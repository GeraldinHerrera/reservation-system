import {
  SpacesService,
  AuthService,
  ReservationsService,
  TipoEspacio,
  RolUsuario,
  EstadoReserva,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  DomainValidationError,
  NotFoundError,
} from '../../src';

describe('Pruebas Unitarias de Servicios (SpacesService, AuthService, ReservationsService)', () => {
  let spacesService: SpacesService;
  let authService: AuthService;
  let reservationsService: ReservationsService;

  beforeEach(() => {
    spacesService = new SpacesService();
    authService = new AuthService();
    reservationsService = new ReservationsService(spacesService, authService);
  });

  describe('SpacesService - Gestión de Espacios Académicos', () => {
    test('Debe registrar un nuevo espacio académico con activo=true y valores válidos', () => {
      const espacio = spacesService.registrarEspacio({
        codigo: 'LAB-IA-01',
        nombre: 'Laboratorio de Inteligencia Artificial',
        capacidad: 25,
        ubicacion: 'Bloque A, Piso 2, Sala 204',
        tipo: TipoEspacio.LABORATORIO,
      });

      expect(espacio.id).toBeDefined();
      expect(espacio.codigo).toBe('LAB-IA-01');
      expect(espacio.nombre).toBe('Laboratorio de Inteligencia Artificial');
      expect(espacio.capacidad).toBe(25);
      expect(espacio.tipo).toBe(TipoEspacio.LABORATORIO);
      expect(espacio.activo).toBe(true);
    });

    test('Debe rechazar el registro con ConflictError (409) cuando el código ya existe', () => {
      spacesService.registrarEspacio({
        codigo: 'AUD-CENTRAL',
        nombre: 'Auditorio Central',
        capacidad: 150,
        ubicacion: 'Edificio de Eventos',
        tipo: TipoEspacio.AUDITORIO,
      });

      expect(() => {
        spacesService.registrarEspacio({
          codigo: 'aud-central', // Debe detectar duplicado sin importar mayúsculas
          nombre: 'Otro Auditorio',
          capacidad: 80,
          ubicacion: 'Edificio B',
          tipo: TipoEspacio.AUDITORIO,
        });
      }).toThrow(ConflictError);
    });

    test('Debe listar únicamente los espacios activos', () => {
      const e1 = spacesService.registrarEspacio({
        codigo: 'SAL-01',
        nombre: 'Sala Cómputo 1',
        capacidad: 30,
        ubicacion: 'Pabellón 1',
        tipo: TipoEspacio.SALA_COMPUTO,
      });

      const e2 = spacesService.registrarEspacio({
        codigo: 'SAL-02',
        nombre: 'Sala Cómputo 2',
        capacidad: 20,
        ubicacion: 'Pabellón 1',
        tipo: TipoEspacio.SALA_COMPUTO,
      });

      expect(spacesService.listarEspaciosActivos()).toHaveLength(2);

      // Deshabilitar lógicamente SAL-01
      spacesService.deshabilitarLogicamente(e1.id);

      const activos = spacesService.listarEspaciosActivos();
      expect(activos).toHaveLength(1);
      expect(activos[0].id).toBe(e2.id);
    });

    test('Debe realizar el borrado lógico actualizando activo a false', () => {
      const espacio = spacesService.registrarEspacio({
        codigo: 'AUD-02',
        nombre: 'Auditorio Menor',
        capacidad: 50,
        ubicacion: 'Pabellón Cultural',
        tipo: TipoEspacio.AUDITORIO,
      });

      const deshabilitado = spacesService.deshabilitarLogicamente(espacio.id);
      expect(deshabilitado.activo).toBe(false);

      const recuperado = spacesService.obtenerPorId(espacio.id);
      expect(recuperado.activo).toBe(false);
    });

    test('Debe actualizar los datos de un espacio', () => {
      const espacio = spacesService.registrarEspacio({
        codigo: 'LAB-QUIM',
        nombre: 'Lab Química',
        capacidad: 20,
        ubicacion: 'Edificio Q',
        tipo: TipoEspacio.LABORATORIO,
      });

      const actualizado = spacesService.actualizarEspacio(espacio.id, {
        nombre: 'Laboratorio de Química Avanzada',
        capacidad: 25,
      });

      expect(actualizado.nombre).toBe('Laboratorio de Química Avanzada');
      expect(actualizado.capacidad).toBe(25);
    });

    test('Debe lanzar NotFoundError al buscar o actualizar un espacio inexistente', () => {
      expect(() => {
        spacesService.obtenerPorId('id-inexistente');
      }).toThrow(NotFoundError);
    });
  });


  describe('AuthService - Registro, Login y Validación de Roles', () => {
    test('Debe registrar un usuario institucional con contraseña encriptada y rol ESTUDIANTE por defecto', () => {
      const usuario = authService.registrarUsuario({
        correoInstitucional: 'maria.gomez@universidad.edu.co',
        nombreCompleto: 'María Gómez',
        contrasena: 'claveSegura2026',
      });

      expect(usuario.id).toBeDefined();
      expect(usuario.correoInstitucional).toBe('maria.gomez@universidad.edu.co');
      expect(usuario.rol).toBe(RolUsuario.ESTUDIANTE);
      expect(usuario.activo).toBe(true);
      expect(usuario.contrasenaEncriptada).not.toBe('claveSegura2026');
      expect(usuario.contrasenaEncriptada).toHaveLength(64); // SHA-256 hex string
    });

    test('Debe rechazar correos no institucionales con DomainValidationError (422)', () => {
      expect(() => {
        authService.registrarUsuario({
          correoInstitucional: 'usuario@gmail.com',
          nombreCompleto: 'Usuario Externo',
          contrasena: 'password123',
        });
      }).toThrow(DomainValidationError);
    });

    test('Debe rechazar registro con correo duplicado con ConflictError (409)', () => {
      authService.registrarUsuario({
        correoInstitucional: 'docente.lopez@instituto.edu',
        nombreCompleto: 'Profesor López',
        contrasena: 'docenteClave1',
        rol: RolUsuario.DOCENTE,
      });

      expect(() => {
        authService.registrarUsuario({
          correoInstitucional: 'docente.lopez@instituto.edu',
          nombreCompleto: 'Profesor López Clon',
          contrasena: 'otraClave',
        });
      }).toThrow(ConflictError);
    });

    test('Debe permitir login con credenciales correctas y rechazar con credenciales incorrectas', () => {
      authService.registrarUsuario({
        correoInstitucional: 'admin.sistemas@campus.edu',
        nombreCompleto: 'Administrador Campus',
        contrasena: 'adminPass2026!',
        rol: RolUsuario.ADMIN,
      });

      // Login exitoso
      const sesion = authService.login('admin.sistemas@campus.edu', 'adminPass2026!');
      expect(sesion.token).toBeDefined();
      expect(sesion.usuario.nombreCompleto).toBe('Administrador Campus');

      // Login con contraseña incorrecta
      expect(() => {
        authService.login('admin.sistemas@campus.edu', 'contrasenaErronea');
      }).toThrow(UnauthorizedError);

      // Login con usuario inexistente
      expect(() => {
        authService.login('noexiste@campus.edu', 'clave');
      }).toThrow(UnauthorizedError);
    });

    test('Debe validar roles RBAC y denegar acceso no autorizado con ForbiddenError (403)', () => {
      const estudiante = authService.registrarUsuario({
        correoInstitucional: 'carlos@u.edu',
        nombreCompleto: 'Carlos Alumno',
        contrasena: 'estudiante123',
        rol: RolUsuario.ESTUDIANTE,
      });

      const admin = authService.registrarUsuario({
        correoInstitucional: 'jefe@u.edu',
        nombreCompleto: 'Jefe Admin',
        contrasena: 'adminMaster',
        rol: RolUsuario.ADMIN,
      });

      // Estudiante intentando acceder a operación exclusiva de ADMIN
      expect(() => {
        authService.validarRol(estudiante.id, [RolUsuario.ADMIN]);
      }).toThrow(ForbiddenError);

      // Admin accede exitosamente
      const validado = authService.validarRol(admin.id, [RolUsuario.ADMIN]);
      expect(validado.id).toBe(admin.id);
    });
  });

  describe('ReservationsService - Flujo Completo de Reservas y Reglas de Negocio', () => {
    let espacioId: string;
    let estudianteId: string;
    let docenteId: string;
    let adminId: string;
    const ahora = new Date('2026-11-01T08:00:00.000Z');

    beforeEach(() => {
      const esp = spacesService.registrarEspacio({
        codigo: 'LAB-COMP-101',
        nombre: 'Laboratorio de Cómputo 101',
        capacidad: 40,
        ubicacion: 'Edificio Central',
        tipo: TipoEspacio.SALA_COMPUTO,
      });
      espacioId = esp.id;

      const est = authService.registrarUsuario({
        correoInstitucional: 'estudiante@facultad.edu',
        nombreCompleto: 'Estudiante Prueba',
        contrasena: 'pass1234',
        rol: RolUsuario.ESTUDIANTE,
      });
      estudianteId = est.id;

      const doc = authService.registrarUsuario({
        correoInstitucional: 'docente@facultad.edu',
        nombreCompleto: 'Docente Prueba',
        contrasena: 'passDocente',
        rol: RolUsuario.DOCENTE,
      });
      docenteId = doc.id;

      const adm = authService.registrarUsuario({
        correoInstitucional: 'admin@facultad.edu',
        nombreCompleto: 'Administrador Decanatura',
        contrasena: 'passAdmin',
        rol: RolUsuario.ADMIN,
      });
      adminId = adm.id;
    });

    test('Debe crear una reserva en estado PENDIENTE con anticipación válida', () => {
      const inicio = new Date('2026-11-01T11:00:00.000Z'); // 3 horas después
      const fin = new Date('2026-11-01T13:00:00.000Z');

      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          motivoAcademico: 'Desarrollo de proyecto final de software',
        },
        ahora
      );

      expect(reserva.id).toBeDefined();
      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      expect(reserva.espacioId).toBe(espacioId);
      expect(reserva.usuarioId).toBe(estudianteId);
    });

    test('Debe rechazar la reserva si el espacio está deshabilitado lógicamente', () => {
      spacesService.deshabilitarLogicamente(espacioId);

      const inicio = new Date('2026-11-01T11:00:00.000Z');
      const fin = new Date('2026-11-01T13:00:00.000Z');

      expect(() => {
        reservationsService.crearSolicitud(
          {
            espacioId,
            usuarioId: estudianteId,
            fechaHoraInicio: inicio,
            fechaHoraFin: fin,
            motivoAcademico: 'Prueba espacio inactivo',
          },
          ahora
        );
      }).toThrow(DomainValidationError);
    });

    test('Debe prevenir reservas simultáneas para el mismo espacio (409 Conflict)', () => {
      // Primera reserva: [11:00 - 13:00]
      reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: new Date('2026-11-01T11:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T13:00:00.000Z'),
          motivoAcademico: 'Taller 1',
        },
        ahora
      );

      // Intento de segunda reserva solapada: [12:00 - 14:00]
      expect(() => {
        reservationsService.crearSolicitud(
          {
            espacioId,
            usuarioId: docenteId,
            fechaHoraInicio: new Date('2026-11-01T12:00:00.000Z'),
            fechaHoraFin: new Date('2026-11-01T14:00:00.000Z'),
            motivoAcademico: 'Taller 2 solapado',
          },
          ahora
        );
      }).toThrow(ConflictError);
    });

    test('Debe listar reservas filtradas por usuario y por espacio', () => {
      reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: new Date('2026-11-01T11:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T12:00:00.000Z'),
          motivoAcademico: 'Reserva Estudiante',
        },
        ahora
      );

      reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: docenteId,
          fechaHoraInicio: new Date('2026-11-01T14:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T16:00:00.000Z'),
          motivoAcademico: 'Reserva Docente',
        },
        ahora
      );

      const reservasEstudiante = reservationsService.listarPorUsuario(estudianteId);
      expect(reservasEstudiante).toHaveLength(1);
      expect(reservasEstudiante[0].usuarioId).toBe(estudianteId);

      const reservasEspacio = reservationsService.listarPorEspacio(espacioId);
      expect(reservasEspacio).toHaveLength(2);
    });

    test('Flujo de Aprobación: Administrador aprueba reserva exitosamente', () => {
      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: new Date('2026-11-01T11:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T13:00:00.000Z'),
          motivoAcademico: 'Examen extraordinario',
        },
        ahora
      );

      const aprobada = reservationsService.aprobar(reserva.id, adminId, ahora);
      expect(aprobada.estado).toBe(EstadoReserva.APROBADA);
      expect(aprobada.evaluadorId).toBe(adminId);
    });

    test('Flujo de Aprobación: Usuario con rol no autorizado es denegado con ForbiddenError (403)', () => {
      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: new Date('2026-11-01T11:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T13:00:00.000Z'),
          motivoAcademico: 'Examen extraordinario',
        },
        ahora
      );

      // Estudiante o docente intenta aprobar
      expect(() => {
        reservationsService.aprobar(reserva.id, estudianteId, ahora);
      }).toThrow(ForbiddenError);

      expect(() => {
        reservationsService.aprobar(reserva.id, docenteId, ahora);
      }).toThrow(ForbiddenError);
    });

    test('Flujo de Rechazo: Administrador rechaza con motivo obligatorio', () => {
      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: new Date('2026-11-01T11:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T13:00:00.000Z'),
          motivoAcademico: 'Actividad extracurricular',
        },
        ahora
      );

      const rechazada = reservationsService.rechazar(
        reserva.id,
        adminId,
        'Espacio asignado a mantenimiento de cableado estructurado',
        ahora
      );

      expect(rechazada.estado).toBe(EstadoReserva.RECHAZADA);
      expect(rechazada.evaluadorId).toBe(adminId);
      expect(rechazada.motivoRechazo).toBe(
        'Espacio asignado a mantenimiento de cableado estructurado'
      );
    });

    test('Flujo de Rechazo: Falla si el motivo está vacío', () => {
      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: new Date('2026-11-01T11:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T13:00:00.000Z'),
          motivoAcademico: 'Actividad extracurricular',
        },
        ahora
      );

      expect(() => {
        reservationsService.rechazar(reserva.id, adminId, '   ', ahora);
      }).toThrow(DomainValidationError);
    });

    test('Flujo de Cancelación: Cancelación exitosa por el propietario con > 1 hora y liberación de horario', () => {
      const inicio = new Date('2026-11-01T12:00:00.000Z');
      const fin = new Date('2026-11-01T14:00:00.000Z');

      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          motivoAcademico: 'Clase cancelada por el profesor',
        },
        ahora
      );

      // Cancelar a las 09:00 (3 horas antes de las 12:00)
      const momentoCancelacion = new Date('2026-11-01T09:00:00.000Z');
      const cancelada = reservationsService.cancelar(reserva.id, estudianteId, momentoCancelacion);

      expect(cancelada.estado).toBe(EstadoReserva.CANCELADA);

      // Verificar que el horario queda disponible inmediatamente para otra solicitud
      const nuevaReserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: docenteId,
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          motivoAcademico: 'Reserva en horario liberado',
        },
        momentoCancelacion
      );

      expect(nuevaReserva.estado).toBe(EstadoReserva.PENDIENTE);
    });

    test('Flujo de Cancelación: Falla si otro usuario que no es admin intenta cancelar', () => {
      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: new Date('2026-11-01T12:00:00.000Z'),
          fechaHoraFin: new Date('2026-11-01T14:00:00.000Z'),
          motivoAcademico: 'Evento estudiantil',
        },
        ahora
      );

      // Docente no es dueño ni admin de esta reserva
      expect(() => {
        reservationsService.cancelar(reserva.id, docenteId, ahora);
      }).toThrow(ForbiddenError);
    });

    test('Flujo de Cancelación: Falla si se intenta cancelar con menos de 1 hora de anticipación', () => {
      const inicio = new Date('2026-11-01T12:00:00.000Z');
      const fin = new Date('2026-11-01T14:00:00.000Z');

      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: inicio,
          fechaHoraFin: fin,
          motivoAcademico: 'Evento estudiantil',
        },
        ahora
      );

      // Cancelar a las 11:15 (a solo 45 minutos del inicio)
      const momentoTardio = new Date('2026-11-01T11:15:00.000Z');
      expect(() => {
        reservationsService.cancelar(reserva.id, estudianteId, momentoTardio);
      }).toThrow(DomainValidationError);
    });
  });
});
