# SIGO-Dental — Sistema Integral de Gestión Odontológica

Sistema web de gestión clínico-administrativa para clínicas odontológicas con
expediente clínico digital, odontograma interactivo, agenda por sillón,
facturación e inventario.

> Proyecto académico — Framework de Programación Web.
> Autor: **Luis Anchundia** (LuisAnchundia).

## Estado

Implementación por fases según el documento de requerimientos (`req.md`):

- **Fase 1 — Core Administrativo y Turnos** ✅
  Pacientes, agenda de citas, catálogo clínico, auth + RBAC, regla RN-03.
- **Fase 2 — Core Clínico** ✅
  Odontograma interactivo (RF-03), periodontograma (RF-04), notas SOEP
  inmutables (RF-05) y consentimientos con firma (RF-06).
- **Fase 3 — Finanzas, Inventarios y Reportes** ✅
  Facturación/POS con pagos mixtos (RF-12), inventario con descargo
  automático por receta (RF-14), presupuestos (RF-07/08), comisiones
  (RF-13), cierre de caja ciego (RN-02) y reportes.
- Fase 4 — UAT, auditoría de seguridad y producción.

## Arquitectura

Monolito modular (el documento admite *"Microservicio / Modular"*).

| Capa        | Tecnología                                        |
|-------------|---------------------------------------------------|
| Frontend    | React + Vite + TypeScript + Tailwind CSS          |
| Backend     | NestJS (TypeScript), arquitectura modular         |
| ORM         | Prisma                                            |
| Base datos  | PostgreSQL 16 (puerto host 5433)                   |
| Cache/colas | Redis 7                                            |
| Auth        | JWT + RBAC (roles) + base para MFA                |
| API Docs    | OpenAPI / Swagger (`/api/docs`)                   |

```
Software Odontológico/
├── backend/          # API NestJS
├── frontend/         # SPA React
├── docker-compose.yml# PostgreSQL + Redis
├── req.md            # Especificación de requerimientos (SRS/BRD)
└── docs/             # Documentación técnica
```

## Puesta en marcha (desarrollo)

Requisitos: Node 20+, Docker, npm.

```bash
# 1. Levantar base de datos y cache
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run start:dev        # API en http://localhost:3000  (Swagger: /api/docs)

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev              # App en http://localhost:5173
```

## Trazabilidad de requerimientos

Los módulos del backend referencian los requerimientos del documento
(RF-xx, RNF-xx, RN-xx) en comentarios y nombres, para auditar cobertura.
