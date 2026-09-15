import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { userResponseSchema, usersResponseSchema } from "@home-server/contracts";
import { AdminGuard, AuthGuard } from "../auth/auth.guard";
import { parsePhotoData } from "../storage/user-storage.service";
import { UsersService } from "./users.service";

type UserPayload = { name?: unknown; password?: unknown; photoData?: unknown; removePhoto?: unknown };

@Controller("v1/users")
@UseGuards(AuthGuard, AdminGuard)
export class UsersController {
  public constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @Get()
  public async list() {
    return usersResponseSchema.parse({ users: await this.usersService.list() });
  }

  @Post()
  public async create(@Body() body: UserPayload) {
    if (typeof body?.name !== "string" || typeof body.password !== "string") {
      throw new BadRequestException("Nombre y contraseña son obligatorios.");
    }
    return userResponseSchema.parse({
      user: await this.usersService.create(body.name, body.password, parsePhotoData(body.photoData)),
    });
  }

  @Patch(":id")
  public async update(@Param("id") id: string, @Body() body: UserPayload) {
    if (typeof body?.name !== "string") throw new BadRequestException("El nombre es obligatorio.");
    return userResponseSchema.parse({
      user: await this.usersService.update(id, {
        name: body.name,
        password: typeof body.password === "string" && body.password ? body.password : undefined,
        photo: parsePhotoData(body.photoData),
        removePhoto: body.removePhoto === true,
      }),
    });
  }

  @Delete(":id")
  public async remove(@Param("id") id: string) {
    return userResponseSchema.parse({ user: await this.usersService.remove(id) });
  }

  @Get(":id/photo")
  public async getPhoto(@Param("id") id: string) {
    const photo = await this.usersService.photo(id);
    return new StreamableFile(photo.stream, { type: photo.contentType, disposition: "inline" });
  }
}
