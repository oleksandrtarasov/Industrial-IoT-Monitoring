import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';

export type LoginRequest = {
  userName: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  role: string;
};

const TOKEN_KEY = 'iot_access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token$ = new BehaviorSubject<string | null>(this.getToken());

  constructor(private http: HttpClient, private api: ApiService) {}

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const t = this.getToken();
    return !!t && t.length > 10; // minimalna sanity-check
  }

  setToken(token: string | null): void {
    if (token && token.length > 10) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    this.token$.next(this.getToken());
  }

  logout(): void {
    this.setToken(null);
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(this.api.buildUrl('/Auth/login'), req)
      .pipe(tap((res) => this.setToken(res.access_token)));
  }
}
