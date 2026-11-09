import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SensorsService } from '../services/sensors.service';
import type { CreateSensorRequest } from '../types/sensors';

@Component({
  standalone: true,
  selector: 'app-sensor-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="wrap">
      <div class="header">
        <div>
          <h2>Add sensor</h2>
          <div class="muted">DeviceId: <code>{{ deviceId }}</code></div>
        </div>

        <a class="btn" [routerLink]="['/devices', deviceId]">Back</a>
      </div>

      <div *ngIf="error" class="error">{{ error }}</div>

      <div class="card" *ngIf="form">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid">
            <label>
              Type *
              <input formControlName="type" placeholder="Temperature" />
              <div class="err" *ngIf="form.controls['type'].touched && form.controls['type'].invalid">
                Type is required.
              </div>
            </label>

            <label>
              Unit *
              <input formControlName="unit" placeholder="°C" />
              <div class="err" *ngIf="form.controls['unit'].touched && form.controls['unit'].invalid">
                Unit is required.
              </div>
            </label>

            <label>
              Lower bound
              <input type="number" formControlName="lowerBound" placeholder="e.g. 0" />
            </label>

            <label>
              Upper bound
              <input type="number" formControlName="upperBound" placeholder="e.g. 100" />
            </label>

            <label>
              Modbus address
              <input type="number" formControlName="modbusAddress" placeholder="e.g. 0" />
            </label>

            <label>
              Scale
              <input type="number" formControlName="scale" placeholder="e.g. 0.1" step="0.01" />
            </label>
          </div>

          <div class="row">
            <button class="btn primary" type="submit" [disabled]="saving || form.invalid">
              {{ saving ? 'Saving…' : 'Create sensor' }}
            </button>
          </div>

          <div class="muted" style="margin-top:8px;">
            Modbus: jeśli ustawisz address + scale, polling zacznie zapisywać pomiary z rejestrów.
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .wrap { max-width: 900px; margin: 18px auto; padding: 0 12px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
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
    .btn:disabled { opacity:0.6; cursor:not-allowed; }

    .err { color: #b00020; font-size: 12px; }
    .error { margin: 12px 0; padding:12px; border-radius:12px; background: rgba(255,0,0,0.06); border:1px solid rgba(255,0,0,0.15); }
  `]
})
export class SensorCreateComponent implements OnInit {
  deviceId = '';
  form!: FormGroup;
  saving = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private api: SensorsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.deviceId = String(this.route.snapshot.paramMap.get('id') ?? '');
    if (!this.deviceId) {
      this.error = 'Missing device id.';
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
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.error = null;

    const v = this.form.value as any;

    const req: CreateSensorRequest = {
      deviceId: this.deviceId,
      type: v.type,
      unit: v.unit,
      lowerBound: v.lowerBound ?? null,
      upperBound: v.upperBound ?? null,
      modbusAddress: v.modbusAddress ?? null,
      scale: v.scale ?? null,
    };

    this.api.create(req).subscribe({
      next: (created) => {
        this.saving = false;
        this.router.navigate(['/devices', this.deviceId], { queryParams: { sensor: created.id } });
      },
      error: (err: any) => {
        this.saving = false;
        this.error = err?.error?.error ?? err?.message ?? 'Create sensor failed.';
      }
    });
  }
}
