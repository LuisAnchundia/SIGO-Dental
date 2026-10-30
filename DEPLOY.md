# Despliegue de SIGO-Dental

Stack de despliegue: **Neon** (PostgreSQL) + **Render** (backend NestJS) +
**Vercel** (frontend React). Todo en planes gratuitos, sin tarjeta.

> Las cuentas deben crearse manualmente (nadie más puede crearlas por ti).
> Cada paso toma 1–2 minutos.

## 1. Base de datos — Neon

1. Entra a **https://neon.tech** → "Sign up" → regístrate con GitHub.
2. Crea un proyecto nuevo, nómbralo `sigo-dental`.
3. En el dashboard del proyecto, copia la **Connection string** (botón
   "Connect"). Se ve así:
   `postgresql://usuario:contraseña@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`
4. Guarda esa URL — la necesitas en el paso 2.

## 2. Backend — Render

1. Entra a **https://render.com** → "Get Started" → regístrate con GitHub.
2. Clic en **New +** → **Blueprint**.
3. Conecta el repositorio `LuisAnchundia/SIGO-Dental` (autoriza a Render a
   acceder a GitHub si lo pide).
4. Render detecta el archivo `render.yaml` del repo y propone crear el
   servicio `sigo-dental-api`. Clic en **Apply**.
5. Una vez creado el servicio, ve a su pestaña **Environment** y agrega estas
   3 variables (las que el blueprint dejó en blanco a propósito):
   - `DATABASE_URL` → la cadena de conexión de Neon (paso 1.3)
   - `JWT_SECRET` → cualquier texto largo y aleatorio (ej. genera uno en
     https://generate-secret.vercel.app/32)
   - `CORS_ORIGINS` → déjalo vacío por ahora, lo completas en el paso 4
6. Guarda. Render construye y despliega automáticamente (3–5 min la primera
   vez). Cuando termine, copia la URL pública, algo como:
   `https://sigo-dental-api.onrender.com`
7. Verifica que funciona: abre `https://sigo-dental-api.onrender.com/api/health`
   en el navegador — debe responder `{"status":"ok",...}`.

> **Nota — plan gratis de Render:** el servicio "duerme" tras 15 minutos sin
> tráfico; la primera petición después de eso tarda ~30–50s en responder
> mientras despierta. Es normal, no es un error.
>
> **Nota — almacenamiento de archivos:** el disco del plan gratis es
> efímero. Los archivos subidos en la pestaña "Archivos" del expediente se
> pierden si el servicio se reinicia o se vuelve a desplegar. Para que sea
> permanente haría falta un servicio de almacenamiento externo (S3, Cloudinary),
> fuera del alcance de este despliegue gratuito.

## 3. Frontend — Vercel

Desde la terminal, en la carpeta del proyecto:

```bash
cd frontend
vercel login
```

Esto abre el navegador para que inicies sesión (con GitHub, gratis). Luego:

```bash
vercel --prod
```

Responde las preguntas:
- **Set up and deploy?** → Yes
- **Which scope?** → tu cuenta
- **Link to existing project?** → No
- **Project name** → `sigo-dental`
- **Directory** → `./` (ya estás en `frontend/`)
- **Override settings?** → No

Al terminar te da una URL pública, algo como `https://sigo-dental.vercel.app`.

Antes de desplegar, añade la variable de entorno con la URL del backend:

```bash
vercel env add VITE_API_URL production
```

Pega cuando lo pida: `https://sigo-dental-api.onrender.com/api` (la URL de
Render del paso 2.6, con `/api` al final). Luego vuelve a desplegar:

```bash
vercel --prod
```

## 4. Conectar frontend y backend (CORS)

Con la URL final de Vercel (paso 3), vuelve a Render → `sigo-dental-api` →
**Environment** → edita `CORS_ORIGINS` con esa URL exacta, por ejemplo:

```
https://sigo-dental.vercel.app
```

Guarda — Render redespliega solo. Cuando termine, el sistema queda
completamente funcional en el link de Vercel.

## 5. Datos de prueba

El seed se ejecuta en tu base de datos local, no en Neon automáticamente.
Para cargar los mismos datos de ejemplo en producción:

```bash
cd backend
DATABASE_URL="<la cadena de conexión de Neon>" npx prisma db seed
```

(ejecútalo una sola vez, desde tu máquina, apuntando a la base de Neon).

## Resumen de URLs (desplegado)

| Servicio | URL |
|----------|-----|
| App (frontend) | https://frontend-rust-nine-7im6rho6p3.vercel.app |
| API (backend) | https://sigo-dental-api-ljom.onrender.com/api |
| Swagger | https://sigo-dental-api-ljom.onrender.com/api/docs |
| Base de datos | Panel de Neon (proyecto `sigo-dental`) |

**Estas URLs están entregadas en el EVA de la universidad — no cambiar.**
Si se necesita redesplegar el frontend, usar siempre el mismo proyecto
(`vercel --prod` desde `frontend/`, ya vinculado) para que la URL se
mantenga igual.
