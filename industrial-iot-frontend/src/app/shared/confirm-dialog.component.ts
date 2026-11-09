import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-confirm-dialog',
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="onBackdrop()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <h3 class="title">{{ title }}</h3>

        <div class="body">
          <p class="msg" *ngIf="message">{{ message }}</p>
          <ng-content></ng-content>

          <div class="error" *ngIf="error">{{ error }}</div>
        </div>

        <div class="actions">
          <button class="btn" (click)="cancel.emit()" [disabled]="busy">
            Cancel
          </button>

          <button class="btn danger" (click)="confirm.emit()" [disabled]="busy">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay{
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display:flex;
      align-items:center;
      justify-content:center;
      padding: 16px;
      z-index: 1000;
    }
    .dialog{
      width: min(560px, 100%);
      background:#fff;
      border-radius: 16px;
      border: 1px solid rgba(0,0,0,0.10);
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
      padding: 14px;
    }
    .title{
      margin: 2px 0 8px;
      font-size: 18px;
    }
    .body{ padding: 6px 0 10px; }
    .msg{ margin: 0; opacity: 0.85; line-height: 1.45; }
    .error{
      margin-top: 10px;
      padding: 10px;
      border-radius: 12px;
      background: rgba(255,0,0,0.06);
      border: 1px solid rgba(255,0,0,0.15);
    }
    .actions{
      display:flex;
      justify-content:flex-end;
      gap: 10px;
      padding-top: 8px;
    }
    .btn{
      padding:10px 12px;
      border-radius:10px;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      cursor:pointer;
    }
    .btn:disabled{ opacity:0.6; cursor:not-allowed; }
    .danger{
      border-color: rgba(255,0,0,0.25);
      background: rgba(255,0,0,0.06);
      font-weight: 700;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirm';
  @Input() message: string | null = null;
  @Input() confirmText = 'Confirm';
  @Input() busy = false;
  @Input() error: string | null = null;
  @Input() closeOnBackdrop = true;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onBackdrop(): void {
    if (this.closeOnBackdrop && !this.busy) this.cancel.emit();
  }
}
