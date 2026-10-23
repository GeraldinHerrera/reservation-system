import React, { useState, useEffect } from 'react';
import { EspacioAcademico } from '../modules/spaces/types';
import { RolUsuario, Usuario } from '../modules/auth/types';
import { api } from './services/apiClient';
import { EspaciosList } from './components/EspaciosList';
import { ReservaForm } from './components/ReservaForm';
import { MisReservas } from './components/MisReservas';
import { AdminPanel } from './components/AdminPanel';

// Usuarios de demostración para alternar roles RBAC en la interfaz
const USUARIOS_DEMO: Usuario[] = [
  {
    id: 'usr-estudiante-demo',
    correoInstitucional: 'carlos.estudiante@universidad.edu.co',
    nombreCompleto: 'Carlos Mendoza (Estudiante)',
    contrasenaEncriptada: 'hash',
    rol: RolUsuario.ESTUDIANTE,
    activo: true,
  },
  {
    id: 'usr-docente-demo',
    correoInstitucional: 'laura.docente@universidad.edu.co',
    nombreCompleto: 'Dra. Laura Sánchez (Docente)',
    contrasenaEncriptada: 'hash',
    rol: RolUsuario.DOCENTE,
    activo: true,
  },
  {
    id: 'usr-admin-demo',
    correoInstitucional: 'decanatura@universidad.edu.co',
    nombreCompleto: 'Ing. Roberto Silva (Administrador Decanatura)',
    contrasenaEncriptada: 'hash',
    rol: RolUsuario.ADMIN,
    activo: true,
  },
];

export const App: React.FC = () => {
  const [usuarioActual, setUsuarioActual] = useState<Usuario>(USUARIOS_DEMO[0]);
  const [seccionActiva, setSeccionActiva] = useState<'ESPACIOS' | 'RESERVAR' | 'MIS_RESERVAS' | 'ADMIN'>('ESPACIOS');
  const [espacios, setEspacios] = useState<EspacioAcademico[]>([]);
  const [espacioParaReservar, setEspacioParaReservar] = useState<EspacioAcademico | null>(null);

  // Sincronizar usuario activo con el cliente API
  useEffect(() => {
    api.setUserId(usuarioActual.id);
  }, [usuarioActual]);

  const cargarEspacios = async () => {
    try {
      const data = await api.listarEspacios();
      setEspacios(data);
    } catch (error) {
      console.error('Error al cargar espacios en App:', error);
    }
  };

  useEffect(() => {
    cargarEspacios();
  }, []);

  const handleSeleccionarEspacioParaReserva = (espacio: EspacioAcademico) => {
    setEspacioParaReservar(espacio);
    setSeccionActiva('RESERVAR');
  };

  const handleCambiarUsuario = (usuarioId: string) => {
    const seleccionado = USUARIOS_DEMO.find((u) => u.id === usuarioId);
    if (seleccionado) {
      setUsuarioActual(seleccionado);
      // Si el nuevo rol no es ADMIN y estaba en la sección ADMIN, volver a ESPACIOS
      if (seleccionado.rol !== RolUsuario.ADMIN && seccionActiva === 'ADMIN') {
        setSeccionActiva('ESPACIOS');
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Barra de Encabezado Principal */}
      <header
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Sistema de Gestión de Reservas de Espacios Académicos
          </h1>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Gestión de laboratorios, auditorios y salas de cómputo (OpenSpec)
          </span>
        </div>

        {/* Selector Interactivo de Rol y Usuario RBAC */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#1e293b', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Simular Usuario:</span>
          <select
            value={usuarioActual.id}
            onChange={(e) => handleCambiarUsuario(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #475569',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {USUARIOS_DEMO.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto} [{u.rol}]
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Menú de Navegación por Secciones */}
      <nav
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 2rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setSeccionActiva('ESPACIOS')}
          style={{
            padding: '1rem 0.75rem',
            background: 'none',
            border: 'none',
            borderBottom: seccionActiva === 'ESPACIOS' ? '3px solid #0284c7' : 'none',
            color: seccionActiva === 'ESPACIOS' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Espacios Académicos
        </button>

        <button
          onClick={() => {
            setEspacioParaReservar(null);
            setSeccionActiva('RESERVAR');
          }}
          style={{
            padding: '1rem 0.75rem',
            background: 'none',
            border: 'none',
            borderBottom: seccionActiva === 'RESERVAR' ? '3px solid #0284c7' : 'none',
            color: seccionActiva === 'RESERVAR' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Solicitar Reserva
        </button>

        <button
          onClick={() => setSeccionActiva('MIS_RESERVAS')}
          style={{
            padding: '1rem 0.75rem',
            background: 'none',
            border: 'none',
            borderBottom: seccionActiva === 'MIS_RESERVAS' ? '3px solid #0284c7' : 'none',
            color: seccionActiva === 'MIS_RESERVAS' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          Mis Reservas
        </button>

        {/* Pestaña de Administración visible/habilitada condicionalmente */}
        <button
          onClick={() => setSeccionActiva('ADMIN')}
          style={{
            padding: '1rem 0.75rem',
            background: 'none',
            border: 'none',
            borderBottom: seccionActiva === 'ADMIN' ? '3px solid #0284c7' : 'none',
            color:
              usuarioActual.rol === RolUsuario.ADMIN
                ? seccionActiva === 'ADMIN'
                  ? '#0284c7'
                  : '#64748b'
                : '#cbd5e1',
            fontWeight: 600,
            cursor: usuarioActual.rol === RolUsuario.ADMIN ? 'pointer' : 'not-allowed',
            fontSize: '0.95rem',
          }}
        >
          Panel de Administración {usuarioActual.rol !== RolUsuario.ADMIN ? '(Solo ADMIN)' : ''}
        </button>
      </nav>

      {/* Contenedor del Cuerpo de la Aplicación */}
      <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        {seccionActiva === 'ESPACIOS' && (
          <EspaciosList onSelectEspacio={handleSeleccionarEspacioParaReserva} />
        )}

        {seccionActiva === 'RESERVAR' && (
          <ReservaForm
            espacios={espacios}
            espacioSeleccionado={espacioParaReservar}
            onReservaExitosa={() => {
              setSeccionActiva('MIS_RESERVAS');
            }}
          />
        )}

        {seccionActiva === 'MIS_RESERVAS' && (
          <MisReservas usuarioId={usuarioActual.id} espacios={espacios} />
        )}

        {seccionActiva === 'ADMIN' && (
          <div>
            {usuarioActual.rol === RolUsuario.ADMIN ? (
              <AdminPanel
                espacios={espacios}
                onEspaciosActualizados={cargarEspacios}
              />
            ) : (
              <div
                style={{
                  padding: '2rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Acceso Restringido (HTTP 403 Prohibido)</h3>
                <p style={{ margin: 0 }}>
                  Únicamente los usuarios con rol <strong>ADMIN</strong> tienen autorización para acceder a la bandeja de evaluación de reservas y administración de catálogo.
                  Utiliza el selector superior para cambiar al usuario con rol Administrador.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
