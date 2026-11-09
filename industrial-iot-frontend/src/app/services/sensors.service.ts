import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import type { SensorDto, CreateSensorRequest, UpdateSensorRequest } from '../types/sensors';

@Injectable({ providedIn: 'root' })
export class SensorsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<SensorDto[]> {
    return this.http.get<SensorDto[]>('/api/Sensors');
  }

  getById(id: string): Observable<SensorDto> {
    return this.http.get<SensorDto>(`/api/Sensors/${id}`);
  }

  create(req: CreateSensorRequest): Observable<SensorDto> {
    return this.http.post<SensorDto>('/api/Sensors', req);
  }

  update(id: string, req: UpdateSensorRequest): Observable<void> {
    return this.http.put<void>(`/api/Sensors/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/Sensors/${id}`);
  }
}
