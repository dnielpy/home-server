import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";
import { GalleryController } from "./gallery.controller";
import { GalleryService } from "./gallery.service";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
