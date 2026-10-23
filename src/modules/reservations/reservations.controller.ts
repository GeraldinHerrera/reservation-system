import { Router, Request, Response, NextFunction } from 'express';
import { ReservationsService } from './reservations.service';
import { AuthService } from '../auth/auth.service';
import { RolUsuario } from '../auth/types';
import { requireRole, extractUserId } from '../../shared/middleware/auth.middleware';
import { DomainValidationError, UnauthorizedError } from '../../shared/errors';

export function createReservationsRouter(
  reservationsService: ReservationsService,
  authService: AuthService
): Router {
  const router = Router();

  // GET /api/reservations - Listar reservas (con filtros opcionales de usuario o espacio)
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { usuarioId, espacioId } = req.query;

      if (typeof usuarioId === 'string') {
        const reservas = reservationsService.listarPorUsuario(usuarioId);
        res.status(200).json(reservas);
        return;
      }

      if (typeof espacioId === 'string') {
        const reservas = reservationsService.listarPorEspacio(espacioId);
        res.status(200).json(reservas);
        return;
      }

      const reservas = reservationsService.listarTodas();
      res.status(200).json(reservas);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/reservations - Crear solicitud de reserva
  router.post('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { espacioId, fechaHoraInicio, fechaHoraFin, motivoAcademico } = req.body;
      const usuarioId = req.body.usuarioId || extractUserId(req);

      if (!usuarioId) {
        throw new UnauthorizedError(
          'El usuario solicitante es obligatorio en la cabecera x-user-id o en el cuerpo.',
          401
        );
      }

      if (!fechaHoraInicio || !fechaHoraFin) {
        throw new DomainValidationError(
          'fechaHoraInicio y fechaHoraFin son obligatorias.',
          422
        );
      }

      const inicio = new Date(fechaHoraInicio);
      const fin = new Date(fechaHoraFin);

      if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
        throw new DomainValidationError(
          'Las fechas proporcionadas no tienen un formato válido.',
          422
        );
      }

      const nuevaReserva = reservationsService.crearSolicitud({
        espacioId,
        usuarioId,
        fechaHoraInicio: inicio,
        fechaHoraFin: fin,
        motivoAcademico,
      });

      res.status(201).json(nuevaReserva);
    } catch (error) {
      next(error);
    }
  });

  // PATCH /api/reservations/:id/approve - Aprobar reserva (Requiere rol ADMIN)
  router.patch(
    '/:id/approve',
    requireRole(authService, [RolUsuario.ADMIN]),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const adminId = extractUserId(req) || req.body.adminId;
        const reservaAprobada = reservationsService.aprobar(id, adminId);
        res.status(200).json(reservaAprobada);
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /api/reservations/:id/reject - Rechazar reserva (Requiere rol ADMIN y motivo obligatorio)
  router.patch(
    '/:id/reject',
    requireRole(authService, [RolUsuario.ADMIN]),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const adminId = extractUserId(req) || req.body.adminId;
        const { motivoRechazo } = req.body;
        const reservaRechazada = reservationsService.rechazar(
          id,
          adminId,
          motivoRechazo
        );
        res.status(200).json(reservaRechazada);
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /api/reservations/:id/cancel - Cancelar reserva (Propietario o ADMIN)
  router.patch('/:id/cancel', (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const solicitanteId = extractUserId(req) || req.body.solicitanteId;
      if (!solicitanteId) {
        throw new UnauthorizedError(
          'Se requiere identificación del solicitante en la cabecera x-user-id o en el cuerpo.',
          401
        );
      }

      const reservaCancelada = reservationsService.cancelar(id, solicitanteId);
      res.status(200).json(reservaCancelada);
    } catch (error) {

      next(error);
    }
  });

  return router;
}
