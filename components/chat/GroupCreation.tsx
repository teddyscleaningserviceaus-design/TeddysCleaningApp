import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface GroupCreationProps {
  onBack: () => void;
  onCreateGroup: (name: string, participants: Employee[]) => void;
  employees: Employee[];
}

export default function GroupCreation({ onBack, onCreateGroup, employees }: GroupCreationProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleEmployeeSelection = (employee: Employee) => {
    setSelectedEmployees(prev => {
      const isSelected = prev.find(e => e.id === employee.id);
      if (isSelected) {
        return prev.filter(e => e.id !== employee.id);
      } else {
        return [...prev, employee];
      }
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    if (selectedEmployees.length < 2) {
      Alert.alert('Error', 'Please select at least 2 members for the group');
      return;
    }

    onCreateGroup(groupName.trim(), selectedEmployees);
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const isSelected = selectedEmployees.find(e => e.id === item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.employeeItem, isSelected && styles.selectedEmployee]}
        onPress={() => toggleEmployeeSelection(item)}
      >
        <View style={styles.employeeAvatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeEmail}>{item.email}</Text>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkedBox]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Group</Text>
        <TouchableOpacity 
          onPress={handleCreateGroup}
          style={[styles.createButton, (!groupName.trim() || selectedEmployees.length < 2) && styles.disabledButton]}
        >
          <Text style={[styles.createButtonText, (!groupName.trim() || selectedEmployees.length < 2) && styles.disabledButtonText]}>
            Create
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.groupNameSection}>
          <Text style={styles.sectionTitle}>Group Name</Text>
          <TextInput
            style={styles.groupNameInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Enter group name..."
            maxLength={50}
          />
        </View>

        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>
            Add Members ({selectedEmployees.length} selected)
          </Text>
          
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search employees..."
            leftIcon={<Ionicons name="search" size={20} color="#9ca3af" />}
          />

          {selectedEmployees.length > 0 && (
            <View style={styles.selectedMembersContainer}>
              <Text style={styles.selectedMembersTitle}>Selected Members:</Text>
              <View style={styles.selectedMembersList}>
                {selectedEmployees.map(employee => (
                  <View key={employee.id} style={styles.selectedMemberChip}>
                    <Text style={styles.selectedMemberName}>{employee.name}</Text>
                    <TouchableOpacity onPress={() => toggleEmployeeSelection(employee)}>
                      <Ionicons name="close-circle" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployee}
            keyExtractor={(item) => item.id}
            style={styles.employeesList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  groupNameSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  membersSection: {
    flex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  selectedMembersContainer: {
    marginBottom: 16,
  },
  selectedMembersTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  selectedMembersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  selectedMemberName: {
    fontSize: 14,
    color: '#1e40af',
  },
  employeesList: {
    flex: 1,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedEmployee: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  employeeEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
});