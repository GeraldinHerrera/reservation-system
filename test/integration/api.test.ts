import request from 'supertest';
import { createApp } from '../../src/server';
import { SpacesService } from '../../src/modules/spaces/spaces.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { ReservationsService } from '../../src/modules/reservations/reservations.service';
import { TipoEspacio } from '../../src/modules/spaces/types';
import { RolUsuario } from '../../src/modules/auth/types';
import { EstadoReserva } from '../../src/modules/reservations/types';

describe('Pruebas de Integración de API HTTP (supertest)', () => {
  let app: any;
  let spacesService: SpacesService;
  let authService: AuthService;
  let reservationsService: ReservationsService;

  let adminUser: any;
  let estudianteUser: any;
  let docenteUser: any;

  beforeEach(() => {
    spacesService = new SpacesService();
    authService = new AuthService();
    reservationsService = new ReservationsService(spacesService, authService);
    app = createApp({ spacesService, authService, reservationsService });

    // Crear usuarios de prueba para RBAC
    adminUser = authService.registrarUsuario({
      correoInstitucional: 'admin.decano@universidad.edu.co',
      nombreCompleto: 'Decano Administrador',
      contrasena: 'admin12345',
      rol: RolUsuario.ADMIN,
    });

    estudianteUser = authService.registrarUsuario({
      correoInstitucional: 'estudiante.ingenieria@universidad.edu.co',
      nombreCompleto: 'Estudiante Prueba',
      contrasena: 'estudiante123',
      rol: RolUsuario.ESTUDIANTE,
    });

    docenteUser = authService.registrarUsuario({
      correoInstitucional: 'docente.sistemas@universidad.edu.co',
      nombreCompleto: 'Profesor Titular',
      contrasena: 'docente123',
      rol: RolUsuario.DOCENTE,
    });
  });

  describe('Endpoints /api/auth', () => {
    test('POST /api/auth/register debe registrar un usuario institucional exitosamente (201)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          correoInstitucional: 'nuevo.alumno@universidad.edu.co',
          nombreCompleto: 'Nuevo Alumno',
          contrasena: 'segura2026',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.correoInstitucional).toBe('nuevo.alumno@universidad.edu.co');
      expect(res.body.rol).toBe(RolUsuario.ESTUDIANTE); // Rol por defecto
    });

    test('POST /api/auth/register debe responder 409 Conflicto con correo duplicado', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          correoInstitucional: 'estudiante.ingenieria@universidad.edu.co',
          nombreCompleto: 'Estudiante Clon',
          contrasena: 'clave1234',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ConflictError');
    });

    test('POST /api/auth/register debe responder 422 con correo no institucional', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          correoInstitucional: 'usuario@gmail.com',
          nombreCompleto: 'Usuario Gmail',
          contrasena: 'clave1234',
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('DomainValidationError');
    });

    test('POST /api/auth/login debe autenticar y responder 200 con token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          correo: 'admin.decano@universidad.edu.co',
          contrasena: 'admin12345',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.usuario.nombreCompleto).toBe('Decano Administrador');
    });

    test('POST /api/auth/login debe responder 401 Unauthorized ante contraseña incorrecta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          correo: 'admin.decano@universidad.edu.co',
          contrasena: 'passwordErronea',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UnauthorizedError');
    });
  });

  describe('Endpoints /api/spaces', () => {
    test('POST /api/spaces debe permitir registrar un espacio a un ADMIN (201)', async () => {
      const res = await request(app)
        .post('/api/spaces')
        .set('x-user-id', adminUser.id)
        .send({
          codigo: 'AUD-MAGNO',
          nombre: 'Auditorio Magno',
          capacidad: 200,
          ubicacion: 'Bloque Central',
          tipo: TipoEspacio.AUDITORIO,
        });

      expect(res.status).toBe(201);
      expect(res.body.codigo).toBe('AUD-MAGNO');
      expect(res.body.activo).toBe(true);
    });

    test('POST /api/spaces debe responder 403 Forbidden cuando un ESTUDIANTE intenta crear un espacio', async () => {
      const res = await request(app)
        .post('/api/spaces')
        .set('x-user-id', estudianteUser.id)
        .send({
          codigo: 'LAB-HACK',
          nombre: 'Lab Hack',
          capacidad: 10,
          ubicacion: 'Pabellón 3',
          tipo: TipoEspacio.LABORATORIO,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('ForbiddenError');
    });

    test('POST /api/spaces debe responder 409 Conflicto por código duplicado', async () => {
      spacesService.registrarEspacio({
        codigo: 'LAB-QUIMICA',
        nombre: 'Laboratorio de Química',
        capacidad: 25,
        ubicacion: 'Bloque Q',
        tipo: TipoEspacio.LABORATORIO,
      });

      const res = await request(app)
        .post('/api/spaces')
        .set('x-user-id', adminUser.id)
        .send({
          codigo: 'LAB-QUIMICA',
          nombre: 'Otro Lab Química',
          capacidad: 30,
          ubicacion: 'Bloque Q Piso 2',
          tipo: TipoEspacio.LABORATORIO,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ConflictError');
    });

    test('GET /api/spaces debe listar los espacios activos (200)', async () => {
      spacesService.registrarEspacio({
        codigo: 'SALA-101',
        nombre: 'Sala Cómputo 101',
        capacidad: 35,
        ubicacion: 'Edificio TIC',
        tipo: TipoEspacio.SALA_COMPUTO,
      });

      const res = await request(app).get('/api/spaces');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    test('DELETE /api/spaces/:id debe permitir borrado lógico a un ADMIN (200)', async () => {
      const espacio = spacesService.registrarEspacio({
        codigo: 'SALA-TEMPORAL',
        nombre: 'Sala Temporal',
        capacidad: 15,
        ubicacion: 'Carpa',
        tipo: TipoEspacio.SALA_COMPUTO,
      });

      const res = await request(app)
        .delete(`/api/spaces/${espacio.id}`)
        .set('x-user-id', adminUser.id);

      expect(res.status).toBe(200);
      expect(res.body.espacio.activo).toBe(false);

      // Debe haber desaparecido de la lista de activos
      const resActivos = await request(app).get('/api/spaces');
      const encontrado = resActivos.body.find((e: any) => e.id === espacio.id);
      expect(encontrado).toBeUndefined();
    });
  });

  describe('Endpoints /api/reservations', () => {
    let espacioPrueba: any;
    const ahora = new Date();
    // Fechas válidas con > 2 horas de anticipación
    const fechaInicioValida = new Date(ahora.getTime() + 4 * 60 * 60 * 1000);
    const fechaFinValida = new Date(ahora.getTime() + 6 * 60 * 60 * 1000);

    beforeEach(() => {
      espacioPrueba = spacesService.registrarEspacio({
        codigo: 'LAB-REDES-202',
        nombre: 'Laboratorio de Redes',
        capacidad: 30,
        ubicacion: 'Bloque Redes',
        tipo: TipoEspacio.LABORATORIO,
      });
    });

    test('POST /api/reservations debe crear una solicitud con estado PENDIENTE (201)', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Práctica de Enrutamiento Dinámico',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.estado).toBe(EstadoReserva.PENDIENTE);
      expect(res.body.usuarioId).toBe(estudianteUser.id);
    });

    test('POST /api/reservations debe responder 422 cuando la anticipación es menor a 2 horas', async () => {
      const fechaCorta = new Date(ahora.getTime() + 30 * 60 * 1000); // 30 minutos

      const res = await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaCorta.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Reserva precipitada',
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('DomainValidationError');
    });

    test('POST /api/reservations debe responder 409 Conflicto por solapamiento horario', async () => {
      // Primera reserva exitosa
      await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Primera reserva',
        });

      // Segunda reserva solapada en el mismo espacio
      const resSolapada = await request(app)
        .post('/api/reservations')
        .set('x-user-id', docenteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: new Date(fechaInicioValida.getTime() + 30 * 60 * 1000).toISOString(),
          fechaHoraFin: new Date(fechaFinValida.getTime() + 30 * 60 * 1000).toISOString(),
          motivoAcademico: 'Segunda reserva en conflicto',
        });

      expect(resSolapada.status).toBe(409);
      expect(resSolapada.body.error).toBe('ConflictError');
    });

    test('GET /api/reservations debe listar reservas con filtro opcional', async () => {
      await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Consulta general',
        });

      const res = await request(app)
        .get(`/api/reservations?usuarioId=${estudianteUser.id}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].usuarioId).toBe(estudianteUser.id);
    });

    test('PATCH /api/reservations/:id/approve debe permitir a un ADMIN aprobar una reserva (200)', async () => {
      const creacion = await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Para sustentar',
        });

      const reservaId = creacion.body.id;

      const resAprobacion = await request(app)
        .patch(`/api/reservations/${reservaId}/approve`)
        .set('x-user-id', adminUser.id);

      expect(resAprobacion.status).toBe(200);
      expect(resAprobacion.body.estado).toBe(EstadoReserva.APROBADA);
      expect(resAprobacion.body.evaluadorId).toBe(adminUser.id);
    });

    test('PATCH /api/reservations/:id/approve debe responder 403 Forbidden si un ESTUDIANTE intenta aprobar', async () => {
      const creacion = await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Intento de auto-aprobación',
        });

      const resAprobacion = await request(app)
        .patch(`/api/reservations/${creacion.body.id}/approve`)
        .set('x-user-id', estudianteUser.id);

      expect(resAprobacion.status).toBe(403);
      expect(resAprobacion.body.error).toBe('ForbiddenError');
    });

    test('PATCH /api/reservations/:id/reject debe rechazar la reserva con motivo obligatorio (200)', async () => {
      const creacion = await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Solicitud sujeta a rechazo',
        });

      const resRechazo = await request(app)
        .patch(`/api/reservations/${creacion.body.id}/reject`)
        .set('x-user-id', adminUser.id)
        .send({
          motivoRechazo: 'Capacidad insuficiente para el número estimado de asistentes',
        });

      expect(resRechazo.status).toBe(200);
      expect(resRechazo.body.estado).toBe(EstadoReserva.RECHAZADA);
      expect(resRechazo.body.evaluadorId).toBe(adminUser.id);
      expect(resRechazo.body.motivoRechazo).toBe(
        'Capacidad insuficiente para el número estimado de asistentes'
      );
    });

    test('PATCH /api/reservations/:id/reject debe responder 422 si falta el motivo de rechazo', async () => {
      const creacion = await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(),
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Solicitud',
        });

      const resRechazo = await request(app)
        .patch(`/api/reservations/${creacion.body.id}/reject`)
        .set('x-user-id', adminUser.id)
        .send({
          motivoRechazo: '',
        });

      expect(resRechazo.status).toBe(422);
      expect(resRechazo.body.error).toBe('DomainValidationError');
    });

    test('PATCH /api/reservations/:id/cancel debe permitir al usuario cancelar con más de 1 hora de anticipación (200)', async () => {
      const creacion = await request(app)
        .post('/api/reservations')
        .set('x-user-id', estudianteUser.id)
        .send({
          espacioId: espacioPrueba.id,
          fechaHoraInicio: fechaInicioValida.toISOString(), // Más de 2h de anticipación
          fechaHoraFin: fechaFinValida.toISOString(),
          motivoAcademico: 'Para cancelar con tiempo',
        });

      const resCancelacion = await request(app)
        .patch(`/api/reservations/${creacion.body.id}/cancel`)
        .set('x-user-id', estudianteUser.id);

      expect(resCancelacion.status).toBe(200);
      expect(resCancelacion.body.estado).toBe(EstadoReserva.CANCELADA);
    });
  });
});
