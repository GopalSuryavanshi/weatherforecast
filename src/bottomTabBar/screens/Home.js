import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  SafeAreaView,
  PermissionsAndroid,
  Platform,
  Linking,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import moment from 'moment';
import {useSettings} from '../../context/SettingsContext';
import {ScrollView} from 'react-native-gesture-handler';

const WEATHER_API_KEY = '66fb6657d29af5be71d4483435fab7aa';
const NEWS_API_KEY = '09e7a1bbd7dc4bcdb65cfbf870a7acc4';

const Home = () => {
  const {temperatureUnit, newsCategories} = useSettings();

  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [news, setNews] = useState([]);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const celsiusToFahrenheit = celsius => (celsius * 9) / 5 + 32;

  const getWeatherSentimentKeywords = (tempCelsius, weatherCondition) => {
    const COLD_TEMP_THRESHOLD = 10;
    const HOT_TEMP_THRESHOLD = 25;

    let sentimentKeywords = [];
    const depressingConditions = [
      'rain',
      'drizzle',
      'thunderstorm',
      'snow',
      'mist',
      'fog',
    ];
    const fearConditions = ['tornado', 'hurricane', 'cyclone', 'squall'];

    const conditionMain = weatherCondition.toLowerCase();

    if (tempCelsius < COLD_TEMP_THRESHOLD) {
      sentimentKeywords.push(
        'recession',
        'unemployment',
        'crisis',
        'sad',
        'difficulty',
      );
      if (depressingConditions.includes(conditionMain)) {
        sentimentKeywords.push('gloomy', 'hardship');
      }
    } else if (tempCelsius > HOT_TEMP_THRESHOLD) {
      sentimentKeywords.push('crime', 'danger', 'threat', 'panic', 'terror');
      if (fearConditions.includes(conditionMain)) {
        sentimentKeywords.push('disaster', 'emergency');
      }
    } else {
      sentimentKeywords.push(
        'success',
        'achievement',
        'celebration',
        'joy',
        'winning',
        'progress',
      );
    }
    return sentimentKeywords.join(' OR ');
  };

  const fetchNews = useCallback(async () => {
    try {
      setLoadingNews(true);
      const selectedCategories = Object.keys(newsCategories).filter(
        cat => newsCategories[cat],
      );

      let categoryQuery =
        selectedCategories.length > 0
          ? selectedCategories.join(' OR ')
          : 'latest news';

      let weatherSentimentQuery = '';
      // 'weather' state is read here, but it's not a dependency of useCallback.
      // This is okay because fetchNews is called after weather is set by requestLocationPermission.
      if (weather && weather.main && weather.weather && weather.weather[0]) {
        weatherSentimentQuery = getWeatherSentimentKeywords(
          weather.main.temp,
          weather.weather[0].main,
        );
      }

      let finalQuery = categoryQuery;
      if (weatherSentimentQuery) {
        finalQuery = finalQuery
          ? `(${categoryQuery}) AND (${weatherSentimentQuery})`
          : weatherSentimentQuery;
      }

      if (!finalQuery) {
        finalQuery = 'top headlines';
      }

      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          finalQuery,
        )}&sortBy=relevancy&language=en&pageSize=20&apiKey=${NEWS_API_KEY}`,
      );

      const json = await response.json();
      if (json.status === 'ok') {
        setNews(json.articles);
      } else {
        throw new Error(json.message || 'Failed to fetch news');
      }
    } catch (error) {
      console.error('News fetch error:', error);
      Alert.alert(
        'News Error',
        'Could not fetch news feed. Check API key or query.',
      );
    } finally {
      setLoadingNews(false);
    }
  }, [newsCategories]); // Removed 'weather' from dependencies

  const fetchWeather = async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`,
      );
      const data = await response.json();
      if (response.ok) {
        setWeather(data);
      } else {
        throw new Error(data.message || 'Failed to fetch current weather');
      }
    } catch (error) {
      console.error('Weather fetch error:', error);
      Alert.alert('Weather Error', 'Could not fetch current weather data.');
    }
  };

  const fetchFiveDayForecast = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`,
      );
      const data = await response.json();
      if (response.ok) {
        const dailyForecasts = {};
        data.list.forEach(item => {
          const date = moment.unix(item.dt).format('YYYY-MM-DD');
          if (
            !dailyForecasts[date] ||
            (moment.unix(item.dt).hour() >= 12 &&
              moment.unix(item.dt).hour() <= 15)
          ) {
            dailyForecasts[date] = item;
          }
        });
        setForecast(Object.values(dailyForecasts).slice(1, 6));
      } else {
        throw new Error(data.message || 'Failed to fetch 5-day forecast');
      }
    } catch (error) {
      console.error('Forecast fetch error:', error);
      Alert.alert('Forecast Error', 'Could not fetch 5-day forecast data.');
    } finally {
      setLoadingWeather(false);
    }
  };

  const getCurrentLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        console.log('App received location:', {latitude, longitude});
        fetchWeather(latitude, longitude);
        fetchFiveDayForecast(latitude, longitude);
      },
      error => {
        console.error('Location error:', error);
        setLocationError(true);
        Alert.alert(
          'Location Error',
          'Could not retrieve your current location. Please check your GPS settings.',
        );
        setLoadingWeather(false);
      },
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000},
    );
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'This app needs access to your location for weather updates.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        } else {
          console.warn('Location permission denied');
          setLocationError(true);
          Alert.alert(
            'Location Denied',
            'Cannot fetch weather without location access. Please enable it in your device settings.',
          );
          setLoadingWeather(false);
        }
      } else {
        getCurrentLocation();
      }
    } catch (err) {
      console.warn(err);
      setLocationError(true);
      Alert.alert('Error', 'Failed to request location permission.');
      setLoadingWeather(false);
    }
  }, [getCurrentLocation]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    await requestLocationPermission();
    await fetchNews();
    setRefreshing(false);
  }, [requestLocationPermission, fetchNews]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderWeatherContent = () => {
    if (loadingWeather) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      );
    }
    if (locationError || !weather) {
      return (
        <Text style={styles.errorMessage}>
          {locationError
            ? 'Location access denied. Cannot display weather.'
            : 'Weather data unavailable.'}
        </Text>
      );
    }

    const currentTemp =
      temperatureUnit === 'fahrenheit'
        ? Math.round(celsiusToFahrenheit(weather.main.temp))
        : Math.round(weather.main.temp);
    const tempUnitSymbol = temperatureUnit === 'fahrenheit' ? '°F' : '°C';

    return (
      <View style={styles.weatherCard}>
        <View style={styles.weatherTop}>
          <View>
            <Text style={styles.city}>
              {weather.name}, {weather.sys.country}
            </Text>
            <Text style={styles.temperature}>
              {currentTemp}
              {tempUnitSymbol}
            </Text>
            <Text style={styles.condition}>
              {weather.weather[0].description}
            </Text>
          </View>
          <Image
            source={{
              uri: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`,
            }}
            style={styles.weatherIcon}
          />
        </View>

        {forecast.length > 0 && (
          <View style={styles.forecastRow}>
            {forecast.map((item, index) => {
              const forecastTemp =
                temperatureUnit === 'fahrenheit'
                  ? Math.round(celsiusToFahrenheit(item.main.temp_max))
                  : Math.round(item.main.temp_max);
              return (
                <View key={index} style={styles.forecastItem}>
                  <Text style={styles.forecastDay}>
                    {moment.unix(item.dt).format('ddd')}
                  </Text>
                  <Image
                    source={{
                      uri: `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`,
                    }}
                    style={styles.forecastIcon}
                  />
                  <Text style={styles.forecastTemp}>{forecastTemp}°</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderNewsContent = () => {
    if (loadingNews) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      );
    }
    if (news.length === 0) {
      return (
        <Text style={styles.errorMessage}>
          No news available for selected filters.
        </Text>
      );
    }
    return (
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={news}
        keyExtractor={(item, index) => item.url || index.toString()}
        renderItem={({item}) => (
          <View style={styles.newsCard}>
            <Text style={styles.newsSource}>🔔 {item.source.name}</Text>
            <Text style={styles.newsTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.newsDesc}>
                {item.description.substring(0, 100)}...
              </Text>
            )}
            <Text
              style={styles.readMore}
              onPress={() => Linking.openURL(item.url)}
              accessibilityRole="link">
              Read More →
            </Text>
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
        }>
        <View style={styles.header}>
          <Text style={styles.headerText}>Weather & News</Text>
          <Icon name="notifications-outline" size={24} color="#333" />
        </View>

        {renderWeatherContent()}

        <Text style={styles.sectionTitle}>News Feed</Text>
        {renderNewsContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 150,
    marginHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginHorizontal: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  weatherTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  city: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  temperature: {
    fontSize: 50,
    fontWeight: '800',
    color: '#333',
  },
  condition: {
    fontSize: 18,
    color: '#666',
    textTransform: 'capitalize',
  },
  weatherIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 15,
  },
  forecastItem: {
    alignItems: 'center',
  },
  forecastDay: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  forecastIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginBottom: 5,
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 30,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    width: 280,
    marginRight: 15,
    marginLeft: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  newsSource: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    fontWeight: '500',
  },
  newsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  newsDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  readMore: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  errorMessage: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 20,
  },
});

export default Home;
