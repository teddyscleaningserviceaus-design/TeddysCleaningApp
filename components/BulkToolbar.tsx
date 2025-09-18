import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

interface BulkToolbarProps {
  selectedJobs: string[];
  onComplete: () => void;
  onSuccess?: () => void;
}

export default function BulkToolbar({ 
  selectedJobs, 
  onComplete,
  onSuccess 
}: BulkToolbarProps) {
  const [loading, setLoading] = useState(false);

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedJobs.length === 0) return;

    Alert.alert(
      'Bulk Status Update',
      `Update ${selectedJobs.length} jobs to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const batch = writeBatch(db);
              
              selectedJobs.forEach(jobId => {
                const docRef = doc(db, 'jobs', jobId);
                batch.update(docRef, {
                  status: newStatus,
                  updatedAt: new Date(),
                });
              });

              await batch.commit();
              Alert.alert('Success', `Updated ${selectedJobs.length} jobs`);
              onComplete();
              onSuccess?.();
            } catch (error) {
              Alert.alert('Error', 'Failed to update jobs');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkAssign = () => {
    Alert.alert('Bulk Assign', 'Bulk assignment feature coming soon');
  };

  const handleBulkMessage = () => {
    Alert.alert('Bulk Message', 'Bulk messaging feature coming soon');
  };

  const handleBulkExport = () => {
    Alert.alert('Export', 'CSV export feature coming soon');
  };

  if (selectedJobs.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.count}>{selectedJobs.length} selected</Text>
        <TouchableOpacity onPress={onComplete}>
          <AntDesign name="close" size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleBulkStatusChange('In Progress')}
          disabled={loading}
        >
          <MaterialIcons name="play-arrow" size={16} color="#3b82f6" />
          <Text style={styles.actionText}>Start</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleBulkStatusChange('Completed')}
          disabled={loading}
        >
          <MaterialIcons name="check-circle" size={16} color="#10b981" />
          <Text style={styles.actionText}>Complete</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleBulkAssign}
          disabled={loading}
        >
          <AntDesign name="team" size={16} color="#8b5cf6" />
          <Text style={styles.actionText}>Assign</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleBulkMessage}
          disabled={loading}
        >
          <AntDesign name="message1" size={16} color="#10b981" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleBulkExport}
          disabled={loading}
        >
          <AntDesign name="download" size={16} color="#f59e0b" />
          <Text style={styles.actionText}>Export</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4facfe',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  count: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});