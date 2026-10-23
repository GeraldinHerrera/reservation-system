# Informe Final de Ingeniería de Software: Sistema de Gestión de Reservas de Espacios Académicos

**Metodología:** Spec-Driven Development (SDD) con OpenSpec  
**Stack:** TypeScript, Node.js 22, Express, SQLite (
ode:sqlite), Jest, Supertest  
**Fecha:** Octubre de 2026  

---

## 1. Introducción y Contexto

El presente informe documenta el proceso de diseño, desarrollo, verificación y evolución del **Sistema de Gestión de Reservas de Espacios Académicos**. La problemática central abordada radicaba en la falta de un mecanismo automatizado y confiable para gestionar espacios compartidos (laboratorios, auditorios y salas de cómputo) en un entorno universitario, lo que generaba solapamientos de horarios, solicitudes fuera de tiempo y discrepancias operativas entre estudiantes, docentes y personal administrativo.

Para mitigar estos riesgos de calidad e ingeniería, el proyecto adoptó el paradigma **Spec-Driven Development (SDD)** mediante el estándar OpenSpec (openspec/specs/sistema-reserva/spec.md). Este enfoque sitúa la especificación formal y ejecutable como la **única fuente de verdad** (*Single Source of Truth*), rigiendo de forma directa la arquitectura, los modelos de dominio, las pruebas automatizadas y la implementación del frontend y backend.

---

## 2. Análisis de Resultados

### 2.1. Cumplimiento de Requerimientos Funcionales y de Dominio
El sistema implementó el 100% de los requerimientos formales definidos bajo terminología RFC 2119:

1. **Gestión de Espacios Académicos:**
   - Registro de espacios con código único alfanumérico, nombre, capacidad, ubicación física y tipo (LABORATORIO, AUDITORIO, SALA_COMPUTO).
   - Prevención de duplicados con código HTTP 409 (*Conflict*).
   - Borrado lógico (ctivo = false) que preserva la integridad referencial histórica de reservas pasadas.
2. **Autenticación y Control de Acceso Basado en Roles (RBAC):**
   - Registro de usuarios institucionales con hash unidireccional SHA-256 de contraseñas.
   - Restricción estricta de rutas administrativas (POST /api/spaces, DELETE /api/spaces/:id, PATCH /api/reservations/:id/approve, PATCH /api/reservations/:id/reject) exclusivamente para el rol ADMIN, respondiendo con HTTP 403 (*Forbidden*) si el solicitante carece de privilegios.
3. **Motor de Validación de Solicitudes de Reserva:**
   - **Anticipación mínima de 2 horas:** Rechazo automático (HTTP 422 *Unprocessable Entity*) de solicitudes en el pasado o con anticipación inferior a 120 minutos.
   - **Duración máxima de 4 horas consecutivas:** Validación estricta que rechaza reservas mayores a 240 minutos con HTTP 422 y acepta aquellas en el límite exacto de 4 horas o menores.
   - **Prevención de Solapamiento Temporal:** Comprobación algorítmica de intersección de intervalos [inicioNuevo, finNuevo) con [inicioExistente, finExistente) para reservas en estado PENDIENTE o APROBADA, respondiendo con HTTP 409 (*Conflict*).
4. **Ciclo de Vida y Flujo Administrativo:**
   - Aprobación de reservas con doble verificación de concurrencia.
   - Rechazo administrativo con motivo o justificación obligatoria.
   - Cancelación de reservas por parte del solicitante o administrador siempre que se realice con más de 1 hora de anticipación al inicio.

### 2.2. Cobertura de Pruebas y Aseguramiento de Calidad
Se implementó una estrategia integral de pruebas automatizadas con **Jest** y **Supertest**, alcanzando un resultado del 100% de satisfacción sin fallos ni regresiones:

* **Total de Pruebas Ejecutadas:** 78 pruebas passing.
* **Total de Suites de Pruebas:** 6 suites estructuradas:
  1. 	est/unit/sqlite.test.ts: Validación de persistencia relacional, restricciones de esquema y transacciones SQLite.
  2. 	est/unit/frontend.test.ts: Validación unitaria de cliente HTTP ApiClient, estados locales y cálculos matemáticos de anticipación y cancelación en interfaz.
  3. 	est/unit/duracion-reserva.test.ts: Pruebas específicas para el límite de 4 horas (rechazo de 4h 1min y 5h; aceptación de 4h exactas y 2h).
  4. 	est/unit/flujo-reservas.test.ts: Cobertura del núcleo de dominio OpenSpec, entidades y reglas de negocio.
  5. 	est/unit/services.test.ts: Pruebas de integración entre capas de servicio (SpacesService, AuthService, ReservationsService).
  6. 	est/integration/api.test.ts: Pruebas de integración HTTP de extremo a extremo evaluando códigos de respuesta (200, 201, 401, 403, 409, 422).

### 2.3. Experiencia de Usuario y Modernización de Frontend
Se entregó una Single Page Application (SPA) interactiva en public/index.html conectada a la API REST:
* **Autenticación como Primera Pantalla:** Los usuarios deben autenticarse o registrarse antes de interactuar con el sistema, eliminando cualquier simulación artificial de roles.
* **Menú Lateral (*Sidebar*):** Navegación ergonómica por pestañas con selector de tema, tarjeta de usuario y botón de cierre de sesión con ícono representativo.
* **Integración con SweetAlert2:** Reemplazo de alertas nativas por modales enriquecidos, incluyendo modal interactivo con validación de texto obligatorio para el motivo de rechazo administrativo.
* **Modo Oscuro / Modo Claro:** Variables CSS fluidas con persistencia de preferencia en localStorage.

---

