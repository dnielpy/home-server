import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { runMigrations } from "@home-server/database/migrations";
import { AppModule } from "./app.module";

const bootstrap = async () => {
  await runMigrations();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true, bodyLimit: 8 * 1024 * 1024 }),
  );
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      "application/octet-stream",
      (_request: unknown, payload: NodeJS.ReadableStream, done: (error: Error | null, body?: unknown) => void) => {
        done(null, payload);
      },
    );
  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? "0.0.0.0";

  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}`, "Bootstrap");
};

void bootstrap();
