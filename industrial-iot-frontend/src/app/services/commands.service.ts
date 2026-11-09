import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';
import { CommandDto } from '../types/commands';

export type CreateCommandRequest = {
  deviceId: string;
  name: string;
  payload?: string | null;
};

@Injectable({ providedIn: 'root' })
export class CommandsService {
  constructor(private http: HttpClient, private api: ApiService) {}

  create(req: CreateCommandRequest) {
    return this.http.post<CommandDto>(`/api/Commands`, req);
  }
  getByDevice(deviceId: string) {
    return this.http.get<CommandDto[]>(`/api/Commands/device/${deviceId}`);
  }
  retry(commandId: string) {
    return this.http.post<void>(`/api/Commands/${commandId}/retry`, {});
}

}
