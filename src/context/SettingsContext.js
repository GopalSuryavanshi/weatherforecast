import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [temperatureUnit, setTemperatureUnit] = useState('celsius');
  const [newsCategories, setNewsCategories] = useState({
    Business: true,
    Sports: true,
    Technology: false,
    Entertainment: false,
    Science: false,
    Health: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedUnit = await AsyncStorage.getItem('temperatureUnit');
        if (storedUnit) {
          setTemperatureUnit(storedUnit);
        }
        const storedCategories = await AsyncStorage.getItem('newsCategories');
        if (storedCategories) {
          setNewsCategories(JSON.parse(storedCategories));
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('temperatureUnit', temperatureUnit);
        await AsyncStorage.setItem('newsCategories', JSON.stringify(newsCategories));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    };
    saveSettings();
  }, [temperatureUnit, newsCategories]);

  const updateTemperatureUnit = unit => {
    setTemperatureUnit(unit);
  };

  const toggleNewsCategory = category => {
    setNewsCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const value = {
    temperatureUnit,
    newsCategories,
    updateTemperatureUnit,
    toggleNewsCategory,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};


