import React, { useState, useEffect } from 'react';
import { Reserva, EstadoReserva } from '../../modules/reservations/types';
import { EspacioAcademico } from '../../modules/spaces/types';
import { api } from '../services/apiClient';

interface MisReservasProps {
  usuarioId?: string;
  espacios: EspacioAcademico[];
}

export const MisReservas: React.FC<MisReservasProps> = ({ usuarioId, espacios }) => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);

  const espaciosMap = new Map<string, EspacioAcademico>(espacios.map((e) => [e.id, e]));

  const cargarReservas = async () => {
    try {
      setCargando(true);
      setError(null);
      const data = await api.listarReservas(usuarioId ? { usuarioId } : undefined);
      setReservas(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las reservas.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReservas();
  }, [usuarioId]);

  // Regla: Cancelación permitida solo con más de 1 hora de anticipación
  const puedeCancelar = (reserva: Reserva): { permitido: boolean; motivo?: string } => {
    if (reserva.estado !== EstadoReserva.PENDIENTE && reserva.estado !== EstadoReserva.APROBADA) {
      return { permitido: false, motivo: 'La reserva ya no está activa.' };
    }

    const ahora = new Date();
    const inicio = new Date(reserva.fechaHoraInicio);
    const tiempoRestanteMs = inicio.getTime() - ahora.getTime();
    const unaHoraEnMs = 60 * 60 * 1000;

    if (tiempoRestanteMs <= unaHoraEnMs) {
      return {
        permitido: false,
        motivo: 'Solo se puede cancelar con más de 1 hora de anticipación al inicio.',
      };
    }

    return { permitido: true };
  };

  const handleCancelar = async (reservaId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return;

    try {
      setAccionEnCurso(reservaId);
      await api.cancelarReserva(reservaId);
      await cargarReservas();
    } catch (err: any) {
      alert(`Error al cancelar: ${err.message}`);
    } finally {
      setAccionEnCurso(null);
    }
  };

  const getBadgeColor = (estado: EstadoReserva) => {
    switch (estado) {
      case EstadoReserva.APROBADA:
        return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case EstadoReserva.PENDIENTE:
        return { bg: '#fef9c3', text: '#854d0e', border: '#fef08a' };
      case EstadoReserva.RECHAZADA:
        return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      case EstadoReserva.CANCELADA:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b' }}>Mis Solicitudes y Reservas</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Historial de solicitudes, estados de aprobación y gestión de cancelaciones.
          </p>
        </div>
        <button
          onClick={cargarReservas}
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

      {cargando && <p style={{ color: '#0284c7' }}>Cargando reservas...</p>}
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!cargando && reservas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          Aún no tienes solicitudes de reserva registradas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reservas.map((r) => {
            const espacio = espaciosMap.get(r.espacioId);
            const badge = getBadgeColor(r.estado);
            const cancelInfo = puedeCancelar(r);

            return (
              <div
                key={r.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: '1 1 350px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                      {espacio ? espacio.nombre : `Espacio ID: ${r.espacioId}`}
                    </h3>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: badge.bg,
                        color: badge.text,
                        borderRadius: '999px',
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {r.estado}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: '1.5' }}>
                    <p style={{ margin: '0.2rem 0' }}>
                      <strong>Inicio:</strong> {new Date(r.fechaHoraInicio).toLocaleString()}
                    </p>
                    <p style={{ margin: '0.2rem 0' }}>
                      <strong>Fin:</strong> {new Date(r.fechaHoraFin).toLocaleString()}
                    </p>
                    <p style={{ margin: '0.2rem 0' }}>
                      <strong>Motivo Académico:</strong> {r.motivoAcademico}
                    </p>

                    {r.estado === EstadoReserva.RECHAZADA && r.motivoRechazo && (
                      <p style={{ margin: '0.4rem 0', color: '#b91c1c', fontWeight: 500 }}>
                        <strong>Motivo de Rechazo:</strong> {r.motivoRechazo}
                      </p>
                    )}

                    {r.evaluadorId && (
                      <p style={{ margin: '0.2rem 0', color: '#64748b', fontSize: '0.8rem' }}>
                        Evaluado por: {r.evaluadorId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div>
                  {(r.estado === EstadoReserva.PENDIENTE || r.estado === EstadoReserva.APROBADA) && (
                    <div>
                      <button
                        onClick={() => handleCancelar(r.id)}
                        disabled={!cancelInfo.permitido || accionEnCurso === r.id}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: cancelInfo.permitido ? '#ef4444' : '#f1f5f9',
                          color: cancelInfo.permitido ? '#ffffff' : '#94a3b8',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: cancelInfo.permitido ? 'pointer' : 'not-allowed',
                          fontSize: '0.88rem',
                        }}
                      >
                        {accionEnCurso === r.id ? 'Cancelando...' : 'Cancelar Reserva'}
                      </button>
                      {!cancelInfo.permitido && cancelInfo.motivo && (
                        <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8', maxWidth: '200px' }}>
                          {cancelInfo.motivo}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
