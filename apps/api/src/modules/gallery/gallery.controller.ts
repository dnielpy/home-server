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
  galleryAlbumsResponseSchema,
  galleryMediaPageSchema,
  galleryUploadResultSchema,
} from "@home-server/contracts/gallery";
import type { FastifyReply } from "fastify";
import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { GalleryService } from "./gallery.service";

@Controller("v1/gallery")
@UseGuards(AuthGuard)
export class GalleryController {
  public constructor(@Inject(GalleryService) private readonly gallery: GalleryService) {}

  @Get("media")
  public async listMedia(
    @Req() request: AuthenticatedRequest,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
    @Query("albumId") albumId?: string,
  ) {
    return galleryMediaPageSchema.parse(
      await this.gallery.listMedia(request.user!, {
        cursor,
        albumId,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
      }),
    );
  }

  @Get("albums")
  public async listAlbums(@Req() request: AuthenticatedRequest) {
    return galleryAlbumsResponseSchema.parse({ albums: await this.gallery.listAlbums(request.user!) });
  }

  @Get("media/:mediaId/thumbnail")
  public async thumbnail(
    @Req() request: AuthenticatedRequest,
    @Param("mediaId") mediaId: string,
    @Res() reply: FastifyReply,
  ) {
    const thumbnail = await this.gallery.getThumbnail(request.user!, mediaId);
    return reply
      .header("cache-control", "private, max-age=31536000, immutable")
      .type(thumbnail.contentType)
      .send(thumbnail.body);
  }

  @Get("media/:mediaId/content")
  public async content(
    @Req() request: AuthenticatedRequest,
    @Param("mediaId") mediaId: string,
    @Res() reply: FastifyReply,
  ) {
    const opened = await this.gallery.openMedia(
      request.user!,
      mediaId,
      request.headers.range,
      request.method !== "HEAD",
    );
    return reply.code(opened.status).headers(opened.headers).send(opened.stream);
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
    if (!contentType?.toLocaleLowerCase().startsWith("application/octet-stream"))
      throw new UnsupportedMediaTypeException("La subida debe usar application/octet-stream.");
    if (!encodedFileName) throw new UnsupportedMediaTypeException("El nombre del archivo es obligatorio.");
    return galleryUploadResultSchema.parse(
      await this.gallery.saveUpload(request.user!, body, {
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
