import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AdminGuard, AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [StorageModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard],
  exports: [AuthService, AuthGuard, AdminGuard],
})
export class AuthModule {}
