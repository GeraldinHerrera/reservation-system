import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors';
import { AuthService } from '../../modules/auth/auth.service';
import { RolUsuario, Usuario } from '../../modules/auth/types';

export interface AuthenticatedRequest extends Request {
  user?: Usuario;
}

/**
 * Extrae el ID de usuario desde el header x-user-id o desde el header Authorization Bearer token.
 */
export function extractUserId(req: Request): string | undefined {
  const headerUserId = req.headers['x-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim() !== '') {
    return headerUserId.trim();
  }

  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // En nuestro AuthService, el token simulado tiene formato 'token-<userId>-<timestamp>'
    const parts = token.split('-');
    if (parts.length >= 2 && parts[0] === 'token') {
      return parts.slice(1, -1).join('-');
    }
  }

  return undefined;
}

/**
 * Middleware que garantiza que la petición sea ejecutada por un usuario con los roles permitidos.
 */
export function requireRole(authService: AuthService, rolesPermitidos: RolUsuario[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      const userId = extractUserId(req);
      if (!userId) {
        throw new UnauthorizedError(
          'Autenticación requerida. Proporcione la cabecera x-user-id o Authorization.',
          401
        );
      }

      const usuario = authService.validarRol(userId, rolesPermitidos);
      req.user = usuario;
      next();
    } catch (error) {
      next(error);
    }
  };
}
