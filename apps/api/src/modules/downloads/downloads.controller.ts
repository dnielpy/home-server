import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { createDownloadSchema, downloadsResponseSchema, downloadSchema } from "@home-server/contracts/downloads";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { DownloadsService } from "./downloads.service";

@Controller("v1/downloads")
@UseGuards(AuthGuard)
export class DownloadsController {
  public constructor(@Inject(DownloadsService) private readonly downloads: DownloadsService) {}

  @Get()
  public async list(@Req() request: AuthenticatedRequest) {
    return downloadsResponseSchema.parse(await this.downloads.dashboard(request.user!));
  }

  @Post()
  public async create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = createDownloadSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("El enlace y el destino son obligatorios.");
    return {
      download: downloadSchema.parse(
        await this.downloads.create(request.user!, parsed.data.url, parsed.data.destination),
      ),
    };
  }

  @Post(":id/pause")
  public async pause(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return { download: downloadSchema.parse(await this.downloads.pause(request.user!, id)) };
  }
  @Post(":id/resume")
  public async resume(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return { download: downloadSchema.parse(await this.downloads.resume(request.user!, id)) };
  }
  @Post(":id/retry")
  public async retry(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return { download: downloadSchema.parse(await this.downloads.retry(request.user!, id)) };
  }
  @Delete(":id")
  public async cancel(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return { download: downloadSchema.parse(await this.downloads.cancel(request.user!, id)) };
  }
}
