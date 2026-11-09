import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SensorsService } from '../services/sensors.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

import type { SensorDto, UpdateSensorRequest } from '../types/sensors';

@Component({
  standalone: true,
  selector: 'app-sensor-edit',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ConfirmDialogComponent],
  template: `
    <div class="wrap">
      <div class="header">
        <div>
          <h2>Edit sensor</h2>
          <div class="muted" *ngIf="sensorId">SensorId: <code>{{ sensorId }}</code></div>
          <div class="muted" *ngIf="deviceId">DeviceId: <code>{{ deviceId }}</code></div>
        </div>

        <div class="actions">
          <a class="btn" [routerLink]="['/devices', deviceId]">Back</a>
          <button class="btn danger" (click)="openDelete()" [disabled]="deleting">Delete</button>
        </div>
      </div>

      <div *ngIf="loading" class="muted">Loading…</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <div class="card" *ngIf="!loading && form">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid">
            <label>
              Type *
              <input formControlName="type" />
              <div class="err" *ngIf="form.controls['type'].touched && form.controls['type'].invalid">
                Type is required.
              </div>
            </label>

            <label>
              Unit *
              <input formControlName="unit" />
              <div class="err" *ngIf="form.controls['unit'].touched && form.controls['unit'].invalid">
                Unit is required.
              </div>
            </label>

            <label>
              Lower bound
              <input type="number" formControlName="lowerBound" />
            </label>

            <label>
              Upper bound
              <input type="number" formControlName="upperBound" />
            </label>

            <label>
              Modbus address
              <input type="number" formControlName="modbusAddress" />
            </label>

            <label>
              Scale
              <input type="number" formControlName="scale" step="0.01" />
            </label>
          </div>

          <div class="row">
            <button class="btn primary" type="submit" [disabled]="saving || form.invalid">
              {{ saving ? 'Saving…' : 'Save changes' }}
            </button>
          </div>

        </form>
      </div>
    </div>

    <!-- NICE DELETE MODAL -->
    <app-confirm-dialog
      *ngIf="showDeleteDialog"
      title="Delete sensor?"
      [message]="'This will permanently delete this sensor. Measurements may remain or deletion may be blocked (DB constraints).'"
      confirmText="Delete"
      [busy]="deleting"
      [error]="deleteError"
      (cancel)="closeDelete()"
      (confirm)="confirmDelete()"
    ></app-confirm-dialog>
  `,
  styles: [`
    .wrap { max-width: 900px; margin: 18px auto; padding: 0 12px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }

    code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 8px; }
    .muted { opacity: 0.75; }

    .card { background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:14px; padding:14px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }

    label { display:flex; flex-direction:column; gap:6px; font-size: 13px; }
    input {
      padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12);
      background:#fff;
    }

    .row { margin-top: 12px; display:flex; gap:10px; flex-wrap:wrap; }
    .btn { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; text-decoration:none; }
    .primary { font-weight: 700; }
    .danger { border-color: rgba(255,0,0,0.25); background: rgba(255,0,0,0.06); font-weight: 700; }
    .btn:disabled { opacity:0.6; cursor:not-allowed; }

    .err { color: #b00020; font-size: 12px; }
    .error { margin: 12px 0; padding:12px; border-radius:12px; background: rgba(255,0,0,0.06); border:1px solid rgba(255,0,0,0.15); }
  `]
})
export class SensorEditComponent implements OnInit {
  deviceId = '';
  sensorId = '';

  loading = false;
  saving = false;
  error: string | null = null;

  form!: FormGroup;

  showDeleteDialog = false;
  deleting = false;
  deleteError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private api: SensorsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.deviceId = String(this.route.snapshot.paramMap.get('id') ?? '');
    this.sensorId = String(this.route.snapshot.paramMap.get('sensorId') ?? '');

    if (!this.deviceId || !this.sensorId) {
      this.error = 'Missing deviceId or sensorId.';
      return;
    }

    this.form = this.fb.group({
      type: ['', [Validators.required]],
      unit: ['', [Validators.required]],
      lowerBound: [null as number | null],
      upperBound: [null as number | null],
      modbusAddress: [null as number | null],
      scale: [null as number | null],
    });

    this.load();
  }

  private load(): void {
    this.loading = true;
    this.error = null;

    this.api.getById(this.sensorId).subscribe({
      next: (s: SensorDto) => {
        this.form.patchValue({
          type: s.type,
          unit: s.unit,
          lowerBound: s.lowerBound ?? null,
          upperBound: s.upperBound ?? null,
          modbusAddress: s.modbusAddress ?? null,
          scale: s.scale ?? null
        });
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.error ?? err?.message ?? 'Failed to load sensor.';
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const v = this.form.value as any;

    const req: UpdateSensorRequest = {
      type: v.type,
      unit: v.unit,
      lowerBound: v.lowerBound ?? null,
      upperBound: v.upperBound ?? null,
      modbusAddress: v.modbusAddress ?? null,
      scale: v.scale ?? null,
    };

    this.api.update(this.sensorId, req).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/devices', this.deviceId]);
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.error ?? err?.message ?? 'Update failed.';
      }
    });
  }

  openDelete(): void {
    this.deleteError = null;
    this.showDeleteDialog = true;
  }

  closeDelete(): void {
    if (this.deleting) return;
    this.showDeleteDialog = false;
  }

  confirmDelete(): void {
    this.deleting = true;
    this.deleteError = null;

    this.api.delete(this.sensorId).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteDialog = false;
        this.router.navigate(['/devices', this.deviceId]);
      },
      error: (err: any) => {
        this.deleting = false;
        const status = err?.status;
        const apiMsg = err?.error?.error ?? err?.error?.message;

        if (status === 409) {
          this.deleteError = apiMsg ?? 'Cannot delete sensor: related measurements exist.';
        } else if (status === 401 || status === 403) {
          this.deleteError = 'Not authorized to delete sensor.';
        } else {
          this.deleteError = apiMsg ?? err?.message ?? 'Delete failed.';
        }
      }
    });
  }
}
