import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly baseUrl = '/api';

  buildUrl(path: string): string {
    if (!path.startsWith('/')) path = '/' + path;
    return this.baseUrl + path;
  }
}
