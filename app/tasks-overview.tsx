import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";

export default function TasksOverviewPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active, completed, all

  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter jobs that have tasks and are relevant to admin
      const jobsWithTasks = jobsList.filter(job => 
        job.tasks && job.tasks.length > 0
      );
      
      setJobs(jobsWithTasks);
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile]);

  const getFilteredJobs = () => {
    switch (filter) {
      case 'active':
        return jobs.filter(job => job.status === 'In Progress');
      case 'completed':
        return jobs.filter(job => job.status === 'Completed');
      default:
        return jobs;
    }
  };

  const getTaskProgress = (job) => {
    if (!job.tasks || job.tasks.length === 0) return 0;
    const completedTasks = job.tasks.filter(task => task.completed);
    return Math.round((completedTasks.length / job.tasks.length) * 100);
  };

  const getTaskStats = (job) => {
    if (!job.tasks) return { total: 0, completed: 0, remaining: 0 };
    const total = job.tasks.length;
    const completed = job.tasks.filter(task => task.completed).length;
    return { total, completed, remaining: total - completed };
  };

  const renderJobItem = ({ item: job }) => {
    const progress = getTaskProgress(job);
    const stats = getTaskStats(job);
    const isActive = job.status === 'In Progress';
    
    return (
      <TouchableOpacity
        style={[styles.jobCard, isActive && styles.activeJobCard]}
        onPress={() => router.push({
          pathname: '/job-progress',
          params: {
            jobId: job.id,
            jobTitle: job.title,
            client: job.client,
            address: job.address,
            adminView: 'true'
          }
        })}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobClient}>👤 {job.client}</Text>
            <Text style={styles.jobAddress}>📍 {job.address}</Text>
          </View>
          <View style={styles.jobStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
              <Text style={styles.statusText}>{job.status || 'Pending'}</Text>
            </View>
            {isActive && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Task Progress</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <View style={styles.taskStats}>
            <Text style={styles.taskStat}>✅ {stats.completed} completed</Text>
            <Text style={styles.taskStat}>⏳ {stats.remaining} remaining</Text>
            <Text style={styles.taskStat}>📋 {stats.total} total</Text>
          </View>
        </View>

        {job.assignedEmployees && job.assignedEmployees.length > 0 && (
          <View style={styles.employeeSection}>
            <Text style={styles.employeeTitle}>Assigned Team:</Text>
            <View style={styles.employeeList}>
              {job.assignedEmployees.map((emp, index) => (
                <View key={emp.id} style={styles.employeeChip}>
                  <Text style={styles.employeeName}>{emp.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {isActive && job.lastTaskUpdate && (
          <View style={styles.lastUpdate}>
            <AntDesign name="clockcircle" size={12} color="#6b7280" />
            <Text style={styles.lastUpdateText}>
              Last update: {new Date(job.lastTaskUpdate.toDate()).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "in progress": return "#fc466b";
      case "completed": return "#38ef7d";
      case "scheduled": return "#8b5cf6";
      default: return "#f59e0b";
    }
  };

  const filteredJobs = getFilteredJobs();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tasks Overview</Text>
          <Text style={styles.headerSubtitle}>Live Job Progress</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => setLoading(true)}
        >
          <MaterialIcons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filterContainer}>
        {['active', 'completed', 'all'].map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[styles.filterText, filter === filterType && styles.filterTextActive]}>
              {filterType === 'active' ? 'In Progress' : 
               filterType === 'completed' ? 'Completed' : 'All Jobs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{jobs.filter(j => j.status === 'In Progress').length}</Text>
          <Text style={styles.statLabel}>Active Jobs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {jobs.reduce((total, job) => total + (job.tasks?.filter(t => t.completed).length || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Tasks Done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {jobs.reduce((total, job) => total + (job.tasks?.length || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
      </View>

      <FlatList
        data={filteredJobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No jobs with tasks found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'active' ? 'No jobs are currently in progress' :
               filter === 'completed' ? 'No completed jobs with tasks' :
               'No jobs have tasks assigned yet'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerCenter: { flex: 1, alignItems: "center" },
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
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: "#4facfe",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTextActive: {
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4facfe",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeJobCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#fc466b",
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  jobClient: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 2,
  },
  jobAddress: {
    fontSize: 12,
    color: "#6b7280",
  },
  jobStatus: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fc466b",
  },
  liveText: {
    fontSize: 10,
    color: "#fc466b",
    fontWeight: "700",
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4facfe",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4facfe",
    borderRadius: 3,
  },
  taskStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  taskStat: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
  employeeSection: {
    marginBottom: 8,
  },
  employeeTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  employeeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  employeeChip: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  employeeName: {
    fontSize: 11,
    color: "#1d4ed8",
    fontWeight: "500",
  },
  lastUpdate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  lastUpdateText: {
    fontSize: 11,
    color: "#6b7280",
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});