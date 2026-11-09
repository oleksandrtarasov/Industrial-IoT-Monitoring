import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';
import type { DeviceSummaryDto, DeviceDetailsDto, DeviceDto, CreateDeviceRequest } from '../types/devices';

@Injectable({ providedIn: 'root' })
export class DevicesService {
  constructor(private http: HttpClient, private api: ApiService) {}


  getAll(): Observable<DeviceDto[]> {
    return this.http.get<DeviceDto[]>('/api/Devices');
  }

  getById(id: string): Observable<DeviceDto> {
    return this.http.get<DeviceDto>(`/api/Devices/${id}`);
  }

  create(req: CreateDeviceRequest): Observable<DeviceDto> {
    return this.http.post<DeviceDto>('/api/Devices', req);
  }

  update(id: string, req: CreateDeviceRequest): Observable<void> {
    return this.http.put<void>(`/api/Devices/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/Devices/${id}`);
  }

  getSummary(): Observable<DeviceSummaryDto[]> {
    return this.http.get<DeviceSummaryDto[]>(this.api.buildUrl('/Devices/summary'));
  }

  getDetails(deviceId: string): Observable<DeviceDetailsDto> {
    return this.http.get<DeviceDetailsDto>(
      this.api.buildUrl(`/Devices/${deviceId}/details`)
    );
  }
}
