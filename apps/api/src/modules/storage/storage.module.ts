import { Module } from "@nestjs/common";
import { UserStorageService } from "./user-storage.service";

@Module({ providers: [UserStorageService], exports: [UserStorageService] })
export class StorageModule {}
