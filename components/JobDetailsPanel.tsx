import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface JobDetailsPanelProps {
  visible: boolean;
  jobId: string | null;
  onClose: () => void;
}

export default function JobDetailsPanel({ visible, jobId, onClose }: JobDetailsPanelProps) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId || !visible) {
      setJob(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'jobs', jobId),
      (doc) => {
        if (doc.exists()) {
          setJob({ id: doc.id, ...doc.data() });
        }
      },
      (error) => {
        console.error('Job details error:', error);
      }
    );

    return unsubscribe;
  }, [jobId, visible]);

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        status: newStatus,
        updatedAt: new Date(),
      });
      Alert.alert('Success', `Job status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update job status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#10b981';
      case 'in progress': return '#3b82f6';
      case 'completed': return '#059669';
      default: return '#6b7280';
    }
  };

  if (!visible || !job) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Job Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <AntDesign name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Job Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Summary</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobClient}>Client: {job.client}</Text>
              <Text style={styles.jobAddress}>📍 {job.address}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                  <Text style={styles.statusText}>{job.status || 'Pending'}</Text>
                </View>
                <Text style={styles.assignedTo}>
                  👷 {job.assignedToName || 'Unassigned'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                onPress={() => handleStatusChange('Accepted')}
                disabled={loading}
              >
                <AntDesign name="check" size={16} color="#fff" />
                <Text style={styles.actionText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#3b82f6' }]}
                onPress={() => handleStatusChange('In Progress')}
                disabled={loading}
              >
                <MaterialIcons name="play-arrow" size={16} color="#fff" />
                <Text style={styles.actionText}>Start</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#059669' }]}
                onPress={() => handleStatusChange('Completed')}
                disabled={loading}
              >
                <AntDesign name="checkcircle" size={16} color="#fff" />
                <Text style={styles.actionText}>Complete</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#8b5cf6' }]}
                disabled={loading}
              >
                <MaterialIcons name="swap-horiz" size={16} color="#fff" />
                <Text style={styles.actionText}>Reassign</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timelineCard}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Job Created</Text>
                  <Text style={styles.timelineTime}>
                    {job.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                  </Text>
                </View>
              </View>
              
              {job.status !== 'Pending' && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#10b981' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Status: {job.status}</Text>
                    <Text style={styles.timelineTime}>
                      {job.updatedAt?.toDate?.()?.toLocaleString() || 'Recently'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Notes */}
          {job.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.notesCard}>
                <Text style={styles.notesText}>{job.notes}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  jobClient: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  assignedTo: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d1d5db',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});