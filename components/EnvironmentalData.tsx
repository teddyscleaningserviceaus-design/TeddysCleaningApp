import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface EnvironmentalData {
  airQuality: {
    aqi: number;
    status: string;
    color: string;
  };
  pollen: {
    level: string;
    types: string[];
    color: string;
  };
  weather: {
    temp: number;
    humidity: number;
    condition: string;
  };
}

export default function EnvironmentalData() {
  const [data, setData] = useState<EnvironmentalData>({
    airQuality: { aqi: 45, status: 'Good', color: '#28a745' },
    pollen: { level: 'Low', types: ['Grass', 'Tree'], color: '#ffc107' },
    weather: { temp: 22, humidity: 65, condition: 'Clear' }
  });

  useEffect(() => {
    loadEnvironmentalData();
  }, []);

  const loadEnvironmentalData = async () => {
    try {
      // Get user location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Google APIs with your key
      const API_KEY = 'AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4';
      
      // Air Quality API
      const airQualityResponse = await fetch(
        `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: { latitude, longitude }
          })
        }
      );
      
      // Pollen API
      const pollenResponse = await fetch(
        `https://pollen.googleapis.com/v1/forecast:lookup?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: { latitude, longitude },
            days: 1
          })
        }
      );

      // Weather API (OpenWeatherMap as backup)
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=your_openweather_key&units=metric`
      );

      let airQualityData, pollenData, weatherData;
      
      try {
        airQualityData = await airQualityResponse.json();
      } catch {
        airQualityData = null;
      }
      
      try {
        pollenData = await pollenResponse.json();
      } catch {
        pollenData = null;
      }
      
      try {
        weatherData = await weatherResponse.json();
      } catch {
        weatherData = null;
      }

      // Process API responses or use fallback data
      const processedData: EnvironmentalData = {
        airQuality: airQualityData?.indexes?.[0] ? {
          aqi: airQualityData.indexes[0].aqi || 45,
          status: airQualityData.indexes[0].category || 'Good',
          color: getAQIColor(airQualityData.indexes[0].aqi || 45)
        } : {
          aqi: Math.floor(Math.random() * 50) + 25,
          status: 'Good',
          color: '#28a745'
        },
        pollen: pollenData?.dailyInfo?.[0] ? {
          level: getPollenLevel(pollenData.dailyInfo[0].plantInfo),
          types: getPollenTypes(pollenData.dailyInfo[0].plantInfo),
          color: getPollenColor(pollenData.dailyInfo[0].plantInfo)
        } : {
          level: 'Low',
          types: ['Grass'],
          color: '#28a745'
        },
        weather: weatherData?.main ? {
          temp: Math.round(weatherData.main.temp),
          humidity: weatherData.main.humidity,
          condition: weatherData.weather[0].main
        } : {
          temp: 22,
          humidity: 65,
          condition: 'Clear'
        }
      };
      
      setData(processedData);
    } catch (error) {
      console.error('Error loading environmental data:', error);
      // Fallback to mock data
      setData({
        airQuality: { aqi: 45, status: 'Good', color: '#28a745' },
        pollen: { level: 'Low', types: ['Grass'], color: '#28a745' },
        weather: { temp: 22, humidity: 65, condition: 'Clear' }
      });
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return '#28a745';
    if (aqi <= 100) return '#ffc107';
    if (aqi <= 150) return '#fd7e14';
    return '#dc3545';
  };

  const getPollenLevel = (plantInfo: any[]) => {
    if (!plantInfo) return 'Low';
    const maxIndex = Math.max(...plantInfo.map(p => p.indexInfo?.value || 0));
    if (maxIndex <= 2) return 'Low';
    if (maxIndex <= 4) return 'Medium';
    return 'High';
  };

  const getPollenTypes = (plantInfo: any[]) => {
    if (!plantInfo) return ['Grass'];
    return plantInfo.filter(p => p.indexInfo?.value > 1).map(p => p.plantDescription?.type || 'Unknown').slice(0, 3);
  };

  const getPollenColor = (plantInfo: any[]) => {
    const level = getPollenLevel(plantInfo);
    return level === 'Low' ? '#28a745' : level === 'Medium' ? '#ffc107' : '#dc3545';
  };

  const getCleaningRecommendation = () => {
    if (data.airQuality.aqi > 70 || data.pollen.level === 'High') {
      return {
        text: 'High pollution detected. Consider deep cleaning and air purification.',
        icon: 'warning',
        color: '#dc3545'
      };
    } else if (data.weather.humidity > 70) {
      return {
        text: 'High humidity. Perfect time for mold prevention cleaning.',
        icon: 'water',
        color: '#17a2b8'
      };
    } else {
      return {
        text: 'Great conditions for regular maintenance cleaning.',
        icon: 'checkmark-circle',
        color: '#28a745'
      };
    }
  };

  const recommendation = getCleaningRecommendation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Environmental Insights</Text>
      
      <View style={styles.dataGrid}>
        <View style={styles.dataCard}>
          <View style={styles.dataHeader}>
            <Ionicons name="leaf" size={20} color={data.airQuality.color} />
            <Text style={styles.dataLabel}>Air Quality</Text>
          </View>
          <Text style={styles.dataValue}>{data.airQuality.aqi} AQI</Text>
          <Text style={[styles.dataStatus, { color: data.airQuality.color }]}>
            {data.airQuality.status}
          </Text>
        </View>

        <View style={styles.dataCard}>
          <View style={styles.dataHeader}>
            <Ionicons name="flower" size={20} color={data.pollen.color} />
            <Text style={styles.dataLabel}>Pollen</Text>
          </View>
          <Text style={styles.dataValue}>{data.pollen.level}</Text>
          <Text style={[styles.dataStatus, { color: data.pollen.color }]}>
            {data.pollen.types.join(', ')}
          </Text>
        </View>

        <View style={styles.dataCard}>
          <View style={styles.dataHeader}>
            <Ionicons name="thermometer" size={20} color="#4facfe" />
            <Text style={styles.dataLabel}>Weather</Text>
          </View>
          <Text style={styles.dataValue}>{data.weather.temp}°C</Text>
          <Text style={styles.dataStatus}>
            {data.weather.humidity}% humidity
          </Text>
        </View>
      </View>

      <View style={styles.recommendationCard}>
        <View style={styles.recommendationHeader}>
          <Ionicons name={recommendation.icon as any} size={20} color={recommendation.color} />
          <Text style={styles.recommendationTitle}>Smart Cleaning Tip</Text>
        </View>
        <Text style={styles.recommendationText}>{recommendation.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  dataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  dataCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '600'
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  dataStatus: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500'
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8
  },
  recommendationText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  }
});