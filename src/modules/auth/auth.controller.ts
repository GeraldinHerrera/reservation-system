import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  // POST /api/auth/register - Registrar usuario institucional
  router.post('/register', (req: Request, res: Response, next: NextFunction) => {
    try {
      const nuevoUsuario = authService.registrarUsuario(req.body);
      res.status(201).json(nuevoUsuario);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/auth/login - Autenticación simulada
  router.post('/login', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { correo, contrasena } = req.body;
      const resultado = authService.login(correo, contrasena);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
