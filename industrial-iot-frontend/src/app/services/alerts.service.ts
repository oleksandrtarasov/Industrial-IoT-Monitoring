import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  constructor(private http: HttpClient, private api: ApiService) {}

  ack(alertId: string): Observable<void> {
    return this.http.post<void>(this.api.buildUrl(`/Alerts/${alertId}/ack`), {});
  }

  clear(alertId: string): Observable<void> {
    return this.http.post<void>(this.api.buildUrl(`/Alerts/${alertId}/clear`), {});
  }
}
