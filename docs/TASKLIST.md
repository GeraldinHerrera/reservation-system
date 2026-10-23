# Lista de Tareas de Implementación (Fase 2)

## 1. Verificación de Consistencia
* [x] Tipos de datos en `specs/system-spec.md` coinciden con los modelos relacionales de `PLAN_INGENIERIA.md`.
* [x] Zona horaria estandarizada a UTC (ISO 8601) para evitar discrepancias de cálculo.
* [x] Matriz RBAC alineada con los actores definidos: Estudiante, Docente y Administrador.
* [x] Estrategia de concurrencia definida con transacciones serializables en PostgreSQL.

## 2. Plan de Tareas de Implementación
* [ ] **Tarea 1 (Infraestructura y Persistencia):**
  * Configurar proyecto, TypeScript, ORM (Prisma/TypeORM) y migración inicial de entidades: `Usuario`, `Espacio`, `Reserva`.
* [ ] **Tarea 2 (Autenticación y RBAC):**
  * Implementar registro, login, hashing de contraseñas y middleware de verificación de roles (`SPEC-USR-02`, `SPEC-SEC-03`).
* [ ] **Tarea 3 (Catálogo de Espacios):**
  * Implementar endpoints CRUD y borrado lógico para espacios (`SPEC-ESP-01`).
* [ ] **Tarea 4 (Motor de Reservas y Disponibilidad):**
  * Implementar algoritmo de detección de solapamiento horario y control de concurrencia (`SPEC-RES-04`, `SPEC-ENG-05`).
* [ ] **Tarea 5 (Flujo de Aprobación y Cancelación):**
  * Implementar endpoints para aprobar, rechazar y cancelar reservas (`SPEC-ADM-07`, `SPEC-HST-08`).
* [ ] **Tarea 6 (Suite de Pruebas Automatizadas):**
  * Implementar pruebas unitarias y de integración que verifiquen los escenarios Given-When-Then.