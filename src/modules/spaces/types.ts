/**
 * Tipos y modelos para el módulo de Espacios Académicos.
 * Basado en la especificación: openspec/specs/sistema-reserva/spec.md
 */

export enum TipoEspacio {
  LABORATORIO = 'LABORATORIO',
  AUDITORIO = 'AUDITORIO',
  SALA_COMPUTO = 'SALA_COMPUTO',
}

export interface EspacioAcademico {
  id: string;
  codigo: string;
  nombre: string;
  capacidad: number;
  ubicacion: string;
  tipo: TipoEspacio;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CrearEspacioDTO {
  codigo: string;
  nombre: string;
  capacidad: number;
  ubicacion: string;
  tipo: TipoEspacio;
}

export interface ActualizarEspacioDTO {
  nombre?: string;
  capacidad?: number;
  ubicacion?: string;
  tipo?: TipoEspacio;
  activo?: boolean;
}
