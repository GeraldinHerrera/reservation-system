# Plan de Ingeniería de Software: Sistema de Gestión de Reservas de Espacios Académicos

## 1. Análisis del problema

### Identificación de la problemática
Actualmente, el proceso de gestión de reservas de espacios académicos (laboratorios, auditorios y salas de cómputo) se ejecuta de forma descentralizada e informal mediante correos electrónicos y hojas de cálculo compartidas. Este esquema genera:
* **Conflictos de concurrencia:** Solapamiento de reservas en el mismo espacio y horario (doble reserva).
* **Falta de visibilidad:** Inexistencia de una vista centralizada del estado de disponibilidad en tiempo real.
* **Tiempos de respuesta elevados:** La confirmación de una solicitud depende de la revisión manual por parte del personal administrativo.
* **Inconsistencia de datos:** Pérdida de trazabilidad e historial de uso de los espacios académicos.

### Necesidades de la institución
1. Centralizar la recepción, procesamiento y almacenamiento de solicitudes de reserva.
2. Validar automáticamente la disponibilidad horaria para eliminar los conflictos de agenda.
3. Proporcionar visibilidad en tiempo real del estado de los espacios académicos.
4. Trazar el ciclo de vida completo de cada reserva (pendiente, aprobada, rechazada, cancelada).
5. Generar reportes básicos de ocupación para la toma de decisiones operativas.

### Actores involucrados
* **Estudiantes:** Consultan disponibilidad y solicitan reservas para eventos o actividades académicas.
* **Docentes / Investigadores:** Consultan disponibilidad, solicitan espacios prioritarios (laboratorios/aulas) y gestionan sus reservas activas.
* **Administradores del Sistema / Decanatura:** Aprueban o rechazan solicitudes, gestionan el catálogo de espacios (alta, baja, modificación, reglas de uso) y consultan métricas.

### Alcance y limitaciones del sistema
* **Alcance:**
  * Autenticación y autorización basada en roles (Estudiante, Docente, Administrador).
  * Gestión del catálogo de espacios académicos categorizados por tipo y capacidad.
  * Módulo de consulta de disponibilidad por rango de fecha/hora.
  * Módulo de solicitudes y motor de validación de conflictos.
  * Panel de administración para aprobación/rechazo de reservas.
* **Limitaciones (Fuera de alcance en la fase inicial):**
  * Integración con sistemas de control de acceso físico (cerraduras electrónicas/IoT).
  * Módulo de cobro o pagos por alquiler de espacios.
  * Sincronización bidireccional con calendarios externos (Google Calendar / Microsoft Outlook).

---

## 2. Propuesta de solución

### Descripción general
Se propone una aplicación web centralizada con arquitectura cliente-servidor que automatiza la validación de reglas de negocio para la reserva de espacios académicos. La solución garantizará consistencia operacional mediante transacciones atómicas que impidan el sobre-agendamiento.

### Funcionalidades prioritarias (MVP)
1. **Gestión de Espacios:** CRUD de laboratorios, auditorios y salas de cómputo con características y capacidad.
2. **Consulta de Disponibilidad:** Buscador en tiempo real por fecha, horario, tipo de espacio y capacidad.
3. **Reserva Directa / Solicitud:** Motor de validación horaria que bloquea solapamientos al momento del registro.
4. **Gestión de Solicitudes:** Flujo de aprobación para administradores.
5. **Historial y Estado:** Vista de solicitudes para el usuario con estados en tiempo real.

### Organización del sistema en módulos
* **Módulo de Autenticación y Usuarios:** Control de acceso, sesiones y roles.
* **Módulo de Catálogo y Espacios:** Registro de recursos y sus configuraciones de uso.
* **Módulo de Reservas y Agenda:** Motor de agendamiento y validación de solapamiento temporal.
* **Módulo de Administración y Aprobaciones:** Flujo de trabajo institucional para validar o rechazar reservas.

### Estrategia de desarrollo progresivo
Se utilizará un enfoque por incrementos funcionales (sprints cortos):
* **Incremento 1:** Núcleo de dominio, catálogo de espacios y autenticación básica.
* **Incremento 2:** Motor de reservas, validación de disponibilidad y registro de solicitudes.
* **Incremento 3:** Panel de administración, flujo de aprobación y notificaciones básicas.
* **Incremento 4:** Refinamiento de IU, pruebas integrales y optimización.

---

## 3. Decisiones de arquitectura y tecnología

