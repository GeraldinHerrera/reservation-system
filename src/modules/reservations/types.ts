/**
 * Tipos y modelos para el módulo de Reservas.
 * Basado en la especificación: openspec/specs/sistema-reserva/spec.md
 */

export enum EstadoReserva {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  CANCELADA = 'CANCELADA',
}

export interface Reserva {
  id: string;
  espacioId: string;
  usuarioId: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  motivoAcademico: string;
  estado: EstadoReserva;
  evaluadorId?: string;
  motivoRechazo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CrearReservaDTO {
  espacioId: string;
  usuarioId: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  motivoAcademico: string;
}

export interface EvaluarReservaDTO {
  reservaId: string;
  evaluadorId: string;
  aprobar: boolean;
  motivoRechazo?: string;
}
