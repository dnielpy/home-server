# Home Server

Panel unificado para las aplicaciones de tu servidor doméstico. El repositorio es un monorepo de pnpm y Turborepo: `apps/web` contiene Next.js, `apps/api` contiene NestJS/Fastify y los contratos y la base de datos viven en `packages/`.

## Desarrollo

```bash
pnpm install
pnpm dev
```

`pnpm dev` carga el `.env` de la raíz y ejecuta el frontend en `APP_PORT` (3000 por defecto) y Nest en `API_PORT` (3001 por defecto). Para desarrollo local contra PostgreSQL en Docker, mantén `DATABASE_URL` apuntando a `localhost:5432` y abre [http://localhost:3000](http://localhost:3000).

El frontend ejecuta sus servicios server-side contra la API de Nest; el navegador no consume directamente la API de estadísticas. La API consulta `systeminformation` para CPU, RAM y velocidad de red en cada lectura, guarda una muestra en PostgreSQL cada 5 minutos y el frontend vuelve a leer el estado cada 5 segundos. El acumulado de tráfico de red se mantiene en PostgreSQL —incluidos los reinicios del contenedor— y las muestras crudas se conservan durante 30 días.

LocalTube está disponible en `/localtube`. La lógica de exploración, subida, streaming con rangos, duración y miniaturas se ejecuta en la API; el frontend usa sus handlers BFF para mantener la sesión fuera del navegador.

Descargas está disponible en `/downloads`. Cada descarga pertenece al usuario autenticado y se encola en aria2 desde la API. Al crearla se elige `gallery` o `local-tube`; el archivo se guarda directamente en la raíz privada de ese destino. Solo se aceptan enlaces HTTP/HTTPS directos. Los formatos no compatibles se conservan, pero se marcan como no indexables en el panel.

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

## Descargas persistentes

Compose inicia también aria2. Define `ARIA2_RPC_SECRET` en `.env`; el RPC se mantiene en la red interna en desarrollo y solo en loopback en producción. La sesión de aria2 y los marcadores de finalización viven en volúmenes separados para que las tareas continúen aunque el navegador o la API se reinicien. El historial de descargas se guarda en PostgreSQL y comienza nuevo en Home Server; no se importa el manifiesto JSON de la aplicación anterior.

## Datos de usuarios en el disco externo

El API usa `EXTERNAL_DISK_MOUNT` como raíz de datos. Al iniciar, crea las carpetas de cada usuario y las aplicaciones disponibles:

```text
Download/test/
├── admin/
│   ├── local-tube/
│   ├── gallery/
│   └── profile-<id>.<ext>
└── usuario/
    ├── local-tube/
    └── gallery/
```

Cada usuario solo accede a sus carpetas `EXTERNAL_DISK_MOUNT/<usuario>/local-tube` y `EXTERNAL_DISK_MOUNT/<usuario>/gallery`. LocalTube conserva los vídeos MP4/WebM y su caché oculta de miniaturas; Downloads escribe en la raíz del destino elegido. Las carpetas antiguas `streamlt/` no se migran ni se eliminan: se preservan sin usar.

En `docker-compose.yml`, `EXTERNAL_DISK_MOUNT` se interpreta como una ruta del host y se monta en `/app/external`. En producción se monta en `/host-external` con permisos de lectura y escritura para que el API pueda crear usuarios y guardar sus fotos.