### Arquitectura seleccionada y justificación
Se selecciona una **Arquitectura en Capas (Layered Architecture)** con separación estricta entre Frontend (Single Page Application) y Backend (RESTful API).
* **Justificación:** Permite aislar la lógica de negocio (validación de horarios) de la capa de presentación y la persistencia. Facilita la evolución técnica del backend sin afectar al cliente web, además de simplificar las pruebas unitarias e integrales del motor de validación.

```
+-------------------------------------------------------+
|                Capa de Presentación                   |
|                   (Frontend SPA)                      |
+-------------------------------------------------------+
                           |  HTTP / REST API (JSON)
+-------------------------------------------------------+
|                 Capa de API / Control                 |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|              Capa de Lógica de Negocio                |
|             (Validación de Solapamientos)             |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|               Capa de Persistencia / ORM              |
+-------------------------------------------------------+
                           |
+-------------------------------------------------------+
|                Base de Datos Relacional               |
+-------------------------------------------------------+
```

### Stack tecnológico propuesto
* **Frontend:** React + TypeScript + Tailwind CSS (Interfaz ágil, reactiva y tipado estático para prevenir errores).
* **Backend:** Node.js con Express o NestJS (TypeScript).
* **Persistencia:** PostgreSQL.
* **ORM:** Prisma o TypeORM.

### Estrategia de persistencia de datos
* **Base de datos relacional (PostgreSQL):** Ideal para garantizar integridad referencial y transaccionalidad estricta (ACID) al ejecutar la validación de solapamientos mediante transacciones con bloqueo optimista/pesimista.
* **Consultas de rango de tiempo:** Uso de índices sobre las columnas de fecha/hora inicio y fin (`start_time`, `end_time`) para optimizar el rendimiento del motor de disponibilidad.

### Comparación de decisiones técnicas vs. alternativas descartadas

| Decisión Seleccionada | Alternativas Descartadas | Justificación de la Elección |
| :--- | :--- | :--- |
| **BD Relacional (PostgreSQL)** | MongoDB (NoSQL) | Se requiere consistencia ACID estricta. Las bases NoSQL requieren lógica adicional a nivel de aplicación para garantizar que no existan dos registros con el mismo espacio y rango de tiempo en condiciones de concurrencia. |
| **TypeScript (Backend/Frontend)** | JavaScript (Vanilla) | TypeScript añade tipado estático en tiempo de compilación, reduciendo errores de tipo en la capa de transferencia de datos (DTOs) y mejorando la integración con herramientas de generación de código por IA. |
| **Arquitectura API RESTful** | Monolito tradicional (Server-Side Rendering) | Desacopla la interfaz de usuario de la lógica del servidor, permitiendo en el futuro agregar clientes móviles o integrar el sistema con otras plataformas universitarias mediante endpoints estándar. |

---

## 4. Estrategia de desarrollo

### Metodología de trabajo
Desarrollo guiado por especificaciones (Spec-Driven Development - SDD) integrado con iteraciones cortas de tipo Kanban/Scrum.

### Etapas de implementación
1. **Fase A - Especificación y Diseño:** Redacción de la arquitectura y definición formal con OpenSpec (OpenAPI/Markdown spec files).
2. **Fase B - Core y Persistencia:** Creación de esquemas de base de datos, migraciones y modelos del dominio.
3. **Fase C - API Backend y Reglas:** Implementación de endpoints y algoritmos de detección de solapamiento.
4. **Fase D - Frontend e Interacción:** Construcción de interfaces de usuario y conexión con la API.
5. **Fase E - QA y Verificación:** Ejecución de suite de pruebas, refactorización y despliegue local.

### Orden de desarrollo de funcionalidades y dependencias

```
[Autenticación & Usuarios] ──► [Gestión de Espacios] ──► [Motor de Disponibilidad]
                                                                  │
                                                                  ▼
[Aprobaciones / Admin] ◄── [Gestión de Solicitudes/Reservas] ◄────┘
```

1. Módulo de Autenticación y Autorización (Requisito base).
2. CRUD de Espacios Académicos (Depende de Autenticación).
3. Motor de Consulta de Disponibilidad (Depende de Espacios).
4. Motor de Creación y Validación de Reservas (Depende de Disponibilidad y Usuarios).
5. Panel de Aprobación Administrativa (Depende de Creación de Reservas).

### Criterios de aceptación para considerar terminada cada etapa (Definition of Done - DoD)
* Especificación en OpenSpec aprobada y sin ambigüedades.
* Código fuente implementado que cumple con la especificación.
* Pruebas unitarias de las reglas de negocio con cobertura mínima del 80%.
* Pruebas de integración de la API ejecutadas con éxito.
* Documentación técnica del código actualizada.

