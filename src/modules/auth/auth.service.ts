import * as crypto from 'crypto';
import { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError, DomainValidationError } from '../../shared/errors';
import { Usuario, RegistrarUsuarioDTO, RolUsuario } from './types';
import { SQLiteDatabase } from '../../shared/database/sqlite';

export class AuthService {
  private usuarios: Map<string, Usuario> = new Map();

  constructor(private readonly db?: SQLiteDatabase) {}

  /**
   * Genera un hash criptográfico SHA-256 para simular la encriptación segura de contraseña.
   */
  public hashearContrasena(contrasena: string): string {
    return crypto.createHash('sha256').update(`salt_inst_${contrasena}`).digest('hex');
  }

  /**
   * Valida que el correo corresponda a un dominio institucional válido (.edu o .edu.*).
   */
  public esCorreoInstitucionalValido(correo: string): boolean {
    const regexInstitucional = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(edu|edu\.[a-zA-Z]{2,})$/i;
    return regexInstitucional.test(correo.trim());
  }

  /**
   * Registra un nuevo usuario en el sistema.
   * Asigna por defecto el rol ESTUDIANTE si no se proporciona uno explícito.
   */
  public registrarUsuario(
    dto: RegistrarUsuarioDTO,
    generarId: () => string = () => `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  ): Usuario {
    if (!dto.correoInstitucional || !this.esCorreoInstitucionalValido(dto.correoInstitucional)) {
      throw new DomainValidationError(
        'El correo debe pertenecer a un dominio institucional válido (ej: .edu o .edu.co).',
        422
      );
    }

    if (!dto.nombreCompleto || dto.nombreCompleto.trim().length === 0) {
      throw new DomainValidationError('El nombre completo es obligatorio.', 422);
    }

    if (!dto.contrasena || dto.contrasena.length < 6) {
      throw new DomainValidationError('La contraseña debe tener al menos 6 caracteres.', 422);
    }

    const correoNormalizado = dto.correoInstitucional.trim().toLowerCase();

    const yaExiste = this.db
      ? this.db.findUsuarioByEmail(correoNormalizado)
      : Array.from(this.usuarios.values()).find(
          (u) => u.correoInstitucional.toLowerCase() === correoNormalizado
        );

    if (yaExiste) {
      throw new ConflictError(
        `Ya existe un usuario registrado con el correo institucional '${dto.correoInstitucional}'.`,
        409
      );
    }

    const ahora = new Date();
    const nuevoUsuario: Usuario = {
      id: generarId(),
      correoInstitucional: correoNormalizado,
      nombreCompleto: dto.nombreCompleto.trim(),
      contrasenaEncriptada: this.hashearContrasena(dto.contrasena),
      rol: dto.rol ?? RolUsuario.ESTUDIANTE,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };

    if (this.db) {
      this.db.insertUsuario(nuevoUsuario);
    } else {
      this.usuarios.set(nuevoUsuario.id, nuevoUsuario);
    }

    return nuevoUsuario;
  }

  /**
   * Autenticación simulada de usuario mediante correo y contraseña.
   */
  public login(correo: string, contrasena: string): { usuario: Usuario; token: string } {
    const correoNormalizado = correo.trim().toLowerCase();

    const usuario = this.db
      ? this.db.findUsuarioByEmail(correoNormalizado)
      : Array.from(this.usuarios.values()).find(
          (u) => u.correoInstitucional.toLowerCase() === correoNormalizado
        );

    if (!usuario) {
      throw new UnauthorizedError('Credenciales inválidas.', 401);
    }

    if (!usuario.activo) {
      throw new ForbiddenError('La cuenta de usuario se encuentra inactiva.', 403);
    }

    const hashIngresado = this.hashearContrasena(contrasena);
    if (usuario.contrasenaEncriptada !== hashIngresado) {
      throw new UnauthorizedError('Credenciales inválidas.', 401);
    }

    const token = `token-${usuario.id}-${Date.now()}`;
    return { usuario, token };
  }

  /**
   * Valida si un usuario posee alguno de los roles permitidos (Control de Acceso RBAC).
   * Lanza ForbiddenError (403) si el rol no está autorizado.
   */
  public validarRol(usuarioId: string, rolesPermitidos: RolUsuario[]): Usuario {
    const usuario = this.obtenerPorId(usuarioId);

    if (!usuario.activo) {
      throw new ForbiddenError('La cuenta del usuario está inactiva.', 403);
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenError(
        `Acceso denegado: el rol '${usuario.rol}' no tiene permisos para esta operación.`,
        403
      );
    }

    return usuario;
  }

  /**
   * Obtiene un usuario por ID.
   */
  public obtenerPorId(id: string): Usuario {
    const usuario = this.db ? this.db.findUsuarioById(id) : this.usuarios.get(id);
    if (!usuario) {
      throw new NotFoundError(`Usuario con id '${id}' no encontrado.`, 404);
    }
    return usuario;
  }

  /**
   * Obtiene un usuario por correo institucional.
   */
  public obtenerPorCorreo(correo: string): Usuario | undefined {
    const correoNormalizado = correo.trim().toLowerCase();
    return this.db
      ? this.db.findUsuarioByEmail(correoNormalizado)
      : Array.from(this.usuarios.values()).find(
          (u) => u.correoInstitucional.toLowerCase() === correoNormalizado
        );
  }

  /**
   * Lista todos los usuarios registrados.
   */
  public listarTodos(): Usuario[] {
    return this.db ? this.db.findAllUsuarios() : Array.from(this.usuarios.values());
  }

  /**
   * Limpia el repositorio en memoria o la base de datos.
   */
  public limpiar(): void {
    if (this.db) {
      this.db.clear();
    } else {
      this.usuarios.clear();
    }
  }
}
