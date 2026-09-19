import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FastController } from "./fast.controller";
import { FastService } from "./fast.service";

@Module({
  imports: [AuthModule],
  controllers: [FastController],
  providers: [FastService],
})
export class FastModule {}
