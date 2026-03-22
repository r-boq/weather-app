/**
 * 天气 API 服务
 * 使用 Open-Meteo 免费 API（无需 API Key）
 * 文档: https://open-meteo.com/en/docs
 */

import type { WeatherData, CurrentWeather, DailyForecast, HourlyForecast } from '../types/weather';

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * 天气代码映射表
 * 来自 WMO Weather interpretation codes
 */
export const weatherCodeMap: Record<number, string> = {
  0: '晴',
  1: '晴间多云',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾凇',
  51: '小毛毛雨',
  53: '中毛毛雨',
  55: '大毛毛雨',
  56: '冻毛毛雨',
  57: '强冻毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '强冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '小阵雨',
  81: '中阵雨',
  82: '大阵雨',
  85: '小阵雪',
  86: '大阵雪',
  95: '雷暴',
  96: '雷暴伴冰雹',
  99: '强雷暴伴冰雹',
};

/**
 * 获取天气图标
 */
export const getWeatherIcon = (code: number): string => {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 57) return '🌧️';
  if (code >= 61 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌤️';
};

/**
 * 获取空气质量等级
 */
export const getAirQualityLevel = (aqi: number): { level: string; color: string } => {
  if (aqi <= 50) return { level: '优', color: '#00e400' };
  if (aqi <= 100) return { level: '良', color: '#ffff00' };
  if (aqi <= 150) return { level: '轻度污染', color: '#ff7e00' };
  if (aqi <= 200) return { level: '中度污染', color: '#ff0000' };
  if (aqi <= 300) return { level: '重度污染', color: '#99004c' };
  return { level: '严重污染', color: '#7e0023' };
};

/**
 * 通过城市名称获取坐标
 */
export async function getCoordinates(city: string): Promise<{ lat: number; lon: number; name: string }> {
  const response = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`);
  
  if (!response.ok) {
    throw new Error('无法获取城市信息，请检查网络连接');
  }
  
  const data = await response.json();
  
  if (!data.results || data.results.length === 0) {
    throw new Error('未找到该城市，请检查城市名称是否正确');
  }
  
  const result = data.results[0];
  return {
    lat: result.latitude,
    lon: result.longitude,
    name: result.name + (result.admin1 ? `, ${result.admin1}` : '') + (result.country ? `, ${result.country}` : ''),
  };
}

/**
 * 获取空气质量数据
 */
async function getAirQuality(lat: number, lon: number): Promise<number | undefined> {
  try {
    const response = await fetch(
      `${AIR_QUALITY_API}?latitude=${lat}&longitude=${lon}&current=us_aqi`
    );
    
    if (!response.ok) return undefined;
    
    const data = await response.json();
    return data.current?.us_aqi;
  } catch {
    return undefined;
  }
}

/**
 * 获取天气数据
 * @param city 城市名称
 * @returns 天气数据对象
 */
export async function fetchWeather(city: string): Promise<WeatherData> {
  const { lat, lon, name } = await getCoordinates(city);
  
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    hourly: 'temperature_2m,weather_code,wind_speed_10m',
    timezone: 'auto',
    forecast_days: '7',
  });
  
  const response = await fetch(`${WEATHER_API}?${params}`);
  
  if (!response.ok) {
    throw new Error('无法获取天气数据，请稍后重试');
  }
  
  const data = await response.json();
  
  const airQuality = await getAirQuality(lat, lon);
  
  const current: CurrentWeather = {
    temperature: Math.round(data.current.temperature_2m),
    humidity: data.current.relative_humidity_2m,
    weatherCode: data.current.weather_code,
    windSpeed: Math.round(data.current.wind_speed_10m),
    airQuality,
  };
  
  const daily: DailyForecast[] = data.daily.time.map((date: string, index: number) => ({
    date,
    temperatureMax: Math.round(data.daily.temperature_2m_max[index]),
    temperatureMin: Math.round(data.daily.temperature_2m_min[index]),
    weatherCode: data.daily.weather_code[index],
  }));
  
  const hourly: HourlyForecast[] = data.hourly.time.map((time: string, index: number) => ({
    time,
    temperature: Math.round(data.hourly.temperature_2m[index]),
    weatherCode: data.hourly.weather_code[index],
    windSpeed: Math.round(data.hourly.wind_speed_10m[index]),
  })).slice(0, 24); // 只取未来24小时的数据
  
  return {
    current,
    daily,
    hourly,
    location: name,
    lastUpdated: new Date().toISOString(),
  };
}
