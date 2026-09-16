import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";
import { DownloadsController } from "./downloads.controller";
import { DownloadsRepository } from "./downloads.repository";
import { DownloadsService } from "./downloads.service";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [DownloadsController],
  providers: [DownloadsRepository, DownloadsService],
  exports: [DownloadsService],
})
export class DownloadsModule {}
