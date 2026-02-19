// models/weather-data.model.ts
export interface WeatherData {
  openWeather?: {
    name: string;
    sys?: {
      country?: string;
      sunrise?: number;
      sunset?: number;
    };
    main?: {
      temp: number;
      feels_like: number;
      humidity: number;
      pressure: number;
    };
    weather?: Array<{
      description: string;
      icon: string;
    }>;
    coord?: {
      lat: number;
      lon: number;
    };
    wind?: {
      speed: number;
      deg: number;
    };
    visibility?: number;
  };
}