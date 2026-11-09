import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EMPTY, Subscription, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { DevicesService } from '../services/devices.service';
import { AlertsService } from '../services/alerts.service';
import { CommandsService } from '../services/commands.service';
import { ModbusSimService, HoldingItem } from '../services/modbus-sim.service';

import { SensorChartComponent } from './sensor-chart.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

import type { DeviceDetailsDto } from '../types/devices';

type CommandVm = {
  id: string;
  deviceId: string;
  name: string;
  payload?: string | null;
  status: string;
  requestedAtUtc: string;
  executedAtUtc?: string | null;
  error?: string | null;
};

@Component({
  standalone: true,
  selector: 'app-device-details',
  imports: [CommonModule, RouterLink, DatePipe, FormsModule, SensorChartComponent, ConfirmDialogComponent],
  template: `
    <a class="back" [routerLink]="['/devices']">← back</a>

    <div *ngIf="loading" class="muted">Loading…</div>
    <div *ngIf="error" class="error">{{ error }}</div>

    <ng-container *ngIf="vm as d">
      <div class="header">
        <div>
          <h2>{{ d.name }}</h2>
          <div class="muted">{{ d.location }} • {{ d.status }}</div>
        </div>

        <div class="actions">
          <a class="btn" [routerLink]="['/devices', d.deviceId, 'edit']">Edit</a>

          <button class="btn danger" (click)="openDelete()" [disabled]="deleting">
            Delete
          </button>

          <button class="btn" (click)="reloadAll()" [disabled]="loading">Reload</button>
        </div>
      </div>

      <!-- Device / Modbus config -->
      <section class="card">
        <h3>Device configuration</h3>
        <div class="grid">
          <div>
            <span class="label">DeviceId</span>
            <div class="mono">{{ d.deviceId }}</div>
          </div>

          <div>
            <span class="label">Modbus IP</span>
            <div>{{ d.modbusIpAddress ?? '—' }}</div>
          </div>

          <div>
            <span class="label">Modbus Port</span>
            <div>{{ d.modbusPort ?? '—' }}</div>
          </div>

          <div>
            <span class="label">UnitId</span>
            <div>{{ d.modbusUnitId ?? '—' }}</div>
          </div>
        </div>
      </section>

      <!-- Measurements chart (from BE) -->
      <section class="card">
        <div class="row">
          <h3>Measurements chart</h3>
        </div>

        <div class="form">
          <label style="min-width: 360px;">
            Select sensor
            <select [(ngModel)]="selectedSensorId">
              <option [ngValue]="null">—</option>
              <option *ngFor="let s of d.sensors" [ngValue]="getSensorId(s)">
                {{ s.type }} ({{ s.unit }})
              </option>
            </select>
          </label>

          <div class="muted" *ngIf="selectedSensorId">
            Selected: <span class="mono">{{ selectedSensorId }}</span>
          </div>
        </div>

        <app-sensor-chart
          *ngIf="selectedSensorId"
          [sensorId]="selectedSensorId"
          [unit]="selectedSensorUnit">
        </app-sensor-chart>

        <div *ngIf="!selectedSensorId" class="muted" style="margin-top:10px;">
          Wybierz sensor, aby zobaczyć wykres.
        </div>
      </section>

      <!-- Simulator registers (HTTP to Node simulator) -->
      <section class="card">
        <div class="row">
          <h3>Modbus registers (Simulator)</h3>
          <button class="btn" (click)="loadHolding()" [disabled]="holdingLoading">
            {{ holdingLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <div class="form">
          <label>
            From
            <input type="number" [(ngModel)]="holdingFrom" />
          </label>

          <label>
            Count
            <input type="number" [(ngModel)]="holdingCount" />
          </label>

          <button class="btn" (click)="loadHolding()" [disabled]="holdingLoading">Load</button>
        </div>

        <div *ngIf="holdingError" class="error" style="margin-top:10px;">{{ holdingError }}</div>

        <div class="table-wrap" *ngIf="holding.length > 0">
          <table class="table">
            <thead>
              <tr>
                <th class="num">Address</th>
                <th class="num">Value</th>
                <th class="num">Set</th>
                <th class="actions"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of holding">
                <td class="num">{{ r.address }}</td>
                <td class="num">{{ r.value }}</td>
                <td class="num">
                  <input class="mini" type="number" [(ngModel)]="editHolding[r.address]" />
                </td>
                <td class="actions">
                  <button class="btn" (click)="setRegisterHttp(r.address)" [disabled]="holdingBusy === r.address">
                    {{ holdingBusy === r.address ? 'Saving…' : 'Write (HTTP)' }}
                  </button>

                  <button class="btn" (click)="sendWriteCommand(r.address)" [disabled]="sendingCmd === r.address">
                    {{ sendingCmd === r.address ? 'Sending…' : 'Write (Command)' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="muted" *ngIf="holding.length === 0 && !holdingLoading">No data loaded.</div>
      </section>

      <!-- Commands -->
      <section class="card">
        <div class="row">
          <h3>Commands</h3>
          <button class="btn" (click)="loadCommands()" [disabled]="commandsLoading">
            {{ commandsLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <div *ngIf="commandsError" class="error" style="margin-top:10px;">
          {{ commandsError }}
        </div>

        <div class="muted" *ngIf="!commandsLoading && commands.length === 0" style="margin-top:10px;">
          No commands.
        </div>

        <div class="table-wrap" *ngIf="commands.length > 0" style="margin-top:10px;">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Executed</th>
                <th>Error</th>
                <th class="actions"></th>
              </tr>
            </thead>

            <tbody>
              <tr *ngFor="let c of commands">
                <td class="mono">{{ c.name }}</td>
                <td>
                  <span class="pill" [class.alert]="c.status === 'Failed'">
                    {{ c.status }}
                  </span>
                </td>
                <td class="mono">{{ c.requestedAtUtc | date:'yyyy-MM-dd HH:mm:ss':'UTC' }} UTC</td>
                <td class="mono">
                  <span *ngIf="c.executedAtUtc; else dashExec">
                    {{ c.executedAtUtc | date:'yyyy-MM-dd HH:mm:ss':'UTC' }} UTC
                  </span>
                  <ng-template #dashExec><span class="muted">—</span></ng-template>
                </td>
                <td>
                  <span *ngIf="c.error; else dashErr" class="muted">{{ c.error }}</span>
                  <ng-template #dashErr><span class="muted">—</span></ng-template>
                </td>
                <td class="actions">
                  <button
                    class="btn"
                    *ngIf="c.status === 'Failed'"
                    (click)="retryCommand(c.id)"
                    [disabled]="retryingId === c.id">
                    {{ retryingId === c.id ? 'Retrying…' : 'Retry' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Alerts -->
      <section class="card">
        <div class="row">
          <h3>Active alerts</h3>
          <span class="muted" *ngIf="d.activeAlerts.length === 0">none</span>
        </div>

        <div *ngIf="d.activeAlerts.length > 0" class="alerts">
          <div class="alert" *ngFor="let a of d.activeAlerts">
            <div class="alert-main">
              <div class="sev" [class.crit]="a.severity === 'Critical'">{{ a.severity }}</div>

              <div class="msg">
                <div class="strong">{{ a.message }}</div>
                <div class="muted">
                  Raised:
                  {{ a.raisedAtUtc | date:'yyyy-MM-dd HH:mm:ss':'UTC' }} UTC
                  <span *ngIf="a.sensorId"> • Sensor: {{ a.sensorId }}</span>
                </div>
              </div>
            </div>

            <div class="alert-actions">
              <button class="btn" (click)="ack(a.alertId)" [disabled]="busyAlertId === a.alertId">Ack</button>
              <button class="btn danger" (click)="clear(a.alertId)" [disabled]="busyAlertId === a.alertId">Clear</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Sensors table -->
      <section class="card">
        <div class="row">
            <h3>Sensors</h3>
            <a class="btn" [routerLink]="['/devices', d.deviceId, 'sensors', 'new']">+ Add sensor</a>
        </div>

        <div class="table-wrap" *ngIf="d.sensors.length > 0; else noSensors">
          <table class="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Unit</th>
                <th class="num">Address</th>
                <th class="num">Scale</th>
                <th class="num">Last value</th>
                <th>Last timestamp</th>
                <th class="actions"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of d.sensors">
                <td class="strong">{{ s.type }}</td>
                <td>{{ s.unit }}</td>
                <td class="num">{{ s.modbusAddress ?? '—' }}</td>
                <td class="num">{{ s.scale ?? '—' }}</td>
                <td class="num">{{ s.lastValue ?? '—' }}</td>
                <td>
                  <span *ngIf="s.lastTimestampUtc; else dash">
                    {{ s.lastTimestampUtc | date:'yyyy-MM-dd HH:mm:ss':'UTC' }} UTC
                  </span>
                  <ng-template #dash><span class="muted">—</span></ng-template>
                </td>
                <td class="actions">
                    <a class="btn" [routerLink]="['/devices', d.deviceId, 'sensors', getSensorId(s), 'edit']">Edit</a>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #noSensors>
          <div class="muted">No sensors.</div>
        </ng-template>
      </section>
    </ng-container>

    <!-- NICE DELETE MODAL -->
    <app-confirm-dialog
      *ngIf="showDeleteDialog && vm as d"
      title="Delete device?"
      [message]="'This will permanently delete device “' + d.name + '”. This action cannot be undone.'"
      confirmText="Delete"
      [busy]="deleting"
      [error]="deleteError"
      (cancel)="closeDelete()"
      (confirm)="confirmDelete()"
    >
      <div class="hint">
        If the device has related sensors/measurements, deletion may be blocked by database constraints.
      </div>
    </app-confirm-dialog>
  `,
  styles: [`
    .back { display:inline-block; margin-bottom: 12px; text-decoration:none; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

    .card { background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:14px; padding:14px; margin:12px 0; }
    .grid { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:12px; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }

    .label { font-size:12px; opacity:0.65; }
    .muted { opacity:0.7; }
    .strong { font-weight: 700; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
    .hint { margin-top: 8px; opacity: 0.75; font-size: 13px; line-height: 1.4; }

    .row { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
    .btn { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; }
    .btn.danger { border-color: rgba(255,0,0,0.25); background: rgba(255,0,0,0.06); font-weight: 700; }

    .error { padding:12px; border-radius:12px; background: rgba(255,0,0,0.06); border:1px solid rgba(255,0,0,0.15); }

    .alerts { display:flex; flex-direction:column; gap:10px; margin-top:10px; }
    .alert { display:flex; justify-content:space-between; gap:12px; padding:10px; border-radius:12px; border:1px solid rgba(0,0,0,0.08); }
    .alert-main { display:flex; gap:10px; }
    .sev { font-size:12px; padding:4px 10px; border-radius:999px; background: rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.08); height: fit-content;}
    .sev.crit { background: rgba(255,0,0,0.08); border-color: rgba(255,0,0,0.18); }
    .msg { display:flex; flex-direction:column; gap:4px; }
    .alert-actions { display:flex; gap:8px; align-items:flex-start; }

    .table-wrap { overflow:auto; border:1px solid rgba(0,0,0,0.08); border-radius:12px; }
    .table { width:100%; border-collapse:collapse; font-size:14px; }
    th, td { padding:10px; border-bottom:1px solid rgba(0,0,0,0.06); }
    .num { text-align:right; white-space:nowrap; width:1%; }
    .actions { text-align:right; white-space:nowrap; width:1%; }

    .form { display:flex; gap:12px; flex-wrap:wrap; align-items:end; margin: 10px 0; }
    label { display:flex; flex-direction:column; gap:6px; font-size: 13px; }
    input, select { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); min-width: 140px; }
    input.mini { min-width: 110px; padding: 8px 10px; }

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
  `],
})
export class DeviceDetailsComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  deviceId = '';
  vm: DeviceDetailsDto | null = null;

  loading = false;
  error: string | null = null;

  busyAlertId: string | null = null;

  // Measurements chart selection
  selectedSensorId: string | null = null;

  // Holding registers (Node simulator)
  holdingFrom = 0;
  holdingCount = 10;
  holding: HoldingItem[] = [];
  editHolding: Record<number, number> = {};
  holdingLoading = false;
  holdingError: string | null = null;
  holdingBusy: number | null = null;

  // Commands
  sendingCmd: number | null = null;
  commands: CommandVm[] = [];
  commandsLoading = false;
  commandsError: string | null = null;
  retryingId: string | null = null;

  // NICE DELETE dialog state
  showDeleteDialog = false;
  deleting = false;
  deleteError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private devicesApi: DevicesService,
    private alertsApi: AlertsService,
    private commandsApi: CommandsService,
    private modbusSim: ModbusSimService
  ) {}

  ngOnInit(): void {
    this.deviceId = this.route.snapshot.paramMap.get('id') ?? '';
    this.selectedSensorId = this.route.snapshot.queryParamMap.get('sensor');
    this.loading = true;

    this.subscriptions.add(
      timer(0, 5000)
        .pipe(
          switchMap(() =>
            this.devicesApi.getDetails(this.deviceId).pipe(
              catchError((err: any) => {
                this.loading = false;
                this.error = err?.message ?? 'Failed to load device details.';
                return EMPTY;
              })
            )
          )
        )
        .subscribe((d) => {
          this.vm = d;
          this.error = null;
          this.loading = false;

          const selectedExists = d.sensors?.some(
            (sensor) => this.getSensorId(sensor) === this.selectedSensorId
          );
          if (!selectedExists) {
            this.selectedSensorId = d.sensors?.length > 0
              ? this.getSensorId(d.sensors[0])
              : null;
          }
        })
    );

    this.subscriptions.add(
      timer(0, 5000)
        .pipe(
          switchMap(() => {
            this.commandsLoading = true;
            this.commandsError = null;

            return this.commandsApi.getByDevice(this.deviceId).pipe(
              catchError((err: any) => {
                this.commandsLoading = false;
                this.commandsError = err?.message ?? 'Failed to load commands.';
                return EMPTY;
              })
            );
          })
        )
        .subscribe((items) => {
          this.commands = items ?? [];
          this.commandsLoading = false;
        })
    );

    // auto-load registers once
    this.loadHolding();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // lepsze: ręczne odświeżenie wszystkiego
  reloadAll(): void {
    this.reload();
    this.loadHolding();
    this.loadCommands();
  }

  reload(): void {
    this.loading = true;
    this.devicesApi.getDetails(this.deviceId).subscribe({
      next: (d) => {
        this.vm = d;
        this.loading = false;
        this.error = null;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.message ?? 'Failed to load device details.';
      },
    });
  }

  // --- Nice delete dialog ---
  openDelete(): void {
    this.deleteError = null;
    this.showDeleteDialog = true;
  }

  closeDelete(): void {
    if (this.deleting) return;
    this.showDeleteDialog = false;
    this.deleteError = null;
  }

  confirmDelete(): void {
    if (!this.vm) return;

    this.deleting = true;
    this.deleteError = null;

    this.devicesApi.delete(this.vm.deviceId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteDialog = false;
        this.router.navigate(['/devices']);
      },
      error: (err: any) => {
        this.deleting = false;

        const status = err?.status;
        const apiMsg = err?.error?.error ?? err?.error?.message;

        if (status === 409) {
          this.deleteError = apiMsg ?? 'Cannot delete device: related data exists (sensors/measurements).';
        } else if (status === 400) {
          this.deleteError = apiMsg ?? 'Cannot delete device (bad request).';
        } else if (status === 401 || status === 403) {
          this.deleteError = 'Not authorized to delete device.';
        } else {
          this.deleteError = apiMsg ?? err?.message ?? 'Delete failed.';
        }
      },
    });
  }

  // --- Alerts ---
  ack(alertId: string): void {
    this.busyAlertId = alertId;
    this.alertsApi.ack(alertId).subscribe({
      next: () => {
        this.busyAlertId = null;
        this.reload();
      },
      error: (err: any) => {
        this.busyAlertId = null;
        this.error = err?.message ?? 'Ack failed.';
      },
    });
  }

  clear(alertId: string): void {
    this.busyAlertId = alertId;
    this.alertsApi.clear(alertId).subscribe({
      next: () => {
        this.busyAlertId = null;
        this.reload();
      },
      error: (err: any) => {
        this.busyAlertId = null;
        this.error = err?.message ?? 'Clear failed.';
      },
    });
  }

  // --- Measurements chart helper ---
  getSensorId(sensor: any): string {
    return sensor.sensorId ?? sensor.id;
  }

  get selectedSensorUnit(): string | undefined {
    if (!this.vm || !this.selectedSensorId) return undefined;

    const s = this.vm.sensors?.find((x: any) => this.getSensorId(x) === this.selectedSensorId);
    return s?.unit;
  }

  // --- Simulator registers ---
  loadHolding(): void {
    this.holdingLoading = true;
    this.holdingError = null;

    const from = Number(this.holdingFrom) || 0;
    const count = Math.max(1, Math.min(50, Number(this.holdingCount) || 10));

    this.modbusSim.getHolding(from, count).subscribe({
      next: (res) => {
        this.holding = res.items ?? [];
        for (const it of this.holding) {
          if (this.editHolding[it.address] === undefined) this.editHolding[it.address] = it.value;
        }
        this.holdingLoading = false;
      },
      error: (err: any) => {
        this.holdingLoading = false;
        this.holdingError = err?.message ?? 'Failed to load holding registers.';
      },
    });
  }

  setRegisterHttp(address: number): void {
    const value = Number(this.editHolding[address] ?? 0);
    this.holdingBusy = address;

    this.modbusSim.setHolding(address, value).subscribe({
      next: () => {
        this.holdingBusy = null;
        this.loadHolding();
      },
      error: (err: any) => {
        this.holdingBusy = null;
        this.holdingError = err?.message ?? 'Write failed.';
      },
    });
  }

  // --- Commands ---
  loadCommands(): void {
    this.commandsLoading = true;
    this.commandsError = null;

    this.commandsApi.getByDevice(this.deviceId).subscribe({
      next: (items: CommandVm[]) => {
        this.commands = items ?? [];
        this.commandsLoading = false;
      },
      error: (err: any) => {
        this.commandsLoading = false;
        this.commandsError = err?.message ?? 'Failed to load commands.';
      },
    });
  }

  retryCommand(commandId: string): void {
    this.retryingId = commandId;

    this.commandsApi.retry(commandId).subscribe({
      next: () => {
        this.retryingId = null;
        this.loadCommands();
      },
      error: (err: any) => {
        this.retryingId = null;
        this.error = err?.message ?? 'Retry failed.';
      },
    });
  }

  sendWriteCommand(address: number): void {
    if (!this.vm) return;

    const value = Number(this.editHolding[address] ?? 0);
    this.sendingCmd = address;

    this.commandsApi
      .create({
        deviceId: this.vm.deviceId,
        name: 'Modbus.WriteSingleRegister',
        payload: JSON.stringify({ registerAddress: address, value }),
      })
      .subscribe({
        next: () => {
          this.sendingCmd = null;
          this.loadCommands();
        },
        error: (err: any) => {
          this.sendingCmd = null;
          this.error = err?.message ?? 'Command failed.';
        },
      });
  }
}
