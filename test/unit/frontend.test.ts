import { ApiClient, ApiError } from '../../src/frontend/services/apiClient';
import { EstadoReserva, Reserva } from '../../src/modules/reservations/types';

describe('Pruebas Unitarias del Frontend (ApiClient y Validaciones de Interfaz)', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('/api');
  });

  describe('ApiClient - Gestión de Estado y Cabeceras', () => {
    test('Debe configurar y retornar el usuario activo actual en x-user-id', () => {
      expect(client.getUserId()).toBeNull();

      client.setUserId('usr-estudiante-123');
      expect(client.getUserId()).toBe('usr-estudiante-123');

      client.setUserId(null);
      expect(client.getUserId()).toBeNull();
    });

    test('ApiError debe almacenar correctamente el mensaje, código de estado y tipo de error', () => {
      const error = new ApiError('Conflicto de solapamiento', 409, 'ConflictError');
      expect(error.message).toBe('Conflicto de solapamiento');
      expect(error.statusCode).toBe(409);
      expect(error.errorType).toBe('ConflictError');
    });
  });

  describe('Lógica de Validación de Reglas en Interfaz de Usuario', () => {
    test('Cálculo de anticipación >= 2 horas debe ser válido para el formulario', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicioValido = new Date('2026-11-01T12:05:00.000Z'); // 2 horas y 5 minutos después

      const diffHoras = (inicioValido.getTime() - ahora.getTime()) / (1000 * 60 * 60);
      expect(diffHoras).toBeGreaterThanOrEqual(2);
    });

    test('Cálculo de anticipación < 2 horas debe ser inválido para el formulario', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const inicioInvalido = new Date('2026-11-01T11:45:00.000Z'); // 1 hora y 45 minutos

      const diffHoras = (inicioInvalido.getTime() - ahora.getTime()) / (1000 * 60 * 60);
      expect(diffHoras).toBeLessThan(2);
    });

    test('Regla de cancelación en MisReservas: permitida con > 1 hora de anticipación', () => {
      const ahora = new Date('2026-11-01T10:00:00.000Z');
      const reserva: Reserva = {
        id: 'res-test',
        espacioId: 'esp-1',
        usuarioId: 'usr-1',
        fechaHoraInicio: new Date('2026-11-01T12:00:00.000Z'), // 2 horas antes
        fechaHoraFin: new Date('2026-11-01T14:00:00.000Z'),
        motivoAcademico: 'Prueba',
        estado: EstadoReserva.APROBADA,
      };

      const tiempoRestanteMs = new Date(reserva.fechaHoraInicio).getTime() - ahora.getTime();
      const unaHoraEnMs = 60 * 60 * 1000;
      const puedeCancelar = tiempoRestanteMs > unaHoraEnMs;

      expect(puedeCancelar).toBe(true);
    });

    test('Regla de cancelación en MisReservas: denegada si falta 1 hora o menos', () => {
      const ahora = new Date('2026-11-01T11:15:00.000Z'); // faltan solo 45 min
      const reserva: Reserva = {
        id: 'res-test',
        espacioId: 'esp-1',
        usuarioId: 'usr-1',
        fechaHoraInicio: new Date('2026-11-01T12:00:00.000Z'),
        fechaHoraFin: new Date('2026-11-01T14:00:00.000Z'),
        motivoAcademico: 'Prueba',
        estado: EstadoReserva.APROBADA,
      };

      const tiempoRestanteMs = new Date(reserva.fechaHoraInicio).getTime() - ahora.getTime();
      const unaHoraEnMs = 60 * 60 * 1000;
      const puedeCancelar = tiempoRestanteMs > unaHoraEnMs;

      expect(puedeCancelar).toBe(false);
    });
  });
});
