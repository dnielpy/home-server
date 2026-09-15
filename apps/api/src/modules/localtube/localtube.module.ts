import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StorageModule } from "../storage/storage.module";
import { LocalTubeController } from "./localtube.controller";
import { LocalTubeService } from "./localtube.service";

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [LocalTubeController],
  providers: [LocalTubeService],
})
export class LocalTubeModule {}
