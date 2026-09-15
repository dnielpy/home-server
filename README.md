# Home Server

Panel unificado para las aplicaciones de tu servidor doméstico.

## Desarrollo

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Docker

```bash
docker compose up --build
```

La aplicación quedará disponible en el puerto `3000`. Puedes cambiarlo en `.env` mediante `APP_PORT`.

## Estadísticas del host

La ruta `/stats` muestra CPU, memoria, discos y red del servidor Ubuntu. Para obtener métricas del host desde Docker, usa la configuración de producción:

```bash
docker compose -f docker-compose.production.yml up --build -d
```

Esta configuración comparte los namespaces de red y procesos del host y monta la raíz del sistema en `/host` en modo solo lectura. El panel no escribe en ese montaje. Configura `EXTERNAL_DISK_MOUNT` con el punto de montaje absoluto del disco externo, por ejemplo `/mnt/external`; Compose lo expondrá internamente como `/host-external` para `systeminformation`.

El proceso debe permanecer en una red privada o detrás de un proxy autenticado; no expongas directamente a Internet un contenedor que puede leer información del host.
