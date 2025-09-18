import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface BulkToolbarProps {
  selectedJobs: string[];
  onComplete: () => void;
}

export default function BulkToolbar({ selectedJobs, onComplete }: BulkToolbarProps) {
  const [lastAction, setLastAction] = useState<{
    type: string;
    jobIds: string[];
    previousStates: any[];
  } | null>(null);

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedJobs.length === 0) return;

    Alert.alert(
      `Update ${selectedJobs.length} Jobs`,
      `Change status to "${newStatus}" for selected jobs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              
              selectedJobs.forEach(jobId => {
                batch.update(doc(db, 'jobs', jobId), {
                  status: newStatus,
                  updatedAt: new Date(),
                });
              });
              
              await batch.commit();
              
              setLastAction({
                type: 'status_change',
                jobIds: selectedJobs,
                previousStates: [] // TODO: Store previous states for undo
              });
              
              Alert.alert('Success', `${selectedJobs.length} jobs updated to ${newStatus}`);
              onComplete();
            } catch (error) {
              Alert.alert('Error', 'Failed to update jobs');
            }
          }
        }
      ]
    );
  };

  const handleBulkMessage = () => {
    Alert.alert('Bulk Message', 'Bulk messaging feature coming soon');
  };

  const handleBulkExport = () => {
    Alert.alert('Export CSV', 'CSV export feature coming soon');
  };

  const handleUndo = () => {
    if (!lastAction) return;
    Alert.alert('Undo', 'Undo functionality coming soon');
    setLastAction(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.selectedCount}>
          {selectedJobs.length} selected
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.scheduleButton]}
            onPress={() => handleBulkStatusChange('Scheduled')}
          >
            <MaterialIcons name="schedule" size={16} color="#fff" />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleBulkStatusChange('Completed')}
          >
            <MaterialIcons name="check-circle" size={16} color="#fff" />
            <Text style={styles.actionText}>Complete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={handleBulkMessage}
          >
            <MaterialIcons name="message" size={16} color="#fff" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.exportButton]}
            onPress={handleBulkExport}
          >
            <MaterialIcons name="file-download" size={16} color="#fff" />
            <Text style={styles.actionText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {lastAction && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>
            Action completed
          </Text>
          <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  scheduleButton: {
    backgroundColor: '#8b5cf6',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  messageButton: {
    backgroundColor: '#3b82f6',
  },
  exportButton: {
    backgroundColor: '#6b7280',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  undoText: {
    fontSize: 14,
    color: '#fff',
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  undoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
});