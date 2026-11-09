import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="wrap">
      <h2>Login</h2>
      <p class="muted">Zaloguj się jako Operator, aby wykonywać komendy i obsługiwać alerty.</p>

      <div *ngIf="error" class="error">{{ error }}</div>

      <form (ngSubmit)="submit()" class="form">
        <label>
          Username
          <input [(ngModel)]="userName" name="userName" autocomplete="username" required />
        </label>

        <label>
          Password
          <input [(ngModel)]="password" name="password" type="password" autocomplete="current-password" required />
        </label>

        <button class="btn" type="submit" [disabled]="loading">
          {{ loading ? 'Logging in…' : 'Login' }}
        </button>
      </form>

      <div class="muted" style="margin-top:12px;">
        <a [routerLink]="['/devices']">Continue without login</a>
      </div>
    </div>
  `,
  styles: [`
    .wrap { max-width: 420px; margin: 20px auto; background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:14px; padding:16px; }
    .muted { opacity: 0.75; }
    .error { margin: 12px 0; padding: 12px; border-radius: 12px; background: rgba(255,0,0,0.06); border: 1px solid rgba(255,0,0,0.15); }
    .form { display:flex; flex-direction:column; gap:12px; margin-top: 12px; }
    label { display:flex; flex-direction:column; gap:6px; font-size: 13px; }
    input { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); }
    .btn { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; }
    .btn:disabled { opacity: 0.6; cursor:not-allowed; }
  `],
})
export class LoginComponent {
  userName = '';
  password = '';

  loading = false;
  error: string | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.loading = true;
    this.error = null;

    this.auth.login({ userName: this.userName, password: this.password }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/devices']);
      },
      error: (err: any) => {
        this.loading = false;

        // Backend zwraca ValidationProblemDetails => err.error.errors
        if (err?.status === 400 && err?.error?.errors) {
          const errs = err.error.errors;
          const firstKey = Object.keys(errs)[0];
          this.error = firstKey ? `${firstKey}: ${errs[firstKey][0]}` : 'Bad request.';
          return;
        }

        this.error = err?.error?.error ?? err?.message ?? 'Login failed.';
      }
    });
  }
}
