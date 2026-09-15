import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "@home-server/database";
import type { HealthData } from "@home-server/contracts/health";

@Injectable()
export class HealthService {
  public async getHealth(): Promise<HealthData> {
    try {
      await sql`select 1`;
      return { status: "ok", database: "ok" };
    } catch {
      throw new ServiceUnavailableException({ status: "error", database: "unavailable" });
    }
  }
}
