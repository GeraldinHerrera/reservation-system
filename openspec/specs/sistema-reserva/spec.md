# Sistema de Gestión de Reservas de Espacios Académicos

## Purpose
Centralizar y administrar de manera confiable las reservas de espacios académicos (laboratorios, auditorios y salas de cómputo), validando automáticamente la disponibilidad horaria, previniendo reservas simultáneas y asegurando un flujo controlado de aprobaciones y trazabilidad histórica.

## Requirements

### Requirement: Gestión de Espacios Académicos
El sistema MUST permitir a los administradores registrar, listar, actualizar y deshabilitar lógicamente espacios académicos con un código único, nombre, capacidad, ubicación física y tipo (LABORATORIO, AUDITORIO, SALA_COMPUTO).

#### Scenario: Creación exitosa de espacio
- **WHEN** un administrador registra un nuevo espacio académico con código, nombre, capacidad y tipo válidos
- **THEN** el sistema guarda el espacio con estado activo en verdadero y responde con código HTTP 201

#### Scenario: Rechazo por código de espacio duplicado
- **WHEN** un administrador intenta registrar un espacio utilizando un código que ya existe en el sistema
- **THEN** el sistema rechaza la operación y responde con código HTTP 409 Conflicto

---

### Requirement: Registro y Administración de Usuarios
El sistema MUST gestionar la identidad de los usuarios mediante correo institucional, nombre completo, contraseña encriptada, rol asignado y estado activo de la cuenta.

#### Scenario: Registro exitoso de usuario institucional
- **WHEN** un usuario se registra con un dominio de correo institucional válido y una contraseña segura
- **THEN** el sistema almacena la cuenta, encripta la contraseña de forma segura y asigna por defecto el rol ESTUDIANTE

---

### Requirement: Control de Acceso Basado en Roles (RBAC)
El sistema MUST aplicar control de acceso basado en roles donde ESTUDIANTE y DOCENTE pueden solicitar y consultar sus reservas, y únicamente ADMIN puede gestionar espacios y aprobar o rechazar solicitudes de reserva.

#### Scenario: Intento de aprobación por rol no autorizado
- **WHEN** un usuario con rol ESTUDIANTE o DOCENTE intenta invocar el endpoint de aprobación de reservas
- **THEN** el sistema deniega la solicitud y responde con código HTTP 403 Prohibido

---

### Requirement: Creación de Solicitudes de Reserva
El sistema MUST permitir a los usuarios crear reservas especificando ID del espacio, fecha y hora de inicio, fecha y hora de fin y motivo académico, asegurando que la hora de inicio tenga al menos 2 horas de anticipación y que el estado inicial sea PENDIENTE.

#### Scenario: Solicitud con tiempo en el pasado o anticipación insuficiente
- **WHEN** un usuario envía una solicitud de reserva con hora de inicio en el pasado o con menos de 2 horas de anticipación respecto al momento actual
- **THEN** el sistema rechaza la solicitud y responde con código HTTP 422 Entidad No Procesable

---

### Requirement: Validación de Disponibilidad y Prevención de Solapamiento
El sistema MUST prevenir reservas simultáneas para el mismo espacio académico siempre que exista otra reserva en estado PENDIENTE o APROBADA en el mismo rango de tiempo, utilizando transacciones atómicas a nivel de base de datos.

#### Scenario: Detección y rechazo de solapamiento horario
- **WHEN** un usuario solicita una reserva para un espacio que se cruza en horario con una reserva existente en estado PENDIENTE o APROBADA para ese mismo espacio
- **THEN** el sistema rechaza la creación y responde con código HTTP 409 Conflicto

---

### Requirement: Aprobación y Rechazo de Solicitudes
El sistema MUST permitir a los administradores cambiar el estado de reservas de PENDIENTE a APROBADA o RECHAZADA, exigiendo un motivo de rechazo obligatorio al declinar una solicitud.

#### Scenario: Aprobación administrativa exitosa
- **WHEN** un administrador aprueba una reserva en estado PENDIENTE que no presenta conflictos de horario
- **THEN** el sistema actualiza el estado a APROBADA y registra el identificador del administrador evaluador

#### Scenario: Rechazo administrativo con motivo
- **WHEN** un administrador rechaza una reserva e ingresa el motivo correspondiente
- **THEN** el sistema cambia el estado a RECHAZADA y almacena la justificación del rechazo

---

### Requirement: Cancelación e Historial de Reservas
El sistema MUST permitir a los usuarios cancelar sus propias reservas activas siempre que se solicite con más de 1 hora de anticipación a la fecha de inicio, liberando inmediatamente el horario y preservando el registro en el historial.

#### Scenario: Cancelación exitosa y liberación horaria
- **WHEN** un usuario cancela su reserva con más de 1 hora de anticipación a la fecha y hora de inicio
- **THEN** el sistema actualiza el estado a CANCELADA y la franja horaria queda disponible inmediatamente para nuevas solicitudes