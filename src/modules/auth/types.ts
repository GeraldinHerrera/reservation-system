/**
 * Tipos y modelos para el módulo de Autenticación y Usuarios.
 * Basado en la especificación: openspec/specs/sistema-reserva/spec.md
 */

export enum RolUsuario {
  ESTUDIANTE = 'ESTUDIANTE',
  DOCENTE = 'DOCENTE',
  ADMIN = 'ADMIN',
}

export interface Usuario {
  id: string;
  correoInstitucional: string;
  nombreCompleto: string;
  contrasenaEncriptada: string;
  rol: RolUsuario;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RegistrarUsuarioDTO {
  correoInstitucional: string;
  nombreCompleto: string;
  contrasena: string;
  rol?: RolUsuario;
}
