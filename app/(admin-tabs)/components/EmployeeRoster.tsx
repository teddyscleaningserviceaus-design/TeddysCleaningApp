import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

interface EmployeeRosterProps {
  employees: any[];
  jobs: any[];
}

export default function EmployeeRoster({ employees, jobs }: EmployeeRosterProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const getEmployeeStatus = useCallback((employee: any) => {
    const activeJob = jobs.find(job => 
      job.assignedTo === employee.id && job.status === 'In Progress'
    );
    return activeJob ? 'working' : 'available';
  }, [jobs]);

  const getDistanceToJob = useCallback((employee: any, job: any) => {
    // Placeholder distance calculation - in real app, use geolocation
    return Math.floor(Math.random() * 20) + 1;
  }, []);
  
  // Memoize available jobs to prevent recalculation
  const availableJobs = useMemo(() => 
    jobs.filter(job => !job.assignedTo && job.status === 'Pending').slice(0, 3),
    [jobs]
  );

  const handleAssignJob = useCallback(async (employeeId: string, jobId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    const job = jobs.find(j => j.id === jobId);
    
    if (!employee || !job) return;

    Alert.alert(
      'Assign Job',
      `Assign "${job.title}" to ${employee.firstName} ${employee.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'jobs', jobId), {
                assignedTo: employeeId,
                assignedToName: `${employee.firstName} ${employee.lastName}`,
                status: 'Scheduled',
                updatedAt: new Date(),
              });
              Alert.alert('Success', 'Job assigned successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to assign job');
            }
          }
        }
      ]
    );
  }, [employees, jobs]);

  const renderEmployee = useCallback(({ item: employee }) => {
    const status = getEmployeeStatus(employee);
    const activeJob = jobs.find(job => 
      job.assignedTo === employee.id && job.status === 'In Progress'
    );

    return (
      <TouchableOpacity 
        style={[
          styles.employeeItem,
          selectedEmployee === employee.id && styles.selectedEmployee
        ]}
        onPress={() => setSelectedEmployee(
          selectedEmployee === employee.id ? null : employee.id
        )}
      >
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>
              {employee.firstName} {employee.lastName}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: status === 'working' ? '#fc466b' : '#10b981' }
            ]}>
              <Text style={styles.statusText}>
                {status === 'working' ? 'Working' : 'Available'}
              </Text>
            </View>
          </View>
          <AntDesign 
            name={selectedEmployee === employee.id ? 'up' : 'down'} 
            size={16} 
            color="#6b7280" 
          />
        </View>

        {activeJob && (
          <Text style={styles.currentJob}>
            Current: {activeJob.title}
          </Text>
        )}

        {employee.skills && (
          <View style={styles.skillTags}>
            {employee.skills.slice(0, 3).map((skill: string, index: number) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {selectedEmployee === employee.id && (
          <View style={styles.assignmentSection}>
            <Text style={styles.assignmentTitle}>Assign to Job:</Text>
            {availableJobs.map(job => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobOption}
                onPress={() => handleAssignJob(employee.id, job.id)}
              >
                <View style={styles.jobOptionContent}>
                  <Text style={styles.jobOptionTitle}>{job.title}</Text>
                  <Text style={styles.jobOptionDistance}>
                    {getDistanceToJob(employee, job)}km away
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={16} color="#4facfe" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedEmployee, availableJobs, getEmployeeStatus, getDistanceToJob, handleAssignJob]);

  return (
    <View style={styles.container}>
      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <AntDesign name="team" size={32} color="#9ca3af" />
            <Text style={styles.emptyText}>No employees found</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  employeeItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedEmployee: {
    borderColor: '#4facfe',
    backgroundColor: '#eff6ff',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  currentJob: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  skillTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  skillTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 10,
    color: '#5b21b6',
    fontWeight: '500',
  },
  assignmentSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  assignmentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  jobOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  jobOptionContent: {
    flex: 1,
  },
  jobOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  jobOptionDistance: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});