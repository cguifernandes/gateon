import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "../auth.service";
import { SESSION_COOKIE_NAME } from "../../utils/utils";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    const session = await this.authService.findValidSessionByToken(token);
    if (!session) {
      throw new UnauthorizedException();
    }
    req.authSession = session;
    return true;
  }
}
