import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { HealthModule } from "./modules/health/health.module";
import { StatsModule } from "./modules/stats/stats.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { LocalTubeModule } from "./modules/localtube/localtube.module";
import { GalleryModule } from "./modules/gallery/gallery.module";
import { DownloadsModule } from "./modules/downloads/downloads.module";
import { FastModule } from "./modules/fast/fast.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    HealthModule,
    StatsModule,
    LocalTubeModule,
    GalleryModule,
    DownloadsModule,
    FastModule,
  ],
})
export class AppModule {}
