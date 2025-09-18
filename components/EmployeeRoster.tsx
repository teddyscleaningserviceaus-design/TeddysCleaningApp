import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Employee {
  id: string;
  name?: string;
  displayName?: string;
  email: string;
  status: string;
  skills?: string[];
}

interface Job {
  id: string;
  assignedTo?: string;
  status?: string;
}

interface EmployeeRosterProps {
  employees: Employee[];
  jobs?: Job[];
  onAssign?: (employeeId: string, employeeName: string) => void;
  selectedJobId?: string;
}

export default function EmployeeRoster({ employees, jobs = [], onAssign, selectedJobId }: EmployeeRosterProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const getEmployeeName = useCallback((employee: Employee) => {
    return employee.displayName || employee.name || employee.email?.split('@')[0] || 'Employee';
  }, []);

  // Calculate availability based on current job assignments
  const availabilityMap = useMemo(() => {
    const map = new Map<string, string>();
    
    employees.forEach(employee => {
      const activeJobs = jobs.filter(job => 
        job.assignedTo === employee.id && 
        job.status === 'In Progress'
      );
      
      if (activeJobs.length === 0) {
        map.set(employee.id, 'available');
      } else if (activeJobs.length === 1) {
        map.set(employee.id, 'busy');
      } else {
        map.set(employee.id, 'overloaded');
      }
    });
    
    return map;
  }, [employees, jobs]);

  const getAvailabilityStatus = useCallback((employee: Employee) => {
    return availabilityMap.get(employee.id) || 'available';
  }, [availabilityMap]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'busy': return '#f59e0b';
      case 'overloaded': return '#ef4444';
      case 'offline': return '#6b7280';
      default: return '#6b7280';
    }
  }, []);

  const handleAssign = useCallback(async (employee: Employee) => {
    if (!onAssign) {
      Alert.alert('Assignment Disabled', 'Assignment function not available');
      return;
    }
    
    if (!selectedJobId) {
      Alert.alert('No Job Selected', 'Please select a job first');
      return;
    }

    const employeeName = getEmployeeName(employee);
    
    Alert.alert(
      'Assign Employee',
      `Assign ${employeeName} to this job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: () => onAssign(employee.id, employeeName),
        },
      ]
    );
  }, [onAssign, selectedJobId, getEmployeeName]);

  const renderEmployee = useCallback(({ item: employee }: { item: Employee }) => {
    const employeeName = getEmployeeName(employee);
    const availability = getAvailabilityStatus(employee);
    const isLoading = loading === employee.id;

    return (
      <TouchableOpacity 
        style={styles.employeeCard}
        onPress={() => handleAssign(employee)}
        disabled={isLoading || availability === 'offline'}
      >
        <View style={styles.employeeInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {employeeName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </Text>
          </View>
          
          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{employeeName}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(availability) }]} />
              <Text style={styles.statusText}>{availability}</Text>
            </View>
            
            {employee.skills && employee.skills.length > 0 && (
              <View style={styles.skillsContainer}>
                {employee.skills.slice(0, 2).map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
                {employee.skills.length > 2 && (
                  <Text style={styles.moreSkills}>+{employee.skills.length - 2}</Text>
                )}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.assignButton}>
          <AntDesign 
            name="plus" 
            size={16} 
            color={availability === 'available' ? '#4facfe' : '#9ca3af'} 
          />
        </View>
      </TouchableOpacity>
    );
  }, [getEmployeeName, getAvailabilityStatus, loading, handleAssign, getStatusColor]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Staff</Text>
        <Text style={styles.count}>{employees.length} employees</Text>
      </View>
      
      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <AntDesign name="team" size={32} color="#9ca3af" />
            <Text style={styles.emptyText}>No employees available</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  count: {
    fontSize: 12,
    color: '#9ca3af',
  },
  list: {
    gap: 8,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  skillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  moreSkills: {
    fontSize: 10,
    color: '#9ca3af',
  },
  assignButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});