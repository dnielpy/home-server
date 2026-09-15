import { Module } from "@nestjs/common";
import { StatsController } from "./stats.controller";
import { StatsRepository } from "./stats.repository";
import { SystemMetricsService } from "./system-metrics.service";
import { StatsService } from "./stats.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  controllers: [StatsController],
  imports: [AuthModule],
  providers: [StatsRepository, SystemMetricsService, StatsService],
})
export class StatsModule {}
