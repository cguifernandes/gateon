import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { OAUTH_STATE_COOKIE_NAME, toPublicUser } from '../../utils/utils';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../lib/guards/auth.guard';
import { loginSchema, registerSchema, deleteAccountSchema, updateProfileSchema, passwordResetRequestSchema, passwordResetConfirmSchema } from '../../lib/zod/auth-schemas';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = registerSchema.parse(body);
    return this.auth.register(input, req, res);
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = loginSchema.parse(body);
    return this.auth.login(input, req, res);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password-reset/request')
  async requestPasswordReset(@Body() body: unknown) {
    const input = passwordResetRequestSchema.parse(body);
    return this.auth.requestPasswordReset(input);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() body: unknown) {
    const input = passwordResetConfirmSchema.parse(body);
    return this.auth.resetPassword(input);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.refresh(req, res);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request) {
    const user = req.authSession?.user;
    if (!user) {
      throw new InternalServerErrorException('Authenticated user not found.');
    }
    return { user: toPublicUser(user) };
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  profile(@Req() req: Request) {
    const session = req.authSession;
    if (!session) {
      throw new InternalServerErrorException('Authenticated session not found.');
    }
    return this.auth.getProfile(session.userId, session.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: Request, @Body() body: unknown) {
    const input = updateProfileSchema.parse(body);
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new InternalServerErrorException('Authenticated user not found.');
    }
    return this.auth.updateProfile(userId, input);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(AuthGuard)
  async revokeSession(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
  ) {
    const session = req.authSession;
    if (!session) {
      throw new InternalServerErrorException('Authenticated session not found.');
    }
    return this.auth.revokeSession(session.userId, sessionId, session.id);
  }

  @Delete('sessions')
  @UseGuards(AuthGuard)
  async revokeOtherSessions(@Req() req: Request) {
    const session = req.authSession;
    if (!session) {
      throw new InternalServerErrorException('Authenticated session not found.');
    }
    return this.auth.revokeOtherSessions(session.userId, session.id);
  }

  @Delete('account')
  @UseGuards(AuthGuard)
  async deleteAccount(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    deleteAccountSchema.parse(body);
    const userId = req.authSession?.userId;
    if (!userId) {
      throw new InternalServerErrorException('Authenticated user not found.');
    }
    return this.auth.deleteAccount(userId, req, res);
  }

  @Get('google')
  googleAuth(@Res() res: Response) {
    const state = randomBytes(32).toString('base64url');
    res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.auth.getOAuthStateTtlMs(),
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    const url = this.auth.buildGoogleAuthorizationUrl(state);
    return res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') oauthError?: string,
  ) {
    const base = this.auth.getWebBaseUrl();
    if (oauthError) {
      return res.redirect(`${base}/login?error=oauth_denied`);
    }
    if (!code || !state) {
      return res.redirect(`${base}/login?error=oauth_invalid`);
    }
    try {
      await this.auth.signInWithGoogle(req, res, code, state);
      return res.redirect(`${base}/dashboard`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(
        `[auth/google/callback] OAuth sign-in failed: ${message}`,
        stack,
      );

      let errorCode = 'oauth_failed';
      if (err instanceof BadRequestException) {
        errorCode = 'oauth_bad_request';
      } else if (err instanceof UnauthorizedException) {
        errorCode = 'oauth_unauthorized';
      }

      return res.redirect(`${base}/login?error=${errorCode}`);
    }
  }
}
