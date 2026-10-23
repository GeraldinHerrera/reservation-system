# Documento de Gestión de Cambios: Regla de Duración Máxima (4 Horas)

## 1. Descripción de la Solicitud
La institución solicita que ningún usuario pueda reservar un espacio académico durante más de cuatro horas consecutivas (240 minutos).

## 2. Análisis de Impacto
* **Impacto en el Plan de Ingeniería (`PLAN_INGENIERIA.md`):**
  * La arquitectura en capas se mantiene idéntica.
  * No altera la persistencia ni el esquema de la base de datos (no se requieren nuevas tablas ni campos; la validación se calcula con la diferencia entre `fechaHoraFin` y `fechaHoraInicio`).
* **Impacto en la Especificación (`openspec`):**
  * Se debe agregar una nueva restricción al módulo `Creación de Solicitudes de Reserva`.
  * Se deben agregar dos escenarios de aceptación: uno que rechace solicitudes mayores a 4 horas y otro que acepte solicitudes de hasta 4 horas exactas.
* **Impacto en el Código Fuente:**
  * Capa de dominio: función de validación de reserva en `src/modules/reservations/domain.ts` (o servicio equivalente).
  * Controlador/API: mapear el nuevo caso de error para devolver código HTTP 422.
* **Impacto en Pruebas:**
  * Crear pruebas unitarias que verifiquen el límite estricto de 4 horas (240 minutos).
  * Ejecutar suite completa para asegurar no regresión.