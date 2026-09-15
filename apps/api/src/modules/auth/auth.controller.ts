import { Body, Controller, Delete, Get, Inject, Post, Req, UnauthorizedException } from "@nestjs/common";
import { loginRequestSchema, loginResponseSchema, userDtoSchema } from "@home-server/contracts";
import { AuthService, toUserDto } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import type { AuthenticatedRequest } from "./auth.types";
import { UseGuards } from "@nestjs/common";

@Controller("v1/auth")
export class AuthController {
  public constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  @Post("login")
  public async login(@Body() body: unknown) {
    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) throw new UnauthorizedException("Credenciales incorrectas.");
    const result = await this.authService.login(parsed.data.name, parsed.data.password);
    if (!result) throw new UnauthorizedException("Credenciales incorrectas.");
    return loginResponseSchema.parse(result);
  }

  @UseGuards(AuthGuard)
  @Get("me")
  public getMe(@Req() request: AuthenticatedRequest) {
    return userDtoSchema.parse(toUserDto(request.user!));
  }

  @Delete("session")
  public async logout(@Req() request: AuthenticatedRequest) {
    await this.authService.deleteSession(this.authService.extractToken(request));
    return { ok: true };
  }
}
