# Guía de demostración y defensa — SIGO-Dental

Autor: **Luis Anchundia**
Proyecto: Sistema Integral de Gestión Odontológica (SIGO-Dental)
Repositorio: https://github.com/LuisAnchundia/SIGO-Dental

Esta guía sirve para **presentar el proyecto en clase** y **responder la defensa**.
Está ordenada para que puedas seguirla en vivo, paso a paso.

---

## 1. Antes de empezar (arrancar el sistema)

Abre tres terminales en la carpeta del proyecto.

```bash
# 1) Base de datos y cache (Docker)
docker compose up -d
```
```bash
# 2) Backend (API NestJS)
cd backend
npm install        # solo la primera vez
npm run start:dev  # http://localhost:3000/api  ·  Swagger: /api/docs
```
```bash
# 3) Frontend (React)
cd frontend
npm install        # solo la primera vez
npm run dev        # http://localhost:5173
```

> Si una base de datos limpia hace falta: `cd backend && npx prisma migrate reset`
> (recrea las tablas y vuelve a cargar los datos de ejemplo).

**Usuarios de prueba** (contraseña `Admin123*`):

| Correo | Rol | Para mostrar |
|--------|-----|--------------|
| `admin@sigodental.com` | ADMIN_TI | Todo (ideal para la demo) |
| `odontologo@sigodental.com` | ODONTOLOGO | Parte clínica |
| `recepcion@sigodental.com` | RECEPCION | Agenda, caja, facturación |

**Dos pantallas clave para abrir en el navegador:**
- App: `http://localhost:5173`
- Documentación de la API (OpenAPI/Swagger): `http://localhost:3000/api/docs`

---

## 2. Qué es el proyecto (frase de apertura)

> "SIGO-Dental es un sistema web de gestión integral para clínicas odontológicas
> con expediente clínico digital. Cubre desde el agendamiento y la facturación
> hasta el odontograma interactivo, el periodontograma y la seguridad del
> expediente. Está construido como un **monolito modular** con **NestJS** en el
> backend, **React** en el frontend y **PostgreSQL** como base de datos."

---

## 3. Guion de demostración (en orden)

### Paso 1 — Login y panel (RNF-05)
1. Entra con `admin@sigodental.com`.
2. Muestra el **panel** con los contadores (pacientes, citas, alertas).
3. Menciona: autenticación **JWT**, roles (**RBAC**) y cierre de sesión por
   inactividad a los 15 minutos.

### Paso 2 — Pacientes y alerta médica (RF-01, RF-02)
1. Ve a **Pacientes**. Muestra la lista y la búsqueda.
2. Señala a **María González**: tiene el **badge rojo "⚠ ALERGIA A PENICILINA"**.
   Explica que el sistema calcula las alertas críticas a partir de la anamnesis
   y las muestra de forma visible en el expediente (RF-02).
3. Crea un paciente nuevo con "Nuevo paciente" (marca alguna alerta para que
   aparezca el badge).

### Paso 3 — Expediente clínico (Fase 2)
Entra al expediente de María (clic en su nombre). Tiene pestañas:

- **Odontograma (RF-03)** — la pieza estrella:
  - Elige una condición de la paleta (ej. **Caries**) y haz clic en una
    superficie de un diente: se pinta de rojo.
  - Cambia entre **FDI** y **Universal**, y entre **Permanente** y **Temporal**.
  - Elige **Exodoncia** y haz clic en un diente: aparece la **✕** sobre el diente.
  - Explica: marcado por superficies (mesial, distal, oclusal, vestibular,
    lingual) y catálogo de colores del documento.
- **Periodontograma (RF-04)** — sondaje de 6 sitios por diente, el punto rojo
  marca sangrado, y movilidad/furca por diente.
- **Notas SOEP (RF-05)** — crea una nota (Subjetivo/Objetivo/Evaluación/Plan).
  Explica que queda **firmada** y se **bloquea contra edición** pasado el plazo
  (24h), por inmutabilidad del historial (RN-01).
- **Consentimientos (RF-06)** — crea uno, **firma con el mouse en el recuadro**
  (firma biométrica) y guárdalo. Aparece como "Firmado" con la firma.
