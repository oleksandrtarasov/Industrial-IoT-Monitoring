import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';

import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration } from 'chart.js';

import { ModbusSimService, HoldingItem } from '../services/modbus-sim.service';
import { SensorsService } from '../services/sensors.service';
import type { SensorDto } from '../types/sensors';

type ChartMode = 'raw' | 'sensor';

@Component({
  standalone: true,
  selector: 'app-simulator',
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <div class="wrap">
      <div class="header">
        <div>
          <h2>Modbus Simulator</h2>
          <div class="muted">
            Symulator: <code>http://127.0.0.1:3001</code> • Backend: <code>/api</code>
          </div>
        </div>

        <div class="header-actions">
          <button class="btn" (click)="refresh()" [disabled]="loading">
            {{ loading ? 'Loading…' : 'Refresh registers' }}
          </button>
        </div>
      </div>

      <!-- Sensor selector -->
      <div class="card">
        <div class="row">
          <h3>Source mapping</h3>
          <div class="muted">Wybierasz sensor → FE mapuje to na Modbus address + scale</div>
        </div>

        <div class="form">
          <label>
            Mode
            <select [(ngModel)]="chartMode" (change)="onModeChanged()">
              <option value="sensor">Sensor (physical value)</option>
              <option value="raw">Raw Modbus register</option>
            </select>
          </label>

          <label *ngIf="chartMode === 'sensor'">
            Sensor
            <select [(ngModel)]="selectedSensorId" (change)="onSensorChanged()">
              <option [ngValue]="''">— wybierz —</option>
              <option *ngFor="let s of sensors" [ngValue]="s.id">
                {{ s.type }} • {{ s.unit }} • addr={{ s.modbusAddress ?? '—' }} • scale={{ s.scale ?? '—' }}
                • dev={{ short(s.deviceId) }}
              </option>
            </select>
          </label>

          <button class="btn" (click)="reloadSensors()" [disabled]="sensorsLoading">
            {{ sensorsLoading ? 'Loading…' : 'Reload sensors' }}
          </button>
        </div>

        <div *ngIf="sensorsError" class="error">{{ sensorsError }}</div>

        <div class="muted" style="margin-top:8px;" *ngIf="chartMode === 'sensor'">
          Wybrany sensor:
          <span *ngIf="selectedSensor; else none">
            <b>{{ selectedSensor.type }}</b> ({{ selectedSensor.unit }})
            • addr={{ selectedSensor.modbusAddress ?? '—' }}
            • scale={{ selectedSensor.scale ?? '—' }}
          </span>
          <ng-template #none>— brak —</ng-template>
        </div>
      </div>

      <!-- Chart -->
      <div class="card">
        <div class="row">
          <h3>Live chart</h3>
          <div class="muted">
            Tryb: {{ chartMode }}
            • address: {{ chartAddress }}
            • interval: {{ chartIntervalMs }}ms
            <span *ngIf="chartMode === 'sensor' && selectedSensor?.unit">• unit: {{ selectedSensor?.unit }}</span>
          </div>
        </div>

        <div class="form">
          <label *ngIf="chartMode === 'raw'">
            Register address
            <input type="number" [(ngModel)]="chartAddress" />
          </label>

          <label>
            Interval (ms)
            <input type="number" [(ngModel)]="chartIntervalMs" (change)="restartChartStreamIfNeeded()" />
          </label>

          <label>
            Max points
            <input type="number" [(ngModel)]="chartMaxPoints" />
          </label>

          <button class="btn" (click)="toggleChartStream()" [disabled]="chartMode==='sensor' && !canChartSensor()">
            {{ chartOn ? 'Stop chart' : 'Start chart' }}
          </button>

          <button class="btn" (click)="clearChart()">Clear</button>
        </div>

        <div class="muted" *ngIf="chartMode==='sensor' && !canChartSensor()" style="margin-top:8px;">
          Aby uruchomić wykres w trybie Sensor, sensor musi mieć ustawiony <code>modbusAddress</code>.
        </div>

        <div class="chart-wrap">
          <canvas
            baseChart
            [type]="'line'"
            [data]="chartData"
            [options]="chartOptions">
          </canvas>
        </div>

        <div *ngIf="chartError" class="error">{{ chartError }}</div>
      </div>

      <div class="grid2">
        <!-- Left: registers -->
        <div>
          <div class="card">
            <div class="form">
              <label>
                From
                <input type="number" [(ngModel)]="from" />
              </label>

              <label>
                Count
                <input type="number" [(ngModel)]="count" />
              </label>

              <label class="checkbox">
                <input type="checkbox" [(ngModel)]="autoRefresh" (change)="toggleAutoRefresh()" />
                Auto refresh (table)
              </label>

              <label *ngIf="autoRefresh">
                Interval (ms)
                <input type="number" [(ngModel)]="intervalMs" (change)="toggleAutoRefresh()" />
              </label>

              <button class="btn" (click)="refresh()" [disabled]="loading">Load</button>
            </div>

            <div *ngIf="error" class="error">{{ error }}</div>
          </div>

          <div class="card">
            <div class="row">
              <h3>Holding registers</h3>
              <div class="muted" *ngIf="items.length > 0">
                Showing {{ items.length }} registers
              </div>
            </div>

            <div class="table-wrap" *ngIf="items.length > 0; else empty">
              <table class="table">
                <thead>
                  <tr>
                    <th class="num">Address</th>
                    <th class="num">Value</th>
                    <th class="num">New value</th>
                    <th class="actions"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of items">
                    <td class="num">{{ r.address }}</td>
                    <td class="num">{{ r.value }}</td>
                    <td class="num">
                      <input class="mini" type="number" [(ngModel)]="edit[r.address]" />
                    </td>
                    <td class="actions">
                      <button class="btn" (click)="write(r.address)" [disabled]="busy === r.address">
                        {{ busy === r.address ? 'Saving…' : 'Write' }}
                      </button>
                      <button class="btn" (click)="resetToCurrent(r.address)" [disabled]="busy === r.address">
                        Reset
                      </button>
                      <button class="btn" (click)="setRawChart(r.address)">Chart this (raw)</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ng-template #empty>
              <div class="muted">No data loaded yet.</div>
            </ng-template>
          </div>

          <div class="card">
            <h3>Quick write</h3>

            <div class="form">
              <label>
                Address
                <input type="number" [(ngModel)]="quickAddress" />
              </label>

              <label>
                Value
                <input type="number" [(ngModel)]="quickValue" />
              </label>

              <button class="btn" (click)="writeQuick()" [disabled]="busyQuick">
                {{ busyQuick ? 'Saving…' : 'Write' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Right: generators -->
        <div>
          <div class="card">
            <h3>Wave generator</h3>
            <div class="muted" style="margin-bottom:10px;">
              Generuje sinusa w surowym rejestrze.
            </div>

            <div class="form">
              <label>
                Address
                <input type="number" [(ngModel)]="waveAddress" />
              </label>

              <label>
                Base
                <input type="number" [(ngModel)]="waveBase" />
              </label>

              <label>
                Amplitude
                <input type="number" [(ngModel)]="waveAmp" />
              </label>

              <label>
                Period (s)
                <input type="number" [(ngModel)]="wavePeriodSec" />
              </label>

              <button class="btn" (click)="toggleWave()">
                {{ waveOn ? 'Stop' : 'Start' }}
              </button>
            </div>
          </div>

          <div class="card">
            <h3>Noise generator</h3>

            <div class="form">
              <label>
                Address
                <input type="number" [(ngModel)]="noiseAddress" />
              </label>

              <label>
                Min
                <input type="number" [(ngModel)]="noiseMin" />
              </label>

              <label>
                Max
                <input type="number" [(ngModel)]="noiseMax" />
              </label>

              <label>
                Interval (ms)
                <input type="number" [(ngModel)]="noiseIntervalMs" />
              </label>

              <button class="btn" (click)="toggleNoise()">
                {{ noiseOn ? 'Stop' : 'Start' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wrap { max-width: 1250px; margin: 18px auto; padding: 0 12px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
    .header-actions { display:flex; gap:10px; align-items:center; }
    .muted { opacity: 0.75; }
    code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 8px; }
    select { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); min-width: 220px; background:#fff; }

    .grid2 { display:grid; grid-template-columns: 1.2fr 1fr; gap: 12px; }
    @media (max-width: 980px) { .grid2 { grid-template-columns: 1fr; } }

    .card { background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:14px; padding:14px; margin:12px 0; }
    .row { display:flex; align-items:baseline; justify-content:space-between; gap:12px; }
    .form { display:flex; gap:12px; flex-wrap:wrap; align-items:end; }
    label { display:flex; flex-direction:column; gap:6px; font-size: 13px; }
    label.checkbox { flex-direction: row; align-items: center; gap: 8px; padding-bottom: 10px; }

    input { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); min-width: 140px; }
    input.mini { min-width: 110px; padding: 8px 10px; }

    .btn { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; }
    .btn:disabled { opacity: 0.6; cursor:not-allowed; }

    .error { margin-top: 12px; padding:12px; border-radius:12px; background: rgba(255,0,0,0.06); border:1px solid rgba(255,0,0,0.15); }

    .table-wrap { overflow:auto; border:1px solid rgba(0,0,0,0.08); border-radius:12px; margin-top: 10px; }
    .table { width:100%; border-collapse:collapse; font-size:14px; }
    th, td { padding:10px; border-bottom:1px solid rgba(0,0,0,0.06); }
    .num { text-align:right; white-space:nowrap; width:1%; }
    .actions { text-align:right; white-space:nowrap; width:1%; }

    .chart-wrap { height: 320px; margin-top: 10px; }
  `],
})
export class SimulatorComponent implements OnInit, OnDestroy {
  from = 0;
  count = 20;

  autoRefresh = true;
  intervalMs = 1000;

  items: HoldingItem[] = [];
  edit: Record<number, number> = {};

  loading = false;
  error: string | null = null;
  busy: number | null = null;

  quickAddress = 0;
  quickValue = 0;
  busyQuick = false;

  // sensors
  sensors: SensorDto[] = [];
  sensorsLoading = false;
  sensorsError: string | null = null;
  selectedSensorId = '';
  selectedSensor: SensorDto | null = null;

  // Wave generator
  waveOn = false;
  waveAddress = 0;
  waveBase = 250;
  waveAmp = 30;
  wavePeriodSec = 10;
  private waveSub?: Subscription;
  private waveStart = Date.now();

  // Noise generator
  noiseOn = false;
  noiseAddress = 1;
  noiseMin = 240;
  noiseMax = 320;
  noiseIntervalMs = 800;
  private noiseSub?: Subscription;

  private autoSub?: Subscription;

  // Chart
  chartMode: ChartMode = 'sensor';
  chartOn = false;
  chartAddress = 0; // used in raw mode, and in sensor mode after mapping
  chartIntervalMs = 1000;
  chartMaxPoints = 120;
  chartError: string | null = null;
  private chartSub?: Subscription;

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Value',
        tension: 0.2,
        pointRadius: 0,
      }
    ]
  };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: { display: true },
      y: { display: true },
    },
    plugins: { legend: { display: true } },
  };

  constructor(
    private sim: ModbusSimService,
    private sensorsApi: SensorsService
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.toggleAutoRefresh();
    this.reloadSensors();
  }

  ngOnDestroy(): void {
    this.autoSub?.unsubscribe();
    this.waveSub?.unsubscribe();
    this.noiseSub?.unsubscribe();
    this.chartSub?.unsubscribe();
  }

  short(id: string): string {
    return (id ?? '').slice(0, 8);
  }

  reloadSensors(): void {
    this.sensorsLoading = true;
    this.sensorsError = null;

    this.sensorsApi.getAll().subscribe({
      next: (items) => {
        // tylko takie, które mają address (bo do wyboru sensora w kontekście Modbusa)
        this.sensors = (items ?? []).slice().sort((a, b) => (a.type ?? '').localeCompare(b.type ?? ''));
        this.sensorsLoading = false;

        // jeśli mamy już wybrany sensorId, odśwież referencję
        if (this.selectedSensorId) this.selectedSensor = this.sensors.find(s => s.id === this.selectedSensorId) ?? null;
      },
      error: (err: any) => {
        this.sensorsLoading = false;
        this.sensorsError = err?.message ?? 'Nie udało się pobrać sensorów z /api/Sensors (czy backend działa?)';
      }
    });
  }

  onModeChanged(): void {
    // zatrzymujemy wykres przy zmianie trybu, żeby nie mieszać
    if (this.chartOn) {
      this.chartOn = false;
      this.chartSub?.unsubscribe();
    }
    this.clearChart();

    if (this.chartMode === 'sensor') {
      // label bardziej “fizyczny”
      const unit = this.selectedSensor?.unit ? ` (${this.selectedSensor.unit})` : '';
      this.chartData = { ...this.chartData, datasets: [{ ...this.chartData.datasets[0], label: `Sensor value${unit}` }] };
    } else {
      this.chartData = { ...this.chartData, datasets: [{ ...this.chartData.datasets[0], label: 'Raw register value' }] };
    }
  }

  onSensorChanged(): void {
    this.selectedSensor = this.sensors.find(s => s.id === this.selectedSensorId) ?? null;

    if (this.selectedSensor?.modbusAddress != null) {
      this.chartAddress = this.selectedSensor.modbusAddress;
      // label pod jednostkę
      const unit = this.selectedSensor.unit ? ` (${this.selectedSensor.unit})` : '';
      this.chartData = { ...this.chartData, datasets: [{ ...this.chartData.datasets[0], label: `Sensor value${unit}` }] };
    }

    // restart wykresu, jeśli działa
    if (this.chartOn) {
      this.chartSub?.unsubscribe();
      this.startChartStream();
    }
  }

  canChartSensor(): boolean {
    return !!(this.selectedSensor && this.selectedSensor.modbusAddress != null);
  }

  setRawChart(address: number): void {
    this.chartMode = 'raw';
    this.chartAddress = address;
    this.onModeChanged();
  }

  toggleAutoRefresh(): void {
    this.autoSub?.unsubscribe();
    if (!this.autoRefresh) return;

    const ms = Math.max(250, Number(this.intervalMs) || 1000);
    this.autoSub = timer(ms, ms).subscribe(() => this.refresh(false));
  }

  refresh(showSpinner = true): void {
    if (showSpinner) this.loading = true;
    this.error = null;

    const f = Math.max(0, Number(this.from) || 0);
    const c = Math.max(1, Math.min(200, Number(this.count) || 20));

    this.sim.getHolding(f, c).subscribe({
      next: (res) => {
        this.items = res.items ?? [];
        for (const it of this.items) {
          if (this.edit[it.address] === undefined) this.edit[it.address] = it.value;
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.message ?? 'Failed to load holding registers. Is the Node simulator running on 127.0.0.1:3001?';
      },
    });
  }

  resetToCurrent(address: number): void {
    const current = this.items.find(x => x.address === address)?.value;
    if (current === undefined) return;
    this.edit[address] = current;
  }

  write(address: number): void {
    const value = Number(this.edit[address] ?? 0);
    this.busy = address;

    this.sim.setHolding(address, value).subscribe({
      next: () => {
        this.busy = null;
        this.refresh(false);
      },
      error: (err: any) => {
        this.busy = null;
        this.error = err?.message ?? 'Write failed.';
      },
    });
  }

  writeQuick(): void {
    const address = Number(this.quickAddress ?? 0);
    const value = Number(this.quickValue ?? 0);

    this.busyQuick = true;
    this.sim.setHolding(address, value).subscribe({
      next: () => {
        this.busyQuick = false;
        this.refresh(false);
      },
      error: (err: any) => {
        this.busyQuick = false;
        this.error = err?.message ?? 'Write failed.';
      },
    });
  }

  // --- Generators ---
  toggleWave(): void {
    this.waveOn = !this.waveOn;
    this.waveSub?.unsubscribe();
    if (!this.waveOn) return;

    this.waveStart = Date.now();
    this.waveSub = timer(0, 500).subscribe(() => {
      const tSec = (Date.now() - this.waveStart) / 1000;
      const period = Math.max(1, Number(this.wavePeriodSec) || 10);
      const base = Number(this.waveBase) || 0;
      const amp = Number(this.waveAmp) || 0;

      const phase = (2 * Math.PI * tSec) / period;
      const v = Math.round(base + amp * Math.sin(phase));

      this.sim.setHolding(Number(this.waveAddress) || 0, v).subscribe({ next: () => {} });
    });
  }

  toggleNoise(): void {
    this.noiseOn = !this.noiseOn;
    this.noiseSub?.unsubscribe();
    if (!this.noiseOn) return;

    const ms = Math.max(100, Number(this.noiseIntervalMs) || 800);
    this.noiseSub = timer(0, ms).subscribe(() => {
      const min = Number(this.noiseMin) || 0;
      const max = Number(this.noiseMax) || 0;
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);

      const v = Math.round(lo + Math.random() * (hi - lo));
      this.sim.setHolding(Number(this.noiseAddress) || 0, v).subscribe({ next: () => {} });
    });
  }

  // --- Chart streaming ---
  restartChartStreamIfNeeded(): void {
    if (this.chartOn) {
      this.chartSub?.unsubscribe();
      this.startChartStream();
    }
  }

  toggleChartStream(): void {
    this.chartError = null;

    if (this.chartMode === 'sensor' && !this.canChartSensor()) {
      this.chartError = 'Wybierz sensor z modbusAddress.';
      return;
    }

    this.chartOn = !this.chartOn;
    this.chartSub?.unsubscribe();

    if (this.chartOn) this.startChartStream();
  }

  startChartStream(): void {
    const ms = Math.max(250, Number(this.chartIntervalMs) || 1000);

    this.chartSub = timer(0, ms).subscribe(() => {
      const addr =
        this.chartMode === 'sensor'
          ? (this.selectedSensor?.modbusAddress ?? null)
          : (Math.max(0, Number(this.chartAddress) || 0));

      if (addr == null) return;

      this.sim.getHolding(addr, 1).subscribe({
        next: (res) => {
          const raw = res?.items?.[0]?.value;
          if (typeof raw !== 'number') return;

          let display = raw;
          if (this.chartMode === 'sensor' && this.selectedSensor) {
            const scale = this.selectedSensor.scale ?? 1;
            display = raw * scale;
          }

          const now = new Date();
          const label = now.toISOString().slice(11, 19); // HH:mm:ss

          const labels = (this.chartData.labels ?? []) as string[];
          const data = this.chartData.datasets[0].data as number[];

          labels.push(label);
          data.push(display);

          const max = Math.max(10, Number(this.chartMaxPoints) || 120);
          while (labels.length > max) labels.shift();
          while (data.length > max) data.shift();

          this.chartData = {
            labels: [...labels],
            datasets: [{ ...this.chartData.datasets[0], data: [...data] }]
          };
        },
        error: () => {
          this.chartError = 'Chart fetch failed. Is the Node simulator running on 127.0.0.1:3001?';
        },
      });
    });
  }

  clearChart(): void {
    this.chartData = {
      labels: [],
      datasets: [{ ...this.chartData.datasets[0], data: [] }]
    };
    this.chartError = null;
  }
}
