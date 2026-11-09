export type SensorDto = {
  id: string;
  deviceId: string;
  type: string;
  unit: string;

  lowerBound: number | null;
  upperBound: number | null;

  modbusAddress: number | null;
  scale: number | null;
};


export type CreateSensorRequest = {
  deviceId: string;
  type: string;
  unit: string;
  lowerBound: number | null;
  upperBound: number | null;
  modbusAddress: number | null;
  scale: number | null;
};

export type UpdateSensorRequest = {
  type: string;
  unit: string;
  lowerBound: number | null;
  upperBound: number | null;
  modbusAddress: number | null;
  scale: number | null;
};
