/**
 * 天气应用主组件
 * 提供天气预报查询功能
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import type { WeatherData } from '../types/weather';
import { fetchWeather, getCoordinates, weatherCodeMap, getWeatherIcon, getAirQualityLevel } from '../services/weatherApi';
import './WeatherApp.css';

interface City {
  name: string;
  lat: number;
  lon: number;
  isDefault?: boolean;
}

function WeatherApp() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [inputCity, setInputCity] = useState<string>('北京');
  const [cities, setCities] = useState<City[]>([]);

  // 保存城市列表到 localStorage
  const saveCities = (cityList: City[]) => {
    localStorage.setItem('weatherAppCities', JSON.stringify(cityList));
  };

  // 收藏城市
  const addCity = useCallback((city: City) => {
    const existingCity = cities.find(c => c.name === city.name);
    if (!existingCity) {
      const updatedCities = [...cities, city];
      setCities(updatedCities);
      saveCities(updatedCities);
    }
  }, [cities]);

  // 删除城市
  const removeCity = useCallback((cityName: string) => {
    const updatedCities = cities.filter(city => city.name !== cityName);
    setCities(updatedCities);
    saveCities(updatedCities);
  }, [cities]);

  const handleSearch = useCallback(async (searchCity: string) => {
    if (!searchCity.trim()) {
      setError('请输入城市名称');
      return;
    }

    setLoading(true);
    setError('');
    setWeatherData(null);

    try {
      // 获取城市坐标信息
      const cityInfo = await getCoordinates(searchCity);
      // 添加城市到收藏列表
      addCity({
        name: cityInfo.name,
        lat: cityInfo.lat,
        lon: cityInfo.lon
      });
      // 获取天气数据
      const data = await fetchWeather(searchCity);
      setWeatherData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取天气失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [addCity]);

  useEffect(() => {
    // 从 localStorage 加载城市列表
    const savedCities = localStorage.getItem('weatherAppCities');
    if (savedCities) {
      setCities(JSON.parse(savedCities));
    }
  }, []);

  useEffect(() => {
    handleSearch('北京');
  }, [handleSearch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch(inputCity);
  };

  const formatDate = (dateStr: string, index: number): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (index === 0) return '今天';
    if (index === 1) return '明天';

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  };

  const formatHour = (timeStr: string): string => {
    const date = new Date(timeStr);
    return date.getHours() + '时';
  };

  const renderLoading = () => (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>正在加载天气数据...</p>
    </div>
  );

  const renderError = () => (
    <div className="error-container">
      <span className="error-icon">⚠️</span>
      <p>{error}</p>
      <button className="retry-btn" onClick={() => handleSearch(inputCity)}>
        重新加载
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="empty-container">
      <span className="empty-icon">🔍</span>
      <p>输入城市名称查询天气</p>
    </div>
  );

  return (
    <div className="weather-app">
      <div className="container">
        <header className="header">
          <h1>天气预报</h1>
          <p className="subtitle">实时天气查询</p>
        </header>

        <form className="search-form" onSubmit={handleSubmit}>
          <input
            type="text"
            className="search-input"
            placeholder="请输入城市名称（如：北京、上海）"
            value={inputCity}
            onChange={(e) => setInputCity(e.target.value)}
          />
          <button type="submit" className="search-btn">
            查询
          </button>
        </form>

        {/* 城市列表 */}
        {cities.length > 0 && (
          <div className="cities-container">
            <h3>城市列表</h3>
            <div className="cities-list">
              {cities.map((city) => (
                <div key={city.name} className="city-item">
                  <span
                    className="city-name"
                    onClick={() => handleSearch(city.name)}
                  >
                    {city.name}
                  </span>
                  <button
                    className="city-remove"
                    onClick={() => removeCity(city.name)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && renderLoading()}
        {error && !loading && renderError()}
        {!loading && !error && !weatherData && renderEmpty()}

        {weatherData && (
          <div className="weather-content">
            <section className="current-weather">
              <div className="location">
                <span className="location-icon">📍</span>
                <h2>{weatherData.location}</h2>
              </div>

              <div className="weather-main">
                <span className="weather-icon">
                  {getWeatherIcon(weatherData.current.weatherCode)}
                </span>
                <div className="temperature">
                  <span className="temp-value">{weatherData.current.temperature}</span>
                  <span className="temp-unit">°C</span>
                </div>
                <p className="weather-desc">
                  {weatherCodeMap[weatherData.current.weatherCode] || '未知'}
                </p>
              </div>

              <div className="weather-details">
                <div className="detail-item">
                  <span className="detail-icon">💧</span>
                  <span className="detail-label">湿度</span>
                  <span className="detail-value">{weatherData.current.humidity}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">💨</span>
                  <span className="detail-label">风速</span>
                  <span className="detail-value">{weatherData.current.windSpeed} km/h</span>
                </div>
                {weatherData.current.airQuality !== undefined && (
                  <div className="detail-item">
                    <span className="detail-icon">🌬️</span>
                    <span className="detail-label">AQI</span>
                    <span
                      className="detail-value aqi-value"
                      style={{ color: getAirQualityLevel(weatherData.current.airQuality).color }}
                    >
                      {weatherData.current.airQuality} ({getAirQualityLevel(weatherData.current.airQuality).level})
                    </span>
                  </div>
                )}
              </div>
            </section>

            <section className="hourly-forecast">
              <h3>24小时天气预报</h3>
              <div className="hourly-list">
                {weatherData.hourly.map((hour) => (
                  <div key={hour.time} className="hourly-item">
                    <span className="hourly-time">{formatHour(hour.time)}</span>
                    <span className="hourly-icon">
                      {getWeatherIcon(hour.weatherCode)}
                    </span>
                    <span className="hourly-temp">{hour.temperature}°</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="forecast">
              <h3>7天天气预报</h3>
              <div className="forecast-list">
                {weatherData.daily.map((day, index) => (
                  <div key={day.date} className="forecast-item">
                    <span className="forecast-day">{formatDate(day.date, index)}</span>
                    <span className="forecast-icon">
                      {getWeatherIcon(day.weatherCode)}
                    </span>
                    <span className="forecast-weather">
                      {weatherCodeMap[day.weatherCode] || '未知'}
                    </span>
                    <div className="forecast-temp">
                      <span className="temp-high">{day.temperatureMax}°</span>
                      <span className="temp-low">{day.temperatureMin}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <footer className="footer">
              <p>数据更新时间: {new Date(weatherData.lastUpdated).toLocaleString('zh-CN')}</p>
              <p className="data-source">数据来源: Open-Meteo</p>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherApp;
