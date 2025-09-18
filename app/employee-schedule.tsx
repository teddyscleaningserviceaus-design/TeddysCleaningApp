import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function EmployeeSchedulePage() {
  const { employeeId, employeeName } = useLocalSearchParams();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;

    // Load all jobs and filter for this employee
    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allJobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter jobs assigned to this employee
      const employeeJobs = allJobs.filter(job => {
        // Check legacy assignedTo field
        if (job.assignedTo === employeeId) {
          return true;
        }
        
        // Check new assignedEmployees array
        if (job.assignedEmployees && Array.isArray(job.assignedEmployees)) {
          return job.assignedEmployees.some(emp => emp.id === employeeId);
        }
        
        return false;
      });

      // Sort by scheduled date
      employeeJobs.sort((a, b) => {
        const aDate = a.scheduledDate?.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate || 0);
        const bDate = b.scheduledDate?.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate || 0);
        return aDate - bDate;
      });

      setJobs(employeeJobs);
      setLoading(false);
    });

    return unsubscribe;
  }, [employeeId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "in-progress": 
      case "in progress": return "#fc466b";
      case "scheduled": return "#11998e";
      case "completed": return "#38ef7d";
      case "pending": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "No date";
    
    try {
      let date;
      if (dateValue?.toDate) {
        date = dateValue.toDate();
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else {
        date = dateValue;
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getWeeklyStats = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weekJobs = jobs.filter(job => {
      try {
        let jobDate;
        if (job.scheduledDate?.toDate) {
          jobDate = job.scheduledDate.toDate();
        } else if (typeof job.scheduledDate === 'string') {
          jobDate = new Date(job.scheduledDate);
        } else {
          jobDate = job.scheduledDate;
        }
        
        return jobDate && jobDate >= startOfWeek && jobDate <= endOfWeek;
      } catch (error) {
        return false;
      }
    });

    return {
      total: weekJobs.length,
      completed: weekJobs.filter(j => j.status?.toLowerCase() === 'completed').length,
      inProgress: weekJobs.filter(j => j.status?.toLowerCase() === 'in-progress' || j.status?.toLowerCase() === 'in progress').length,
      scheduled: weekJobs.filter(j => j.status?.toLowerCase() === 'scheduled').length,
    };
  };

  const renderJobItem = ({ item: job }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => router.push(`/admin-job-details/${job.id}`)}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobClient}>👤 {job.client}</Text>
          <Text style={styles.jobAddress}>📍 {job.address}</Text>
          <Text style={styles.jobDate}>🗓️ {formatDate(job.scheduledDate)}</Text>
          {job.startTime && (
            <Text style={styles.jobTime}>⏰ {job.startTime}</Text>
          )}
        </View>
        <View style={styles.jobStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{job.status || 'pending'}</Text>
          </View>
          <Text style={styles.progressText}>{job.progress || 0}%</Text>
        </View>
      </View>
      
      {job.assignedEmployees?.length > 1 && (
        <View style={styles.teamInfo}>
          <MaterialIcons name="group" size={14} color="#8b5cf6" />
          <Text style={styles.teamText}>
            Team job with {job.assignedEmployees.length} employees
          </Text>
        </View>
      )}
      
      {job.tasks && job.tasks.length > 0 && (
        <View style={styles.tasksInfo}>
          <MaterialIcons name="assignment" size={14} color="#059669" />
          <Text style={styles.tasksText}>
            {job.tasks.filter(t => t.assignedTo === employeeId).length} of {job.tasks.length} tasks assigned
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const weeklyStats = getWeeklyStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Employee Schedule</Text>
          <Text style={styles.headerSubtitle}>{employeeName}</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>This Week's Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{weeklyStats.total}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#fc466b" }]}>{weeklyStats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#38ef7d" }]}>{weeklyStats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: "#11998e" }]}>{weeklyStats.scheduled}</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>All Assigned Jobs ({jobs.length})</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading schedule...</Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.jobsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="event-busy" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No jobs assigned</Text>
                <Text style={styles.emptySubtext}>
                  This employee has no jobs assigned yet
                </Text>
              </View>
            )}
          />
        )}
      </View>
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
  headerRight: { width: 40 },
  statsContainer: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4facfe",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e7eb",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  jobsList: {
    paddingBottom: 20,
  },
  jobCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#4facfe",
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    marginBottom: 2,
  },
  jobDate: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  jobTime: {
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
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  teamInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  teamText: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  tasksInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  tasksText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
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
    textAlign: "center",
  },
});