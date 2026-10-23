# Sistema de Gestión de Reservas de Espacios Académicos

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Native_Node22-blue.svg)](https://nodejs.org/api/sqlite.html)
[![Jest](https://img.shields.io/badge/Jest-29.x-red.svg)](https://jestjs.io/)
[![OpenSpec](https://img.shields.io/badge/Spec--Driven-OpenSpec-orange.svg)](openspec/specs/sistema-reserva/spec.md)

Solución integral desarrollada bajo la metodología **Spec-Driven Development (SDD)** para la administración, control y agendamiento de espacios académicos (Laboratorios, Auditorios y Salas de Cómputo) en instituciones de educación superior.

El sistema previene solapamientos de reservas, valida reglas de negocio institucionales, implementa control de acceso basado en roles (RBAC), provee persistencia relacional con SQLite y ofrece una interfaz web moderna, responsiva y accesible.

---

## Características Principales

* **Gestión de Espacios Académicos:** Registro con código institucional único, capacidad, ubicación física, tipo (LABORATORIO, AUDITORIO, SALA_COMPUTO) y borrado lógico.
* **Control de Acceso y Autenticación Real:**
  * Registro de usuarios institucionales con contraseña cifrada (SHA-256).
  * Control de acceso basado en roles (ESTUDIANTE, DOCENTE, ADMIN).
  * Sin simulación: autenticación real con almacenamiento de sesión local.
* **Motor de Validación de Reservas:**
  * **Anticipación mínima de 2 horas:** Ninguna reserva puede solicitarse en el pasado ni con menos de 2 horas de anticipación.
  * **Duración máxima de 4 horas consecutivas:** Las solicitudes no pueden exceder 240 minutos (HTTP 422).
  * **Prevención de Solapamiento:** Rechazo automático (HTTP 409) si el espacio ya cuenta con una reserva en estado PENDIENTE o APROBADA en el mismo intervalo temporal.
* **Flujo Administrativo de Aprobaciones:**
  * Bandeja de evaluación exclusiva para el rol ADMIN.
  * Aprobación con verificación final de conflictos.
  * Rechazo con motivo obligatorio y justificado.
* **Cancelación de Reservas:**
  * Permitida únicamente con más de 1 hora de anticipación a la hora de inicio.
* **Interfaz de Usuario Moderna:**
  * Primera pantalla de inicio de sesión y registro institucional elegante.
  * Menú lateral de navegación (*Sidebar*) intuitivo con íconos dinámicos.
  * Diálogos y notificaciones interactivos con **SweetAlert2**.
  * Soporte completo de temas **Modo Oscuro** y **Modo Claro** persistido en el navegador.

---

## Requisitos Previos

* **Node.js:** Versión 22.x o superior (se utiliza el módulo nativo 
ode:sqlite).
* **npm:** Versión 10.x o superior.
* Navegador web moderno (Chrome, Edge, Firefox, Safari).

---

## Instalación y Configuración

### 1. Clonar o ingresar al directorio del proyecto

`ash
cd sistema-reserva
`

### 2. Instalar dependencias

`ash
npm install
`

### 3. Base de Datos SQLite

La base de datos se inicializa automáticamente al arrancar la aplicación en la ruta:
data/sistema_reserva.sqlite

Si se desea sembrar datos de prueba iniciales (usuarios, espacios y reservas de demostración), se ejecutan automáticamente al iniciar o manualmente con:
`ash
npx ts-node src/seed.ts
`

---

## Compilación y Ejecución

### Modo Producción / Estándar

1. **Compilar TypeScript:**
   `ash
   npm run build
   `
2. **Iniciar Servidor:**
   `ash
   npm start
   `

3. **Compilar e Iniciar en un solo comando:**
   `ash
   npm run build:start
   `

El servidor estará disponible en:
* **Aplicación Web:** http://localhost:3000
* **API REST Base:** http://localhost:3000/api

---

## Cuentas de Acceso de Demostración

El sistema incluye las siguientes cuentas institucionales preconfiguradas para pruebas inmediatas:

| Rol | Nombre Completo | Correo Institucional | Contraseña |
| :--- | :--- | :--- | :--- |
| **ESTUDIANTE** | Carlos Mendoza | carlos.mendoza@universidad.edu.co | Estudiante123! |
| **DOCENTE** | Dra. Laura Sánchez | laura.sanchez@universidad.edu.co | Docente123! |
| **ADMIN** | Ing. Roberto Silva | oberto.silva@universidad.edu.co | Admin123! |

*(En la pantalla de login también puedes hacer clic en los botones de acceso rápido para iniciar sesión instantáneamente).*

---

## Ejecución de Pruebas

El proyecto cuenta con **78 pruebas automatizadas** divididas en 6 suites (unitarias y de integración) ejecutadas con **Jest** y **Supertest**:

`ash
# Ejecutar todas las pruebas
npm test

# Ejecutar con reporte de cobertura de código
npm run test:coverage

# Ejecutar chequeo de tipos de TypeScript sin compilar
npm run typecheck
`

### Suites de Pruebas Incluidas:
1. 	est/unit/sqlite.test.ts: Pruebas de persistencia y operaciones CRUD sobre SQLite.
2. 	est/unit/frontend.test.ts: Pruebas unitarias de la capa de cliente ApiClient y reglas de interfaz.
3. 	est/unit/duracion-reserva.test.ts: Validación exhaustiva del límite de 4 horas consecutivas (rechazo con 4h 1min y 5h, aceptación con 4h y 2h).
4. 	est/unit/flujo-reservas.test.ts: Pruebas de dominio OpenSpec para modelos, anticipación >= 2h, solapamiento y ciclo de aprobación/cancelación.
5. 	est/unit/services.test.ts: Pruebas de integración de servicios (SpacesService, AuthService, ReservationsService).
6. 	est/integration/api.test.ts: Pruebas de integración HTTP sobre los endpoints Express con Supertest.

---

## Endpoints de la API REST

Todos los endpoints que requieren rol institucional esperan la cabecera x-user-id: <ID_USUARIO> o sesión activa.

### Autenticación (/api/auth)
* POST /api/auth/register: Registro de usuario institucional (correoInstitucional, 
ombreCompleto, contrasena, ol).
* POST /api/auth/login: Autenticación y obtención de perfil institucional (correoInstitucional, contrasena).

### Espacios Académicos (/api/spaces)
* GET /api/spaces: Listar espacios académicos activos.
* POST /api/spaces: Registrar nuevo espacio académico (*Requiere rol ADMIN*).
* DELETE /api/spaces/:id: Borrado lógico del espacio (*Requiere rol ADMIN*).

### Reservas (/api/reservations)
* GET /api/reservations: Listar reservas (permite filtros ?usuarioId=... o ?espacioId=...).
* POST /api/reservations: Crear solicitud de reserva (*Valida >= 2h de anticipación, <= 4h de duración y sin solapamiento*).
* PATCH /api/reservations/:id/approve: Aprobar reserva (*Requiere rol ADMIN*).
* PATCH /api/reservations/:id/reject: Rechazar reserva con motivo obligatorio (*Requiere rol ADMIN*).
* PATCH /api/reservations/:id/cancel: Cancelar reserva (*Requiere ser el propietario o ADMIN con > 1h de anticipación*).

---

## Estructura del Proyecto

`	ext
sistema-reserva/
├── data/
│   └── sistema_reserva.sqlite      # Base de datos relacional SQLite
├── docs/
│   ├── PLAN_INGENIERIA.md          # Plan arquitectónico y requerimientos
│   ├── CAMBIO_REGLA_4H.md          # Gestión de cambios de la regla de 4 horas
│   └── TASKLIST.md                 # Trazabilidad de tareas del proyecto
├── openspec/
│   └── specs/sistema-reserva/
│       └── spec.md                 # Especificación ejecutable OpenSpec (RFC 2119)
├── public/
│   └── index.html                  # Frontend interactivo SPA (Sidebar, Dark/Light, Swal)
├── src/
│   ├── frontend/                   # Componentes React y cliente API tipado
│   ├── modules/
│   │   ├── auth/                   # Tipos, servicio y controlador de autenticación
│   │   ├── spaces/                 # Tipos, servicio y controlador de espacios
│   │   └── reservations/           # Dominio, tipos, servicio y controlador de reservas
│   ├── shared/
│   │   ├── database/sqlite.ts      # Conexión y repositorio SQLite nativo
│   │   ├── errors.ts               # Jerarquía de errores de dominio (401, 403, 409, 422)
│   │   └── middleware/             # Middlewares de Express (Auth, ErrorHandler)
│   ├── seed.ts                     # Datos de prueba para la base de datos
│   └── server.ts                   # Servidor Express y configuración HTTP
├── test/
│   ├── integration/api.test.ts     # Pruebas HTTP completas con Supertest
│   └── unit/                       # Pruebas unitarias de dominio, SQLite y servicios
├── INFORME_FINAL.md                # Informe final de ingeniería y análisis SDD
├── README.md                       # Documentación técnica general
└── package.json
`

---

## Licencia

Proyecto desarrollado bajo fines académicos e institucionales conforme al estándar de ingeniería de software Spec-Driven Development (SDD).
