// src/app/models/air-quality-data.model.ts
export interface AirQualityData {
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  aqi: number;
  timestamp?: Date;
  humidity?: number;
  temperature?: number;
}