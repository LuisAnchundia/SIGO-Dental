# Seguridad y cumplimiento — SIGO-Dental

Resumen de los controles implementados frente a los requerimientos no
funcionales del documento (sección 5) y OWASP Top 10.

## Autenticación y autorización (RNF-05)

- **JWT** con expiración configurable (`JWT_EXPIRES_IN`, por defecto 8h).
- **RBAC**: control de acceso por rol con `@Roles()` + `RolesGuard`, bajo el
  principio de menor privilegio (cada endpoint declara los roles permitidos).
- **MFA (TOTP)** obligatorio cuando el usuario lo activa: el login exige el
  código de 6 dígitos de una app de autenticación. Endpoints
  `/auth/mfa/setup`, `/auth/mfa/verify`, `/auth/mfa/disable`.
- **Cierre de sesión por inactividad** (15 min) en el cliente.
- La validez del usuario se revalida contra la base de datos en cada petición
  (un usuario desactivado pierde acceso de inmediato).

## Trazabilidad y auditoría (RNF-06)

- **Log inmutable de auditoría**: un interceptor global registra cada acción de
  escritura (CREATE/UPDATE/DELETE) con usuario, recurso, `entityId`, IP de
  origen y timestamp ISO-8601 en la tabla `audit_logs`. Los registros no se
  editan ni se borran.

## Protección de datos (RNF-04)

- **En tránsito**: TLS 1.3 se termina en el balanceador / reverse proxy
  delante del stack (ver `docker-compose.prod.yml` y `frontend/nginx.conf`).
- **En reposo**: el cifrado AES-256 se habilita a nivel de volumen/instancia
  gestionada de PostgreSQL y del almacenamiento de objetos del proveedor.
- Las contraseñas se almacenan con **bcrypt** (nunca en texto plano).

## Endurecimiento HTTP (OWASP)

- **helmet**: cabeceras de seguridad (HSTS, X-Content-Type-Options,
  X-Frame-Options, etc.).
- **Rate limiting** (`@nestjs/throttler`): 200 solicitudes/min por IP, mitiga
  fuerza bruta y abuso.
- **Validación de entrada** estricta con `class-validator` y `ValidationPipe`
  (`whitelist` + `forbidNonWhitelisted`), que descarta campos no esperados.
- **CORS** restringido al origen del frontend.
- **ORM parametrizado** (Prisma): evita inyección SQL.

## Reglas de negocio con impacto en integridad

- **RN-01**: el historial clínico es inmutable; las notas SOEP se bloquean
  contra edición tras un plazo configurable (24h).
- **RN-02**: cierre de caja ciego (el conteo físico se ingresa antes de ver el
  total teórico).

## Pruebas (criterio de aceptación 8.2)

- Pruebas unitarias de las reglas críticas: RN-03 (solape de citas), RN-02
  (cierre de caja), estado de factura y timbrado (RF-12), alertas médicas
  (RF-02) y procesamiento de recordatorios (RF-11). 12 pruebas.
- Ejecución: `npm test` (backend). Cobertura: `npm run test:cov`.

## Análisis de dependencias (SAST de dependencias)

- **Frontend: 0 vulnerabilidades** (`npm audit`).
- **Backend runtime: sin vulnerabilidades.** Las 3 advertencias "high" que
  reporta `npm audit` provienen únicamente de `@prisma/config`, dependencia del
  **CLI de Prisma** (`prisma`), que es `devDependency` y se usa solo para
  migraciones; **no forma parte del runtime** (`@prisma/client`) ni de la imagen
  de producción. Resolverlas exige subir a Prisma 8 (cambio mayor), por lo que
  se documenta como riesgo aceptado de tooling de desarrollo.

## Documentación de API

- **OpenAPI / Swagger v3** disponible en `/api/docs`.
