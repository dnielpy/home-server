import { Controller, Get } from "@nestjs/common";
import type { HealthData } from "@home-server/contracts/health";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  @Get()
  public getHealth(): Promise<HealthData> {
    return this.healthService.getHealth();
  }
}
