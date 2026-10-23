import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  DomainValidationError,
} from '../../shared/errors';
import { RolUsuario } from '../auth/types';
import { AuthService } from '../auth/auth.service';
import { SpacesService } from '../spaces/spaces.service';
import { Reserva, CrearReservaDTO } from './types';
import { SQLiteDatabase } from '../../shared/database/sqlite';
import {
  crearReserva as crearReservaDominio,
  aprobarReserva as aprobarReservaDominio,
  rechazarReserva as rechazarReservaDominio,
  cancelarReserva as cancelarReservaDominio,
  verificarSolapamiento,
} from './domain';

export class ReservationsService {
  private reservas: Map<string, Reserva> = new Map();

  constructor(
    private readonly spacesService: SpacesService,
    private readonly authService: AuthService,
    private readonly db?: SQLiteDatabase
  ) {}

  /**
   * Crea una nueva solicitud de reserva validando:
   * - Existencia y vigencia activa del espacio.
   * - Existencia y vigencia activa del usuario solicitante.
   * - Anticipación mínima de 2 horas.
   * - Ausencia de solapamiento horario con reservas activas (PENDIENTE o APROBADA).
   */
  public crearSolicitud(
    dto: CrearReservaDTO,
    ahora: Date = new Date(),
    generarId: () => string = () => `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  ): Reserva {
    // 1. Validar que el espacio exista y esté activo
    const espacio = this.spacesService.obtenerPorId(dto.espacioId);
    if (!espacio.activo) {
      throw new DomainValidationError(
        `No es posible reservar el espacio '${espacio.nombre}' porque se encuentra deshabilitado.`,
        422
      );
    }

    // 2. Validar que el usuario exista y esté activo
    const usuario = this.authService.obtenerPorId(dto.usuarioId);
    if (!usuario.activo) {
      throw new ForbiddenError('El usuario solicitante se encuentra inactivo.', 403);
    }

    // 3. Obtener reservas existentes para el espacio solicitado
    const reservasDelEspacio = this.listarPorEspacio(dto.espacioId);

    // 4. Delegar en la lógica de dominio
    const nuevaReserva = crearReservaDominio(
      dto,
      reservasDelEspacio,
      ahora,
      generarId
    );

    // 5. Almacenar en la base de datos SQLite o repositorio en memoria
    if (this.db) {
      this.db.insertReserva(nuevaReserva);
    } else {
      this.reservas.set(nuevaReserva.id, nuevaReserva);
    }

    return nuevaReserva;
  }

  /**
   * Obtiene una reserva por su ID.
   */
  public obtenerPorId(id: string): Reserva {
    const reserva = this.db ? this.db.findReservaById(id) : this.reservas.get(id);
    if (!reserva) {
      throw new NotFoundError(`Reserva con id '${id}' no encontrada.`, 404);
    }
    return reserva;
  }

  /**
   * Lista todas las reservas asociadas a un usuario en particular.
   */
  public listarPorUsuario(usuarioId: string): Reserva[] {
    return this.db
      ? this.db.findReservasByUserId(usuarioId)
      : Array.from(this.reservas.values()).filter((r) => r.usuarioId === usuarioId);
  }

  /**
   * Lista todas las reservas asociadas a un espacio académico en particular.
   */
  public listarPorEspacio(espacioId: string): Reserva[] {
    return this.db
      ? this.db.findReservasBySpaceId(espacioId)
      : Array.from(this.reservas.values()).filter((r) => r.espacioId === espacioId);
  }

  /**
   * Lista todas las reservas del sistema.
   */
  public listarTodas(): Reserva[] {
    return this.db ? this.db.findAllReservas() : Array.from(this.reservas.values());
  }

  /**
   * Aprueba una reserva en estado PENDIENTE.
   * Solo los usuarios con rol ADMIN pueden evaluar reservas (RBAC).
   */
  public aprobar(reservaId: string, adminId: string, ahora: Date = new Date()): Reserva {
    // Validar autorización RBAC (solo ADMIN puede aprobar)
    this.authService.validarRol(adminId, [RolUsuario.ADMIN]);

    const reserva = this.obtenerPorId(reservaId);

    // Verificar que al aprobar no colisione con otra ya aprobada para ese mismo espacio
    const otrasReservas = this.listarPorEspacio(reserva.espacioId).filter(
      (r) => r.id !== reserva.id
    );
    const tieneConflicto = otrasReservas.some((otra) =>
      verificarSolapamiento(reserva.fechaHoraInicio, reserva.fechaHoraFin, otra)
    );

    if (tieneConflicto) {
      throw new ConflictError(
        'No se puede aprobar la reserva debido a un conflicto de solapamiento con otra reserva activa.',
        409
      );
    }

    const reservaAprobada = aprobarReservaDominio(reserva, adminId, ahora);

    if (this.db) {
      this.db.updateReserva(reservaAprobada);
    } else {
      this.reservas.set(reservaAprobada.id, reservaAprobada);
    }

    return reservaAprobada;
  }

  /**
   * Rechaza una reserva en estado PENDIENTE con motivo obligatorio.
   * Solo los usuarios con rol ADMIN pueden evaluar reservas (RBAC).
   */
  public rechazar(
    reservaId: string,
    adminId: string,
    motivoRechazo: string,
    ahora: Date = new Date()
  ): Reserva {
    // Validar autorización RBAC (solo ADMIN puede rechazar)
    this.authService.validarRol(adminId, [RolUsuario.ADMIN]);

    const reserva = this.obtenerPorId(reservaId);
    const reservaRechazada = rechazarReservaDominio(
      reserva,
      adminId,
      motivoRechazo,
      ahora
    );

    if (this.db) {
      this.db.updateReserva(reservaRechazada);
    } else {
      this.reservas.set(reservaRechazada.id, reservaRechazada);
    }

    return reservaRechazada;
  }

  /**
   * Cancela una reserva activa.
   * Reglas:
   * - Solo el propietario de la reserva o un administrador pueden cancelarla.
   * - Debe solicitarse con más de 1 hora de anticipación a la hora de inicio.
   */
  public cancelar(reservaId: string, solicitanteId: string, ahora: Date = new Date()): Reserva {
    const reserva = this.obtenerPorId(reservaId);
    const usuario = this.authService.obtenerPorId(solicitanteId);

    // El solicitante debe ser el dueño de la reserva o un administrador
    const esPropietario = reserva.usuarioId === solicitanteId;
    const esAdmin = usuario.rol === RolUsuario.ADMIN;

    if (!esPropietario && !esAdmin) {
      throw new ForbiddenError(
        'No tiene permisos para cancelar una reserva de otro usuario.',
        403
      );
    }

    const reservaCancelada = cancelarReservaDominio(reserva, ahora);

    if (this.db) {
      this.db.updateReserva(reservaCancelada);
    } else {
      this.reservas.set(reservaCancelada.id, reservaCancelada);
    }

    return reservaCancelada;
  }

  /**
   * Limpia el repositorio en memoria o la base de datos.
   */
  public limpiar(): void {
    if (this.db) {
      this.db.clear();
    } else {
      this.reservas.clear();
    }
  }
}
