import React, { useState, useEffect } from 'react';
import { Reserva, EstadoReserva } from '../../modules/reservations/types';
import { EspacioAcademico, TipoEspacio } from '../../modules/spaces/types';
import { api } from '../services/apiClient';

interface AdminPanelProps {
  espacios: EspacioAcademico[];
  onEspaciosActualizados: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  espacios,
  onEspaciosActualizados,
}) => {
  const [pestanaActiva, setPestanaActiva] = useState<'RESERVAS' | 'ESPACIOS'>('RESERVAS');

  // Estado para Solicitudes
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargandoReservas, setCargandoReservas] = useState<boolean>(true);
  const [filtroEstado, setFiltroEstado] = useState<string>('PENDIENTE');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Estado para Modal de Rechazo Obligatorio
  const [reservaParaRechazar, setReservaParaRechazar] = useState<Reserva | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string>('');
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Estado para Crear Espacio
  const [nuevoCodigo, setNuevoCodigo] = useState<string>('');
  const [nuevoNombre, setNuevoNombre] = useState<string>('');
  const [nuevaCapacidad, setNuevaCapacidad] = useState<number>(30);
  const [nuevaUbicacion, setNuevaUbicacion] = useState<string>('');
  const [nuevoTipo, setNuevoTipo] = useState<TipoEspacio>(TipoEspacio.LABORATORIO);
  const [creandoEspacio, setCreandoEspacio] = useState<boolean>(false);
  const [mensajeEspacio, setMensajeEspacio] = useState<string | null>(null);

  const espaciosMap = new Map<string, EspacioAcademico>(espacios.map((e) => [e.id, e]));

  const cargarReservas = async () => {
    try {
      setCargandoReservas(true);
      const data = await api.listarReservas();
      setReservas(data);
    } catch (err: any) {
      console.error('Error al cargar reservas:', err);
    } finally {
      setCargandoReservas(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, []);

  const handleAprobar = async (id: string) => {
    if (!window.confirm('¿Aprobar esta solicitud de reserva?')) return;
    try {
      setProcesandoId(id);
      await api.aprobarReserva(id);
      await cargarReservas();
    } catch (err: any) {
      alert(`Error al aprobar: ${err.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirModalRechazo = (reserva: Reserva) => {
    setReservaParaRechazar(reserva);
    setMotivoRechazo('');
    setErrorModal(null);
  };

  const handleConfirmarRechazo = async () => {
    if (!reservaParaRechazar) return;

    if (!motivoRechazo || motivoRechazo.trim().length === 0) {
      setErrorModal('El motivo de rechazo es obligatorio para declinar la solicitud.');
      return;
    }

    try {
      setProcesandoId(reservaParaRechazar.id);
      await api.rechazarReserva(reservaParaRechazar.id, motivoRechazo.trim());
      setReservaParaRechazar(null);
      await cargarReservas();
    } catch (err: any) {
      setErrorModal(err.message || 'Error al rechazar la reserva.');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCrearEspacio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreandoEspacio(true);
      setMensajeEspacio(null);

      await api.registrarEspacio({
        codigo: nuevoCodigo.trim(),
        nombre: nuevoNombre.trim(),
        capacidad: nuevaCapacidad,
        ubicacion: nuevaUbicacion.trim(),
        tipo: nuevoTipo,
      });

      setMensajeEspacio(`Espacio '${nuevoNombre}' registrado con éxito.`);
      setNuevoCodigo('');
      setNuevoNombre('');
      setNuevaUbicacion('');
      onEspaciosActualizados();
    } catch (err: any) {
      setMensajeEspacio(`Error: ${err.message}`);
    } finally {
      setCreandoEspacio(false);
    }
  };

  const handleDeshabilitarEspacio = async (id: string) => {
    if (!window.confirm('¿Deshabilitar lógicamente este espacio académico?')) return;
    try {
      await api.deshabilitarEspacio(id);
      onEspaciosActualizados();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const reservasFiltradas = reservas.filter((r) =>
    filtroEstado === 'TODAS' ? true : r.estado === filtroEstado
  );

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>Panel de Administración Institucional</h2>
        <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
          Gestión de solicitudes de reserva (RBAC) y catálogo de espacios académicos.
        </p>
      </div>

      {/* Navegación de Pestañas del Panel */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setPestanaActiva('RESERVAS')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: pestanaActiva === 'RESERVAS' ? '3px solid #0284c7' : 'none',
            color: pestanaActiva === 'RESERVAS' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Evaluación de Solicitudes ({reservas.filter((r) => r.estado === EstadoReserva.PENDIENTE).length} pendientes)
        </button>
        <button
          onClick={() => setPestanaActiva('ESPACIOS')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: pestanaActiva === 'ESPACIOS' ? '3px solid #0284c7' : 'none',
            color: pestanaActiva === 'ESPACIOS' ? '#0284c7' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Gestión de Espacios ({espacios.length})
        </button>
      </div>

      {/* Pestaña: EVALUACIÓN DE SOLICITUDES */}
      {pestanaActiva === 'RESERVAS' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA', 'TODAS'].map((estado) => (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: filtroEstado === estado ? '#0f172a' : '#ffffff',
                    color: filtroEstado === estado ? '#ffffff' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {estado}
                </button>
              ))}
            </div>

            <button
              onClick={cargarReservas}
              style={{
                padding: '0.4rem 0.8rem',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Recargar
            </button>
          </div>

          {cargandoReservas ? (
            <p style={{ color: '#0284c7' }}>Cargando solicitudes...</p>
          ) : reservasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No hay solicitudes en estado {filtroEstado}.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reservasFiltradas.map((r) => {
                const espacio = espaciosMap.get(r.espacioId);
                const esPendiente = r.estado === EstadoReserva.PENDIENTE;

                return (
                  <div
                    key={r.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>
                          {espacio ? espacio.nombre : r.espacioId}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor:
                              r.estado === EstadoReserva.APROBADA
                                ? '#dcfce7'
                                : r.estado === EstadoReserva.PENDIENTE
                                ? '#fef9c3'
                                : '#fee2e2',
                            color:
                              r.estado === EstadoReserva.APROBADA
                                ? '#166534'
                                : r.estado === EstadoReserva.PENDIENTE
                                ? '#854d0e'
                                : '#991b1b',
                          }}
                        >
                          {r.estado}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.4' }}>
                        <p style={{ margin: '0.2rem 0' }}>
                          <strong>Solicitante:</strong> {r.usuarioId}
                        </p>
                        <p style={{ margin: '0.2rem 0' }}>
                          <strong>Horario:</strong> {new Date(r.fechaHoraInicio).toLocaleString()} -{' '}
                          {new Date(r.fechaHoraFin).toLocaleTimeString()}
                        </p>
                        <p style={{ margin: '0.2rem 0' }}>
                          <strong>Motivo Académico:</strong> {r.motivoAcademico}
                        </p>
                        {r.motivoRechazo && (
                          <p style={{ margin: '0.2rem 0', color: '#b91c1c' }}>
                            <strong>Justificación de Rechazo:</strong> {r.motivoRechazo}
                          </p>
                        )}
                      </div>
                    </div>

                    {esPendiente && (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleAprobar(r.id)}
                          disabled={procesandoId === r.id}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => abrirModalRechazo(r)}
                          disabled={procesandoId === r.id}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: GESTIÓN DE ESPACIOS */}
      {pestanaActiva === 'ESPACIOS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Formulario para registrar espacio */}
          <div
            style={{
              padding: '1.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Registrar Nuevo Espacio</h3>

            {mensajeEspacio && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  backgroundColor: mensajeEspacio.startsWith('Error') ? '#fee2e2' : '#dcfce7',
                  color: mensajeEspacio.startsWith('Error') ? '#991b1b' : '#166534',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                {mensajeEspacio}
              </div>
            )}

            <form onSubmit={handleCrearEspacio} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                  Código Único:
                </label>
                <input
                  type="text"
                  placeholder="Ej: AUD-MAGNO"
                  value={nuevoCodigo}
                  onChange={(e) => setNuevoCodigo(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                  Nombre del Espacio:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Auditorio de Posgrados"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                  Tipo de Espacio:
                </label>
                <select
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value as TipoEspacio)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  <option value={TipoEspacio.LABORATORIO}>Laboratorio</option>
                  <option value={TipoEspacio.AUDITORIO}>Auditorio</option>
                  <option value={TipoEspacio.SALA_COMPUTO}>Sala de Cómputo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                  Capacidad de Aforo:
                </label>
                <input
                  type="number"
                  min="1"
                  value={nuevaCapacidad}
                  onChange={(e) => setNuevaCapacidad(parseInt(e.target.value, 10))}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#334155' }}>
                  Ubicación Física:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Bloque B, Piso 1"
                  value={nuevaUbicacion}
                  onChange={(e) => setNuevaUbicacion(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={creandoEspacio}
                style={{
                  padding: '0.7rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {creandoEspacio ? 'Guardando...' : 'Crear Espacio'}
              </button>
            </form>
          </div>

          {/* Listado para deshabilitar lógicamente */}
          <div
            style={{
              padding: '1.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a' }}>Catálogo Existente</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {espacios.map((esp) => (
                <div
                  key={esp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    border: '1px solid #f1f5f9',
                    borderRadius: '6px',
                    backgroundColor: esp.activo ? '#ffffff' : '#f8fafc',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{esp.nombre}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      ({esp.codigo})
                    </span>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {esp.tipo} | Aforo: {esp.capacidad} |{' '}
                      <span style={{ color: esp.activo ? '#16a34a' : '#dc2626' }}>
                        {esp.activo ? 'Activo' : 'Deshabilitado'}
                      </span>
                    </div>
                  </div>

                  {esp.activo && (
                    <button
                      onClick={() => handleDeshabilitarEspacio(esp.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Deshabilitar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL OBLIGATORIO DE RECHAZO */}
      {reservaParaRechazar && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.75rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#b91c1c' }}>Rechazar Solicitud de Reserva</h3>
            <p style={{ margin: '0 0 1rem 0', color: '#475569', fontSize: '0.9rem' }}>
              De acuerdo con la especificación institucional, debes ingresar obligatoriamente una justificación académica o técnica para declinar esta solicitud.
            </p>

            {errorModal && (
              <div
                style={{
                  padding: '0.6rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                {errorModal}
              </div>
            )}

            <textarea
              rows={4}
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Ingresa el motivo obligatorio del rechazo..."
              required
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontSize: '0.95rem',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => setReservaParaRechazar(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRechazo}
                disabled={!motivoRechazo.trim() || procesandoId === reservaParaRechazar.id}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: motivoRechazo.trim() ? '#dc2626' : '#94a3b8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: motivoRechazo.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
