import {
  crearReserva,
  DomainValidationError,
  EstadoReserva,
} from '../../src/modules/reservations/domain';
import { ReservationsService } from '../../src/modules/reservations/reservations.service';
import { SpacesService } from '../../src/modules/spaces/spaces.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { TipoEspacio } from '../../src/modules/spaces/types';
import { RolUsuario } from '../../src/modules/auth/types';

describe('Regla de Negocio: Duración máxima de 4 horas consecutivas en Reservas', () => {
  const ahora = new Date('2026-11-01T10:00:00.000Z');
  // Anticipación válida: inicio a las 12:00:00 (exactamente 2 horas después de 'ahora')
  const inicioValido = new Date('2026-11-01T12:00:00.000Z');

  describe('Lógica de Dominio (crearReserva)', () => {
    test('Rechazo de solicitud con duración de 4 horas y 1 minuto (241 minutos) con error HTTP 422', () => {
      const fin4h1m = new Date('2026-11-01T16:01:00.000Z'); // 4h 1min

      try {
        crearReserva(
          {
            espacioId: 'esp-01',
            usuarioId: 'usr-01',
            fechaHoraInicio: inicioValido,
            fechaHoraFin: fin4h1m,
            motivoAcademico: 'Taller extendido que excede el límite permitido',
          },
          [],
          ahora
        );
        throw new Error('Debería haber lanzado excepción');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainValidationError);
        expect(err.statusCode).toBe(422);
        expect(err.message).toMatch(/4 horas/i);
      }
    });

    test('Rechazo de solicitud con duración de 5 horas con error HTTP 422', () => {
      const fin5h = new Date('2026-11-01T17:00:00.000Z'); // 5 horas

      try {
        crearReserva(
          {
            espacioId: 'esp-01',
            usuarioId: 'usr-01',
            fechaHoraInicio: inicioValido,
            fechaHoraFin: fin5h,
            motivoAcademico: 'Evento prolongado de 5 horas',
          },
          [],
          ahora
        );
        throw new Error('Debería haber lanzado excepción');
      } catch (err: any) {
        expect(err).toBeInstanceOf(DomainValidationError);
        expect(err.statusCode).toBe(422);
        expect(err.message).toMatch(/4 horas/i);
      }
    });

    test('Aceptación de solicitud con duración exacta de 4 horas (240 minutos) en estado PENDIENTE', () => {
      const fin4hExactas = new Date('2026-11-01T16:00:00.000Z'); // Exactamente 240 minutos

      const reserva = crearReserva(
        {
          espacioId: 'esp-01',
          usuarioId: 'usr-01',
          fechaHoraInicio: inicioValido,
          fechaHoraFin: fin4hExactas,
          motivoAcademico: 'Jornada académica de 4 horas completas',
        },
        [],
        ahora,
        () => 'res-exact-4h'
      );

      expect(reserva.id).toBe('res-exact-4h');
      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      const duracionMinutos =
        (reserva.fechaHoraFin.getTime() - reserva.fechaHoraInicio.getTime()) / (1000 * 60);
      expect(duracionMinutos).toBe(240);
    });

    test('Aceptación de solicitud con duración menor (ej. 2 horas) en estado PENDIENTE', () => {
      const fin2h = new Date('2026-11-01T14:00:00.000Z'); // 2 horas (120 minutos)

      const reserva = crearReserva(
        {
          espacioId: 'esp-01',
          usuarioId: 'usr-01',
          fechaHoraInicio: inicioValido,
          fechaHoraFin: fin2h,
          motivoAcademico: 'Clase estándar de 2 horas',
        },
        [],
        ahora,
        () => 'res-2h'
      );

      expect(reserva.id).toBe('res-2h');
      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      const duracionMinutos =
        (reserva.fechaHoraFin.getTime() - reserva.fechaHoraInicio.getTime()) / (1000 * 60);
      expect(duracionMinutos).toBe(120);
    });
  });

  describe('Capa de Servicio (ReservationsService)', () => {
    let spacesService: SpacesService;
    let authService: AuthService;
    let reservationsService: ReservationsService;
    let espacioId: string;
    let estudianteId: string;

    beforeEach(() => {
      spacesService = new SpacesService();
      authService = new AuthService();
      reservationsService = new ReservationsService(spacesService, authService);

      const espacio = spacesService.registrarEspacio({
        codigo: 'AUD-CENTRAL',
        nombre: 'Auditorio Central',
        capacidad: 100,
        ubicacion: 'Edificio de Biblioteca',
        tipo: TipoEspacio.AUDITORIO,
      });
      espacioId = espacio.id;

      const estudiante = authService.registrarUsuario({
        correoInstitucional: 'carlos.mora@universidad.edu.co',
        nombreCompleto: 'Carlos Mora',
        contrasena: 'claveSegura123',
        rol: RolUsuario.ESTUDIANTE,
      });
      estudianteId = estudiante.id;
    });

    test('El servicio rechaza solicitud de 4h 1min con DomainValidationError (422)', () => {
      const fin4h1m = new Date('2026-11-01T16:01:00.000Z');

      expect(() => {
        reservationsService.crearSolicitud(
          {
            espacioId,
            usuarioId: estudianteId,
            fechaHoraInicio: inicioValido,
            fechaHoraFin: fin4h1m,
            motivoAcademico: 'Conferencia de 4 horas y 1 minuto',
          },
          ahora
        );
      }).toThrow(DomainValidationError);
    });

    test('El servicio acepta solicitud de 4 horas exactas (240 minutos) en estado PENDIENTE', () => {
      const fin4h = new Date('2026-11-01T16:00:00.000Z');

      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: inicioValido,
          fechaHoraFin: fin4h,
          motivoAcademico: 'Seminario de 4 horas exactas',
        },
        ahora
      );

      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      const minutos =
        (reserva.fechaHoraFin.getTime() - reserva.fechaHoraInicio.getTime()) / (1000 * 60);
      expect(minutos).toBe(240);
    });

    test('El servicio acepta solicitud de duración menor (2 horas) en estado PENDIENTE', () => {
      const fin2h = new Date('2026-11-01T14:00:00.000Z');

      const reserva = reservationsService.crearSolicitud(
        {
          espacioId,
          usuarioId: estudianteId,
          fechaHoraInicio: inicioValido,
          fechaHoraFin: fin2h,
          motivoAcademico: 'Taller de 2 horas',
        },
        ahora
      );

      expect(reserva.estado).toBe(EstadoReserva.PENDIENTE);
      const minutos =
        (reserva.fechaHoraFin.getTime() - reserva.fechaHoraInicio.getTime()) / (1000 * 60);
      expect(minutos).toBe(120);
    });
  });
});
