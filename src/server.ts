import express, { Express } from 'express';
import path from 'path';
import { SQLiteDatabase } from './shared/database/sqlite';
import { SpacesService } from './modules/spaces/spaces.service';
import { AuthService } from './modules/auth/auth.service';
import { ReservationsService } from './modules/reservations/reservations.service';
import { createSpacesRouter } from './modules/spaces/spaces.controller';
import { createAuthRouter } from './modules/auth/auth.controller';
import { createReservationsRouter } from './modules/reservations/reservations.controller';
import { errorHandler } from './shared/middleware/error.middleware';
import { seedInitialData } from './seed';

export interface AppDependencies {
  spacesService?: SpacesService;
  authService?: AuthService;
  reservationsService?: ReservationsService;
  sqliteDb?: SQLiteDatabase | null;
  seedData?: boolean;
}

/**
 * Crea y configura la aplicación modular de Express.
 */
export function createApp(dependencies: AppDependencies = {}): Express {
  const app = express();
  const isTest = process.env.NODE_ENV === 'test';

  // 1. Instanciación de base de datos SQLite y servicios
  let db: SQLiteDatabase | undefined = undefined;
  if (dependencies.sqliteDb !== undefined) {
    db = dependencies.sqliteDb === null ? undefined : dependencies.sqliteDb;
  } else if (!isTest) {
    db = new SQLiteDatabase();
  }

  const spacesService = dependencies.spacesService || new SpacesService(db);
  const authService = dependencies.authService || new AuthService(db);
  const reservationsService =
    dependencies.reservationsService || new ReservationsService(spacesService, authService, db);

  // Sembrar datos de demostración si se solicita y no estamos en ejecución paralela de tests
  if (dependencies.seedData && !isTest) {
    seedInitialData(spacesService, authService);
  }

  // 2. Middlewares base
  app.use(express.json());

  // Servir archivos estáticos del frontend
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // 3. Montaje de rutas API
  app.use('/api/spaces', createSpacesRouter(spacesService, authService));
  app.use('/api/auth', createAuthRouter(authService));
  app.use('/api/reservations', createReservationsRouter(reservationsService, authService));

  // 4. Middleware centralizado de errores
  app.use(errorHandler);

  return app;
}

export const app = createApp({ seedData: true });

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` Servidor de Reservas con SQLite iniciado con éxito`);
    console.log(` Base de Datos: ./data/sistema_reserva.sqlite`);
    console.log(` URL Local:     http://localhost:${PORT}`);
    console.log(` API Base:      http://localhost:${PORT}/api`);
    console.log(`================================================================`);
  });
}
