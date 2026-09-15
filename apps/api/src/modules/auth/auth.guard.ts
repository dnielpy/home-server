import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  public async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authService.getUserForSession(this.authService.extractToken(request));
    if (!user) throw new UnauthorizedException("Autenticación requerida.");
    request.user = user;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  public canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.isAdmin) throw new ForbiddenException("Acceso de administrador requerido.");
    return true;
  }
}
