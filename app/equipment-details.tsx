import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Image } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Stack } from 'expo-router';

export default function EquipmentDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [equipment, setEquipment] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(
      doc(db, 'equipment', id),
      (doc) => {
        if (doc.exists()) {
          setEquipment({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const maintenanceQuery = collection(db, 'maintenance');
    const unsubscribe = onSnapshot(maintenanceQuery, (snapshot) => {
      const history = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.equipmentId === id) {
          history.push({ id: doc.id, ...data });
        }
      });
      history.sort((a, b) => b.date.toDate() - a.date.toDate());
      setMaintenanceHistory(history);
    });

    return () => unsubscribe();
  }, [id]);

  const getMaintenanceStatus = () => {
    if (!equipment?.lastMaintenance) return { status: 'overdue', color: '#ef4444', text: 'Maintenance Overdue' };
    
    const daysSince = Math.floor((new Date() - equipment.lastMaintenance.toDate()) / (1000 * 60 * 60 * 24));
    if (daysSince > 7) return { status: 'due', color: '#f59e0b', text: 'Maintenance Due' };
    if (daysSince > 3) return { status: 'soon', color: '#eab308', text: 'Maintenance Due Soon' };
    return { status: 'good', color: '#10b981', text: 'Recently Maintained' };
  };

  const handleReportMaintenance = async () => {
    Alert.alert(
      'Report Maintenance',
      'Have you completed maintenance on this equipment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Completed',
          onPress: async () => {
            try {
              // Add maintenance record
              await addDoc(collection(db, 'maintenance'), {
                equipmentId: id,
                employeeId: auth.currentUser.uid,
                date: new Date(),
                type: 'routine',
                notes: 'Routine maintenance completed',
                status: 'completed',
                createdAt: new Date()
              });

              // Update equipment last maintenance date
              await updateDoc(doc(db, 'equipment', id), {
                lastMaintenance: new Date(),
                updatedAt: new Date()
              });

              Alert.alert('Success', 'Maintenance has been recorded!');
            } catch (error) {
              console.error('Error recording maintenance:', error);
              Alert.alert('Error', 'Failed to record maintenance. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReportIssue = () => {
    Alert.alert(
      'Report Issue',
      'What type of issue would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Needs Repair',
          onPress: () => reportIssue('repair')
        },
        {
          text: 'Not Working',
          onPress: () => reportIssue('broken')
        },
        {
          text: 'Missing Parts',
          onPress: () => reportIssue('missing_parts')
        }
      ]
    );
  };

  const reportIssue = async (issueType) => {
    try {
      await addDoc(collection(db, 'maintenance'), {
        equipmentId: id,
        employeeId: auth.currentUser.uid,
        date: new Date(),
        type: 'issue',
        issueType: issueType,
        notes: `Issue reported: ${issueType.replace('_', ' ')}`,
        status: 'pending',
        priority: issueType === 'broken' ? 'high' : 'medium',
        createdAt: new Date()
      });

      // Update equipment status
      await updateDoc(doc(db, 'equipment', id), {
        status: issueType === 'broken' ? 'out_of_service' : 'needs_attention',
        updatedAt: new Date()
      });

      Alert.alert('Issue Reported', 'Your issue has been reported to maintenance team.');
    } catch (error) {
      console.error('Error reporting issue:', error);
      Alert.alert('Error', 'Failed to report issue. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AntDesign name="loading1" size={32} color="#4facfe" />
        <Text style={styles.loadingText}>Loading equipment details...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Equipment not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const maintenanceStatus = getMaintenanceStatus();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
        
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Equipment Details</Text>
              <Text style={styles.headerSubtitle}>{equipment.name}</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Equipment Info */}
          <View style={styles.equipmentCard}>
            <View style={styles.equipmentHeader}>
              <View style={styles.equipmentIcon}>
                <AntDesign name="tool" size={32} color="#4facfe" />
              </View>
              <View style={styles.equipmentInfo}>
                <Text style={styles.equipmentName}>{equipment.name}</Text>
                <Text style={styles.equipmentType}>{equipment.type}</Text>
                <Text style={styles.equipmentSerial}>Serial: {equipment.serialNumber}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: maintenanceStatus.color }]}>
                <Text style={styles.statusText}>
                  {equipment.status === 'assigned' ? 'Active' : equipment.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Maintenance Status */}
          <View style={styles.maintenanceCard}>
            <Text style={styles.cardTitle}>Maintenance Status</Text>
            <View style={styles.maintenanceStatus}>
              <View style={[styles.maintenanceIndicator, { backgroundColor: maintenanceStatus.color }]} />
              <Text style={[styles.maintenanceText, { color: maintenanceStatus.color }]}>
                {maintenanceStatus.text}
              </Text>
            </View>
            {equipment.lastMaintenance && (
              <Text style={styles.lastMaintenanceText}>
                Last maintained: {equipment.lastMaintenance.toDate().toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Equipment Details */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Equipment Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Brand:</Text>
              <Text style={styles.detailValue}>{equipment.brand || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Model:</Text>
              <Text style={styles.detailValue}>{equipment.model || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Purchase Date:</Text>
              <Text style={styles.detailValue}>
                {equipment.purchaseDate ? equipment.purchaseDate.toDate().toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Assigned Date:</Text>
              <Text style={styles.detailValue}>
                {equipment.assignedDate ? equipment.assignedDate.toDate().toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.maintenanceButton} onPress={handleReportMaintenance}>
                <AntDesign name="checkcircle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Report Maintenance</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.issueButton} onPress={handleReportIssue}>
                <AntDesign name="exclamationcircle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Report Issue</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Maintenance History */}
          <View style={styles.historyCard}>
            <Text style={styles.cardTitle}>Maintenance History</Text>
            {maintenanceHistory.length > 0 ? (
              maintenanceHistory.slice(0, 5).map((record) => (
                <View key={record.id} style={styles.historyItem}>
                  <View style={styles.historyIcon}>
                    <AntDesign 
                      name={record.type === 'issue' ? 'exclamationcircle' : 'checkcircle'} 
                      size={16} 
                      color={record.type === 'issue' ? '#ef4444' : '#10b981'} 
                    />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle}>
                      {record.type === 'issue' ? 'Issue Reported' : 'Maintenance Completed'}
                    </Text>
                    <Text style={styles.historyDate}>
                      {record.date.toDate().toLocaleDateString()}
                    </Text>
                    {record.notes && (
                      <Text style={styles.historyNotes}>{record.notes}</Text>
                    )}
                  </View>
                  <Text style={[styles.historyStatus, 
                    { color: record.status === 'completed' ? '#10b981' : '#f59e0b' }]}>
                    {record.status}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                <AntDesign name="inbox" size={32} color="#d1d5db" />
                <Text style={styles.emptyText}>No maintenance history</Text>
              </View>
            )}
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  headerBackButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerRight: { width: 40 },
  
  content: { flex: 1, padding: 20 },
  
  equipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipmentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  equipmentType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  equipmentSerial: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'capitalize',
  },
  
  maintenanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  maintenanceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  maintenanceIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  maintenanceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastMaintenanceText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  maintenanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  issueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyIcon: {
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  historyNotes: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});