import type { Readable } from "node:stream";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnsupportedMediaTypeException,
  UseGuards,
} from "@nestjs/common";
import {
  localTubeSuggestionsSchema,
  localTubeUploadResultSchema,
  localTubeVideoPageSchema,
  localTubeVideoSchema,
} from "@home-server/contracts/localtube";
import type { FastifyReply } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { LocalTubeService } from "./localtube.service";

@Controller("v1/localtube")
@UseGuards(AuthGuard)
export class LocalTubeController {
  public constructor(@Inject(LocalTubeService) private readonly localTube: LocalTubeService) {}

  @Get("videos")
  public async listVideos(
    @Req() request: AuthenticatedRequest,
    @Query("q") query?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return localTubeVideoPageSchema.parse(
      await this.localTube.listVideos(request.user!, {
        query,
        cursor,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get("videos/suggestions")
  public async suggestions(@Req() request: AuthenticatedRequest, @Query("q") query = "") {
    return localTubeSuggestionsSchema.parse({ suggestions: await this.localTube.suggestTitles(request.user!, query) });
  }

  @Get("videos/:videoId/thumbnail")
  public async thumbnail(
    @Req() request: AuthenticatedRequest,
    @Param("videoId") videoId: string,
    @Res() reply: FastifyReply,
  ) {
    const thumbnail = await this.localTube.getThumbnail(request.user!, videoId);
    return reply.header("cache-control", "private, no-store").type(thumbnail.contentType).send(thumbnail.body);
  }

  @Get("videos/:videoId/stream")
  public async stream(
    @Req() request: AuthenticatedRequest,
    @Param("videoId") videoId: string,
    @Query("download") download: string | undefined,
    @Res() reply: FastifyReply,
  ) {
    const opened = await this.localTube.openVideo(
      request.user!,
      videoId,
      request.headers.range,
      download === "1",
      true,
    );
    return reply.code(opened.status).headers(opened.headers).send(opened.stream);
  }

  @Get("videos/:videoId")
  public async video(@Req() request: AuthenticatedRequest, @Param("videoId") videoId: string) {
    return localTubeVideoSchema.parse(await this.localTube.getVideo(request.user!, videoId));
  }

  @Post("uploads")
  @HttpCode(HttpStatus.CREATED)
  public async upload(
    @Req() request: AuthenticatedRequest,
    @Body() body: Readable,
    @Headers("content-type") contentType: string | undefined,
    @Headers("x-file-name") encodedFileName: string | undefined,
    @Headers("x-folder-name") encodedFolderName: string | undefined,
  ) {
    if (!contentType?.toLocaleLowerCase().startsWith("application/octet-stream")) {
      throw new UnsupportedMediaTypeException("La subida debe usar application/octet-stream.");
    }
    if (!encodedFileName) throw new UnsupportedMediaTypeException("El nombre del archivo es obligatorio.");
    return localTubeUploadResultSchema.parse(
      await this.localTube.saveUpload(request.user!, body, {
        fileName: this.decodeHeader(encodedFileName, "El nombre del archivo"),
        folderName: encodedFolderName ? this.decodeHeader(encodedFolderName, "El nombre de la carpeta") : null,
      }),
    );
  }

  private decodeHeader(value: string, label: string) {
    try {
      return decodeURIComponent(value);
    } catch {
      throw new UnsupportedMediaTypeException(`${label} no es válido.`);
    }
  }
}
