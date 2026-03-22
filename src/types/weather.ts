/**
 * 天气数据类型定义
 */

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  airQuality?: number;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  weatherCode: number;
  windSpeed: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  location: string;
  lastUpdated: string;
}

export interface WeatherError {
  message: string;
  code?: string;
}
