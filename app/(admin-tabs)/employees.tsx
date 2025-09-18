import { AntDesign, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc } from "firebase/firestore";
import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useFirestoreListener } from "../../hooks/useFirestoreListener";

export default function AdminEmployees() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useFirestoreListener(() => {
    if (!user) {
      setEmployees([]);
      setJobs([]);
      setLoading(false);
      return;
    }

    // Load employees from users collection where userType is employee
    const employeesQuery = query(collection(db, "users"));
    const unsubscribeEmployees = onSnapshot(employeesQuery, 
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filter for employees only
        const employeesList = Array.isArray(usersList) ? usersList.filter(user => user.userType === 'employee') : [];
        setEmployees(employeesList);
        setLoading(false);
      },
      (error) => {
        console.error("Employees query error:", error);
        if (error.code === 'permission-denied') {
          // User likely logged out, clear data silently
          setEmployees([]);
        }
        setLoading(false);
      }
    );

    // Load jobs for assignment counts
    const jobsQuery = query(collection(db, "jobs"));
    const unsubscribeJobs = onSnapshot(jobsQuery, 
      (snapshot) => {
        const jobsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJobs(jobsList);
      },
      (error) => {
        console.error("Jobs query error:", error);
        if (error.code === 'permission-denied') {
          // User likely logged out, clear data silently
          setJobs([]);
        }
      }
    );

    return [unsubscribeEmployees, unsubscribeJobs];
  }, []);

  const getEmployeeJobStats = (employeeId) => {
    const employeeJobs = Array.isArray(jobs) ? jobs.filter(job => job.assignedTo === employeeId) : [];
    return {
      total: employeeJobs.length,
      active: Array.isArray(employeeJobs) ? employeeJobs.filter(job => job.status === "In Progress").length : 0,
      completed: Array.isArray(employeeJobs) ? employeeJobs.filter(job => job.status === "Completed").length : 0,
    };
  };

  const handleToggleEmployeeStatus = async (employeeId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    Alert.alert(
      "Update Employee Status",
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} this employee?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              // Update in users collection
              await updateDoc(doc(db, "users", employeeId), {
                status: newStatus,
                updatedAt: new Date(),
              });
              
              Alert.alert("Success", `Employee ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            } catch (error) {
              Alert.alert("Error", "Failed to update employee status");
            }
          },
        },
      ]
    );
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    Alert.alert(
      "Delete Employee",
      `Are you sure you want to permanently delete ${employeeName}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Check if employee has active jobs
              const activeJobs = Array.isArray(jobs) ? jobs.filter(job => 
                job.assignedTo === employeeId && 
                (job.status === "In Progress" || job.status === "Assigned")
              ) : [];
              
              if (activeJobs.length > 0) {
                Alert.alert(
                  "Cannot Delete",
                  `This employee has ${activeJobs.length} active job(s). Please reassign or complete these jobs first.`
                );
                return;
              }
              
              // Delete from users collection
              await deleteDoc(doc(db, "users", employeeId));
              
              // Unassign from any completed jobs
              const employeeJobs = Array.isArray(jobs) ? jobs.filter(job => job.assignedTo === employeeId) : [];
              for (const job of employeeJobs) {
                await updateDoc(doc(db, "jobs", job.id), {
                  assignedTo: null,
                  updatedAt: new Date(),
                });
              }
              
              Alert.alert("Success", "Employee deleted successfully");
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete employee");
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (employeeId, employeeName) => {
    return (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDeleteEmployee(employeeId, employeeName)}
        >
          <AntDesign name="delete" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#10b981' : '#ef4444';
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  const getEmployeeName = (employee) => {
    return employee.displayName || employee.name || employee.email?.split('@')[0] || 'Employee';
  };

  const renderEmployee = ({ item: employee }) => {
    const jobStats = getEmployeeJobStats(employee.id);
    const employeeName = getEmployeeName(employee);
    
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(employee.id, employeeName)}
        rightThreshold={40}
      >
        <View style={styles.employeeCard}>
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.avatarContainer}>
              {employee.profileImage ? (
                <Image source={{ uri: employee.profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {getEmployeeName(employee).split(' ').map(n => n[0]).join('').substring(0, 2)}
                </Text>
              )}
            </View>
            <View style={styles.employeeDetails}>
              <Text style={styles.employeeName}>{getEmployeeName(employee)}</Text>
              <Text style={styles.employeeEmail}>{employee.email}</Text>
              <Text style={styles.joinDate}>Joined: {formatDate(employee.createdAt || employee.joinDate)}</Text>
            </View>
          </View>
          
          <View style={styles.employeeActions}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(employee.status) }]}>
              <Text style={styles.statusText}>{employee.status}</Text>
            </View>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => handleToggleEmployeeStatus(employee.id, employee.status)}
            >
              <AntDesign 
                name={employee.status === 'active' ? 'pause' : 'play'} 
                size={16} 
                color="#4facfe" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{jobStats.total}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{jobStats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{jobStats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingContainer}>
              <AntDesign name="star" size={14} color="#f59e0b" />
              <Text style={styles.statNumber}>{employee.rating || 'N/A'}</Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        <View style={styles.employeeActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              const activeJob = jobs.find(j => j.assignedTo === employee.id && j.status === "In Progress");
              if (activeJob) {
                router.push({
                  pathname: '/job-progress',
                  params: {
                    jobId: activeJob.id,
                    jobTitle: activeJob.title,
                    client: activeJob.client,
                    address: activeJob.address,
                    adminView: 'true'
                  },
                });
              } else {
                Alert.alert("No Active Job", "This employee doesn't have an active job to monitor.");
              }
            }}
          >
            <AntDesign name="eye" size={14} color="#4facfe" />
            <Text style={styles.actionText}>Monitor Job</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // Navigate to admin messaging with employee pre-selected
              router.push({
                pathname: '/(admin-tabs)/messaging',
                params: {
                  employeeId: employee.id,
                  employeeName: getEmployeeName(employee)
                }
              });
            }}
          >
            <AntDesign name="message1" size={14} color="#10b981" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // Navigate to employee schedule view
              router.push({
                pathname: '/schedule',
                params: {
                  employeeId: employee.id,
                  employeeName: getEmployeeName(employee),
                  adminView: 'true'
                }
              });
            }}
          >
            <Feather name="calendar" size={14} color="#8b5cf6" />
            <Text style={styles.actionText}>Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Team Members</Text>
          <Text style={styles.headerSubtitle}>Manage employees</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/add-employee')}
        >
          <AntDesign name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.overviewContainer}>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewNumber}>{employees.length}</Text>
          <Text style={styles.overviewLabel}>Total Employees</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Text style={styles.overviewNumber}>
            {Array.isArray(employees) ? employees.filter(e => e.status === 'active').length : 0}
          </Text>
          <Text style={styles.overviewLabel}>Active</Text>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewItem}>
          <Text style={styles.overviewNumber}>
            {Array.isArray(jobs) ? jobs.filter(j => j.status === "In Progress").length : 0}
          </Text>
          <Text style={styles.overviewLabel}>Jobs in Progress</Text>
        </View>
      </View>

      <FlatList
        data={employees}
        renderItem={renderEmployee}
        keyExtractor={(item) => `employee_${item.id}`}
        contentContainerStyle={styles.content}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <AntDesign name="team" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No employees found</Text>
            <Text style={styles.emptySubtext}>Add team members to get started</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  addButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  overviewContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4facfe",
  },
  overviewLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  overviewDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  content: {
    padding: 16,
  },
  employeeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  employeeInfo: {
    flexDirection: "row",
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4facfe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  employeeEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  employeeActions: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e7eb",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#6b7280",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 16,
  },
  deleteAction: {
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});