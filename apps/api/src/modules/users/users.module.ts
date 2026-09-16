import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { DownloadsModule } from "../downloads/downloads.module";

@Module({
  imports: [AuthModule, StorageModule, DownloadsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
