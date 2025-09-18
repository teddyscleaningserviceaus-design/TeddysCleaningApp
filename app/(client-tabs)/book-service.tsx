import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import ClientHeader from '../../components/ClientHeader';
import { useClient } from '../../contexts/ClientContext';

const { width } = Dimensions.get('window');

export default function EcoHub() {
  const router = useRouter();
  const { clientData } = useClient();
  const [selectedSensor, setSelectedSensor] = useState(null);
  
  // Mock IoT data - will be replaced with real ESP32 data
  const [sensorData, setSensorData] = useState({
    airQuality: { aqi: 42, status: 'Good', color: '#10b981' },
    temperature: 22.5,
    humidity: 45,
    co2: 380,
    lastUpdate: new Date()
  });
  
  const [floorPlan, setFloorPlan] = useState(null);
  const [recycleBins, setRecycleBins] = useState([
    { id: 1, type: 'General', level: 65, location: 'Kitchen', color: '#6b7280' },
    { id: 2, type: 'Recycling', level: 30, location: 'Office', color: '#10b981' },
    { id: 3, type: 'Organic', level: 80, location: 'Break Room', color: '#f59e0b' }
  ]);
  
  // Mock sensor locations on floorplan
  const sensorLocations = [
    { id: 1, x: 120, y: 80, temp: 22.5, aqi: 42, room: 'Living Room' },
    { id: 2, x: 200, y: 150, temp: 24.1, aqi: 38, room: 'Kitchen' },
    { id: 3, x: 80, y: 200, temp: 21.8, aqi: 45, room: 'Bedroom' }
  ];

  const handleUploadFloorplan = () => {
    Alert.alert(
      'Upload Venue Video',
      'Record a walkthrough video of your venue. Our AI will process it to create your floorplan with sensor locations.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Record Video', onPress: () => Alert.alert('Coming Soon', 'Video processing feature will be available soon!') }
      ]
    );
  };

  const getBinLevelColor = (level) => {
    if (level > 80) return '#ef4444';
    if (level > 60) return '#f59e0b';
    return '#10b981';
  };

  const getAQIStatus = (aqi) => {
    if (aqi <= 50) return { status: 'Good', color: '#10b981' };
    if (aqi <= 100) return { status: 'Moderate', color: '#f59e0b' };
    return { status: 'Poor', color: '#ef4444' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10b981" />
      <ClientHeader title="Eco Hub" subtitle="Smart venue monitoring" theme="waste" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Real-time Environmental Data */}
        <View style={styles.environmentalSection}>
          <Text style={styles.sectionTitle}>🌍 Live Environmental Data</Text>
          <View style={styles.dataGrid}>
            <View style={[styles.dataCard, { borderLeftColor: sensorData.airQuality.color }]}>
              <MaterialIcons name="air" size={24} color={sensorData.airQuality.color} />
              <Text style={styles.dataValue}>{sensorData.airQuality.aqi}</Text>
              <Text style={styles.dataLabel}>Air Quality</Text>
              <Text style={[styles.dataStatus, { color: sensorData.airQuality.color }]}>
                {sensorData.airQuality.status}
              </Text>
            </View>
            
            <View style={[styles.dataCard, { borderLeftColor: '#06b6d4' }]}>
              <MaterialIcons name="thermostat" size={24} color="#06b6d4" />
              <Text style={styles.dataValue}>{sensorData.temperature}°C</Text>
              <Text style={styles.dataLabel}>Temperature</Text>
              <Text style={styles.dataStatus}>Optimal</Text>
            </View>
            
            <View style={[styles.dataCard, { borderLeftColor: '#8b5cf6' }]}>
              <MaterialIcons name="water-drop" size={24} color="#8b5cf6" />
              <Text style={styles.dataValue}>{sensorData.humidity}%</Text>
              <Text style={styles.dataLabel}>Humidity</Text>
              <Text style={styles.dataStatus}>Good</Text>
            </View>
            
            <View style={[styles.dataCard, { borderLeftColor: '#f59e0b' }]}>
              <MaterialIcons name="co2" size={24} color="#f59e0b" />
              <Text style={styles.dataValue}>{sensorData.co2}</Text>
              <Text style={styles.dataLabel}>CO₂ (ppm)</Text>
              <Text style={styles.dataStatus}>Normal</Text>
            </View>
          </View>
          <Text style={styles.lastUpdate}>
            Last updated: {sensorData.lastUpdate.toLocaleTimeString()}
          </Text>
        </View>

        {/* Interactive Floorplan */}
        <View style={styles.floorplanSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏢 Smart Floorplan</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={handleUploadFloorplan}>
              <Ionicons name="cloud-upload" size={16} color="#4facfe" />
              <Text style={styles.uploadText}>Upload Video</Text>
            </TouchableOpacity>
          </View>
          
          {floorPlan ? (
            <View style={styles.floorplanContainer}>
              {/* Floorplan will be rendered here */}
              <Text style={styles.placeholderText}>AI-Generated Floorplan</Text>
            </View>
          ) : (
            <View style={styles.floorplanPlaceholder}>
              <View style={styles.mockFloorplan}>
                <Text style={styles.floorplanTitle}>Your Venue Layout</Text>
                
                {/* Mock room layout */}
                <View style={styles.roomsContainer}>
                  <View style={[styles.room, { top: 20, left: 20, width: 80, height: 60 }]}>
                    <Text style={styles.roomLabel}>Living Room</Text>
                  </View>
                  <View style={[styles.room, { top: 20, right: 20, width: 70, height: 50 }]}>
                    <Text style={styles.roomLabel}>Kitchen</Text>
                  </View>
                  <View style={[styles.room, { bottom: 20, left: 20, width: 60, height: 70 }]}>
                    <Text style={styles.roomLabel}>Bedroom</Text>
                  </View>
                </View>
                
                {/* Sensor locations overlay */}
                {sensorLocations.map((sensor) => (
                  <TouchableOpacity
                    key={sensor.id}
                    style={[styles.sensorDot, { left: sensor.x, top: sensor.y }]}
                    onPress={() => setSelectedSensor(sensor)}
                  >
                    <View style={[styles.sensorIndicator, { 
                      backgroundColor: getAQIStatus(sensor.aqi).color 
                    }]}>
                      <MaterialIcons name="sensors" size={12} color="#fff" />
                    </View>
                    <Text style={styles.sensorTemp}>{sensor.temp}°</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity style={styles.generateButton} onPress={handleUploadFloorplan}>
                <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.generateGradient}>
                  <MaterialIcons name="smart-toy" size={20} color="#fff" />
                  <Text style={styles.generateText}>Generate with AI</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recycle Bin Status */}
        <View style={styles.binsSection}>
          <Text style={styles.sectionTitle}>♻️ Smart Bin Monitoring</Text>
          <View style={styles.binsGrid}>
            {recycleBins.map((bin) => (
              <View key={bin.id} style={styles.binCard}>
                <View style={styles.binHeader}>
                  <MaterialIcons name="delete" size={24} color={bin.color} />
                  <Text style={styles.binType}>{bin.type}</Text>
                </View>
                <Text style={styles.binLocation}>{bin.location}</Text>
                
                <View style={styles.binLevelContainer}>
                  <View style={styles.binLevelBar}>
                    <View style={[
                      styles.binLevelFill, 
                      { 
                        height: `${bin.level}%`, 
                        backgroundColor: getBinLevelColor(bin.level) 
                      }
                    ]} />
                  </View>
                  <Text style={[styles.binLevel, { color: getBinLevelColor(bin.level) }]}>
                    {bin.level}%
                  </Text>
                </View>
                
                {bin.level > 80 && (
                  <View style={styles.alertBadge}>
                    <MaterialIcons name="warning" size={12} color="#ef4444" />
                    <Text style={styles.alertText}>Needs Emptying</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Environmental Impact */}
        <View style={styles.impactSection}>
          <Text style={styles.sectionTitle}>🌱 Your Environmental Impact</Text>
          <View style={styles.impactGrid}>
            <View style={styles.impactCard}>
              <Text style={styles.impactNumber}>{clientData?.co2Saved || 0}kg</Text>
              <Text style={styles.impactLabel}>CO₂ Saved This Month</Text>
            </View>
            <View style={styles.impactCard}>
              <Text style={styles.impactNumber}>85%</Text>
              <Text style={styles.impactLabel}>Waste Diverted</Text>
            </View>
            <View style={styles.impactCard}>
              <Text style={styles.impactNumber}>150L</Text>
              <Text style={styles.impactLabel}>Water Conserved</Text>
            </View>
            <View style={styles.impactCard}>
              <Text style={styles.impactNumber}>100%</Text>
              <Text style={styles.impactLabel}>Green Products</Text>
            </View>
          </View>
        </View>

        {/* Sensor Detail Modal */}
        {selectedSensor && (
          <View style={styles.sensorModal}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedSensor.room} Sensor</Text>
              <Text style={styles.modalData}>Temperature: {selectedSensor.temp}°C</Text>
              <Text style={styles.modalData}>Air Quality: {selectedSensor.aqi} AQI</Text>
              <TouchableOpacity 
                style={styles.modalClose}
                onPress={() => setSelectedSensor(null)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1 },
  
  environmentalSection: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, elevation: 3 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4facfe' },
  uploadText: { fontSize: 12, color: '#4facfe', fontWeight: '600', marginLeft: 4 },
  
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dataCard: { flex: 1, minWidth: '45%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, alignItems: 'center', borderLeftWidth: 4 },
  dataValue: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginTop: 8 },
  dataLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  dataStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  lastUpdate: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 12 },
  
  floorplanSection: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, elevation: 3 },
  floorplanContainer: { height: 300, backgroundColor: '#f8fafc', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  floorplanPlaceholder: { alignItems: 'center' },
  mockFloorplan: { width: width - 80, height: 250, backgroundColor: '#f1f5f9', borderRadius: 12, position: 'relative', marginBottom: 16 },
  floorplanTitle: { position: 'absolute', top: 10, left: 10, fontSize: 14, fontWeight: '600', color: '#6b7280' },
  roomsContainer: { flex: 1 },
  room: { position: 'absolute', backgroundColor: '#e2e8f0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  roomLabel: { fontSize: 10, color: '#475569', fontWeight: '500' },
  sensorDot: { position: 'absolute', alignItems: 'center' },
  sensorIndicator: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  sensorTemp: { fontSize: 8, color: '#374151', fontWeight: '600', marginTop: 2 },
  generateButton: { borderRadius: 12, overflow: 'hidden' },
  generateGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  generateText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  
  binsSection: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, elevation: 3 },
  binsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  binCard: { flex: 1, minWidth: '30%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, alignItems: 'center' },
  binHeader: { alignItems: 'center', marginBottom: 8 },
  binType: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 4 },
  binLocation: { fontSize: 10, color: '#6b7280', marginBottom: 12 },
  binLevelContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  binLevelBar: { width: 20, height: 40, backgroundColor: '#e5e7eb', borderRadius: 10, justifyContent: 'flex-end', overflow: 'hidden' },
  binLevelFill: { width: '100%', borderRadius: 10 },
  binLevel: { fontSize: 14, fontWeight: 'bold' },
  alertBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 8 },
  alertText: { fontSize: 8, color: '#ef4444', fontWeight: '600', marginLeft: 2 },
  
  impactSection: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20, elevation: 3 },
  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  impactCard: { flex: 1, minWidth: '45%', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' },
  impactNumber: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
  impactLabel: { fontSize: 11, color: '#374151', textAlign: 'center', marginTop: 4 },
  
  sensorModal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 20, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  modalData: { fontSize: 14, color: '#374151', marginBottom: 8 },
  modalClose: { backgroundColor: '#4facfe', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 12 },
  modalCloseText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});