import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';

import { BaseChartDirective } from 'ng2-charts';
import type { ChartConfiguration } from 'chart.js';

import { MeasurementsService, MeasurementDto } from '../services/measurements.service';

@Component({
  standalone: true,
  selector: 'app-sensor-chart',
  imports: [CommonModule, FormsModule, BaseChartDirective],
  template: `
    <div class="card">
      <div class="row">
        <div>
          <h3>Sensor chart</h3>
          <div class="muted">
            Sensor: <code>{{ sensorId }}</code>
            <span *ngIf="unit"> • Unit: {{ unit }}</span>
          </div>
        </div>

        <button class="btn" (click)="reload()" [disabled]="loading">
          {{ loading ? 'Loading…' : 'Reload' }}
        </button>
      </div>

      <div class="form">
        <label>
          Auto refresh
          <input type="checkbox" [(ngModel)]="auto" (change)="toggleAuto()" />
        </label>

        <label>
          Interval (ms)
          <input type="number" [(ngModel)]="intervalMs" (change)="toggleAuto()" />
        </label>

        <label>
          Points
          <input type="number" [(ngModel)]="take" />
        </label>
      </div>

      <div class="chart-wrap">
        <canvas
          baseChart
          [type]="'line'"
          [data]="chartData"
          [options]="chartOptions">
        </canvas>
      </div>

      <div *ngIf="error" class="error">{{ error }}</div>
    </div>
  `,
  styles: [`
    .card { background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:14px; padding:14px; margin:12px 0; }
    .row { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .muted { opacity:0.75; }
    code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 8px; }
    .form { display:flex; gap:12px; flex-wrap:wrap; align-items:end; margin-top:10px; }
    label { display:flex; flex-direction:column; gap:6px; font-size: 13px; }
    input { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); min-width: 140px; }
    .btn { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; }
    .btn:disabled { opacity:0.6; cursor:not-allowed; }
    .error { margin-top: 12px; padding:12px; border-radius:12px; background: rgba(255,0,0,0.06); border:1px solid rgba(255,0,0,0.15); }
    .chart-wrap { height: 320px; margin-top: 10px; }
  `],
})
export class SensorChartComponent implements OnInit, OnDestroy {
  @Input({ required: true }) sensorId!: string;
  @Input() unit?: string;

  loading = false;
  error: string | null = null;

  auto = true;
  intervalMs = 2000;
  take = 120;

  private sub?: Subscription;

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{ data: [], label: 'Value', tension: 0.2, pointRadius: 0 }]
  };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: true } },
  };

  constructor(private measurements: MeasurementsService) {}

  ngOnInit(): void {
    this.reload();
    this.toggleAuto();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleAuto(): void {
    this.sub?.unsubscribe();
    if (!this.auto) return;

    const ms = Math.max(500, Number(this.intervalMs) || 2000);
    this.sub = timer(ms, ms).subscribe(() => this.reload(false));
  }

  reload(showSpinner = true): void {
    if (!this.sensorId) return;

    if (showSpinner) this.loading = true;
    this.error = null;

    this.measurements.getBySensor(this.sensorId, { page: 1, pageSize: Math.max(10, this.take) })
      .subscribe({
        next: (res) => {
          const items = (res.items ?? []).slice().reverse(); // backend order by timestamp asc/desc? u Ciebie asc, ale na wszelki wypadek
          this.setChart(items);
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err?.message ?? 'Failed to load measurements.';
        },
      });
  }

  private setChart(items: MeasurementDto[]): void {
    const labels = items.map(x => x.timestampUtc.slice(11, 19));
    const data = items.map(x => x.value);

    this.chartData = {
      labels,
      datasets: [{ ...this.chartData.datasets[0], data }]
    };
  }
}
