import { randomBytes } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OAUTH_STATE_COOKIE_NAME, toPublicUser } from '../utils/utils';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { loginSchema, registerSchema } from './schemas/auth.schemas';

@Controller('auth')
export class AuthController {
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
      return res.redirect(`${base}/`);
    } catch {
      return res.redirect(`${base}/login?error=oauth_failed`);
    }
  }
}
