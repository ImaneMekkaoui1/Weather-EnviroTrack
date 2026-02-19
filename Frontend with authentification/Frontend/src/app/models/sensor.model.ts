// src/app/models/sensor.model.ts
export interface Sensor {
    id: string;
    name: string;
    type: 'air' | 'weather' | 'noise';
    location: string;
    status: 'actif' | 'inactif' | 'maintenance';
    lastValue?: number;
    lastUpdate?: Date;
  }