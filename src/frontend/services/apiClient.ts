import { EspacioAcademico, CrearEspacioDTO, TipoEspacio } from '../../modules/spaces/types';
import { Usuario, RegistrarUsuarioDTO, RolUsuario } from '../../modules/auth/types';
import { Reserva, EstadoReserva } from '../../modules/reservations/types';

export class ApiError extends Error {
  constructor(
    public override message: string,
    public statusCode: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private currentUserId: string | null = null;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public setUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  public getUserId(): string | null {
    return this.currentUserId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.currentUserId) {
      headers['x-user-id'] = this.currentUserId;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.message || `Error en la solicitud: ${response.statusText}`;
      const errorType = data?.error || 'HttpError';
      throw new ApiError(message, response.status, errorType);
    }

    return data as T;
  }

  // --- Auth Endpoints ---
  public async register(dto: RegistrarUsuarioDTO): Promise<Usuario> {
    return this.request<Usuario>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async login(correo: string, contrasena: string): Promise<{ usuario: Usuario; token: string }> {
    const result = await this.request<{ usuario: Usuario; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, contrasena }),
    });
    this.setUserId(result.usuario.id);
    return result;
  }

  // --- Spaces Endpoints ---
  public async listarEspacios(): Promise<EspacioAcademico[]> {
    return this.request<EspacioAcademico[]>('/spaces', {
      method: 'GET',
    });
  }

  public async registrarEspacio(dto: CrearEspacioDTO): Promise<EspacioAcademico> {
    return this.request<EspacioAcademico>('/spaces', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  public async deshabilitarEspacio(id: string): Promise<{ message: string; espacio: EspacioAcademico }> {
    return this.request<{ message: string; espacio: EspacioAcademico }>(`/spaces/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Reservations Endpoints ---
  public async listarReservas(params?: { usuarioId?: string; espacioId?: string }): Promise<Reserva[]> {
    const query = new URLSearchParams();
    if (params?.usuarioId) query.set('usuarioId', params.usuarioId);
    if (params?.espacioId) query.set('espacioId', params.espacioId);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Reserva[]>(`/reservations${qs}`, {
      method: 'GET',
    });
  }

  public async crearReserva(dto: {
    espacioId: string;
    fechaHoraInicio: string;
    fechaHoraFin: string;
    motivoAcademico: string;
    usuarioId?: string;
  }): Promise<Reserva> {
    return this.request<Reserva>('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        ...dto,
        usuarioId: dto.usuarioId || this.currentUserId,
      }),
    });
  }

  public async aprobarReserva(id: string): Promise<Reserva> {
    return this.request<Reserva>(`/reservations/${id}/approve`, {
      method: 'PATCH',
    });
  }

  public async rechazarReserva(id: string, motivoRechazo: string): Promise<Reserva> {
    return this.request<Reserva>(`/reservations/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ motivoRechazo }),
    });
  }

  public async cancelarReserva(id: string): Promise<Reserva> {
    return this.request<Reserva>(`/reservations/${id}/cancel`, {
      method: 'PATCH',
    });
  }
}

export const api = new ApiClient();
export { TipoEspacio, RolUsuario, EstadoReserva };
