import {
  TipoEspacio,
  EspacioAcademico,
  RolUsuario,
  Usuario,
  EstadoReserva,
  Reserva,
  crearReserva,
  verificarSolapamiento,
  aprobarReserva,
  rechazarReserva,
  cancelarReserva,
  DomainValidationError,
  ConflictError,
} from '../../src';

describe('Flujo de Reservas y Modelos de Datos (OpenSpec Validation)', () => {
  const baseDate = new Date('2026-11-01T10:00:00.000Z');

  describe('Modelos y Enums de Datos', () => {
    test('verificarSolapamiento debe identificar correctamente intersecciones temporales', () => {
      const existente = {
        fechaHoraInicio: new Date('2026-11-01T14:00:00.000Z'),
        fechaHoraFin: new Date('2026-11-01T16:00:00.000Z'),
        estado: EstadoReserva.APROBADA,
      };

      // Intervalo solapado
      expect(
        verificarSolapamiento(
          new Date('2026-11-01T15:00:00.000Z'),
          new Date('2026-11-01T17:00:00.000Z'),
          existente
        )
      ).toBe(true);

      // Intervalo no solapado
      expect(
        verificarSolapamiento(
          new Date('2026-11-01T16:00:00.000Z'),
          new Date('2026-11-01T18:00:00.000Z'),
          existente
        )
      ).toBe(false);
    });

    test('Entidad EspacioAcademico debe contener todos los campos requeridos y usar TipoEspacio', () => {
      const espacio: EspacioAcademico = {
        id: 'esp-1',
        codigo: 'LAB-REDES-01',
        nombre: 'Laboratorio de Redes y Telecomunicaciones',
        capacidad: 30,
        ubicacion: 'Edificio de Ingeniería, Piso 3, Aula 302',
        tipo: TipoEspacio.LABORATORIO,
        activo: true,
        createdAt: baseDate,
        updatedAt: baseDate,
      };

      expect(espacio.id).toBe('esp-1');
      expect(espacio.codigo).toBe('LAB-REDES-01');
      expect(espacio.nombre).toBe('Laboratorio de Redes y Telecomunicaciones');
      expect(espacio.capacidad).toBe(30);
      expect(espacio.ubicacion).toBe('Edificio de Ingeniería, Piso 3, Aula 302');
      expect(espacio.tipo).toBe(TipoEspacio.LABORATORIO);
      expect(espacio.activo).toBe(true);

      // Verificación exhaustiva de valores del enum TipoEspacio
      expect(Object.values(TipoEspacio)).toEqual(
        expect.arrayContaining(['LABORATORIO', 'AUDITORIO', 'SALA_COMPUTO'])
      );
    });

    test('Entidad Usuario debe contener todos los campos requeridos y usar RolUsuario', () => {
      const usuario: Usuario = {
        id: 'usr-1',
        correoInstitucional: 'juan.perez@universidad.edu.co',
        nombreCompleto: 'Juan Pérez',
        contrasenaEncriptada: '$2b$10$hashedPasswordSample123',
        rol: RolUsuario.ESTUDIANTE,
        activo: true,
        createdAt: baseDate,
        updatedAt: baseDate,
      };

      expect(usuario.id).toBe('usr-1');
      expect(usuario.correoInstitucional).toBe('juan.perez@universidad.edu.co');
      expect(usuario.nombreCompleto).toBe('Juan Pérez');
      expect(usuario.contrasenaEncriptada).toBe('$2b$10$hashedPasswordSample123');
      expect(usuario.rol).toBe(RolUsuario.ESTUDIANTE);
      expect(usuario.activo).toBe(true);

      // Verificación exhaustiva de valores del enum RolUsuario
      expect(Object.values(RolUsuario)).toEqual(
        expect.arrayContaining(['ESTUDIANTE', 'DOCENTE', 'ADMIN'])
      );
    });

    test('Entidad Reserva debe contener todos los campos requeridos y usar EstadoReserva', () => {
      const inicio = new Date('2026-11-01T14:00:00.000Z');
      const fin = new Date('2026-11-01T16:00:00.000Z');

      const reserva: Reserva = {
        id: 'res-1',
        espacioId: 'esp-1',
        usuarioId: 'usr-1',
        fechaHoraInicio: inicio,
        fechaHoraFin: fin,
        motivoAcademico: 'Sustentación de Proyecto de Grado',
        estado: EstadoReserva.PENDIENTE,
        createdAt: baseDate,
        updatedAt: baseDate,
      };

      expect(reserva.id).toBe('res-1');
      expect(reserva.espacioId).toBe('esp-1');
      expect(reserva.usuarioId).toBe('usr-1');
      expect(reserva.fechaHoraInicio).toBe(inicio);
      expect(reserva.fechaHoraFin).toBe(fin);
      expect(reserva.motivoAcademico).toBe('Sustentación de Proyecto de Grado');
      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);

      // Verificación exhaustiva de valores del enum EstadoReserva
      expect(Object.values(EstadoReserva)).toEqual(
        expect.arrayContaining(['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA'])
      );
    });
  });

  describe('Requisito: Creación de Solicitudes de Reserva', () => {
    test('Debe crear una reserva con estado inicial PENDIENTE cuando se cumple la anticipación >= 2 horas', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicio = new Date('2026-11-01T12:00:00.000Z'); // Exactamente 2 horas después
      const fin = new Date('2026-11-01T14:00:00.000Z');

      const reserva = crearReserva(
        {
          espacioId: 'esp-1',
          usuarioId: 'usr-1',
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          motivoAcademico: 'Taller de Algoritmos Paralelos',
        },
        [],
        ahora,
        () => 'res-test-123'
      );

      expect(reserva.id).toBe('res-test-123');
      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      expect(reserva.espacioId).toBe('esp-1');
      expect(reserva.usuarioId).toBe('usr-1');
      expect(reserva.fechaHoraInicio).toEqual(inicio);
      expect(reserva.fechaHoraFin).toEqual(fin);
    });

    test('Debe rechazar la reserva con código 422 si la hora de inicio tiene menos de 2 horas de anticipación', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicio = new Date('2026-11-01T11:59:00.000Z'); // 1 hora y 59 minutos
      const fin = new Date('2026-11-01T13:00:00.000Z');

      expect(() => {
        crearReserva(
          {
            espacioId: 'esp-1',
            usuarioId: 'usr-1',
            fechaHoraInicio: inicio,
            fechaHoraFin: fin,
            motivoAcademico: 'Reunión de última hora',
          },
          [],
          ahora
        );
      }).toThrow(DomainValidationError);
    });

    test('Debe rechazar la reserva con código 422 si la hora de inicio está en el pasado', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicioEnPasado = new Date('2026-11-01T09:00:00.000Z');
      const fin = new Date('2026-11-01T11:00:00.000Z');

      expect(() => {
        crearReserva(
          {
            espacioId: 'esp-1',
            usuarioId: 'usr-1',
            fechaHoraInicio: inicioEnPasado,
            fechaHoraFin: fin,
            motivoAcademico: 'Prueba en el pasado',
          },
          [],
          ahora
        );
      }).toThrow(DomainValidationError);
    });

    test('Debe rechazar si la fecha de fin es anterior o igual a la de inicio', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicio = new Date('2026-11-01T14:00:00.000Z');
      const finInvalido = new Date('2026-11-01T13:00:00.000Z');

      expect(() => {
        crearReserva(
          {
            espacioId: 'esp-1',
            usuarioId: 'usr-1',
            fechaHoraInicio: inicio,
            fechaHoraFin: finInvalido,
            motivoAcademico: 'Horario invertido',
          },
          [],
          ahora
        );
      }).toThrow(DomainValidationError);
    });

    test('Debe rechazar la reserva con código 422 si la duración es de 4 horas y 1 minuto (241 minutos)', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicio = new Date('2026-11-01T12:00:00.000Z'); // 2 horas de anticipación
      const fin = new Date('2026-11-01T16:01:00.000Z'); // 4 horas y 1 minuto

      try {
        crearReserva(
          {
            espacioId: 'esp-1',
            usuarioId: 'usr-1',
            fechaHoraInicio: inicio,
            fechaHoraFin: fin,
            motivoAcademico: 'Taller extendido 4 horas y 1 minuto',
          },
          [],
          ahora
        );
        throw new Error('Debería haber lanzado error de validación de duración');
      } catch (error: any) {
        expect(error).toBeInstanceOf(DomainValidationError);
        expect(error.statusCode).toBe(422);
        expect(error.message).toContain('4 horas');
      }
    });

    test('Debe rechazar la reserva con código 422 si la duración es de 5 horas', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicio = new Date('2026-11-01T12:00:00.000Z');
      const fin = new Date('2026-11-01T17:00:00.000Z'); // 5 horas consecutivas

      try {
        crearReserva(
          {
            espacioId: 'esp-1',
            usuarioId: 'usr-1',
            fechaHoraInicio: inicio,
            fechaHoraFin: fin,
            motivoAcademico: 'Maratón académica de 5 horas',
          },
          [],
          ahora
        );
        throw new Error('Debería haber lanzado error de validación de duración');
      } catch (error: any) {
        expect(error).toBeInstanceOf(DomainValidationError);
        expect(error.statusCode).toBe(422);
        expect(error.message).toContain('4 horas');
      }
    });

    test('Debe aceptar la solicitud con duración exacta de 4 horas (240 minutos) en estado PENDIENTE', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicio = new Date('2026-11-01T12:00:00.000Z');
      const fin = new Date('2026-11-01T16:00:00.000Z'); // Exactamente 4 horas (240 minutos)

      const reserva = crearReserva(
        {
          espacioId: 'esp-1',
          usuarioId: 'usr-1',
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          motivoAcademico: 'Seminario de 4 horas exactas',
        },
        [],
        ahora,
        () => 'res-limite-4h'
      );

      expect(reserva.id).toBe('res-limite-4h');
      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      expect(reserva.fechaHoraInicio).toEqual(inicio);
      expect(reserva.fechaHoraFin).toEqual(fin);
      const duracionMinutos = (reserva.fechaHoraFin.getTime() - reserva.fechaHoraInicio.getTime()) / (1000 * 60);
      expect(duracionMinutos).toBe(240);
    });

    test('Debe aceptar la solicitud con duración menor a 4 horas (ej. 2 horas) en estado PENDIENTE', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicio = new Date('2026-11-01T12:00:00.000Z');
      const fin = new Date('2026-11-01T14:00:00.000Z'); // 2 horas (120 minutos)

      const reserva = crearReserva(
        {
          espacioId: 'esp-1',
          usuarioId: 'usr-1',
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          motivoAcademico: 'Clase de 2 horas',
        },
        [],
        ahora,
        () => 'res-2h-valida'
      );

      expect(reserva.id).toBe('res-2h-valida');
      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      const duracionMinutos = (reserva.fechaHoraFin.getTime() - reserva.fechaHoraInicio.getTime()) / (1000 * 60);
      expect(duracionMinutos).toBe(120);
    });
  });

  describe('Requisito: Prevención de Solapamiento Horario', () => {
    const ahora = new Date('2026-11-01T08:00:00.000Z');
    const reservaExistente: Reserva = {
      id: 'res-existente',
      espacioId: 'esp-1',
      usuarioId: 'usr-docente-1',
      fechaHoraInicio: new Date('2026-11-01T14:00:00.000Z'),
      fechaHoraFin: new Date('2026-11-01T16:00:00.000Z'),
      motivoAcademico: 'Clase Magistral',
      estado: EstadoReserva.APROBADA,
    };

    test('Debe rechazar con ConflictError (409) si se solapa con una reserva APROBADA', () => {
      expect(() => {
        crearReserva(
          {
            espacioId: 'esp-1',
            usuarioId: 'usr-2',
            fechaHoraInicio: new Date('2026-11-01T15:00:00.000Z'), // Se cruza [15:00 - 17:00] con [14:00 - 16:00]
            fechaHoraFin: new Date('2026-11-01T17:00:00.000Z'),
            motivoAcademico: 'Estudio en grupo',
          },
          [reservaExistente],
          ahora
        );
      }).toThrow(ConflictError);
    });

    test('Debe rechazar con ConflictError (409) si se solapa con una reserva PENDIENTE', () => {
      const reservaPendiente: Reserva = {
        ...reservaExistente,
        id: 'res-pendiente',
        estado: EstadoReserva.PENDIENTE,
      };

      expect(() => {
        crearReserva(
          {
            espacioId: 'esp-1',
            usuarioId: 'usr-2',
            fechaHoraInicio: new Date('2026-11-01T13:30:00.000Z'),
            fechaHoraFin: new Date('2026-11-01T14:30:00.000Z'),
            motivoAcademico: 'Práctica libre',
          },
          [reservaPendiente],
          ahora
        );
      }).toThrow(ConflictError);
    });

    test('Permite la creación si la reserva existente está CANCELADA o RECHAZADA', () => {
      const reservaCancelada: Reserva = {
        ...reservaExistente,
        id: 'res-cancelada',
        estado: EstadoReserva.CANCELADA,
      };

      const reservaCreada = crearReserva(
        {
          espacioId: 'esp-1',
          usuarioId: 'usr-3',
          fechaHoraInicio: new Date('2026-11-01T14:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T16:00:00.000Z'),
          motivoAcademico: 'Toma del horario liberado',
        },
        [reservaCancelada],
        ahora
      );

      expect(reservaCreada.estado).toBe(EstadoReserva.PENDIENTE);
    });

    test('Permite la creación si los rangos son contiguos pero no se solapan', () => {
      // Justo antes [12:00 - 14:00] de [14:00 - 16:00]
      const reservaAntes = crearReserva(
        {
          espacioId: 'esp-1',
          usuarioId: 'usr-4',
          fechaHoraInicio: new Date('2026-11-01T12:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T14:00:00.000Z'),
          motivoAcademico: 'Laboratorio previo',
        },
        [reservaExistente],
        ahora
      );
      expect(reservaAntes.estado).toBe(EstadoReserva.PENDIENTE);

      // Justo después [16:00 - 18:00] de [14:00 - 16:00]
      const reservaDespues = crearReserva(
        {
          espacioId: 'esp-1',
          usuarioId: 'usr-5',
          fechaHoraInicio: new Date('2026-11-01T16:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T18:00:00.000Z'),
          motivoAcademico: 'Laboratorio posterior',
        },
        [reservaExistente],
        ahora
      );
      expect(reservaDespues.estado).toBe(EstadoReserva.PENDIENTE);
    });
  });

  describe('Requisito: Aprobación y Rechazo de Solicitudes', () => {
    const reservaPendiente: Reserva = {
      id: 'res-evaluar',
      espacioId: 'esp-1',
      usuarioId: 'usr-1',
      fechaHoraInicio: new Date('2026-11-01T14:00:00.000Z'),
      fechaHoraFin: new Date('2026-11-01T16:00:00.000Z'),
      motivoAcademico: 'Conferencia de Seguridad',
      estado: EstadoReserva.PENDIENTE,
    };

    test('Un administrador aprueba una solicitud PENDIENTE y se registra evaluadorId', () => {
      const aprobada = aprobarReserva(reservaPendiente, 'admin-01');

      expect(aprobada.estado).toBe(EstadoReserva.APROBADA);
      expect(aprobada.evaluadorId).toBe('admin-01');
    });

    test('Un administrador rechaza una solicitud con motivo justificado obligatorio', () => {
      const rechazada = rechazarReserva(
        reservaPendiente,
        'admin-01',
        'Mantenimiento preventivo programado para esa sala'
      );

      expect(rechazada.estado).toBe(EstadoReserva.RECHAZADA);
      expect(rechazada.evaluadorId).toBe('admin-01');
      expect(rechazada.motivoRechazo).toBe('Mantenimiento preventivo programado para esa sala');
    });

    test('Debe fallar el rechazo si no se proporciona un motivo', () => {
      expect(() => {
        rechazarReserva(reservaPendiente, 'admin-01', '');
      }).toThrow(DomainValidationError);
    });
  });

  describe('Requisito: Cancelación e Historial de Reservas', () => {
    test('Permite cancelar si se solicita con más de 1 hora de anticipación', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const reserva: Reserva = {
        id: 'res-cancelar',
        espacioId: 'esp-1',
        usuarioId: 'usr-1',
        fechaHoraInicio: new Date('2026-11-01T12:00:00.000Z'), // 2 horas antes
        fechaHoraFin: new Date('2026-11-01T14:00:00.000Z'),
        motivoAcademico: 'Clase cancelada por fuerza mayor',
        estado: EstadoReserva.APROBADA,
      };

      const cancelada = cancelarReserva(reserva, ahora);
      expect(cancelada.estado).toBe(EstadoReserva.CANCELADA);
    });

    test('Falla la cancelación si falta 1 hora o menos para el inicio', () => {
      const ahora = new Date('2026-11-01T11:30:00.000Z');
      const reserva: Reserva = {
        id: 'res-cancelar-tarde',
        espacioId: 'esp-1',
        usuarioId: 'usr-1',
        fechaHoraInicio: new Date('2026-11-01T12:00:00.000Z'), // solo 30 minutos antes
        fechaHoraFin: new Date('2026-11-01T14:00:00.000Z'),
        motivoAcademico: 'Imprevisto',
        estado: EstadoReserva.APROBADA,
      };

      expect(() => {
        cancelarReserva(reserva, ahora);
      }).toThrow(DomainValidationError);
    });
  });
});
