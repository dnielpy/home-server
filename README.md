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

En un servidor Ubuntu usa `docker-compose.production.yml`; esa variante mantiene PostgreSQL y el RPC de aria2 en loopback y monta el disco externo en `/host-external` dentro de los contenedores.

## Estadísticas del host

La ruta `/stats` muestra CPU, memoria, discos y red del servidor Ubuntu. Para obtener métricas del host desde Docker, usa la configuración de producción:

```bash
docker compose -f docker-compose.production.yml up --build -d
```

En producción, solo el servicio `api` comparte los namespaces de red y procesos del host y monta la raíz en `/host` como solo lectura. Ni `web` ni PostgreSQL reciben esos montajes ni credenciales de base de datos. Configura `EXTERNAL_DISK_MOUNT` con el punto de montaje absoluto del disco externo, por ejemplo `/mnt/external`; Compose lo expone internamente como `/host-external` para `systeminformation`.

El proceso debe permanecer en una red privada o detrás de un proxy autenticado; no expongas directamente a Internet un contenedor que puede leer información del host.

## Descargas persistentes

Compose inicia también aria2. Define `ARIA2_RPC_SECRET` en `.env`; el RPC se mantiene en la red interna en desarrollo y solo en loopback en producción. La sesión de aria2 y los marcadores de finalización viven en volúmenes separados para que las tareas continúen aunque el navegador o la API se reinicien. El historial de descargas se guarda en PostgreSQL y comienza nuevo en Home Server; no se importa el manifiesto JSON de la aplicación anterior.

aria2 está configurado para una conexión lenta: una descarga simultánea, dos conexiones por servidor, reanudación automática, reintentos ilimitados y tiempos de espera amplios. No se aplica un límite artificial de velocidad; la descarga usa el ancho de banda disponible.

## Datos de usuarios en el disco externo

El API usa `EXTERNAL_DISK_MOUNT` como raíz de datos. Al iniciar, crea las carpetas de cada usuario y las aplicaciones disponibles:

```text
Download/test/
├── Admin/
│   ├── local-tube/
│   ├── gallery/
│   └── profile-<id>.<ext>
└── usuario/
    ├── local-tube/
    └── gallery/
```

Cada usuario solo accede a sus carpetas `EXTERNAL_DISK_MOUNT/<usuario>/local-tube` y `EXTERNAL_DISK_MOUNT/<usuario>/gallery`. LocalTube conserva los vídeos MP4/WebM y su caché oculta de miniaturas; Downloads escribe en la raíz del destino elegido. Las carpetas antiguas `streamlt/` no se migran ni se eliminan: se preservan sin usar.

En `docker-compose.yml`, `EXTERNAL_DISK_MOUNT` se interpreta como una ruta del host y se monta en `/app/external`. En producción se monta en `/host-external` con permisos de lectura y escritura para que el API pueda crear usuarios y guardar sus fotos.

## Instalación en Ubuntu

Los comandos siguientes asumen Ubuntu 22.04 o 24.04, un disco de datos montado en `/mnt/external` y que el repositorio quedará en `/opt/home-server`.

1. Instala Docker Engine y Compose desde el repositorio oficial de Docker ([guía oficial](https://docs.docker.com/engine/install/ubuntu/)):

   ```bash
   sudo apt update
   sudo apt install -y ca-certificates curl openssl git
   sudo install -m 0755 -d /etc/apt/keyrings
   sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
   sudo chmod a+r /etc/apt/keyrings/docker.asc
   sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
   Types: deb
   URIs: https://download.docker.com/linux/ubuntu
   Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
   Components: stable
   Architectures: $(dpkg --print-architecture)
   Signed-By: /etc/apt/keyrings/docker.asc
   EOF
   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   sudo systemctl enable --now docker
   sudo usermod -aG docker "$USER"
   ```

   Cierra la sesión y vuelve a entrar para que el grupo `docker` tenga efecto. Comprueba la instalación con `docker compose version` y `docker run hello-world`.

2. Monta el disco externo y prepara la carpeta de datos. La API y aria2 comparten el grupo Linux `root` dentro del área de datos; el Compose ya configura esa colaboración para que las descargas puedan escribir en las carpetas creadas por la API.

   ```bash
   sudo mkdir -p /mnt/external
   sudo mkdir -p /opt/home-server
   sudo chown "$USER":"$USER" /opt/home-server
   ```

   Si `/mnt/external` es un disco local, asegúrate de que esté montado antes de iniciar Compose y que el directorio sea escribible por Docker. No uses una carpeta del sistema como destino de descargas.

3. Clona el proyecto y crea el archivo de variables:

   ```bash
   sudo -u "$USER" git clone <URL_DEL_REPOSITORIO> /opt/home-server
   cd /opt/home-server
   cp .env.example .env
   ```

   Edita `.env` y deja, como mínimo, esta configuración:

   ```dotenv
   APP_PORT=3000
   API_PORT=3001
   POSTGRES_DB=home_server
   POSTGRES_USER=home_server
   POSTGRES_PASSWORD=<una-clave-larga-para-postgres>
   ADMIN_USERNAME=Admin
   ADMIN_PASSWORD=admin1234
   EXTERNAL_DISK_MOUNT=/mnt/external
   ARIA2_RPC_SECRET=<otro-secreto-largo-y-distinto>
   ARIA2_RPC_PORT=6800
   ```

   Puedes generar secretos con `openssl rand -hex 32`. La contraseña inicial solicitada es `Admin` / `admin1234`; cámbiala desde la aplicación después del primer acceso.

4. Valida el archivo y construye los contenedores:

   ```bash
   docker compose --env-file .env -f docker-compose.production.yml config >/dev/null
   docker compose --env-file .env -f docker-compose.production.yml build
   docker compose --env-file .env -f docker-compose.production.yml up -d
   ```

   La primera construcción puede tardar en una conexión lenta porque descarga las imágenes y dependencias. Los siguientes despliegues reutilizan las capas de Docker.

5. Comprueba el estado y abre `http://IP_DEL_SERVIDOR:3000`:

   ```bash
   docker compose --env-file .env -f docker-compose.production.yml ps
   docker compose --env-file .env -f docker-compose.production.yml logs -f api
   ```

   En el primer arranque, la API ejecuta las migraciones, crea el administrador inicial y crea:

   ```text
   /mnt/external/Admin/
   ├── local-tube/
   └── gallery/
   ```

   Cada usuario nuevo creado desde `/users` recibe esas mismas dos carpetas. Si el volumen de PostgreSQL ya contiene un administrador, no se crea otro ni se cambia su contraseña: las variables iniciales solo se aplican cuando la base de datos todavía no tiene administrador.

6. Para actualizaciones:

   ```bash
   cd /opt/home-server
   git pull
   docker compose --env-file .env -f docker-compose.production.yml up -d --build
   ```

   No uses `docker compose down -v` durante una actualización: eliminaría los volúmenes de PostgreSQL y aria2. Haz copias de seguridad de PostgreSQL y de `/mnt/external` antes de migrar o reinstalar el servidor.

La configuración actual deja la API en el puerto `3001` y el RPC de aria2 en el `6800`, pero ambos no se publican directamente hacia Internet en la variante de producción. Protege el puerto `3000` con el firewall del servidor o con un proxy HTTPS si la aplicación será accesible fuera de tu red local.