- **Presupuestos (RF-07, RF-08)** — arma un presupuesto con procedimientos del
  catálogo y usa **"Aprobar todo"**; el estado pasa a APROBADO_TOTAL.

### Paso 4 — Agenda y regla de sillón (RF-09, RF-10, RN-03)
1. Ve a **Agenda**. Crea una cita (paciente, odontólogo, sillón, horario).
2. **Demostración de RN-03**: intenta crear **otra cita en el mismo sillón, en
   un horario que se solape**. El sistema la **rechaza** con el mensaje
   "El sillón ya tiene una cita en ese horario (RN-03)".
3. Cambia el **estado** de una cita con el selector (Programado → Confirmado…).

### Paso 5 — Facturación e inventario (RF-12, RF-14)
1. Ve a **Facturación**. Elige paciente y odontólogo, **agrega el procedimiento
   "Restauración de amalgama"** del catálogo y **Emitir factura**.
2. Abre **Inventario** (o **Reportes**) y muestra que el stock de los insumos de
   ese procedimiento **bajó solo** (ej. anestesia, guantes, resina). Ese es el
   **descargo automático por receta de consumo** (RF-14).
3. Vuelve a **Facturación** y **registra un pago** (puedes elegir el método:
   efectivo, tarjeta, transferencia, seguro → pagos mixtos). El estado de la
   factura cambia a PAGADA/PARCIAL.

### Paso 6 — Cierre de caja ciego (RN-02)
1. Ve a **Caja**. **Abre caja** con un fondo inicial.
2. Ingresa el **conteo físico** y **Cierra caja**. Recién **después** del cierre
   se revela el **total teórico** y la **diferencia**. Explica que el cajero no
   puede ver el total esperado antes de contar (cierre ciego, RN-02).

### Paso 7 — Reportes (RF-13 y BI)
En **Reportes** muestra:
- **Corte de caja** (total recaudado por método de pago).
- **Liquidación de honorarios (RF-13)**: la Dra. Mera tiene 40% de comisión;
  sobre $80 facturados, su comisión es **$32**.
- **Inventario**: estado de stock y marca de "Reponer" si está bajo el mínimo.

### Paso 8 — Seguridad (RNF-05, RNF-06)
1. Ve a **Seguridad** → **Activar MFA**: aparece un **QR** para Google
   Authenticator. (Opcional: escanéalo, ingresa el código y actívalo; luego el
   login pedirá ese código de 6 dígitos.)
2. Menciona la **auditoría (RNF-06)**: cada escritura queda registrada con
   usuario, IP y fecha en un log inmutable.
3. Abre **Swagger** (`/api/docs`) para mostrar la documentación de la API.

---

## 4. Mapa de requerimientos → dónde se demuestra

| Requerimiento | Dónde se ve |
|---------------|-------------|
| RF-01 Registro de pacientes | Pacientes → Nuevo paciente |
| RF-02 Anamnesis y alertas | Badge rojo en el expediente |
| RF-03 Odontograma | Expediente → Odontograma |
| RF-04 Periodontograma | Expediente → Periodontograma |
| RF-05 Notas SOEP inmutables | Expediente → Notas SOEP |
| RF-06 Consentimiento + firma | Expediente → Consentimientos |
| RF-07 Presupuesto multinivel | Expediente → Presupuestos |
| RF-08 Aprobación de presupuesto | Presupuestos → Aprobar |
| RF-09 Agenda por sillón/profesional | Agenda |
| RF-10 Estados de cita | Agenda → selector de estado |
| RF-11 Notificaciones | *Integración externa (ver §6)* |
| RF-12 Facturación + pagos mixtos | Facturación |
| RF-13 Comisiones/honorarios | Reportes → Liquidación |
| RF-14 Descargo de insumos | Facturar → baja de stock |
| RNF-04 Cifrado TLS/AES | SECURITY.md (infra) |
| RNF-05 RBAC + MFA + timeout | Login, Seguridad, roles |
| RNF-06 Auditoría inmutable | Interceptor de auditoría |
| RNF-07 Responsive | Interfaz con Tailwind |
| RN-01 Historial inmutable | Notas SOEP bloqueadas |
| RN-02 Cierre de caja ciego | Caja |
| RN-03 No solapar sillón | Agenda (rechazo 409) |

