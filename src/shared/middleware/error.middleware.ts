import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = err.message || 'Error interno del servidor';
  const errorName = err.name || 'InternalServerError';

  res.status(statusCode).json({
    statusCode,
    error: errorName,
    message,
  });
}
