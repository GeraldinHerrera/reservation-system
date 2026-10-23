import { SQLiteDatabase } from '../../src/shared/database/sqlite';
import { TipoEspacio } from '../../src/modules/spaces/types';
import { RolUsuario } from '../../src/modules/auth/types';
import { EstadoReserva } from '../../src/modules/reservations/types';

describe('Pruebas Unitarias de Persistencia SQLite (SQLiteDatabase)', () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    // Usar base de datos SQLite en memoria para aislamiento en pruebas
    db = new SQLiteDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  test('Debe insertar y recuperar un usuario en SQLite', () => {
    db.insertUsuario({
      id: 'usr-sql-1',
      correoInstitucional: 'test.sqlite@universidad.edu.co',
      nombreCompleto: 'Usuario SQLite',
      contrasenaEncriptada: 'hash123',
      rol: RolUsuario.DOCENTE,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const encontrado = db.findUsuarioByEmail('test.sqlite@universidad.edu.co');
    expect(encontrado).toBeDefined();
    expect(encontrado?.id).toBe('usr-sql-1');
    expect(encontrado?.nombreCompleto).toBe('Usuario SQLite');
    expect(encontrado?.rol).toBe(RolUsuario.DOCENTE);
  });

  test('Debe insertar, listar activos y actualizar un espacio académico en SQLite', () => {
    db.insertEspacio({
      id: 'esp-sql-1',
      codigo: 'AUD-SQL-10',
      nombre: 'Auditorio SQLite',
      capacidad: 120,
      ubicacion: 'Pabellón Central',
      tipo: TipoEspacio.AUDITORIO,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const activos = db.findActiveEspacios();
    expect(activos).toHaveLength(1);
    expect(activos[0].codigo).toBe('AUD-SQL-10');

    // Deshabilitar lógicamente
    db.updateEspacio({
      ...activos[0],
      activo: false,
    });

    const activosDespues = db.findActiveEspacios();
    expect(activosDespues).toHaveLength(0);

    const todos = db.findAllEspacios();
    expect(todos).toHaveLength(1);
    expect(todos[0].activo).toBe(false);
  });

  test('Debe insertar, consultar y actualizar el estado de una reserva en SQLite', () => {
    const inicio = new Date('2026-11-01T14:00:00.000Z');
    const fin = new Date('2026-11-01T16:00:00.000Z');

    db.insertReserva({
      id: 'res-sql-1',
      espacioId: 'esp-sql-1',
      usuarioId: 'usr-sql-1',
      fechaHoraInicio: inicio,
      fechaHoraFin: fin,
      motivoAcademico: 'Sustentación',
      estado: EstadoReserva.PENDIENTE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const reserva = db.findReservaById('res-sql-1');
    expect(reserva).toBeDefined();
    expect(reserva?.estado).toBe(EstadoReserva.PENDIENTE);
    expect(reserva?.fechaHoraInicio).toEqual(inicio);

    // Actualizar a rechazada con motivo
    db.updateReserva({
      ...reserva!,
      estado: EstadoReserva.RECHAZADA,
      evaluadorId: 'admin-1',
      motivoRechazo: 'Mantenimiento del auditorio',
    });

    const actualizada = db.findReservaById('res-sql-1');
    expect(actualizada?.estado).toBe(EstadoReserva.RECHAZADA);
    expect(actualizada?.evaluadorId).toBe('admin-1');
    expect(actualizada?.motivoRechazo).toBe('Mantenimiento del auditorio');
  });
});
