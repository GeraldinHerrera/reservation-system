import React, { useState, useEffect } from 'react';
import { EspacioAcademico } from '../../modules/spaces/types';
import { api, ApiError } from '../services/apiClient';

interface ReservaFormProps {
  espacios: EspacioAcademico[];
  espacioSeleccionado?: EspacioAcademico | null;
  onReservaExitosa?: () => void;
}

export const ReservaForm: React.FC<ReservaFormProps> = ({
  espacios,
  espacioSeleccionado,
  onReservaExitosa,
}) => {
  const [espacioId, setEspacioId] = useState<string>('');
  const [fechaHoraInicio, setFechaHoraInicio] = useState<string>('');
  const [fechaHoraFin, setFechaHoraFin] = useState<string>('');
  const [motivoAcademico, setMotivoAcademico] = useState<string>('');

  const [enviando, setEnviando] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    if (espacioSeleccionado) {
      setEspacioId(espacioSeleccionado.id);
    } else if (espacios.length > 0 && !espacioId) {
      setEspacioId(espacios[0].id);
    }
  }, [espacioSeleccionado, espacios, espacioId]);

  // Cálculo de anticipación en tiempo real para validación visual
  const calcularAnticipacion = (): {
    esValida: boolean;
    mensaje: string;
    diferenciaHoras: number;
  } => {
    if (!fechaHoraInicio) {
      return { esValida: false, mensaje: 'Selecciona una fecha y hora de inicio.', diferenciaHoras: 0 };
    }

    const ahora = new Date();
    const inicio = new Date(fechaHoraInicio);

    if (isNaN(inicio.getTime())) {
      return { esValida: false, mensaje: 'Fecha de inicio inválida.', diferenciaHoras: 0 };
    }

    const diferenciaMs = inicio.getTime() - ahora.getTime();
    const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);

    if (diferenciaMs <= 0) {
      return {
        esValida: false,
        mensaje: 'La fecha y hora de inicio no puede estar en el pasado.',
        diferenciaHoras,
      };
    }

    if (diferenciaHoras < 2) {
      const horas = Math.floor(diferenciaHoras);
      const minutos = Math.floor((diferenciaHoras - horas) * 60);
      return {
        esValida: false,
        mensaje: `Anticipación insuficiente: faltan ${horas}h ${minutos}m. La regla institucional exige al menos 2 horas de anticipación.`,
        diferenciaHoras,
      };
    }

    const horas = Math.floor(diferenciaHoras);
    const minutos = Math.floor((diferenciaHoras - horas) * 60);
    return {
      esValida: true,
      mensaje: `Cumple la regla de anticipación (${horas}h ${minutos}m de antelación).`,
      diferenciaHoras,
    };
  };

  const validacionAnticipacion = calcularAnticipacion();

  // Validación de rango temporal fin > inicio
  const esRangoFechasValido = (): boolean => {
    if (!fechaHoraInicio || !fechaHoraFin) return false;
    const inicio = new Date(fechaHoraInicio);
    const fin = new Date(fechaHoraFin);
    return fin.getTime() > inicio.getTime();
  };

  const formularioValido =
    Boolean(espacioId) &&
    validacionAnticipacion.esValida &&
    esRangoFechasValido() &&
    motivoAcademico.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formularioValido) return;

    try {
      setEnviando(true);
      setMensajeError(null);
      setMensajeExito(null);

      const nuevaReserva = await api.crearReserva({
        espacioId,
        fechaHoraInicio: new Date(fechaHoraInicio).toISOString(),
        fechaHoraFin: new Date(fechaHoraFin).toISOString(),
        motivoAcademico: motivoAcademico.trim(),
      });

      setMensajeExito(
        `¡Solicitud de reserva registrada con éxito! Código: ${nuevaReserva.id}. Estado inicial: PENDIENTE.`
      );
      setMotivoAcademico('');
      setFechaHoraInicio('');
      setFechaHoraFin('');

      if (onReservaExitosa) {
        onReservaExitosa();
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setMensajeError(
          'Conflicto de Horario (409): Ya existe otra reserva activa para este espacio en el intervalo seleccionado.'
        );
      } else {
        setMensajeError(err.message || 'Error al procesar la reserva.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '650px',
        margin: '0 auto',
        padding: '2rem',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        fontFamily: 'Segoe UI, sans-serif',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Solicitud de Reserva de Espacio</h2>
      <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.95rem' }}>
        Diligencia el formulario. Se validará automáticamente la disponibilidad y el cumplimiento de al menos 2 horas de anticipación.
      </p>

      {mensajeExito && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            border: '1px solid #bbf7d0',
            fontWeight: 500,
          }}
        >
          {mensajeExito}
        </div>
      )}

      {mensajeError && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '1.25rem',
            border: '1px solid #fecaca',
            fontWeight: 500,
          }}
        >
          {mensajeError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Selector de Espacio */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
            Espacio Académico:
          </label>
          <select
            value={espacioId}
            onChange={(e) => setEspacioId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.95rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">-- Selecciona un espacio --</option>
            {espacios.map((e) => (
              <option key={e.id} value={e.id} disabled={!e.activo}>
                {e.nombre} ({e.codigo}) - Capacidad: {e.capacidad} {!e.activo ? '[Inactivo]' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha y Hora de Inicio */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
            Fecha y Hora de Inicio:
          </label>
          <input
            type="datetime-local"
            value={fechaHoraInicio}
            onChange={(e) => setFechaHoraInicio(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: '6px',
              border: `1px solid ${
                fechaHoraInicio
                  ? validacionAnticipacion.esValida
                    ? '#22c55e'
                    : '#ef4444'
                  : '#cbd5e1'
              }`,
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />

          {/* Validación visual interactiva de las 2 horas */}
          {fechaHoraInicio && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 500,
                backgroundColor: validacionAnticipacion.esValida ? '#f0fdf4' : '#fef2f2',
                color: validacionAnticipacion.esValida ? '#15803d' : '#b91c1c',
                border: `1px solid ${validacionAnticipacion.esValida ? '#bbf7d0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>{validacionAnticipacion.esValida ? '✓' : '⚠'}</span>
              <span>{validacionAnticipacion.mensaje}</span>
            </div>
          )}
        </div>

        {/* Fecha y Hora de Fin */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
            Fecha y Hora de Fin:
          </label>
          <input
            type="datetime-local"
            value={fechaHoraFin}
            onChange={(e) => setFechaHoraFin(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: '6px',
              border: `1px solid ${
                fechaHoraFin && !esRangoFechasValido() ? '#ef4444' : '#cbd5e1'
              }`,
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />
          {fechaHoraFin && !esRangoFechasValido() && (
            <p style={{ margin: '0.4rem 0 0 0', color: '#dc2626', fontSize: '0.85rem' }}>
              La fecha y hora de fin debe ser posterior a la de inicio.
            </p>
          )}
        </div>

        {/* Motivo Académico */}
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', color: '#334155' }}>
            Motivo Académico:
          </label>
          <textarea
            value={motivoAcademico}
            onChange={(e) => setMotivoAcademico(e.target.value)}
            rows={3}
            placeholder="Describe la justificación académica (ej: Taller práctico de redes, sustentación de tesis, examen parcial)..."
            required
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={!formularioValido || enviando}
          style={{
            padding: '0.8rem 1.5rem',
            backgroundColor: formularioValido && !enviando ? '#0284c7' : '#94a3b8',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '1rem',
            border: 'none',
            borderRadius: '6px',
            cursor: formularioValido && !enviando ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s',
            marginTop: '0.5rem',
          }}
        >
          {enviando ? 'Verificando y Reservando...' : 'Enviar Solicitud de Reserva'}
        </button>
      </form>
    </div>
  );
};