---

## 5. Decisiones técnicas (para defender)

- **¿Por qué monolito modular y no microservicios?** El documento admite
  *"Microservicio / Modular"*. Para el alcance y el equipo, un monolito modular
  con NestJS da la misma separación por módulos sin la complejidad operativa de
  desplegar y coordinar muchos servicios. Está preparado para dividirse después.
- **¿Por qué NestJS?** Arquitectura modular, inyección de dependencias, guards
  para RBAC, y generación automática de **OpenAPI/Swagger** (criterio de
  aceptación del documento).
- **¿Por qué Prisma + PostgreSQL?** PostgreSQL por integridad transacional y
  tipos ricos (enums, arrays, JSON); Prisma por el esquema tipado, migraciones
  versionadas y seguridad ante inyección SQL.
- **¿Por qué React + Vite + Tailwind?** Ecosistema estándar, build rápido y UI
  responsive sin salir de clases de utilidad.
- **Seguridad**: JWT + RBAC, MFA (TOTP), bcrypt para contraseñas, helmet,
  rate limiting, validación estricta de entrada y log de auditoría.

---

## 6. Qué quedó fuera (y por qué)

Son **integraciones con servicios externos** que el propio documento ubica como
APIs a conectar; requieren cuentas y claves de terceros, por eso se dejan
preparadas pero no activadas:

- **RF-11 Notificaciones** WhatsApp/SMS/Email (Meta Cloud API / Twilio).
- **RF-12** Timbrado fiscal real del **SRI** y **pasarelas de pago**
  (Stripe/dLocal). La factura actual es un comprobante interno.
- **DICOM/PACS** (visor de radiografías) — el documento lo marca como Fase 2+.
- Los **RNF de rendimiento** (RNF-01 < 1.5s, RNF-02 uptime, RNF-03 150 usuarios
  concurrentes) son metas de operación/infraestructura, no funcionalidades;
  se validarían con pruebas de carga en el ambiente de producción.

---

## 7. Preguntas probables y respuestas

- **¿Cómo garantizas que no se borre el historial clínico (RN-01)?**
  Las notas SOEP se bloquean contra edición tras 24h y no se eliminan; las
  correcciones se hacen por adenda. Además, toda escritura queda en el log de
  auditoría inmutable.
- **¿Cómo evitas doble agenda en un sillón (RN-03)?**
  Al crear una cita, el backend busca solapamientos en el mismo sillón
  (intervalos que se cruzan) y rechaza con error 409 si existe conflicto.
- **¿Cómo funciona el descargo de insumos (RF-14)?**
  Cada procedimiento tiene una "receta de consumo" (qué insumos y cuánto). Al
  facturar un ítem ligado a un procedimiento, el sistema descuenta el stock y
  registra un movimiento de salida, todo dentro de una transacción.
- **¿Cómo proteges el acceso (RNF-05)?**
  JWT + control por roles; MFA con TOTP opcional/obligatorio; cierre por
  inactividad; contraseñas con bcrypt.
- **¿Qué pasa si la base de datos tiene otro puerto?**
  En este entorno PostgreSQL corre en el **puerto 5433** del host (el 5432 lo
  usa otro proyecto). Se configura en `backend/.env` (`DATABASE_URL`).
- **¿Está documentada la API?** Sí, OpenAPI/Swagger v3 en `/api/docs`.
- **¿Tiene pruebas?** Sí, pruebas unitarias de las reglas críticas
  (RN-03, RN-02, estado de factura, alertas). `npm test` en el backend.

---

## 8. Cierre sugerido

> "El sistema cubre las cuatro fases del documento: core administrativo y
> turnos, core clínico, finanzas con inventario y reportes, y seguridad con
> despliegue. Está versionado en GitHub y preparado para integrar los
> servicios externos (facturación fiscal, pagos y mensajería) cuando se
> dispongan las credenciales."
