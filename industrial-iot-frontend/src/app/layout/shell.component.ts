import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <header class="top">
      <div class="brand">
        <div class="logo">IoT</div>
        <div>
          <div class="title">Industrial IoT Monitoring</div>
          <div class="sub">Operator panel (MVP)</div>
        </div>
      </div>

      <nav class="nav">
        <a class="link" routerLink="/devices" routerLinkActive="active">Devices</a>
        <a class="link" routerLink="/simulator" routerLinkActive="active">Simulator</a>
        <a class="link" routerLink="/login" routerLinkActive="active" *ngIf="!auth.isLoggedIn()">Login</a>

        <button class="btn" *ngIf="auth.isLoggedIn()" (click)="logout()">Logout</button>
      </nav>
    </header>

    <main class="main">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .top {
      position: sticky; top: 0; z-index: 10;
      display:flex; align-items:center; justify-content:space-between; gap:12px;
      padding: 12px 14px;
      background: #fff;
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }
    .brand { display:flex; align-items:center; gap:10px; }
    .logo {
      width: 38px; height: 38px;
      border-radius: 12px;
      display:flex; align-items:center; justify-content:center;
      border: 1px solid rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.03);
      font-weight: 800;
    }
    .title { font-weight: 800; }
    .sub { opacity: 0.7; font-size: 12px; margin-top: 2px; }
    .nav { display:flex; align-items:center; gap:10px; }
    .link {
      text-decoration:none;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid transparent;
      color: inherit;
      opacity: 0.9;
    }
    .link.active {
      border-color: rgba(0,0,0,0.12);
      background: rgba(0,0,0,0.03);
      opacity: 1;
    }
    .btn {
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid rgba(0,0,0,0.12);
      background: #fff;
      cursor: pointer;
    }
    .main { padding: 10px 0; }
  `],
})
export class ShellComponent {
  constructor(public auth: AuthService) {}

  logout(): void {
    this.auth.logout();
  }
}
