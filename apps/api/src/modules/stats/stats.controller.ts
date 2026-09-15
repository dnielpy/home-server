import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import {
  networkHistoryResponseSchema,
  statsLiveResponseSchema,
  type NetworkHistoryResponse,
  type StatsLiveResponse,
} from "@home-server/contracts/stats";
import { StatsService } from "./stats.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("v1/stats")
@UseGuards(AuthGuard)
export class StatsController {
  public constructor(
    @Inject(StatsService)
    private readonly statsService: StatsService,
  ) {}

  @Get("live")
  public async getLive(): Promise<StatsLiveResponse> {
    return statsLiveResponseSchema.parse(await this.statsService.getLive());
  }

  @Get("network-history")
  public async getNetworkHistory(@Query("period") period?: string): Promise<NetworkHistoryResponse> {
    if (period !== "7d") throw new BadRequestException("period must be 7d.");
    return networkHistoryResponseSchema.parse(await this.statsService.getWeeklyNetworkHistory());
  }
}
