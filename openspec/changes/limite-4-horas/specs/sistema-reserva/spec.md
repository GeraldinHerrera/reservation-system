# Delta: Límite de 4 Horas Consecutivas para Reservas

## MODIFIED Requirements

### Requirement: Creación de Solicitudes de Reserva
El sistema MUST permitir a los usuarios crear reservas especificando ID del espacio, fecha y hora de inicio, fecha y hora de fin y motivo académico, asegurando que la hora de inicio tenga al menos 2 horas de anticipación, que la duración no exceda las 4 horas consecutivas y que el estado inicial sea PENDIENTE.

#### Scenario: Solicitud con tiempo en el pasado o anticipación insuficiente
- **WHEN** un usuario envía una solicitud de reserva con hora de inicio en el pasado o con menos de 2 horas de anticipación respecto al momento actual
- **THEN** el sistema rechaza la solicitud y responde con código HTTP 422 Entidad No Procesable

#### Scenario: Rechazo por duración superior a 4 horas consecutivas
- **WHEN** un usuario solicita una reserva cuya duración entre fecha y hora de inicio y fecha y hora de fin sea mayor a 4 horas consecutivas (más de 240 minutos)
- **THEN** el sistema rechaza la solicitud y responde con código HTTP 422 Entidad No Procesable con mensaje indicando que excede el límite máximo de 4 horas

#### Scenario: Aceptación en el límite de 4 horas consecutivas
- **WHEN** un usuario solicita una reserva cuya duración sea exactamente igual o menor a 4 horas consecutivas (hasta 240 minutos) con anticipación válida
- **THEN** el sistema acepta la solicitud y la registra en estado PENDIENTE