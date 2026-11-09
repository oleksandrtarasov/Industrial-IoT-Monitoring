import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type MeasurementDto = {
  id: string;
  sensorId: string;
  value: number;
  timestampUtc: string;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

@Injectable({ providedIn: 'root' })
export class MeasurementsService {
  constructor(private http: HttpClient, private api: ApiService) {}

  getBySensor(
    sensorId: string,
    opts?: { from?: string; to?: string; page?: number; pageSize?: number }
  ): Observable<PagedResult<MeasurementDto>> {
    let params = new HttpParams();
    if (opts?.from) params = params.set('from', opts.from);
    if (opts?.to) params = params.set('to', opts.to);
    params = params.set('page', String(opts?.page ?? 1));
    params = params.set('pageSize', String(opts?.pageSize ?? 200));

    return this.http.get<PagedResult<MeasurementDto>>(
      this.api.buildUrl(`/Measurements/sensor/${sensorId}`),
      { params }
    );
  }
}
