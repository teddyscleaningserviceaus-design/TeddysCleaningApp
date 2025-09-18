import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, Image } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface JobDetailsPanelProps {
  visible: boolean;
  jobId: string | null;
  onClose: () => void;
}

export default function JobDetailsPanel({ visible, jobId, onClose }: JobDetailsPanelProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [optimisticState, setOptimisticState] = useState<any>(null);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [slaTimer, setSlaTimer] = useState<string>('');

  useEffect(() => {
    if (!jobId || !visible) return;

    const unsubscribes: (() => void)[] = [];
    
    // Determine collection and actual job ID
    const isGuestJob = jobId.startsWith('guest_');
    const actualJobId = isGuestJob ? jobId.replace('guest_', '') : jobId;
    const collection_name = isGuestJob ? 'guest-bookings' : 'jobs';
    
    console.log('JobDetailsPanel - jobId:', jobId, 'actualJobId:', actualJobId, 'collection:', collection_name);

    // Job data listener
    const jobUnsub = onSnapshot(doc(db, collection_name, actualJobId), 
      (doc) => {
        if (doc.exists()) {
          const jobData = { 
            id: isGuestJob ? `guest_${doc.id}` : doc.id, 
            originalId: isGuestJob ? doc.id : undefined,
            ...doc.data(),
            bookingType: isGuestJob ? 'guest' : undefined
          };
          console.log('JobDetailsPanel - Found job:', jobData.id);
          setJob(jobData);
          setOptimisticState(null);
        } else {
          console.log('JobDetailsPanel - Job not found in', collection_name);
          Alert.alert('Error', 'Job not found');
        }
      },
      (error) => {
        console.error('Job details error:', error);
        Alert.alert('Error', 'Failed to load job details');
      }
    );

    // Audit entries listener (use actual job ID for audit)
    const auditUnsub = onSnapshot(
      collection(db, 'audit'),
      (snapshot) => {
        const entries = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(entry => entry.jobId === actualJobId || entry.jobId === jobId)
          .sort((a, b) => (b.timestamp?.toDate?.() || new Date()).getTime() - (a.timestamp?.toDate?.() || new Date()).getTime());
        setAuditEntries(entries);
      },
      (error) => {
        console.error('Audit entries error:', error);
      }
    );

    unsubscribes.push(jobUnsub, auditUnsub);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [jobId, visible]);

  // SLA Timer
  useEffect(() => {
    if (!job?.scheduledDate) return;

    const updateTimer = () => {
      const scheduledDate = job.scheduledDate?.toDate?.() || new Date(job.scheduledDate);
      const now = new Date();
      const diff = scheduledDate.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setSlaTimer(`${hours}h ${minutes}m remaining`);
      } else {
        const overdue = Math.abs(diff);
        const hours = Math.floor(overdue / (1000 * 60 * 60));
        const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
        setSlaTimer(`${hours}h ${minutes}m overdue`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [job?.scheduledDate]);

  const createAuditEntry = async (action: string, details?: any) => {
    try {
      await addDoc(collection(db, 'audit'), {
        jobId,
        action,
        details,
        userId: user?.uid,
        userName: user?.displayName || user?.email,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to create audit entry:', error);
    }
  };

  const updateJobStatus = async (newStatus: string) => {
    if (!job) return;

    const previousStatus = job.status;
    const optimisticUpdate = { ...job, status: newStatus };
    setOptimisticState(optimisticUpdate);

    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        status: newStatus,
        updatedAt: new Date(),
      });
      
      await createAuditEntry('status_change', {
        from: previousStatus,
        to: newStatus
      });
    } catch (error) {
      setOptimisticState(null);
      Alert.alert('Error', 'Failed to update job status');
    }
  };

  const handleAccept = async () => {
    await updateJobStatus('scheduled');
  };

  const handleDecline = async () => {
    Alert.alert(
      'Decline Job',
      'Are you sure you want to decline this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            await updateJobStatus('declined');
          }
        }
      ]
    );
  };

  const handleReassign = () => {
    Alert.alert('Reassign Job', 'Reassignment modal would open here');
  };

  const handleRequestProof = async () => {
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        proofRequested: true,
        proofRequestedAt: new Date(),
      });
      
      await createAuditEntry('proof_requested');
      Alert.alert('Success', 'Proof request sent to employee');
    } catch (error) {
      Alert.alert('Error', 'Failed to request proof');
    }
  };

  const handleEscalate = async () => {
    try {
      await updateDoc(doc(db, 'jobs', job.id), {
        escalated: true,
        escalatedAt: new Date(),
        priority: 'high'
      });
      
      await createAuditEntry('escalated');
      Alert.alert('Success', 'Job has been escalated');
    } catch (error) {
      Alert.alert('Error', 'Failed to escalate job');
    }
  };

  const displayJob = optimisticState || job;

  if (!visible || !displayJob) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{displayJob.title}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => {
                onClose();
                router.push(`/admin-job-details/${jobId}`);
              }} 
              style={styles.fullViewButton}
            >
              <MaterialIcons name="open-in-full" size={20} color="#4facfe" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <AntDesign name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* SLA Timer */}
          {slaTimer && (
            <View style={styles.slaSection}>
              <Text style={styles.slaTimer}>{slaTimer}</Text>
            </View>
          )}

          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusChips}>
              {['pending', 'scheduled', 'in progress', 'completed'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusChip,
                    displayJob.status?.toLowerCase() === status && styles.statusChipActive
                  ]}
                  onPress={() => updateJobStatus(status)}
                >
                  <Text style={[
                    styles.statusChipText,
                    displayJob.status?.toLowerCase() === status && styles.statusChipTextActive
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Client:</Text>
              <Text style={styles.detailValue}>{displayJob.client}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{displayJob.address}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Scheduled:</Text>
              <Text style={styles.detailValue}>{displayJob.scheduledDate}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Assigned:</Text>
              <Text style={styles.detailValue}>{displayJob.assignedToName || 'Unassigned'}</Text>
            </View>
          </View>

          {/* Photo Proof Section */}
          {displayJob.proofPhotos?.length > 0 && (
            <View style={styles.proofSection}>
              <Text style={styles.sectionTitle}>Proof Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {displayJob.proofPhotos.map((photo: string, index: number) => (
                  <Image key={index} source={{ uri: photo }} style={styles.proofThumbnail} />
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              {/* Only show Accept/Decline buttons for pending jobs */}
              {displayJob.status?.toLowerCase() === 'pending' && (
                <>
                  <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAccept}>
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={handleDecline}>
                    <MaterialIcons name="close" size={20} color="#fff" />
                    <Text style={[styles.actionButtonText, styles.actionButtonTextWhite]}>Decline</Text>
                  </TouchableOpacity>
                </>
              )}
              {/* Always show these action buttons regardless of status */}
              <TouchableOpacity style={styles.actionButton} onPress={handleReassign}>
                <MaterialIcons name="person-add" size={20} color="#4facfe" />
                <Text style={styles.actionButtonText}>Reassign</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleRequestProof}>
                <MaterialIcons name="photo-camera" size={20} color="#f59e0b" />
                <Text style={styles.actionButtonText}>Request Proof</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleEscalate}>
                <MaterialIcons name="priority-high" size={20} color="#ef4444" />
                <Text style={styles.actionButtonText}>Escalate</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: '/job-attachments',
                    params: {
                      jobId: displayJob.id,
                      jobTitle: displayJob.title,
                      adminView: 'true'
                    }
                  });
                }}
              >
                <MaterialIcons name="photo-library" size={20} color="#8b5cf6" />
                <Text style={styles.actionButtonText}>View Media</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Audit Timeline */}
          {auditEntries.length > 0 && (
            <View style={styles.auditSection}>
              <Text style={styles.sectionTitle}>Activity Timeline</Text>
              {auditEntries.slice(0, 5).map((entry) => (
                <View key={entry.id} style={styles.auditEntry}>
                  <Text style={styles.auditAction}>{entry.action.replace('_', ' ')}</Text>
                  <Text style={styles.auditUser}>by {entry.userName}</Text>
                  <Text style={styles.auditTime}>
                    {entry.timestamp?.toDate?.()?.toLocaleString() || 'Unknown time'}
                  </Text>
                </View>
              ))}
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullViewButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  statusChipActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusChipTextActive: {
    color: '#fff',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButtonTextWhite: {
    color: '#fff',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  slaSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  slaTimer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
  },
  proofSection: {
    marginBottom: 24,
  },
  proofThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  auditSection: {
    marginBottom: 24,
  },
  auditEntry: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  auditAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  auditUser: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  auditTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
});