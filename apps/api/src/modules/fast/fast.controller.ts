import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Head,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { fastSessionResponseSchema } from "@home-server/contracts/fast";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { FastService } from "./fast.service";

@Controller("v1/fast")
@UseGuards(AuthGuard)
export class FastController {
  public constructor(@Inject(FastService) private readonly fast: FastService) {}

  @Post("sessions")
  public createSession(@Req() request: AuthenticatedRequest) {
    return fastSessionResponseSchema.parse({ session: this.fast.createSession(request.user!) });
  }

  @Delete("sessions")
  @HttpCode(204)
  public releaseSession(@Req() request: AuthenticatedRequest, @Query("session") sessionId?: string) {
    this.fast.releaseSession(request.user!, this.sessionId(sessionId));
  }

  @Head("ping")
  @HttpCode(204)
  public ping(@Req() request: AuthenticatedRequest, @Query("session") sessionId?: string) {
    this.fast.ping(request.user!, this.sessionId(sessionId));
  }

  @Get("download")
  public download(
    @Req() request: AuthenticatedRequest,
    @Query("session") sessionId: string | undefined,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const download = this.fast.createDownload(request.user!, this.sessionId(sessionId));
    response
      .header("Cache-Control", "no-store, no-transform")
      .header("Content-Encoding", "identity")
      .header("Content-Length", String(download.size))
      .header("X-Content-Type-Options", "nosniff");
    return new StreamableFile(download.stream, { type: "application/octet-stream" });
  }

  @Post("upload")
  @HttpCode(204)
  public async upload(
    @Req() request: AuthenticatedRequest,
    @Query("session") sessionId: string | undefined,
    @Res({ passthrough: true }) response: FastifyReply,
    @Body() body: unknown,
  ) {
    const bytes = await this.fast.consumeUpload(request.user!, this.sessionId(sessionId), body);
    response.header("Cache-Control", "no-store, no-transform").header("X-Fast-Bytes", String(bytes));
  }

  private sessionId(value: string | undefined) {
    if (!value) throw new BadRequestException("La sesión de prueba es obligatoria.");
    return value;
  }
}
