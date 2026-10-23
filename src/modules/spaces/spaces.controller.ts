import { Router, Request, Response, NextFunction } from 'express';
import { SpacesService } from './spaces.service';
import { AuthService } from '../auth/auth.service';
import { RolUsuario } from '../auth/types';
import { requireRole } from '../../shared/middleware/auth.middleware';

export function createSpacesRouter(spacesService: SpacesService, authService: AuthService): Router {
  const router = Router();

  // GET /api/spaces - Listar espacios activos
  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const espacios = spacesService.listarEspaciosActivos();
      res.status(200).json(espacios);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/spaces - Registrar espacio (Requiere rol ADMIN)
  router.post(
    '/',
    requireRole(authService, [RolUsuario.ADMIN]),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const nuevoEspacio = spacesService.registrarEspacio(req.body);
        res.status(201).json(nuevoEspacio);
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/spaces/:id - Borrado lógico (Requiere rol ADMIN)
  router.delete(
    '/:id',
    requireRole(authService, [RolUsuario.ADMIN]),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const espacio = spacesService.deshabilitarLogicamente(id);
        res.status(200).json({
          message: 'Espacio deshabilitado lógicamente.',
          espacio,
        });
      } catch (error) {

        next(error);
      }
    }
  );

  return router;
}
