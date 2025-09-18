import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// MapView removed - using placeholder instead
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebase";

const { width } = Dimensions.get("window");

export default function JobDetailsPage() {
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const router = useRouter();

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    try {
      // Check if user is authenticated before making Firestore request
      if (!auth.currentUser) {
        console.log('Job details: No authenticated user, redirecting');
        router.replace('/');
        return;
      }

      // Try jobs collection first
      let jobDoc = await getDoc(doc(db, "jobs", id));
      let jobData = null;
      
      if (jobDoc.exists()) {
        jobData = { id: jobDoc.id, ...jobDoc.data() };
      } else {
        // Try guest-bookings collection
        jobDoc = await getDoc(doc(db, "guest-bookings", id));
        if (jobDoc.exists()) {
          jobData = { id: jobDoc.id, ...jobDoc.data(), bookingType: 'guest' };
        }
      }
      
      if (jobData) {
        // Load client/guest contact information
        if (jobData.clientId && jobData.bookingType !== 'guest') {
          // Load client data
          const clientDoc = await getDoc(doc(db, "clients", jobData.clientId));
          if (clientDoc.exists()) {
            jobData.clientData = clientDoc.data();
          }
        }
        
        setJob(jobData);
      } else {
        Alert.alert("Error", "Job not found");
        router.back();
      }
    } catch (error) {
      console.error('Job details error:', error);
      Alert.alert("Error", "Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (newStatus) => {
    try {
      // Check if user is authenticated before making Firestore request
      if (!auth.currentUser) {
        console.log('Job details: No authenticated user for status update');
        return;
      }

      const newProgress = newStatus === "Completed" ? 100 : newStatus === "In Progress" ? 50 : 0;
      await updateDoc(doc(db, "jobs", id), {
        status: newStatus,
        progress: newProgress,
        updatedAt: new Date(),
      });
      setJob(prev => ({ ...prev, status: newStatus, progress: newProgress }));
    } catch (error) {
      console.error('Job status update error:', error);
      Alert.alert("Error", "Failed to update job status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress": return "#fc466b";
      case "Scheduled": return "#11998e";
      case "Completed": return "#38ef7d";
      default: return "#6b7280";
    }
  };

  const getJobGradient = (status) => {
    switch (status) {
      case "In Progress": return ["#fc466b", "#3f5efb"];
      case "Scheduled": return ["#11998e", "#38ef7d"];
      case "Completed": return ["#667eea", "#764ba2"];
      default: return ["#6b7280", "#9ca3af"];
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <ImageBackground
        source={require("../../assets/background_pattern.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <LinearGradient colors={getJobGradient(job.status)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View>
              <Text style={styles.headerTitle}>{job.title}</Text>
              <Text style={styles.headerSubtitle}>{job.client}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.headerRight}
            onPress={() => {
              Alert.alert(
                "Update Status",
                "Change job status:",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Scheduled", onPress: () => updateJobStatus("Scheduled") },
                  { text: "In Progress", onPress: () => updateJobStatus("In Progress") },
                  { text: "Completed", onPress: () => updateJobStatus("Completed") },
                ]
              );
            }}
          >
            <Feather name="edit" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.statusBar}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{job.status}</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${job.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>{job.progress || 0}% Complete</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
            onPress={() => setActiveTab('tasks')}
          >
            <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'location' && styles.activeTab]}
            onPress={() => setActiveTab('location')}
          >
            <Text style={[styles.tabText, activeTab === 'location' && styles.activeTabText]}>Location</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'overview' && (
            <View>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Job Information</Text>
                <View style={styles.infoRow}>
                  <AntDesign name="calendar" size={16} color="#4facfe" />
                  <Text style={styles.infoLabel}>Scheduled Date:</Text>
                  <Text style={styles.infoValue}>{job.scheduledDate}</Text>
                </View>
                <View style={styles.infoRow}>
                  <AntDesign name="clockcircle" size={16} color="#4facfe" />
                  <Text style={styles.infoLabel}>Start Time:</Text>
                  <Text style={styles.infoValue}>{job.startTime || 'Not specified'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <AntDesign name="enviromento" size={16} color="#4facfe" />
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{job.address}</Text>
                </View>
                <View style={styles.infoRow}>
                  <AntDesign name="flag" size={16} color="#4facfe" />
                  <Text style={styles.infoLabel}>Priority:</Text>
                  <Text style={[styles.infoValue, { color: job.priority === 'High' ? '#ef4444' : job.priority === 'Medium' ? '#f59e0b' : '#10b981' }]}>
                    {job.priority || 'Medium'}
                  </Text>
                </View>
              </View>

              {/* Client Contact Information */}
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Client Contact</Text>
                <View style={styles.infoRow}>
                  <AntDesign name="user" size={16} color="#4facfe" />
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>
                    {job.clientData?.firstName && job.clientData?.lastName 
                      ? `${job.clientData.firstName} ${job.clientData.lastName}`
                      : job.client || 'Not specified'}
                  </Text>
                </View>
                {(job.clientData?.email || job.email) && (
                  <View style={styles.infoRow}>
                    <AntDesign name="mail" size={16} color="#4facfe" />
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{job.clientData?.email || job.email}</Text>
                  </View>
                )}
                {(job.clientData?.phone || job.phone) && (
                  <View style={styles.infoRow}>
                    <AntDesign name="phone" size={16} color="#4facfe" />
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{job.clientData?.phone || job.phone}</Text>
                  </View>
                )}
                {job.bookingType === 'guest' && (
                  <View style={styles.guestBadge}>
                    <Text style={styles.guestBadgeText}>Guest Booking</Text>
                  </View>
                )}
              </View>

              {/* Team Members */}
              {job.assignedEmployees && job.assignedEmployees.length > 0 && (
                <View style={styles.infoCard}>
                  <Text style={styles.cardTitle}>Team Members ({job.assignedEmployees.length})</Text>
                  {job.assignedEmployees.map((employee, index) => {
                    const employeeTasks = job.tasks ? job.tasks.filter(task => task.assignedTo === employee.id) : [];
                    return (
                      <View key={employee.id} style={styles.teamMemberItem}>
                        <View style={styles.teamMemberInfo}>
                          <View style={styles.teamMemberAvatar}>
                            <Text style={styles.teamMemberInitial}>
                              {employee.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.teamMemberDetails}>
                            <Text style={styles.teamMemberName}>{employee.name}</Text>
                            <Text style={styles.teamMemberTasks}>
                              {employeeTasks.length} tasks assigned
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.viewTasksButton}
                          onPress={() => router.push(`/job-tasks/${job.id}`)}
                        >
                          <Text style={styles.viewTasksText}>View Tasks</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Equipment Required</Text>
                <View style={styles.equipmentGrid}>
                  {['Vacuum Cleaner', 'Mop & Bucket', 'Cleaning Cloths', 'Disinfectant', 'Glass Cleaner', 'Trash Bags'].map((item, index) => (
                    <View key={index} style={styles.equipmentItem}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#38ef7d" />
                      <Text style={styles.equipmentText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Chemicals & Supplies</Text>
                <View style={styles.chemicalsList}>
                  {['All-Purpose Cleaner', 'Bathroom Cleaner', 'Floor Cleaner', 'Window Cleaner', 'Sanitizer'].map((chemical, index) => (
                    <View key={index} style={styles.chemicalItem}>
                      <View style={styles.chemicalIcon}>
                        <MaterialCommunityIcons name="flask" size={16} color="#4facfe" />
                      </View>
                      <Text style={styles.chemicalText}>{chemical}</Text>
                      <Text style={styles.chemicalAmount}>1 bottle</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {activeTab === 'tasks' && (
            <View>
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Job Tasks</Text>
                {job.tasks && job.tasks.length > 0 ? (
                  <View style={styles.tasksList}>
                    {job.tasks.map((task, index) => (
                      <View key={task.id || index} style={styles.taskItem}>
                        <View style={[styles.taskCheckbox, task.completed && styles.taskCheckboxCompleted]}>
                          {task.completed && <AntDesign name="check" size={12} color="#fff" />}
                        </View>
                        <View style={styles.taskContent}>
                          <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>
                            {task.title}
                          </Text>
                          {task.assignedToName && (
                            <Text style={styles.taskAssignee}>
                              👤 Assigned to: {task.assignedToName}
                            </Text>
                          )}
                          {task.estimatedTime && (
                            <Text style={styles.taskTime}>
                              ⏱️ {task.estimatedTime} minutes
                            </Text>
                          )}
                        </View>
                        {task.priority && (
                          <View style={[styles.taskPriorityBadge, { 
                            backgroundColor: task.priority === 'High' ? '#ef4444' : 
                                           task.priority === 'Medium' ? '#f59e0b' : '#10b981' 
                          }]}>
                            <Text style={styles.taskPriorityText}>{task.priority}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noTasksContainer}>
                    <MaterialCommunityIcons name="clipboard-list-outline" size={48} color="#9ca3af" />
                    <Text style={styles.noTasksText}>No tasks assigned yet</Text>
                    <TouchableOpacity 
                      style={styles.addTasksButton}
                      onPress={() => router.push(`/job-tasks/${job.id}`)}
                    >
                      <Text style={styles.addTasksButtonText}>Manage Tasks</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'location' && (
            <View>
              <View style={styles.mapCard}>
                <Text style={styles.cardTitle}>Job Location</Text>
                <View style={styles.noMapContainer}>
                  <AntDesign name="enviromento" size={48} color="#9ca3af" />
                  <Text style={styles.noMapText}>
                    {job.coordinates ? "Map requires Google Maps API key" : "No coordinates available"}
                  </Text>
                  {job.coordinates && (
                    <View style={styles.coordinatesDisplay}>
                      <Text style={styles.coordinatesText}>
                        Lat: {job.coordinates.latitude.toFixed(4)}
                      </Text>
                      <Text style={styles.coordinatesText}>
                        Lng: {job.coordinates.longitude.toFixed(4)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Directions & Notes</Text>
                <TouchableOpacity style={styles.directionsButton}>
                  <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.directionsButtonGradient}>
                    <AntDesign name="navigation" size={20} color="#fff" />
                    <Text style={styles.directionsButtonText}>Get Directions</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.notesText}>
                  {job.notes || "No special instructions for this job."}
                </Text>
              </View>

              {/* Work Request Button for Employees */}
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Additional Services</Text>
                <TouchableOpacity 
                  style={styles.workRequestButton}
                  onPress={() => router.push({
                    pathname: '/request-work',
                    params: {
                      jobId: job.id,
                      jobTitle: job.title,
                      client: job.client,
                      address: job.address
                    }
                  })}
                >
                  <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.workRequestButtonGradient}>
                    <AntDesign name="plus" size={20} color="#fff" />
                    <Text style={styles.workRequestButtonText}>Request Additional Work</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.workRequestDescription}>
                  Found additional cleaning needs? Request approval for extra services.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  background: { flex: 1 },
  backgroundImage: { opacity: 0.05 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerCenter: { 
    flex: 1,
    alignItems: "center",
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#fff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    textAlign: "center",
  },
  headerRight: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  progressContainer: {
    flex: 1,
    marginLeft: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4facfe",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4facfe",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  activeTabText: {
    color: "#4facfe",
  },

  content: {
    flex: 1,
    padding: 20,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },

  equipmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  equipmentItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "50%",
    marginBottom: 12,
  },
  equipmentText: {
    fontSize: 14,
    color: "#1f2937",
    marginLeft: 8,
  },

  chemicalsList: {
    marginTop: 8,
  },
  chemicalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  chemicalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(79, 172, 254, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chemicalText: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  chemicalAmount: {
    fontSize: 12,
    color: "#6b7280",
  },

  tasksList: {
    marginTop: 8,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  taskCheckboxCompleted: {
    backgroundColor: "#38ef7d",
    borderColor: "#38ef7d",
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },

  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  noMapContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  noMapText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  coordinatesDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 2,
  },

  directionsButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  directionsButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  directionsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  notesText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
  },

  // Team Members Styles
  teamMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  teamMemberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  teamMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4facfe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  teamMemberInitial: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  teamMemberDetails: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  teamMemberTasks: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  viewTasksButton: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4facfe",
  },
  viewTasksText: {
    fontSize: 12,
    color: "#4facfe",
    fontWeight: "600",
  },

  // Enhanced Task Styles
  taskContent: {
    flex: 1,
  },
  taskAssignee: {
    fontSize: 12,
    color: "#8b5cf6",
    marginTop: 2,
    fontWeight: "500",
  },
  taskTime: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 1,
  },
  taskPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  taskPriorityText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  noTasksContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noTasksText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
    marginBottom: 16,
  },
  addTasksButton: {
    backgroundColor: "#4facfe",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addTasksButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Work Request Styles
  workRequestButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  workRequestButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  workRequestButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  workRequestDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
    textAlign: "center",
  },

  // Guest badge styles
  guestBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  guestBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});