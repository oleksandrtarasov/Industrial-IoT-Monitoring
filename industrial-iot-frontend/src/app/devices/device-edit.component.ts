import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { DevicesService } from '../services/devices.service';
import type { CreateDeviceRequest, DeviceDto } from '../types/devices';

@Component({
  standalone: true,
  selector: 'app-device-edit',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="wrap">
      <div class="header">
        <div>
          <h2>Edit Device</h2>
          <div class="muted" *ngIf="deviceId">ID: <code>{{ deviceId }}</code></div>
        </div>

        <div class="actions">
          <a class="btn" [routerLink]="['/devices', deviceId]">Back</a>
        </div>
      </div>

      <div *ngIf="loading" class="muted">Loading…</div>
      <div *ngIf="error" class="error">{{ error }}</div>

      <div class="card" *ngIf="!loading && form">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid">
            <label>
              Name *
              <input formControlName="name" />
              <div class="err" *ngIf="form.controls['name'].touched && form.controls['name'].invalid">
                Name is required (min 2).
              </div>
            </label>

            <label>
              Location *
              <input formControlName="location" />
              <div class="err" *ngIf="form.controls['location'].touched && form.controls['location'].invalid">
                Location is required (min 2).
              </div>
            </label>

            <label>
              Status *
              <select formControlName="status">
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Maintenance">Maintenance</option>
              </select>
              <div class="err" *ngIf="form.controls['status'].touched && form.controls['status'].invalid">
                Status is required.
              </div>
            </label>
          </div>

          <div class="divider"></div>

          <h3>Modbus (optional)</h3>
          <div class="grid">
            <label>
              Modbus IP
              <input formControlName="modbusIpAddress" placeholder="127.0.0.1" />
            </label>

            <label>
              Modbus Port
              <input type="number" formControlName="modbusPort" placeholder="1502" />
              <div class="err" *ngIf="form.controls['modbusPort'].touched && form.controls['modbusPort'].invalid">
                Port must be 1..65535 (or empty).
              </div>
            </label>

            <label>
              Modbus UnitId
              <input type="number" formControlName="modbusUnitId" placeholder="1" />
              <div class="err" *ngIf="form.controls['modbusUnitId'].touched && form.controls['modbusUnitId'].invalid">
                UnitId must be 1..247 (or empty).
              </div>
            </label>
          </div>

          <div class="divider"></div>

          <div class="row">
            <button class="btn primary" type="submit" [disabled]="saving || form.invalid">
              {{ saving ? 'Saving…' : 'Save changes' }}
            </button>

            <button class="btn danger" type="button" (click)="deleteDevice()" [disabled]="deleting">
              {{ deleting ? 'Deleting…' : 'Delete device' }}
            </button>
          </div>

          <div class="muted" style="margin-top:8px;">
            Uwaga: usuwanie może być blokowane, jeśli masz FK do sensorów/measurements.
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .wrap { max-width: 900px; margin: 18px auto; padding: 0 12px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
    .actions { display:flex; gap:10px; }
    .muted { opacity: 0.75; }
    code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 8px; }

    .card { background:#fff; border:1px solid rgba(0,0,0,0.08); border-radius:14px; padding:14px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }

    label { display:flex; flex-direction:column; gap:6px; font-size: 13px; }
    input, select {
      padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12);
      background:#fff;
    }

    .divider { height:1px; background: rgba(0,0,0,0.08); margin: 14px 0; }

    .row { display:flex; gap:10px; flex-wrap:wrap; }
    .btn { padding:10px 12px; border-radius:10px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; }
    .primary { font-weight: 700; }
    .danger { border-color: rgba(255,0,0,0.25); background: rgba(255,0,0,0.05); }
    .btn:disabled { opacity:0.6; cursor:not-allowed; }

    .err { color: #b00020; font-size: 12px; }
    .error { margin: 12px 0; padding:12px; border-radius:12px; background: rgba(255,0,0,0.06); border:1px solid rgba(255,0,0,0.15); }
  `]
})
export class DeviceEditComponent implements OnInit {
  deviceId = '';
  loading = false;
  saving = false;
  deleting = false;
  error: string | null = null;

  form!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private devicesApi: DevicesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.deviceId = String(this.route.snapshot.paramMap.get('id') ?? '');
    if (!this.deviceId) {
      this.error = 'Missing device id.';
      return;
    }

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      location: ['', [Validators.required, Validators.minLength(2)]],
      status: ['Offline', [Validators.required]],

      modbusIpAddress: [''],
      modbusPort: [null as number | null, [this.optionalRangeValidator(1, 65535)]],
      modbusUnitId: [null as number | null, [this.optionalRangeValidator(1, 247)]],
    });

    this.load();
  }

  private load(): void {
    this.loading = true;
    this.error = null;

    this.devicesApi.getById(this.deviceId).subscribe({
      next: (d: DeviceDto) => {
        this.form.patchValue({
          name: d.name,
          location: d.location,
          status: d.status,
          modbusIpAddress: d.modbusIpAddress ?? '',
          modbusPort: d.modbusPort ?? null,
          modbusUnitId: d.modbusUnitId ?? null
        });
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.error ?? err?.message ?? 'Failed to load device.';
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

    const req: CreateDeviceRequest = {
      name: v.name,
      location: v.location,
      status: v.status,
      modbusIpAddress: (v.modbusIpAddress?.trim() ? v.modbusIpAddress.trim() : null),
      modbusPort: v.modbusPort ?? null,
      modbusUnitId: v.modbusUnitId ?? null,
    };

    this.devicesApi.update(this.deviceId, req).subscribe({
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

  deleteDevice(): void {
    if (!this.deviceId) return;

    const ok = confirm('Delete this device? This cannot be undone.');
    if (!ok) return;

    this.deleting = true;
    this.error = null;

    this.devicesApi.delete(this.deviceId).subscribe({
      next: () => {
        this.deleting = false;
        this.router.navigate(['/devices']);
      },
      error: (err: any) => {
        this.deleting = false;
        this.error = err?.error?.error ?? err?.message ?? 'Delete failed.';
      }
    });
  }

  private optionalRangeValidator(min: number, max: number) {
    return (control: any) => {
      const v = control.value;
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return { range: true };
      if (n < min || n > max) return { range: true };
      return null;
    };
  }
}
