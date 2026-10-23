import { ConflictError, NotFoundError, DomainValidationError } from '../../shared/errors';
import { EspacioAcademico, CrearEspacioDTO, ActualizarEspacioDTO, TipoEspacio } from './types';
import { SQLiteDatabase } from '../../shared/database/sqlite';

export class SpacesService {
  private espacios: Map<string, EspacioAcademico> = new Map();

  constructor(private readonly db?: SQLiteDatabase) {}

  /**
   * Registra un nuevo espacio académico con código único.
   * Lanza ConflictError (409) si el código ya existe en el sistema.
   */
  public registrarEspacio(
    dto: CrearEspacioDTO,
    generarId: () => string = () => `esp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  ): EspacioAcademico {
    if (!dto.codigo || dto.codigo.trim() === '') {
      throw new DomainValidationError('El código del espacio es obligatorio.', 422);
    }
    if (!dto.nombre || dto.nombre.trim() === '') {
      throw new DomainValidationError('El nombre del espacio es obligatorio.', 422);
    }
    if (!dto.capacidad || dto.capacidad <= 0) {
      throw new DomainValidationError('La capacidad del espacio debe ser un número entero positivo.', 422);
    }
    if (!dto.ubicacion || dto.ubicacion.trim() === '') {
      throw new DomainValidationError('La ubicación física del espacio es obligatoria.', 422);
    }
    if (!Object.values(TipoEspacio).includes(dto.tipo)) {
      throw new DomainValidationError(`El tipo de espacio ${dto.tipo} no es válido.`, 422);
    }

    const codigoNormalizado = dto.codigo.trim().toUpperCase();

    const existe = this.db
      ? this.db.findEspacioByCodigo(codigoNormalizado)
      : Array.from(this.espacios.values()).find(
          (e) => e.codigo.trim().toUpperCase() === codigoNormalizado
        );

    if (existe) {
      throw new ConflictError(
        `Ya existe un espacio académico registrado con el código '${dto.codigo.trim()}'.`,
        409
      );
    }

    const ahora = new Date();
    const nuevoEspacio: EspacioAcademico = {
      id: generarId(),
      codigo: dto.codigo.trim(),
      nombre: dto.nombre.trim(),
      capacidad: dto.capacidad,
      ubicacion: dto.ubicacion.trim(),
      tipo: dto.tipo,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora,
    };

    if (this.db) {
      this.db.insertEspacio(nuevoEspacio);
    } else {
      this.espacios.set(nuevoEspacio.id, nuevoEspacio);
    }

    return nuevoEspacio;
  }

  /**
   * Obtiene un espacio académico por su identificador.
   */
  public obtenerPorId(id: string): EspacioAcademico {
    const espacio = this.db ? this.db.findEspacioById(id) : this.espacios.get(id);
    if (!espacio) {
      throw new NotFoundError(`Espacio académico con id '${id}' no encontrado.`, 404);
    }
    return espacio;
  }

  /**
   * Obtiene un espacio académico por su código único.
   */
  public obtenerPorCodigo(codigo: string): EspacioAcademico | undefined {
    return this.db
      ? this.db.findEspacioByCodigo(codigo)
      : Array.from(this.espacios.values()).find(
          (e) => e.codigo.trim().toUpperCase() === codigo.trim().toUpperCase()
        );
  }

  /**
   * Retorna la lista de espacios académicos activos (activo === true).
   */
  public listarEspaciosActivos(): EspacioAcademico[] {
    return this.db
      ? this.db.findActiveEspacios()
      : Array.from(this.espacios.values()).filter((e) => e.activo);
  }

  /**
   * Retorna todos los espacios académicos registrados en el repositorio.
   */
  public listarTodos(): EspacioAcademico[] {
    return this.db ? this.db.findAllEspacios() : Array.from(this.espacios.values());
  }

  /**
   * Actualiza los datos de un espacio académico existente.
   */
  public actualizarEspacio(id: string, dto: ActualizarEspacioDTO): EspacioAcademico {
    const espacio = this.obtenerPorId(id);

    if (dto.capacidad !== undefined && dto.capacidad <= 0) {
      throw new DomainValidationError('La capacidad del espacio debe ser mayor a 0.', 422);
    }

    if (dto.tipo !== undefined && !Object.values(TipoEspacio).includes(dto.tipo)) {
      throw new DomainValidationError(`El tipo de espacio ${dto.tipo} no es válido.`, 422);
    }

    const espacioActualizado: EspacioAcademico = {
      ...espacio,
      nombre: dto.nombre !== undefined ? dto.nombre.trim() : espacio.nombre,
      capacidad: dto.capacidad !== undefined ? dto.capacidad : espacio.capacidad,
      ubicacion: dto.ubicacion !== undefined ? dto.ubicacion.trim() : espacio.ubicacion,
      tipo: dto.tipo !== undefined ? dto.tipo : espacio.tipo,
      activo: dto.activo !== undefined ? dto.activo : espacio.activo,
      updatedAt: new Date(),
    };

    if (this.db) {
      this.db.updateEspacio(espacioActualizado);
    } else {
      this.espacios.set(id, espacioActualizado);
    }

    return espacioActualizado;
  }

  /**
   * Realiza un borrado lógico del espacio académico configurando activo = false.
   */
  public deshabilitarLogicamente(id: string): EspacioAcademico {
    const espacio = this.obtenerPorId(id);
    const espacioDeshabilitado: EspacioAcademico = {
      ...espacio,
      activo: false,
      updatedAt: new Date(),
    };

    if (this.db) {
      this.db.updateEspacio(espacioDeshabilitado);
    } else {
      this.espacios.set(id, espacioDeshabilitado);
    }

    return espacioDeshabilitado;
  }

  /**
   * Limpia el repositorio en memoria o la base de datos.
   */
  public limpiar(): void {
    if (this.db) {
      this.db.clear();
    } else {
      this.espacios.clear();
    }
  }
}
