import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Sessions, Users } from '@prisma/client';
import * as argon2 from 'argon2';
import type { CookieOptions, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_SESSION_TTL_DAYS,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_MS,
  PROVIDER_CREDENTIALS,
  PROVIDER_GOOGLE,
  PublicUser,
  SESSION_COOKIE_NAME,
  hashSensitiveValue,
  toPublicUser,
} from '../../utils/utils';
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  type LoginInput,
  type PasswordResetConfirmInput,
  type PasswordResetRequestInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '../../lib/zod/auth-schemas';
import { sendPasswordResetEmail } from '../../lib/auth/password-reset-mail';
import {
  buildPasswordResetUrl,
  getPasswordResetMaxRequestsPerHour,
  getPasswordResetTtlMs,
  hashPasswordResetToken,
} from '../../lib/auth/password-reset';

type GoogleUserProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getWebBaseUrl(): string {
    return this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000';
  }

  private async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  private async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  private sessionTtlMs(): number {
    const raw = process.env.SESSION_TTL_DAYS;
    const days = raw ? Number(raw) : DEFAULT_SESSION_TTL_DAYS;
    if (Number.isNaN(days) || days <= 0) {
      return DEFAULT_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    }
    return days * 24 * 60 * 60 * 1000;
  }

  private newToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private sessionCookieOptions(expires?: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(expires ? { expires } : {}),
      domain: process.env.COOKIE_DOMAIN || undefined,
    };
  }

  private sessionMetadataTtlMs(): number {
    const defaultDays = 7;
    const raw = process.env.SESSION_METADATA_TTL_DAYS;
    const days = raw ? Number(raw) : defaultDays;
    if (Number.isNaN(days) || days <= 0) {
      return defaultDays * 24 * 60 * 60 * 1000;
    }
    return days * 24 * 60 * 60 * 1000;
  }

  private normalizeSessionIp(req: Request): string | null {
    const forwarded =
      typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]
        : null;
    const raw = forwarded ?? req.ip ?? req.socket.remoteAddress ?? null;
    if (!raw) {
      return null;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeSessionUserAgent(req: Request): string | null {
    const raw = req.get('user-agent');
    if (!raw) {
      return null;
    }
    const normalized = raw.trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private hashSessionToken(token: string): string {
    return hashSensitiveValue(`session:${token}`);
  }

  private buildHashedSessionMetadata(req: Request): {
    ipHash: string | null;
    userAgentHash: string | null;
    metadataExpiresAt: Date;
  } {
    const ip = this.normalizeSessionIp(req);
    const userAgent = this.normalizeSessionUserAgent(req);

    return {
      ipHash: ip ? hashSensitiveValue(`ip:${ip}`) : null,
      userAgentHash: userAgent ? hashSensitiveValue(`ua:${userAgent}`) : null,
      metadataExpiresAt: new Date(Date.now() + this.sessionMetadataTtlMs()),
    };
  }

  private async cleanupExpiredSessionData(): Promise<void> {
    await this.prisma.sessions.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await this.prisma.sessions.updateMany({
      where: {
        metadataExpiresAt: { lte: new Date() },
        OR: [{ ipHash: { not: null } }, { userAgentHash: { not: null } }],
      },
      data: {
        ipHash: null,
        userAgentHash: null,
      },
    });
  }

  private async createSession(
    userId: string,
    req: Request,
  ): Promise<{ session: Sessions & { user: Users }; rawToken: string }> {
    void this.cleanupExpiredSessionData().catch(() => undefined);
    const token = this.newToken();
    const tokenHash = this.hashSessionToken(token);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs());
    const metadata = this.buildHashedSessionMetadata(req);
    const session = await this.prisma.sessions.create({
      data: {
        tokenHash,
        expiresAt,
        userId,
        ipHash: metadata.ipHash,
        userAgentHash: metadata.userAgentHash,
        metadataExpiresAt: metadata.metadataExpiresAt,
      },
      include: { user: true },
    });
    return { session, rawToken: token };
  }

  async findValidSessionByToken(
    token: string | undefined,
  ): Promise<(Sessions & { user: Users }) | null> {
    if (!token) {
      return null;
    }
    const session = await this.prisma.sessions.findUnique({
      where: { tokenHash: this.hashSessionToken(token) },
      include: { user: true },
    });
    if (!session) {
      return null;
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.sessions
        .delete({ where: { id: session.id } })
        .catch(() => undefined);
      return null;
    }
    return session;
  }

  private async rotateSession(
    token: string | undefined,
    req: Request,
  ): Promise<{ session: Sessions & { user: Users }; rawToken: string } | null> {
    const current = await this.findValidSessionByToken(token);
    if (!current) {
      return null;
    }
    void this.cleanupExpiredSessionData().catch(() => undefined);
    const newTok = this.newToken();
    const newTokHash = this.hashSessionToken(newTok);
    const expiresAt = new Date(Date.now() + this.sessionTtlMs());
    const metadata = this.buildHashedSessionMetadata(req);
    const session = await this.prisma.sessions.update({
      where: { id: current.id },
      data: {
        tokenHash: newTokHash,
        expiresAt,
        ipHash: metadata.ipHash,
        userAgentHash: metadata.userAgentHash,
        metadataExpiresAt: metadata.metadataExpiresAt,
      },
      include: { user: true },
    });
    return { session, rawToken: newTok };
  }

  private async revokeByToken(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    await this.prisma.sessions.deleteMany({
      where: { tokenHash: this.hashSessionToken(token) },
    });
  }

  buildGoogleAuthorizationUrl(state: string): string {
    console.log('=== buildGoogleAuthorizationUrl ===');
    console.log('state:', state);

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');

    console.log('clientId:', clientId);
    console.log('redirectUri:', redirectUri);

    if (!clientId || !redirectUri) {
      throw new BadRequestException(
        'Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI).',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  getOAuthStateTtlMs(): number {
    return OAUTH_STATE_TTL_MS;
  }

  private getFetchErrorDetail(error: unknown): string | null {
    if (!(error instanceof Error)) {
      return null;
    }

    const cause = error.cause;
    if (cause instanceof Error) {
      const code = (cause as { code?: unknown }).code;
      const suffix = typeof code === 'string' ? ` (${code})` : '';
      return `${cause.message}${suffix}`;
    }

    return error.message || null;
  }

  private async fetchGoogleOAuth(
    url: string,
    init: RequestInit,
    context: string,
  ): Promise<globalThis.Response> {
    console.log('=== fetchGoogleOAuth ===');
    console.log('context:', context);
    console.log('url:', url);

    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(10_000),
      });

      console.log('status:', response.status);
      console.log('statusText:', response.statusText);

      return response;
    } catch (error: unknown) {
      const detail = this.getFetchErrorDetail(error);
      throw new UnauthorizedException(
        `Google OAuth ${context} request failed before receiving a response${
          detail ? `: ${detail}` : ''
        }.`,
      );
    }
  }

  private async exchangeCodeForAccessToken(code: string): Promise<string> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        'Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI).',
      );
    }
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const res = await this.fetchGoogleOAuth(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
      'token exchange',
    );
    if (!res.ok) {
      throw new UnauthorizedException(
        `OAuth token exchange failed (${res.status}).`,
      );
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new UnauthorizedException(
        'OAuth token exchange returned no token.',
      );
    }
    return json.access_token;
  }

  private async fetchGoogleUserProfile(
    accessToken: string,
  ): Promise<GoogleUserProfile> {
    const res = await this.fetchGoogleOAuth(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      'userinfo',
    );
    if (!res.ok) {
      throw new UnauthorizedException(
        `Google userinfo failed (${res.status}).`,
      );
    }
    const json = (await res.json()) as GoogleUserProfile;
    if (!json.sub || !json.email) {
      throw new UnauthorizedException('Google profile missing sub or email.');
    }
    return json;
  }

  async register(
    dto: RegisterInput,
    req: Request,
    res: Response,
  ): Promise<{ user: PublicUser }> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.users.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hash = await this.hashPassword(dto.password);
    const user = await this.prisma.users.create({
      data: {
        email,
        name: dto.name.trim(),
        accounts: {
          create: {
            accountId: email,
            providerId: PROVIDER_CREDENTIALS,
            password: hash,
          },
        },
      },
    });
    const { session, rawToken } = await this.createSession(user.id, req);
    res.cookie(
      SESSION_COOKIE_NAME,
      rawToken,
      this.sessionCookieOptions(session.expiresAt),
    );
    return { user: toPublicUser(session.user) };
  }

  async login(
    dto: LoginInput,
    req: Request,
    res: Response,
  ): Promise<{ user: PublicUser }> {
    const email = dto.email.trim().toLowerCase();
    const account = await this.prisma.accounts.findUnique({
      where: {
        providerId_accountId: {
          providerId: PROVIDER_CREDENTIALS,
          accountId: email,
        },
      },
      include: { user: true },
    });
    if (!account?.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await this.verifyPassword(account.password, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { session, rawToken } = await this.createSession(account.userId, req);
    res.cookie(
      SESSION_COOKIE_NAME,
      rawToken,
      this.sessionCookieOptions(session.expiresAt),
    );
    return { user: toPublicUser(session.user) };
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    await this.revokeByToken(token);
    const options = this.sessionCookieOptions();

    console.log('Clear cookie options:');
    console.dir(options);

    res.clearCookie(SESSION_COOKIE_NAME, options);
    res.clearCookie(SESSION_COOKIE_NAME, this.sessionCookieOptions());
    return { ok: true };
  }

  async deleteAccount(
    userId: string,
    req: Request,
    res: Response,
  ): Promise<{ ok: true }> {
    await this.prisma.users.delete({
      where: { id: userId },
    });
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    await this.revokeByToken(token);
    res.clearCookie(SESSION_COOKIE_NAME, this.sessionCookieOptions());
    return { ok: true };
  }

  async refresh(req: Request, res: Response): Promise<{ user: PublicUser }> {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const rotated = await this.rotateSession(token, req);
    if (!rotated) {
      res.clearCookie(SESSION_COOKIE_NAME, this.sessionCookieOptions());
      throw new UnauthorizedException('Session expired');
    }

    const options = this.sessionCookieOptions(rotated.session.expiresAt);

    console.log('Set cookie options:');
    console.dir(options);

    res.cookie(
      SESSION_COOKIE_NAME,
      rotated.rawToken,
      this.sessionCookieOptions(rotated.session.expiresAt),
    );
    return { user: toPublicUser(rotated.session.user) };
  }

  private resolveAccountLabel(providerId: string): string {
    if (providerId === PROVIDER_GOOGLE) {
      return 'Google';
    }
    if (providerId === PROVIDER_CREDENTIALS) {
      return 'E-mail e senha';
    }
    return providerId;
  }

  async getProfile(userId: string, currentSessionId: string) {
    const [user, accounts, sessions, stats] = await Promise.all([
      this.prisma.users.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          emailVerified: true,
          planId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.accounts.findMany({
        where: { userId },
        select: {
          id: true,
          providerId: true,
          password: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.sessions.findMany({
        where: { userId },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
          ipHash: true,
          userAgentHash: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      Promise.all([
        this.prisma.telegramGroups.count({ where: { userId } }),
        this.prisma.telegramGroupMembers.count({
          where: { group: { userId }, leftAt: null },
        }),
        this.prisma.telegramAlerts.count({ where: { userId } }),
        this.prisma.stripeBillingConnections.count({ where: { userId } }),
      ]),
    ]);

    const [telegramGroups, members, alerts, stripeConnections] = stats;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        planId: user.planId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accounts: accounts.map((account) => ({
        id: account.id,
        providerId: account.providerId,
        label: this.resolveAccountLabel(account.providerId),
        linkedAt: account.createdAt.toISOString(),
        hasPassword:
          account.providerId === PROVIDER_CREDENTIALS &&
          Boolean(account.password),
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        isCurrent: session.id === currentSessionId,
        hasIpMetadata: Boolean(session.ipHash),
        hasUserAgentMetadata: Boolean(session.userAgentHash),
      })),
      stats: {
        telegramGroups,
        members,
        alerts,
        stripeConnections,
      },
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const data: {
      name?: string;
      image?: string | null;
    } = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }

    if (input.image !== undefined) {
      data.image =
        input.image === '' || input.image === null ? null : input.image.trim();
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nenhum campo para atualizar.');
    }

    const user = await this.prisma.users.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        planId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        planId: user.planId,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  }

  async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
  ): Promise<{ ok: true }> {
    if (sessionId === currentSessionId) {
      throw new BadRequestException(
        'Não é possível encerrar a sessão atual. Use Sair.',
      );
    }

    const result = await this.prisma.sessions.deleteMany({
      where: { id: sessionId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Sessão não encontrada.');
    }

    return { ok: true };
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<{ revokedCount: number }> {
    const result = await this.prisma.sessions.deleteMany({
      where: {
        userId,
        id: { not: currentSessionId },
      },
    });

    return { revokedCount: result.count };
  }

  async requestPasswordReset(
    dto: PasswordResetRequestInput,
  ): Promise<{ ok: true; message: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.users.findUnique({ where: { email } });

    if (!user) {
      return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const credentialsAccount = await this.prisma.accounts.findUnique({
      where: {
        providerId_accountId: {
          providerId: PROVIDER_CREDENTIALS,
          accountId: email,
        },
      },
    });

    if (!credentialsAccount?.password) {
      return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await this.prisma.passwordResetTokens.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRequests >= getPasswordResetMaxRequestsPerHour()) {
      return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
    }

    const rawToken = this.newToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + getPasswordResetTtlMs());
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.passwordResetTokens.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetTokens.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const resetUrl = buildPasswordResetUrl(this.getWebBaseUrl(), rawToken);

    try {
      await sendPasswordResetEmail({
        to: email,
        resetUrl,
        expiresAt,
      });
    } catch {
      await this.prisma.passwordResetTokens.updateMany({
        where: { tokenHash, usedAt: null },
        data: { usedAt: now },
      });
    }

    return { ok: true, message: PASSWORD_RESET_GENERIC_MESSAGE };
  }

  async resetPassword(dto: PasswordResetConfirmInput): Promise<{ ok: true }> {
    const tokenHash = hashPasswordResetToken(dto.token.trim());
    const record = await this.prisma.passwordResetTokens.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.usedAt !== null ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Link de redefinição inválido ou expirado.',
      );
    }

    const email = record.user.email.trim().toLowerCase();
    const passwordHash = await this.hashPassword(dto.password);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const account = await tx.accounts.findUnique({
        where: {
          providerId_accountId: {
            providerId: PROVIDER_CREDENTIALS,
            accountId: email,
          },
        },
      });

      if (!account?.password) {
        throw new BadRequestException(
          'Link de redefinição inválido ou expirado.',
        );
      }

      await tx.accounts.update({
        where: { id: account.id },
        data: { password: passwordHash },
      });

      await tx.passwordResetTokens.update({
        where: { id: record.id },
        data: { usedAt: now },
      });

      await tx.passwordResetTokens.updateMany({
        where: {
          userId: record.userId,
          usedAt: null,
          id: { not: record.id },
        },
        data: { usedAt: now },
      });

      await tx.sessions.deleteMany({
        where: { userId: record.userId },
      });
    });

    return { ok: true };
  }

  async signInWithGoogle(
    req: Request,
    res: Response,
    code: string,
    state: string,
  ): Promise<void> {
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE_NAME] as
      | string
      | undefined;
    if (!cookieState || cookieState !== state) {
      res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      throw new BadRequestException('Invalid OAuth state');
    }
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    const accessToken = await this.exchangeCodeForAccessToken(code);
    console.log('Access token OK');

    const profile = await this.fetchGoogleUserProfile(accessToken);
    console.log('Profile:', profile.email);

    const user = await this.linkOrCreateGoogleUser(profile);
    console.log('User:', user.id);

    const { session, rawToken } = await this.createSession(user.id, req);
    console.log('Session criada:', session.id);

    const cookieOptions = this.sessionCookieOptions(session.expiresAt);

    console.log('Cookie options:');
    console.dir(cookieOptions, { depth: null });

    res.cookie(SESSION_COOKIE_NAME, rawToken, cookieOptions);

    console.log('Cookie enviado.');
  }

  private async linkOrCreateGoogleUser(
    profile: GoogleUserProfile,
  ): Promise<Users> {
    console.log('=== linkOrCreateGoogleUser ===');
    console.dir(profile, { depth: null });

    const existingAccount = await this.prisma.accounts.findUnique({
      where: {
        providerId_accountId: {
          providerId: PROVIDER_GOOGLE,
          accountId: profile.sub,
        },
      },
      include: { user: true },
    });

    console.log('existingAccount:');
    console.dir(existingAccount, { depth: null });

    if (existingAccount) {
      return this.prisma.users.update({
        where: { id: existingAccount.userId },
        data: {
          ...(profile.name != null ? { name: profile.name } : {}),
          ...(profile.picture != null ? { image: profile.picture } : {}),
          emailVerified: profile.email_verified ?? false,
        },
      });
    }

    const email = profile.email.trim().toLowerCase();
    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      await this.prisma.accounts.create({
        data: {
          userId: existingUser.id,
          accountId: profile.sub,
          providerId: PROVIDER_GOOGLE,
        },
      });
      return this.prisma.users.update({
        where: { id: existingUser.id },
        data: {
          ...(profile.name != null ? { name: profile.name } : {}),
          ...(profile.picture != null ? { image: profile.picture } : {}),
          emailVerified: profile.email_verified ?? existingUser.emailVerified,
        },
      });
    }

    return this.prisma.users.create({
      data: {
        email,
        name: profile.name ?? null,
        image: profile.picture ?? null,
        emailVerified: profile.email_verified ?? false,
        accounts: {
          create: {
            accountId: profile.sub,
            providerId: PROVIDER_GOOGLE,
          },
        },
      },
    });
  }
}
