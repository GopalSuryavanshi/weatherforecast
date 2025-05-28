import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useSettings } from '../../context/SettingsContext';

const Settings = () => {
  const { temperatureUnit, newsCategories, updateTemperatureUnit, toggleNewsCategory } = useSettings();

  const handleSave = () => {
    console.log('Settings Saved (via context auto-save):');
    console.log('Selected Unit:', temperatureUnit);
    console.log('Selected Categories:', newsCategories);
    
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Temperature Unit</Text>
        <Text style={styles.subTitle}>Select Unit</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity style={styles.radioItem} onPress={() => updateTemperatureUnit('celsius')}>
            <View style={temperatureUnit === 'celsius' ? styles.radioSelected : styles.radio} />
            <Text style={styles.radioText}>Celsius (°C)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.radioItem} onPress={() => updateTemperatureUnit('fahrenheit')}>
            <View style={temperatureUnit === 'fahrenheit' ? styles.radioSelected : styles.radio} />
            <Text style={styles.radioText}>Fahrenheit (°F)</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 30 }]}>News Categories</Text>
        <Text style={styles.subTitle}>Select Categories</Text>
        {Object.keys(newsCategories).map((cat) => (
          <TouchableOpacity key={cat} style={styles.checkboxRow} onPress={() => toggleNewsCategory(cat)}>
            <View style={newsCategories[cat] ? styles.checkboxChecked : styles.checkbox} />
            <Text style={styles.checkboxText}>{cat}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
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
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 5,
    color: '#333',
  },
  subTitle: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666',
  },
  radioGroup: {
    marginBottom: 15,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 6,
    borderColor: '#5f63f2',
    marginRight: 12,
  },
  radioText: {
    fontSize: 16,
    color: '#333',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#aaa',
    marginRight: 12,
    borderRadius: 4,
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    backgroundColor: '#5f63f2',
    marginRight: 12,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
  },
  saveBtn: {
    backgroundColor: '#5f63f2',
    marginTop: 40,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default Settings;




