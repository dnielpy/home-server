import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { Cron, CronExpression, Interval } from "@nestjs/schedule";
import type { NetworkHistoryResponse, StatsLiveResponse } from "@home-server/contracts/stats";
import { StatsRepository } from "./stats.repository";
import { SystemMetricsService } from "./system-metrics.service";

const SAMPLE_INTERVAL_MS = 2_000;
const LIVE_HISTORY_MS = 5 * 60 * 1_000;
const WEEKLY_HISTORY_MS = 7 * 24 * 60 * 60 * 1_000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

@Injectable()
export class StatsService implements OnModuleInit {
  private readonly logger = new Logger(StatsService.name);
  private collecting = false;

  public constructor(
    private readonly systemMetricsService: SystemMetricsService,
    private readonly statsRepository: StatsRepository,
  ) {}

  public async onModuleInit() {
    await this.purgeExpiredStats();
    await this.collect();
  }

  @Interval(SAMPLE_INTERVAL_MS)
  public async collect() {
    if (this.collecting) {
      this.logger.warn("Skipping stats collection because the previous sample is still running.");
      return;
    }

    this.collecting = true;
    try {
      await this.statsRepository.insert(await this.systemMetricsService.collect());
    } catch (error) {
      this.logger.error("Unable to collect and persist system metrics.", error instanceof Error ? error.stack : undefined);
    } finally {
      this.collecting = false;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  public async purgeExpiredStats() {
    await this.statsRepository.deleteBefore(new Date(Date.now() - RETENTION_MS));
  }

  public async getLive(): Promise<StatsLiveResponse> {
    const current = await this.statsRepository.findLatest();
    if (!current) throw new ServiceUnavailableException("No system metrics have been collected yet.");

    return {
      current,
      networkHistory: await this.statsRepository.findNetworkHistory(new Date(Date.now() - LIVE_HISTORY_MS)),
    };
  }

  public async getWeeklyNetworkHistory(): Promise<NetworkHistoryResponse> {
    return {
      period: "7d",
      intervalMinutes: 15,
      points: await this.statsRepository.findWeeklyNetworkHistory(new Date(Date.now() - WEEKLY_HISTORY_MS)),
    };
  }
}
