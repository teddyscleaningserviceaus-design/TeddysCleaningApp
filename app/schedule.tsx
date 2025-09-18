import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
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

import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const jobsList = [];
        querySnapshot.forEach((doc) => {
          jobsList.push({ id: doc.id, ...doc.data() });
        });
        setJobs(jobsList);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDate && jobs.length > 0) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const filtered = jobs.filter(job => 
        job.scheduledDate && job.scheduledDate.includes(dateStr)
      );
      setFilteredJobs(filtered);
    } else {
      setFilteredJobs([]);
    }
  }, [selectedDate, jobs]);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <ImageBackground
        source={require("../assets/background_pattern.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require("../assets/teddy-logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>Schedule</Text>
              <Text style={styles.headerSubtitle}>Calendar & Jobs</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.headerRight} onPress={() => router.push('/add-job')}>
            <AntDesign name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Calendar Section */}
          <View style={styles.calendarContainer}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.dateSelector}>
              <TouchableOpacity style={styles.dateButton}>
                <AntDesign name="calendar" size={20} color="#4facfe" />
                <Text style={styles.dateButtonText}>{selectedDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <Text style={styles.dateNote}>Calendar picker will be available when dependencies are resolved</Text>
            </View>
          </View>

          {/* Jobs for Selected Date */}
          <View style={styles.jobsSection}>
            <View style={styles.jobsHeader}>
              <Text style={styles.sectionTitle}>
                Jobs for {selectedDate.toLocaleDateString()}
              </Text>
              <View style={styles.jobCount}>
                <Text style={styles.jobCountText}>{filteredJobs.length}</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading jobs...</Text>
              </View>
            ) : filteredJobs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <AntDesign name="calendar" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No jobs scheduled</Text>
                <Text style={styles.emptySubtext}>for this date</Text>
                <TouchableOpacity 
                  style={styles.addJobBtn}
                  onPress={() => router.push('/add-job')}
                >
                  <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.addJobBtnGradient}>
                    <AntDesign name="plus" size={16} color="#fff" />
                    <Text style={styles.addJobBtnText}>Add Job</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              filteredJobs.map((job) => (
                <TouchableOpacity 
                  key={job.id} 
                  style={styles.jobCard}
                  onPress={() => router.push(`/admin-job-details/${job.id}`)}
                >
                  <LinearGradient colors={getJobGradient(job.status)} style={styles.jobCardGradient}>
                    <View style={styles.jobCardHeader}>
                      <View style={styles.jobCardLeft}>
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <Text style={styles.jobClient}>{job.client}</Text>
                        <Text style={styles.jobAddress}>{job.address}</Text>
                      </View>
                      <View style={styles.jobCardRight}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                          <Text style={styles.statusText}>{job.status}</Text>
                        </View>
                        <Text style={styles.jobTime}>{job.startTime}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.jobCardFooter}>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${job.progress || 0}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{job.progress || 0}%</Text>
                      </View>
                      <TouchableOpacity style={styles.detailsButton}>
                        <Text style={styles.detailsButtonText}>View Details</Text>
                        <AntDesign name="right" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>This Week Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.statCardGradient}>
                  <AntDesign name="checkcircle" size={24} color="#fff" />
                  <Text style={styles.statNumber}>{jobs.filter(j => j.status === "Completed").length}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient colors={["#fc466b", "#3f5efb"]} style={styles.statCardGradient}>
                  <AntDesign name="clockcircle" size={24} color="#fff" />
                  <Text style={styles.statNumber}>{jobs.filter(j => j.status === "In Progress").length}</Text>
                  <Text style={styles.statLabel}>In Progress</Text>
                </LinearGradient>
              </View>
              
              <View style={styles.statCard}>
                <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.statCardGradient}>
                  <AntDesign name="calendar" size={24} color="#fff" />
                  <Text style={styles.statNumber}>{jobs.filter(j => j.status === "Scheduled").length}</Text>
                  <Text style={styles.statLabel}>Scheduled</Text>
                </LinearGradient>
              </View>
            </View>
          </View>
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
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginLeft: -40,
  },
  logo: { 
    width: 36, 
    height: 36, 
    marginRight: 12,
    borderRadius: 18,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  headerRight: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  content: {
    flex: 1,
    padding: 20,
  },

  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1f2937", 
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  calendarContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dateSelector: {
    alignItems: "center",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79, 172, 254, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4facfe",
    marginLeft: 8,
  },
  dateNote: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },

  jobsSection: {
    marginBottom: 24,
  },
  jobsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  jobCount: {
    backgroundColor: "#4facfe",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  jobCountText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  jobCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  jobCardGradient: {
    padding: 20,
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  jobCardLeft: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  jobClient: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  jobCardRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  jobTime: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailsButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },

  statsContainer: {
    marginBottom: 40,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  statCardGradient: {
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginTop: 4,
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
    marginBottom: 20,
  },
  addJobBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  addJobBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addJobBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});