# Home Server

Panel unificado para las aplicaciones de tu servidor doméstico. El repositorio es un monorepo de pnpm y Turborepo: `apps/web` contiene Next.js, `apps/api` contiene NestJS/Fastify y los contratos y la base de datos viven en `packages/`.

## Desarrollo

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Para ejecutar el frontend fuera de Compose, configura `API_URL=http://localhost:3001`.

El frontend ejecuta sus servicios server-side contra la API de Nest; el navegador no consume directamente la API de estadísticas. La API consulta `systeminformation` para CPU, RAM y velocidad de red en cada lectura, guarda una muestra en PostgreSQL cada 5 minutos y el frontend vuelve a leer el estado cada 5 segundos. El acumulado de tráfico de red se mantiene en PostgreSQL —incluidos los reinicios del contenedor— y las muestras crudas se conservan durante 30 días.

## Docker

```bash
docker compose up --build
```

La aplicación quedará disponible en el puerto `3000`. Compose inicia `web`, `api` y PostgreSQL. Puedes cambiar puertos y credenciales con las variables de `.env.example`.

## Estadísticas del host

La ruta `/stats` muestra CPU, memoria, discos y red del servidor Ubuntu. Para obtener métricas del host desde Docker, usa la configuración de producción:

```bash
docker compose -f docker-compose.production.yml up --build -d
```

En producción, solo el servicio `api` comparte los namespaces de red y procesos del host y monta la raíz en `/host` como solo lectura. Ni `web` ni PostgreSQL reciben esos montajes ni credenciales de base de datos. Configura `EXTERNAL_DISK_MOUNT` con el punto de montaje absoluto del disco externo, por ejemplo `/mnt/external`; Compose lo expone internamente como `/host-external` para `systeminformation`.

El proceso debe permanecer en una red privada o detrás de un proxy autenticado; no expongas directamente a Internet un contenedor que puede leer información del host.
