import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Sessions, Users } from "@prisma/client";
import * as argon2 from "argon2";
import type { Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import {
  DEFAULT_SESSION_TTL_DAYS,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_TTL_MS,
  PROVIDER_CREDENTIALS,
  PROVIDER_GOOGLE,
  PublicUser,
  SESSION_COOKIE_NAME,
  toPublicUser,
} from "../utils/utils";
import type { LoginInput, RegisterInput } from "./schemas/auth.schemas";

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
    return this.config.get<string>("WEB_BASE_URL") ?? "http://localhost:3000";
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
    return randomBytes(32).toString("base64url");
  }

  private async createSession(
    userId: string,
    req: Request,
  ): Promise<Sessions & { user: Users }> {
    const token = this.newToken();
    const expiresAt = new Date(Date.now() + this.sessionTtlMs());
    return this.prisma.sessions.create({
      data: {
        token,
        expiresAt,
        userId,
        ipAddress:
          typeof req.headers["x-forwarded-for"] === "string" &&
          req.headers["x-forwarded-for"].length > 0
            ? (req.headers["x-forwarded-for"].split(",")[0]?.trim() ?? null)
            : (req.ip ?? req.socket.remoteAddress ?? null),
        userAgent: req.get("user-agent") ?? null,
      },
      include: { user: true },
    });
  }

  async findValidSessionByToken(
    token: string | undefined,
  ): Promise<(Sessions & { user: Users }) | null> {
    if (!token) {
      return null;
    }
    const session = await this.prisma.sessions.findUnique({
      where: { token },
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
  ): Promise<(Sessions & { user: Users }) | null> {
    const current = await this.findValidSessionByToken(token);
    if (!current) {
      return null;
    }
    const newTok = this.newToken();
    const expiresAt = new Date(Date.now() + this.sessionTtlMs());
    return this.prisma.sessions.update({
      where: { id: current.id },
      data: {
        token: newTok,
        expiresAt,
        ipAddress:
          typeof req.headers["x-forwarded-for"] === "string" &&
          req.headers["x-forwarded-for"].length > 0
            ? (req.headers["x-forwarded-for"].split(",")[0]?.trim() ?? null)
            : (req.ip ?? req.socket.remoteAddress ?? null),
        userAgent: req.get("user-agent") ?? null,
      },
      include: { user: true },
    });
  }

  private async revokeByToken(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    await this.prisma.sessions.deleteMany({ where: { token } });
  }

  buildGoogleAuthorizationUrl(state: string): string {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const redirectUri = this.config.get<string>("GOOGLE_REDIRECT_URI");
    if (!clientId || !redirectUri) {
      throw new BadRequestException(
        "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI).",
      );
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  getOAuthStateTtlMs(): number {
    return OAUTH_STATE_TTL_MS;
  }

  private async exchangeCodeForAccessToken(code: string): Promise<string> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    const redirectUri = this.config.get<string>("GOOGLE_REDIRECT_URI");
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException(
        "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI).",
      );
    }
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new UnauthorizedException(
        `OAuth token exchange failed: ${res.status} ${text}`,
      );
    }
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new UnauthorizedException(
        "OAuth token exchange returned no token.",
      );
    }
    return json.access_token;
  }

  private async fetchGoogleUserProfile(
    accessToken: string,
  ): Promise<GoogleUserProfile> {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new UnauthorizedException(
        `Google userinfo failed: ${res.status} ${text}`,
      );
    }
    const json = (await res.json()) as GoogleUserProfile;
    if (!json.sub || !json.email) {
      throw new UnauthorizedException("Google profile missing sub or email.");
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
      throw new ConflictException("Email already registered");
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
    const session = await this.createSession(user.id, req);
    res.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
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
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await this.verifyPassword(account.password, dto.password);
    if (!ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const session = await this.createSession(account.userId, req);
    res.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return { user: toPublicUser(session.user) };
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    await this.revokeByToken(token);
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return { ok: true };
  }

  async refresh(req: Request, res: Response): Promise<{ user: PublicUser }> {
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const rotated = await this.rotateSession(token, req);
    if (!rotated) {
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      throw new UnauthorizedException("Session expired");
    }
    res.cookie(SESSION_COOKIE_NAME, rotated.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: rotated.expiresAt,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return { user: toPublicUser(rotated.user) };
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
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      throw new BadRequestException("Invalid OAuth state");
    }
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    const accessToken = await this.exchangeCodeForAccessToken(code);
    const profile = await this.fetchGoogleUserProfile(accessToken);
    const user = await this.linkOrCreateGoogleUser(profile);
    const session = await this.createSession(user.id, req);
    res.cookie(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
  }

  private async linkOrCreateGoogleUser(
    profile: GoogleUserProfile,
  ): Promise<Users> {
    const existingAccount = await this.prisma.accounts.findUnique({
      where: {
        providerId_accountId: {
          providerId: PROVIDER_GOOGLE,
          accountId: profile.sub,
        },
      },
      include: { user: true },
    });
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
