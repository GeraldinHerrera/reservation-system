import { SpacesService } from './modules/spaces/spaces.service';
import { AuthService } from './modules/auth/auth.service';
import { TipoEspacio } from './modules/spaces/types';
import { RolUsuario } from './modules/auth/types';

export function seedInitialData(spacesService: SpacesService, authService: AuthService): void {
  if (spacesService.listarTodos().length === 0) {
    spacesService.registrarEspacio({
      codigo: 'LAB-REDES-01',
      nombre: 'Laboratorio de Redes y Telecomunicaciones',
      capacidad: 30,
      ubicacion: 'Edificio de Ingeniería, Piso 3, Aula 302',
      tipo: TipoEspacio.LABORATORIO,
    });

    spacesService.registrarEspacio({
      codigo: 'AUD-CENTRAL',
      nombre: 'Auditorio Central Institucional',
      capacidad: 180,
      ubicacion: 'Bloque Administrativo, Piso 1',
      tipo: TipoEspacio.AUDITORIO,
    });

    spacesService.registrarEspacio({
      codigo: 'SALA-COMP-101',
      nombre: 'Sala de Cómputo y Desarrollo de Software',
      capacidad: 40,
      ubicacion: 'Pabellón de Informática, Sala 101',
      tipo: TipoEspacio.SALA_COMPUTO,
    });
  }

  if (authService.listarTodos().length === 0) {
    authService.registrarUsuario(
      {
        correoInstitucional: 'carlos.mendoza@universidad.edu.co',
        nombreCompleto: 'Carlos Mendoza',
        contrasena: 'estudiante123',
        rol: RolUsuario.ESTUDIANTE,
      },
      () => 'usr-estudiante-demo'
    );

    authService.registrarUsuario(
      {
        correoInstitucional: 'laura.sanchez@universidad.edu.co',
        nombreCompleto: 'Dra. Laura Sánchez',
        contrasena: 'docente123',
        rol: RolUsuario.DOCENTE,
      },
      () => 'usr-docente-demo'
    );

    authService.registrarUsuario(
      {
        correoInstitucional: 'roberto.silva@universidad.edu.co',
        nombreCompleto: 'Ing. Roberto Silva (Decanatura)',
        contrasena: 'admin123',
        rol: RolUsuario.ADMIN,
      },
      () => 'usr-admin-demo'
    );
  }
}
