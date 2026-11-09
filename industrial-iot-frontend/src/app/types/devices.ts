export type DeviceSummaryDto = {
  deviceId: string;
  name: string;
  location: string;
  status: string;
  lastMeasurementUtc: string | null;
  activeAlerts: number;
  sensorsCount: number;
};

export type DeviceSensorDto = {
  sensorId: string;
  type: string;
  unit: string;
  lowerBound: number | null;
  upperBound: number | null;
  modbusAddress: number | null;
  scale: number | null;
  lastValue: number | null;
  lastTimestampUtc: string | null;
};

export type DeviceAlertDto = {
  alertId: string;
  deviceId: string;
  sensorId: string | null;
  severity: string;
  message: string;
  raisedAtUtc: string;
  acknowledgedAtUtc: string | null;
  clearedAtUtc: string | null;
};

export type DeviceDetailsDto = {
  deviceId: string;
  name: string;
  location: string;
  status: string;
  modbusIpAddress: string | null;
  modbusPort: number | null;
  modbusUnitId: number | null;
  sensors: DeviceSensorDto[];
  activeAlerts: DeviceAlertDto[];
};

export type DeviceDto = {
  id: string;
  name: string;
  location: string;
  status: string;

  // optional Modbus config
  modbusIpAddress?: string | null;
  modbusPort?: number | null;
  modbusUnitId?: number | null;
};

export type CreateDeviceRequest = {
  name: string;
  location: string;
  status: string;

  modbusIpAddress?: string | null;
  modbusPort?: number | null;
  modbusUnitId?: number | null;
};
