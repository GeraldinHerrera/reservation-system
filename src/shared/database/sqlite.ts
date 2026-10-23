import fs from 'fs';
import path from 'path';
// Importación de SQLite nativo de Node.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite');

import { EspacioAcademico, TipoEspacio } from '../../modules/spaces/types';
import { Usuario, RolUsuario } from '../../modules/auth/types';
import { Reserva, EstadoReserva } from '../../modules/reservations/types';

export class SQLiteDatabase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.join(process.cwd(), 'data', 'sistema_reserva.sqlite');

    if (finalPath !== ':memory:') {
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(finalPath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        correoInstitucional TEXT UNIQUE NOT NULL,
        nombreCompleto TEXT NOT NULL,
        contrasenaEncriptada TEXT NOT NULL,
        rol TEXT NOT NULL,
        activo INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS espacios_academicos (
        id TEXT PRIMARY KEY,
        codigo TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        capacidad INTEGER NOT NULL,
        ubicacion TEXT NOT NULL,
        tipo TEXT NOT NULL,
        activo INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reservas (
        id TEXT PRIMARY KEY,
        espacioId TEXT NOT NULL,
        usuarioId TEXT NOT NULL,
        fechaHoraInicio TEXT NOT NULL,
        fechaHoraFin TEXT NOT NULL,
        motivoAcademico TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'PENDIENTE',
        evaluadorId TEXT,
        motivoRechazo TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }

  // --- Espacios Académicos ---
  public insertEspacio(espacio: EspacioAcademico): void {
    const stmt = this.db.prepare(`
      INSERT INTO espacios_academicos (id, codigo, nombre, capacidad, ubicacion, tipo, activo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      espacio.id,
      espacio.codigo,
      espacio.nombre,
      espacio.capacidad,
      espacio.ubicacion,
      espacio.tipo,
      espacio.activo ? 1 : 0,
      espacio.createdAt ? espacio.createdAt.toISOString() : new Date().toISOString(),
      espacio.updatedAt ? espacio.updatedAt.toISOString() : new Date().toISOString()
    );
  }

  public findEspacioById(id: string): EspacioAcademico | undefined {
    const stmt = this.db.prepare('SELECT * FROM espacios_academicos WHERE id = ?');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(id) as any;
    return row ? this.mapEspacio(row) : undefined;
  }

  public findEspacioByCodigo(codigo: string): EspacioAcademico | undefined {
    const stmt = this.db.prepare('SELECT * FROM espacios_academicos WHERE UPPER(codigo) = UPPER(?)');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(codigo) as any;
    return row ? this.mapEspacio(row) : undefined;
  }

  public findActiveEspacios(): EspacioAcademico[] {
    const stmt = this.db.prepare('SELECT * FROM espacios_academicos WHERE activo = 1 ORDER BY nombre ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapEspacio(r));
  }

  public findAllEspacios(): EspacioAcademico[] {
    const stmt = this.db.prepare('SELECT * FROM espacios_academicos ORDER BY nombre ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapEspacio(r));
  }

  public updateEspacio(espacio: EspacioAcademico): void {
    const stmt = this.db.prepare(`
      UPDATE espacios_academicos
      SET nombre = ?, capacidad = ?, ubicacion = ?, tipo = ?, activo = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      espacio.nombre,
      espacio.capacidad,
      espacio.ubicacion,
      espacio.tipo,
      espacio.activo ? 1 : 0,
      new Date().toISOString(),
      espacio.id
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapEspacio(row: any): EspacioAcademico {
    return {
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      capacidad: Number(row.capacidad),
      ubicacion: row.ubicacion,
      tipo: row.tipo as TipoEspacio,
      activo: Boolean(row.activo),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  // --- Usuarios ---
  public insertUsuario(usuario: Usuario): void {
    const stmt = this.db.prepare(`
      INSERT INTO usuarios (id, correoInstitucional, nombreCompleto, contrasenaEncriptada, rol, activo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      usuario.id,
      usuario.correoInstitucional.toLowerCase(),
      usuario.nombreCompleto,
      usuario.contrasenaEncriptada,
      usuario.rol,
      usuario.activo ? 1 : 0,
      usuario.createdAt ? usuario.createdAt.toISOString() : new Date().toISOString(),
      usuario.updatedAt ? usuario.updatedAt.toISOString() : new Date().toISOString()
    );
  }

  public findUsuarioById(id: string): Usuario | undefined {
    const stmt = this.db.prepare('SELECT * FROM usuarios WHERE id = ?');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(id) as any;
    return row ? this.mapUsuario(row) : undefined;
  }

  public findUsuarioByEmail(correo: string): Usuario | undefined {
    const stmt = this.db.prepare('SELECT * FROM usuarios WHERE LOWER(correoInstitucional) = LOWER(?)');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(correo.toLowerCase()) as any;
    return row ? this.mapUsuario(row) : undefined;
  }

  public findAllUsuarios(): Usuario[] {
    const stmt = this.db.prepare('SELECT * FROM usuarios ORDER BY nombreCompleto ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapUsuario(r));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapUsuario(row: any): Usuario {
    return {
      id: row.id,
      correoInstitucional: row.correoInstitucional,
      nombreCompleto: row.nombreCompleto,
      contrasenaEncriptada: row.contrasenaEncriptada,
      rol: row.rol as RolUsuario,
      activo: Boolean(row.activo),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  // --- Reservas ---
  public insertReserva(reserva: Reserva): void {
    const stmt = this.db.prepare(`
      INSERT INTO reservas (id, espacioId, usuarioId, fechaHoraInicio, fechaHoraFin, motivoAcademico, estado, evaluadorId, motivoRechazo, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      reserva.id,
      reserva.espacioId,
      reserva.usuarioId,
      reserva.fechaHoraInicio.toISOString(),
      reserva.fechaHoraFin.toISOString(),
      reserva.motivoAcademico,
      reserva.estado,
      reserva.evaluadorId || null,
      reserva.motivoRechazo || null,
      reserva.createdAt ? reserva.createdAt.toISOString() : new Date().toISOString(),
      reserva.updatedAt ? reserva.updatedAt.toISOString() : new Date().toISOString()
    );
  }

  public findReservaById(id: string): Reserva | undefined {
    const stmt = this.db.prepare('SELECT * FROM reservas WHERE id = ?');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = stmt.get(id) as any;
    return row ? this.mapReserva(row) : undefined;
  }

  public findReservasByUserId(usuarioId: string): Reserva[] {
    const stmt = this.db.prepare('SELECT * FROM reservas WHERE usuarioId = ? ORDER BY fechaHoraInicio ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(usuarioId) as any[];
    return rows.map((r) => this.mapReserva(r));
  }

  public findReservasBySpaceId(espacioId: string): Reserva[] {
    const stmt = this.db.prepare('SELECT * FROM reservas WHERE espacioId = ? ORDER BY fechaHoraInicio ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all(espacioId) as any[];
    return rows.map((r) => this.mapReserva(r));
  }

  public findAllReservas(): Reserva[] {
    const stmt = this.db.prepare('SELECT * FROM reservas ORDER BY fechaHoraInicio ASC');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapReserva(r));
  }

  public updateReserva(reserva: Reserva): void {
    const stmt = this.db.prepare(`
      UPDATE reservas
      SET estado = ?, evaluadorId = ?, motivoRechazo = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      reserva.estado,
      reserva.evaluadorId || null,
      reserva.motivoRechazo || null,
      new Date().toISOString(),
      reserva.id
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapReserva(row: any): Reserva {
    return {
      id: row.id,
      espacioId: row.espacioId,
      usuarioId: row.usuarioId,
      fechaHoraInicio: new Date(row.fechaHoraInicio),
      fechaHoraFin: new Date(row.fechaHoraFin),
      motivoAcademico: row.motivoAcademico,
      estado: row.estado as EstadoReserva,
      evaluadorId: row.evaluadorId || undefined,
      motivoRechazo: row.motivoRechazo || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  public clear(): void {
    this.db.exec(`
      DELETE FROM reservas;
      DELETE FROM espacios_academicos;
      DELETE FROM usuarios;
    `);
  }

  public close(): void {
    this.db.close();
  }
}
