import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DevicesService } from '../services/devices.service';
import { DeviceSummaryDto } from '../types/devices';

@Component({
  standalone: true,
  selector: 'app-devices-list',
  imports: [CommonModule, RouterLink, DatePipe],
  template: `
    <div class="header">
      <h2>Devices</h2>

      <div class="header-actions">
        <a class="btn primary" routerLink="/devices/new">+ Add device</a>

        <button class="btn" (click)="reload()" [disabled]="loading">
          {{ loading ? 'Loading…' : 'Reload' }}
        </button>
      </div>
    </div>

    <div *ngIf="error" class="error">
      {{ error }}
    </div>

    <div *ngIf="!loading && !error && devices.length === 0" class="empty">
      No devices.
    </div>

    <div class="table-wrap" *ngIf="devices.length > 0">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Location</th>
            <th>Status</th>
            <th class="num">Sensors</th>
            <th class="num">Active alerts</th>
            <th>Last measurement</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr *ngFor="let d of devices">
            <td class="name">{{ d.name }}</td>
            <td>{{ d.location }}</td>
            <td>
              <span class="pill" [class.alert]="d.activeAlerts > 0">
                {{ d.status }}
              </span>
            </td>
            <td class="num">{{ d.sensorsCount }}</td>
            <td class="num">
              <span class="pill" [class.alert]="d.activeAlerts > 0">
                {{ d.activeAlerts }}
              </span>
            </td>
            <td>
              <span *ngIf="d.lastMeasurementUtc; else noTs">
                {{ d.lastMeasurementUtc | date : 'yyyy-MM-dd HH:mm:ss' : 'UTC' }} UTC
              </span>
              <ng-template #noTs>
                <span class="muted">—</span>
              </ng-template>
            </td>
            <td class="actions">
              <a class="link" [routerLink]="['/devices', d.deviceId]">Details →</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [
    `
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .btn {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        background: #fff;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn.primary {
        font-weight: 700;
      }

      .error {
        padding: 12px;
        border-radius: 12px;
        background: rgba(255, 0, 0, 0.06);
        border: 1px solid rgba(255, 0, 0, 0.15);
        margin: 12px 0;
      }
      .empty {
        opacity: 0.7;
        margin-top: 10px;
      }
      .muted {
        opacity: 0.65;
      }

      .table-wrap {
        overflow: auto;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        background: #fff;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      thead th {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        white-space: nowrap;
      }

      tbody td {
        padding: 12px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        vertical-align: middle;
      }

      tbody tr:hover {
        background: rgba(0, 0, 0, 0.02);
      }

      .num {
        text-align: right;
        width: 1%;
        white-space: nowrap;
      }

      .name {
        font-weight: 600;
      }

      .actions {
        text-align: right;
        width: 1%;
        white-space: nowrap;
      }

      .link {
        text-decoration: none;
        font-weight: 600;
      }

      .pill {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.06);
        border: 1px solid rgba(0, 0, 0, 0.08);
        font-size: 12px;
      }
      .pill.alert {
        background: rgba(255, 0, 0, 0.08);
        border-color: rgba(255, 0, 0, 0.18);
      }
    `,
  ],
})
export class DevicesListComponent implements OnInit {
  devices: DeviceSummaryDto[] = [];
  loading = false;
  error: string | null = null;

  constructor(private devicesApi: DevicesService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    this.error = null;

    this.devicesApi.getSummary().subscribe({
      next: (items: DeviceSummaryDto[]) => {
        this.devices = items ?? [];
        this.loading = false;
      },
      error: (err: unknown) => {
        this.loading = false;

        const msg =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to load devices. Check backend/proxy and try again.';

        this.error = msg;
      },
    });
  }
}
