import React, { useState, useEffect } from 'react';
import { EspacioAcademico, TipoEspacio } from '../../modules/spaces/types';
import { api } from '../services/apiClient';

interface EspaciosListProps {
  onSelectEspacio?: (espacio: EspacioAcademico) => void;
}

export const EspaciosList: React.FC<EspaciosListProps> = ({ onSelectEspacio }) => {
  const [espacios, setEspacios] = useState<EspacioAcademico[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  const cargarEspacios = async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await api.listarEspacios();
      setEspacios(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los espacios académicos.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEspacios();
  }, []);

  const espaciosFiltrados = espacios.filter((e) => {
    const coincideTipo = filtroTipo === 'TODOS' || e.tipo === filtroTipo;
    const coincideBusqueda =
      e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      e.ubicacion.toLowerCase().includes(busqueda.toLowerCase());
    return coincideTipo && coincideBusqueda;
  });

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Catálogo de Espacios Académicos</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Consulta la disponibilidad, aforo y características técnicas de cada espacio.
          </p>
        </div>
        <button
          onClick={cargarEspacios}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Actualizar
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, código o ubicación..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            flex: '1 1 250px',
            padding: '0.6rem 0.8rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.95rem',
          }}
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.95rem',
            backgroundColor: '#fff',
          }}
        >
          <option value="TODOS">Todos los tipos</option>
          <option value={TipoEspacio.LABORATORIO}>Laboratorios</option>
          <option value={TipoEspacio.AUDITORIO}>Auditorios</option>
          <option value={TipoEspacio.SALA_COMPUTO}>Salas de Cómputo</option>
        </select>
      </div>

      {/* Estados de Carga y Error */}
      {cargando && <p style={{ color: '#0284c7' }}>Cargando espacios académicos...</p>}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Cuadrícula de Tarjetas de Espacios */}
      {!cargando && espaciosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No se encontraron espacios académicos que coincidan con los criterios.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {espaciosFiltrados.map((espacio) => {
            const colorTipo =
              espacio.tipo === TipoEspacio.LABORATORIO
                ? '#10b981'
                : espacio.tipo === TipoEspacio.AUDITORIO
                ? '#8b5cf6'
                : '#3b82f6';

            return (
              <div
                key={espacio.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      {espacio.codigo}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: colorTipo,
                        border: `1px solid ${colorTipo}`,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '12px',
                      }}
                    >
                      {espacio.tipo}
                    </span>
                  </div>

                  <h3 style={{ margin: '0.5rem 0', color: '#0f172a', fontSize: '1.15rem' }}>
                    {espacio.nombre}
                  </h3>

                  <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.75rem', lineHeight: '1.4' }}>
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Capacidad:</strong> {espacio.capacidad} personas
                    </p>
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Ubicación:</strong> {espacio.ubicacion}
                    </p>
                    <p style={{ margin: '0.25rem 0' }}>
                      <strong>Estado:</strong>{' '}
                      <span style={{ color: espacio.activo ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {espacio.activo ? 'Disponible' : 'Deshabilitado'}
                      </span>
                    </p>
                  </div>
                </div>

                {onSelectEspacio && espacio.activo && (
                  <button
                    onClick={() => onSelectEspacio(espacio)}
                    style={{
                      marginTop: '1rem',
                      width: '100%',
                      padding: '0.6rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    Reservar este Espacio
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
