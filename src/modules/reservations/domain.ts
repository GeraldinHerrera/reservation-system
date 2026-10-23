import { EstadoReserva, Reserva, CrearReservaDTO } from './types';

import { DomainValidationError, ConflictError } from '../../shared/errors';
export { DomainValidationError, ConflictError };


/**
 * Valida si un nuevo rango de fechas se solapa con una reserva existente.
 * Se considera conflicto únicamente si la reserva existente está PENDIENTE o APROBADA.
 */
export function verificarSolapamiento(
  inicioNuevo: Date,
  finNuevo: Date,
  reservaExistente: Pick<Reserva, 'fechaHoraInicio' | 'fechaHoraFin' | 'estado'>
): boolean {
  if (
    reservaExistente.estado !== EstadoReserva.PENDIENTE &&
    reservaExistente.estado !== EstadoReserva.APROBADA
  ) {
    return false;
  }

  // Comprueba si los intervalos de tiempo se intersecan: [inicioNuevo, finNuevo) con [inicioExistente, finExistente)
  return (
    inicioNuevo.getTime() < reservaExistente.fechaHoraFin.getTime() &&
    finNuevo.getTime() > reservaExistente.fechaHoraInicio.getTime()
  );
}

/**
 * Valida y crea una nueva instancia de Reserva en estado PENDIENTE.
 * Regla: La hora de inicio debe tener al menos 2 horas de anticipación respecto al momento actual.
 */
export function crearReserva(
  dto: CrearReservaDTO,
  reservasExistentesDelEspacio: Reserva[] = [],
  ahora: Date = new Date(),
  generarId: () => string = () => `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
): Reserva {

  if (dto.fechaHoraFin.getTime() <= dto.fechaHoraInicio.getTime()) {
    throw new DomainValidationError('La fecha de fin debe ser posterior a la fecha de inicio.', 422);
  }

  const dosHorasEnMs = 2 * 60 * 60 * 1000;
  const anticipacionMs = dto.fechaHoraInicio.getTime() - ahora.getTime();

  if (anticipacionMs < dosHorasEnMs) {
    throw new DomainValidationError(
      'La solicitud de reserva debe realizarse con al menos 2 horas de anticipación.',
      422
    );
  }

  // Validar solapamiento con reservas activas (PENDIENTE o APROBADA) en el mismo espacio
  const tieneSolapamiento = reservasExistentesDelEspacio.some((existente) =>
    verificarSolapamiento(dto.fechaHoraInicio, dto.fechaHoraFin, existente)
  );

  if (tieneSolapamiento) {
    throw new ConflictError(
      'El espacio académico ya cuenta con una reserva en ese horario.',
      409
    );
  }

  return {
    id: generarId(),
    espacioId: dto.espacioId,
    usuarioId: dto.usuarioId,
    fechaHoraInicio: dto.fechaHoraInicio,
    fechaHoraFin: dto.fechaHoraFin,
    motivoAcademico: dto.motivoAcademico,
    estado: EstadoReserva.PENDIENTE,
    createdAt: ahora,
    updatedAt: ahora,
  };
}

/**
 * Aprueba una reserva pendiente registrando el evaluador.
 */
export function aprobarReserva(
  reserva: Reserva,
  evaluadorId: string,
  ahora: Date = new Date()
): Reserva {
  if (reserva.estado !== EstadoReserva.PENDIENTE) {
    throw new DomainValidationError('Solo se pueden aprobar reservas en estado PENDIENTE.', 422);
  }

  return {
    ...reserva,
    estado: EstadoReserva.APROBADA,
    evaluadorId,
    updatedAt: ahora,
  };
}

/**
 * Rechaza una reserva pendiente exigiendo obligatoriamente un motivo de rechazo.
 */
export function rechazarReserva(
  reserva: Reserva,
  evaluadorId: string,
  motivoRechazo: string,
  ahora: Date = new Date()
): Reserva {
  if (reserva.estado !== EstadoReserva.PENDIENTE) {
    throw new DomainValidationError('Solo se pueden rechazar reservas en estado PENDIENTE.', 422);
  }

  if (!motivoRechazo || motivoRechazo.trim().length === 0) {
    throw new DomainValidationError('El motivo de rechazo es obligatorio para declinar una solicitud.', 422);
  }

  return {
    ...reserva,
    estado: EstadoReserva.RECHAZADA,
    evaluadorId,
    motivoRechazo: motivoRechazo.trim(),
    updatedAt: ahora,
  };
}

/**
 * Cancela una reserva siempre que se solicite con más de 1 hora de anticipación a la fecha de inicio.
 */
export function cancelarReserva(
  reserva: Reserva,
  ahora: Date = new Date()
): Reserva {
  if (reserva.estado !== EstadoReserva.PENDIENTE && reserva.estado !== EstadoReserva.APROBADA) {
    throw new DomainValidationError('No se puede cancelar una reserva que no esté activa.', 422);
  }

  const unaHoraEnMs = 1 * 60 * 60 * 1000;
  const tiempoRestanteMs = reserva.fechaHoraInicio.getTime() - ahora.getTime();

  if (tiempoRestanteMs <= unaHoraEnMs) {
    throw new DomainValidationError(
      'La reserva solo puede cancelarse con más de 1 hora de anticipación a la hora de inicio.',
      422
    );
  }

  return {
    ...reserva,
    estado: EstadoReserva.CANCELADA,
    updatedAt: ahora,
  };
}
