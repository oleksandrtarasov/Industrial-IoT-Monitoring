export interface CommandDto {
  id: string;
  deviceId: string;
  name: string;
  payload?: string | null;
  status: string;
  requestedAtUtc: string;
  executedAtUtc?: string | null;
  error?: string | null;
}

export interface CreateCommandRequest {
  deviceId: string;
  name: string;
  payload?: string | null;
}
