import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'devices', pathMatch: 'full' },

      {
        path: 'login',
        loadComponent: () =>
          import('./auth/login.component').then((m) => m.LoginComponent),
      },

      {
        path: 'devices',
        loadComponent: () =>
          import('./devices/devices-list.component').then((m) => m.DevicesListComponent),
      },

      {
        path: 'devices/new',
        loadComponent: () =>
          import('./devices/device-create.component').then((m) => m.DeviceCreateComponent),
      },

      {
        path: 'devices/:id',
        loadComponent: () =>
          import('./devices/device-details.component').then((m) => m.DeviceDetailsComponent),
      },

      {
        path: 'devices/:id/edit',
        loadComponent: () =>
          import('./devices/device-edit.component').then((m) => m.DeviceEditComponent),
      },

      {
        path: 'simulator',
        loadComponent: () =>
          import('./simulator/simulator.component').then((m) => m.SimulatorComponent),
      },

      {
        path: 'devices/:id/sensors/new',
        loadComponent: () =>
          import('./devices/sensor-create.component').then((m) => m.SensorCreateComponent),
      },

      {
        path: 'devices/:id/sensors/:sensorId/edit',
        loadComponent: () =>
          import('./devices/sensor-edit.component').then((m) => m.SensorEditComponent),
      },

      { path: '**', redirectTo: 'devices' },
    ],
  },
];
