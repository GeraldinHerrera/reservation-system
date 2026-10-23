// Servidor y factoría de aplicación
export * from './server';

// Errores Compartidos y Middlewares
export * from './shared/errors';
export * from './shared/middleware/auth.middleware';
export * from './shared/middleware/error.middleware';

// Módulo de Espacios Académicos
export * from './modules/spaces/types';
export * from './modules/spaces/spaces.service';
export * from './modules/spaces/spaces.controller';

// Módulo de Autenticación y Usuarios
export * from './modules/auth/types';
export * from './modules/auth/auth.service';
export * from './modules/auth/auth.controller';

// Módulo de Reservas
export * from './modules/reservations/types';
export * from './modules/reservations/domain';
export * from './modules/reservations/reservations.service';
export * from './modules/reservations/reservations.controller';