## 3. Dificultades Encontradas y Soluciones Aplicadas

A lo largo del ciclo de vida del proyecto surgieron retos técnicos representativos:

### 3.1. Concurrencia y Bloqueos de Archivo en SQLite (
ode:sqlite)
* **Problema:** Durante la ejecución paralela de pruebas en Jest, múltiples hilos de prueba intentaban abrir y bloquear simultáneamente el archivo de base de datos en disco (data/sistema_reserva.sqlite), arrojando errores de tipo database is locked.
* **Solución Técnica:** Se implementó una separación estricta en src/server.ts y en las suites de prueba: cuando el entorno de ejecución es de prueba (NODE_ENV === 'test'), el sistema utiliza bases de datos SQLite en memoria (:memory:) o repositorios aislados, permitiendo que cada prueba se ejecute en milisegundos con aislamiento total y sin contención en el sistema de archivos del sistema operativo Windows.

### 3.2. Gestión Precisa de Rangos Temporales y Zonas Horarias
* **Problema:** El cálculo de anticipación (2 horas) y duración consecutiva (4 horas) presentaba susceptibilidad a desfases horarios locales si se manipulaban cadenas de texto sin normalizar.
* **Solución Técnica:** Se estandarizó el uso estricto de timestamps en milisegundos (getTime()) y formato ISO-8601 UTC en la capa de transporte (	oISOString()). Todas las validaciones aritméticas en src/modules/reservations/domain.ts operan directamente sobre marcas de tiempo epoch, eliminando ambigüedades originadas por zonas horarias o transiciones de horario de verano.

### 3.3. Trazabilidad Estricta de Errores Semánticos en HTTP
* **Problema:** En arquitecturas multicapa, los errores de validación interna a menudo terminan degradándose en errores genéricos 400 o 500, dificultando la retroalimentación precisa al usuario.
* **Solución Técnica:** Se diseñó una jerarquía formal de clases de excepción en src/shared/errors.ts (DomainValidationError con 422, ConflictError con 409, ForbiddenError con 403, UnauthorizedError con 401, NotFoundError con 404). Un middleware centralizado en Express intercepta estos errores y genera respuestas JSON predecibles y coherentes con la especificación.

---

## 4. Decisiones Técnicas Modificadas a lo Largo del Proyecto

El desarrollo ágil y orientado a especificaciones facilitó pivotar oportunamente cuando los requerimientos o necesidades de usabilidad evolucionaron:

| Decisión Inicial | Modificación Aplicada | Justificación Técnica |
| :--- | :--- | :--- |
| **Persistencia volátil en memoria (Map)** | **Base de Datos SQLite relacional (
ode:sqlite)** | Necesidad de garantizar persistencia duradera de datos en data/sistema_reserva.sqlite sin requerir la sobrecarga de instalar motores pesados externos como PostgreSQL en fases tempranas. |
| **Simulación de rol en selector frontend** | **Autenticación real con SHA-256 y sesiones** | Proporcionar una experiencia realista donde los permisos RBAC correspondan a credenciales auténticas y validadas por el backend. |
| **Duración de reserva sin límite explícito** | **Límite máximo estricto de 4 horas consecutivas** | Solicitud institucional formal incorporada mediante control de cambios (CAMBIO_REGLA_4H.md) para optimizar la equidad en el uso de los recursos académicos. |
| **Navegación horizontal y alertas nativas** | **Menú lateral (*Sidebar*), SweetAlert2 y Modo Oscuro** | Elevar los estándares estéticos, usabilidad en dispositivos de escritorio y ofrecer accesibilidad visual en entornos con poca luz. |
| **Ícono de salida genérico** | **Ícono SVG vectorial específico de puerta y flecha exterior** | Ajuste fino de diseño solicitado por el usuario para alinearse con la identidad gráfica requerida. |

---

## 5. Conclusiones sobre el Uso de Spec-Driven Development (SDD)

El desarrollo del Sistema de Reservas demostró las ventajas competitivas y de ingeniería que ofrece la metodología **Spec-Driven Development**:

1. **La Especificación como Única Fuente de Verdad:**
   El archivo spec.md redactado con sintaxis RFC 2119 eliminó cualquier ambigüedad en la interpretación de los requerimientos. Tanto el equipo backend como las suites de prueba conocían de antemano el comportamiento esperado ante cualquier combinación de entradas.
2. **Evolución Controlada y Gestión de Cambios:**
   Cuando surgió el nuevo requerimiento de *Ningún usuario podrá reservar un espacio académico durante más de cuatro horas consecutivas*, el ciclo SDD permitió:
   - Actualizar primero la especificación (spec.md).
   - Documentar el impacto técnico (docs/CAMBIO_REGLA_4H.md).
   - Escribir las pruebas que fallaban inicialmente (TDD).
   - Implementar la lógica en la capa de dominio (domain.ts) y servicios.
   - Validar que las 78 pruebas pasaran al 100% sin introducir regresiones en módulos preexistentes.
3. **Desacoplamiento Efectivo de Capas:**
   Separar la lógica de negocio pura (en domain.ts) de los adaptadores de infraestructura (servidores Express, clientes HTTP, controladores y base de datos) permitió probar exhaustivamente las reglas institucionales sin requerir levantar servicios externos ni simular complejas dependencias.
4. **Cultura de Verificación Continua:**
   La integración de pruebas unitarias y de integración como artefactos de primer nivel dentro del flujo de desarrollo asegura que futuras ampliaciones (como integración con calendarios o notificaciones por correo) puedan construirse con alta velocidad y bajo riesgo técnico.

---

*Informe elaborado en conformidad con las directrices de ingeniería y calidad de software del proyecto.*