---

## 5. Estrategia de calidad

### Tipos de pruebas
* **Pruebas Unitarias:** Cobertura de las reglas de validación del motor de agendamiento (ej: verificar que el rango $[10:00 - 12:00]$ bloquee el rango $[11:00 - 13:00]$).
* **Pruebas de Integración:** Verificación de controladores HTTP, interacción con la base de datos y flujos del ORM.
* **Pruebas de Contrato:** Validación de que la respuesta de la API coincida exactamente con la especificación OpenSpec.
* **Pruebas End-to-End (E2E):** Automatización del flujo completo desde el cliente frontend para solicitar y aprobar una reserva.

### Matriz de riesgos y mitigación

| ID | Riesgo Identificado | Impacto | Probabilidad | Estrategia de Mitigación |
| :--- | :--- | :--- | :--- | :--- |
| **R01** | **Condiciones de carrera (Race conditions):** Dos usuarios reservan el mismo espacio al mismo segundo. | Alto | Media | Implementar transacciones de base de datos con nivel de aislamiento adecuado o restricciones explícitas (`EXCLUDE` constraints) a nivel BD. |
| **R02** | **Desalineación entre código generado por IA y la especificación:** Generación de código que no cumple OpenSpec. | Medio | Alta | Utilizar validadores automáticos de esquemas de OpenAPI y pruebas de contrato en el pipeline de CI/CD. |
| **R03** | **Complejidad en la interfaz de usuario para rangos de horarios:** Errores de formato al enviar la fecha/hora. | Medio | Media | Estandarizar la comunicación en UTC bajo el formato ISO-8601 y utilizar selectores de fecha/hora validados en el frontend. |
| **R04** | **Subestimación del tiempo de implementación:** Retrasos por complejidad en la lógica de negocio. | Alto | Media | Priorizar un MVP estricto y desacoplar funcionalidades opcionales (ej. notificaciones por email) del flujo principal. |
| **R05** | **Inconsistencia de permisos:** Un estudiante aprueba sus propias reservas o edita espacios. | Alto | Baja | Implementar pruebas de integración dedicadas a la verificación de Middleware de autorización por rol (RBAC). |

### Mecanismos de verificación de requisitos
* Lista de chequeo de especificaciones antes de codificar.
* Suite de pruebas automatizadas como puerta de enlace (Gatekeeper).
* Matriz de trazabilidad que vincule Requisito $\rightarrow$ OpenSpec $\rightarrow$ Código $\rightarrow$ Test.

---

## 6. Uso de SDD e Inteligencia Artificial

### Integración de OpenSpec
OpenSpec funcionará como la **única fuente de verdad** (*Single Source of Truth*) para el diseño funcional y técnico de la solución. Ninguna línea de código de negocio o controlador se escribirá antes de definir el archivo de especificación correspondiente en OpenSpec.

### Transformación del plan de ingeniería en especificaciones
1. A partir de los módulos definidos en la Sección 2, se redactarán especificaciones OpenSpec estructuradas por dominio.
2. Cada endpoint, DTO, regla de negocio y respuesta de error será declarada formalmente en la sintaxis de OpenSpec/OpenAPI.
3. Se definirán escenarios de prueba estilo Given-When-Then dentro de las especificaciones de negocio.

### Actividades delegadas a la Inteligencia Artificial
* Generación de código boilerplate (estructuras de controladores, rutas, modelos del ORM).
* Generación de suites de pruebas unitarias basadas en los criterios de las especificaciones OpenSpec.
* Creación de migraciones de base de datos a partir de modelos conceptuales.
* Redacción de documentación técnica interna y comentarios del código.

### Verificación del código generado por IA
* **Revisión Manual por el Estudiante:** Inspección estricta del código para garantizar el cumplimiento de patrones de diseño limpios y legibilidad.
* **Validación de Compilación y Tipado:** Verificación sin errores del compilador TypeScript.
* **Ejecución de Pruebas Automatizadas:** El código generado solo se aceptará si pasa las pruebas unitarias e integrales existentes.
* **Linters y Formateadores:** Aplicación automática de reglas de estilo mediante ESLint / Prettier.

### Decisiones responsabilidad del estudiante
El estudiante mantiene la responsabilidad humana exclusiva sobre:
* La toma de decisiones arquitectónicas y selección del stack tecnológico.
* La aprobación de las especificaciones funcionales y de negocio en OpenSpec.
* La revisión de seguridad, estrategia de persistencia y manejo de transacciones.
* La validación final de la trazabilidad y la aceptación de cada entregable.