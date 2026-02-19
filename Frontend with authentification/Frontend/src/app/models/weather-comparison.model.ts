export interface WeatherComparison {
  id: number;
  city: string;
  forecastDate: string;
  recordedAt: string;
  source: string;
  forecastTemperature: number;
  forecastHumidity: number;
  forecastWindSpeed: number;
  forecastCondition: string;
  actualTemperature?: number;
  actualHumidity?: number;
  actualWindSpeed?: number;
  actualCondition?: string;
  observedAt?: string;
  temperatureDelta?: number;
  humidityDelta?: number;
  windSpeedDelta?: number;
  conditionMatch?: boolean;
}