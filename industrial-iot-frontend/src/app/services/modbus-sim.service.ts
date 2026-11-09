import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type HoldingItem = { address: number; value: number };
export type HoldingResponse = { from: number; count: number; items: HoldingItem[] };

@Injectable({ providedIn: 'root' })
export class ModbusSimService {
  private readonly baseUrl = 'http://127.0.0.1:3001';

  constructor(private http: HttpClient) {}

  getHolding(from = 0, count = 20): Observable<HoldingResponse> {
    return this.http.get<HoldingResponse>(`${this.baseUrl}/api/holding?from=${from}&count=${count}`);
  }

  setHolding(address: number, value: number): Observable<{ address: number; value: number }> {
    return this.http.put<{ address: number; value: number }>(
      `${this.baseUrl}/api/holding/${address}`,
      { value }
    );
  }
}
