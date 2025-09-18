import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";

import { auth, db } from "../../config/firebase";

import { useAuth } from "../../contexts/AuthContext";
import JobDetailsPanel from "./components/JobDetailsPanel";
import { useLiveOpsListeners } from "./hooks/useLiveOpsListeners";
import LiveMap from "./components/LiveMap";
import EmployeeRoster from "./components/EmployeeRoster";
import BulkToolbar from "./components/BulkToolbar";
import { geocodeAddressOSM } from "../../services/locationService";

const { width } = Dimensions.get("window");

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userProfile, logout } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("today");
  const [includePast, setIncludePast] = useState(false);
  
  // Memoized date range to prevent effect loops
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (selectedDateRange) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "week":
        return { start: today, end: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case "month":
        return { start: today, end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) };
      default:
        return null;
    }
  }, [selectedDateRange]);
  
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showJobPanel, setShowJobPanel] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Use the enhanced hook with proper filters and stable dependencies
  const { jobs, employees, alerts, counts, loading, error, refresh } = useLiveOpsListeners({
    search: searchInput,
    dateRange: selectedDateRange === 'all' ? null : dateRange,
    includePast,
    pageSize: 50
  });

  // Debounced search handler - now handled internally by the hook
  const handleSearch = useCallback((text: string) => {
    setSearchInput(text);
  }, []);

  const toggleJobSelection = (jobId) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleMapJobPress = async (job) => {
    console.log('Dashboard: centering map on job', job.id, job.address);
    setSelectedJobId(job.id);
    
    if (job.latitude && job.longitude) {
      return;
    }
    
    if (job._geocoded) {
      return;
    }
    
    if (job.address) {
      try {
        const coords = await geocodeAddressOSM(job.address);
        if (coords) {
          await updateDoc(doc(db, 'jobs', job.id), {
            latitude: coords.latitude,
            longitude: coords.longitude,
            _geocoded: true
          });
          console.log('Dashboard: geocoded job', job.id, coords);
        } else {
          await updateDoc(doc(db, 'jobs', job.id), { _geocoded: true });
          console.warn('Dashboard: could not geocode address:', job.address);
        }
      } catch (error) {
        console.error('Dashboard: geocoding failed:', error);
        try {
          await updateDoc(doc(db, 'jobs', job.id), { _geocoded: true });
        } catch (updateError) {
          console.error('Dashboard: failed to update geocoded flag:', updateError);
        }
      }
    }
  };

  const handleJobPressShort = (job) => {
    console.log('Dashboard: short press - centering map on job', job.id);
    handleMapJobPress(job);
  };

  const handleJobLongPress = (job) => {
    console.log('Dashboard: long press - opening admin job details page', job.id);
    router.push(`/admin-job-details/${job.id}`);
  };
  
  // API to open JobDetailsPanel from external components (Jump-to-Job)
  const openJobDetailsPanel = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
    setShowJobPanel(true);
  }, []);
  
  // Expose openJobDetailsPanel globally for Jump-to-Job
  useEffect(() => {
    (window as any).openJobDetailsPanel = openJobDetailsPanel;
    return () => {
      delete (window as any).openJobDetailsPanel;
    };
  }, [openJobDetailsPanel]);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  };

  const handleKPIClick = (type) => {
    const statusMap = {
      total: null,
      active: "In Progress", // Exact DB match
      completed: "Completed",
      pending: "Pending"
    };
    
    const status = statusMap[type];
    if (status) {
      router.push(`/(admin-tabs)/jobs?status=${encodeURIComponent(status)}`);
    } else {
      router.push("/(admin-tabs)/jobs");
    }
  };

  const renderJobItem = ({ item: job }) => (
    <TouchableOpacity 
      style={[
        styles.jobItem,
        selectedJobs.has(job.id) && styles.selectedJobItem,
        selectedJobId === job.id && styles.selectedJobItem
      ]}
      onPressIn={() => {
        if (isMultiSelectMode) {
          toggleJobSelection(job.id);
          return;
        }
        if (pressTimer) clearTimeout(pressTimer);
        const timer = setTimeout(() => {
          handleJobLongPress(job);
          setPressTimer(null);
        }, 2000);
        setPressTimer(timer);
      }}
      onPressOut={() => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          setPressTimer(null);
          if (!isMultiSelectMode) {
            handleJobPressShort(job);
          }
        }
      }}
    >
      {isMultiSelectMode && (
        <View style={styles.checkboxContainer}>
          <View style={[styles.checkbox, selectedJobs.has(job.id) && styles.checkboxSelected]}>
            {selectedJobs.has(job.id) && <AntDesign name="check" size={12} color="#fff" />}
          </View>
        </View>
      )}
      <View style={styles.jobContent}>
        <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
        <Text style={styles.jobClient} numberOfLines={1}>{job.client || job.contactName}</Text>
        <Text style={styles.jobAddress} numberOfLines={1}>{job.address}</Text>
        <View style={styles.jobMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.statusText}>{job.status || 'Pending'}</Text>
          </View>
          <Text style={styles.assignedText}>{job.assignedToName || 'Unassigned'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "in progress": return "#fc466b";
      case "completed": return "#38ef7d";
      case "pending": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Live Operations</Text>
          <Text style={styles.headerSubtitle}>
            {userProfile?.name || userProfile?.firstName && userProfile?.lastName 
              ? `${userProfile.firstName} ${userProfile.lastName}` 
              : user?.displayName || 'Admin'} • Teddy's Cleaning
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <AntDesign name="logout" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Top Utility Bar */}
      <View style={styles.utilityBar}>
        <View style={styles.searchContainer}>
          <AntDesign name="search1" size={16} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, clients, employees..."
            value={searchInput}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity style={styles.utilityButton} onPress={refresh}>
          <AntDesign name="reload1" size={16} color="#4facfe" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.utilityButton}
          onPress={() => setShowAlerts(true)}
        >
          <AntDesign name="bells" size={16} color="#4facfe" />
          {Array.isArray(alerts) && alerts.length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{alerts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Error/Offline Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <AntDesign name="exclamationcircle" size={16} color="#f59e0b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* KPI Cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => handleKPIClick("total")}>
          <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.statGradient}>
            <AntDesign name="filetext1" size={24} color="#fff" />
            <Text style={styles.statNumber}>{counts.totalJobs}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => handleKPIClick("active")}>
          <LinearGradient colors={["#fc466b", "#3f5efb"]} style={styles.statGradient}>
            <AntDesign name="clockcircleo" size={24} color="#fff" />
            <Text style={styles.statNumber}>{counts.inProgress}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => handleKPIClick("completed")}>
          <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.statGradient}>
            <AntDesign name="checkcircleo" size={24} color="#fff" />
            <Text style={styles.statNumber}>{counts.completed}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => handleKPIClick("pending")}>
          <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.statGradient}>
            <AntDesign name="exclamationcircleo" size={24} color="#fff" />
            <Text style={styles.statNumber}>{counts.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      <View style={styles.dateRangeFilter}>
        {['today', 'week', 'month', 'all'].map((range) => (
          <TouchableOpacity 
            key={range}
            style={[styles.dateButton, selectedDateRange === range && styles.dateButtonActive]}
            onPress={() => setSelectedDateRange(range)}
          >
            <Text style={[styles.dateButtonText, selectedDateRange === range && styles.dateButtonTextActive]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Include Past Jobs Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, includePast && styles.toggleButtonActive]}
          onPress={() => setIncludePast(!includePast)}
        >
          <AntDesign 
            name={includePast ? "checkcircle" : "checkcircleo"} 
            size={16} 
            color={includePast ? "#fff" : "#4facfe"} 
          />
          <Text style={[styles.toggleText, includePast && styles.toggleTextActive]}>
            Include Past Jobs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live Ops Layout */}
      <View style={styles.liveOpsContainer}>
        {/* Left Side - Map and Job List */}
        <View style={styles.leftPanel}>
          <View style={styles.mapContainer}>
            <LiveMap 
              jobs={Array.isArray(jobs) ? jobs : []} 
              onJobSelect={handleMapJobPress}
              selectedJobId={selectedJobId}
              includePast={includePast}
              showLocateButton={true}
              locateButtonStyle="transparent"
            />
          </View>
          
          <View style={styles.jobListContainer}>
            <View style={styles.jobListHeader}>
              <Text style={styles.jobListTitle}>Jobs ({Array.isArray(jobs) ? jobs.length : 0})</Text>
              <TouchableOpacity 
                style={styles.multiSelectButton}
                onPress={() => setIsMultiSelectMode(!isMultiSelectMode)}
              >
                <MaterialIcons name="checklist" size={16} color="#4facfe" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={Array.isArray(jobs) ? jobs : []}
              renderItem={renderJobItem}
              keyExtractor={(item) => item.id}
              style={styles.jobList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>

        {/* Right Side - Roster and Alerts */}
        <View style={[styles.rightPanel, width < 768 && { display: 'none' }]}>
          <TouchableOpacity 
            style={styles.rosterHeader}
            onPress={() => setShowRoster(!showRoster)}
          >
            <Text style={styles.rosterTitle}>Team ({employees.length})</Text>
            <AntDesign name={showRoster ? "up" : "down"} size={16} color="#6b7280" />
          </TouchableOpacity>
          {showRoster && (
            <EmployeeRoster employees={employees} jobs={jobs} />
          )}
          
          <TouchableOpacity 
            style={styles.alertsHeader}
            onPress={() => setShowAlerts(!showAlerts)}
          >
            <Text style={styles.alertsTitle}>Alerts ({Array.isArray(alerts) ? alerts.length : 0})</Text>
            {Array.isArray(alerts) && alerts.length > 0 && <View style={styles.alertsBadge} />}
            <AntDesign name={showAlerts ? "up" : "down"} size={16} color="#6b7280" />
          </TouchableOpacity>
          {showAlerts && (
            <View style={styles.alertsList}>
              {Array.isArray(alerts) && alerts.map((alert) => (
                <View key={alert.id} style={styles.alertItem}>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.alertTime}>
                    {alert.timestamp?.toLocaleTimeString?.() || 'Now'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Mobile Roster/Alerts Buttons */}
      {width < 768 && (
        <View style={styles.mobileActions}>
          <TouchableOpacity 
            style={styles.mobileActionButton}
            onPress={() => setShowRoster(true)}
          >
            <AntDesign name="team" size={20} color="#4facfe" />
            <Text style={styles.mobileActionText}>Team</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.mobileActionButton}
            onPress={() => setShowAlerts(true)}
          >
            <AntDesign name="bells" size={20} color="#f59e0b" />
            <Text style={styles.mobileActionText}>Alerts</Text>
            {Array.isArray(alerts) && alerts.length > 0 && <View style={styles.mobileBadge} />}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowFABMenu(!showFABMenu)}
      >
        <AntDesign name={showFABMenu ? "close" : "plus"} size={24} color="#fff" />
      </TouchableOpacity>

      {/* FAB Menu */}
      {showFABMenu && (
        <View style={styles.fabMenu}>
          <TouchableOpacity 
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFABMenu(false);
              router.push("/add-job");
            }}
          >
            <AntDesign name="plus" size={16} color="#fff" />
            <Text style={styles.fabMenuText}>New Job</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFABMenu(false);
              router.push("/add-employee");
            }}
          >
            <AntDesign name="user" size={16} color="#fff" />
            <Text style={styles.fabMenuText}>New Employee</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFABMenu(false);
              router.push("/admin-work-requests");
            }}
          >
            <AntDesign name="inbox" size={16} color="#fff" />
            <Text style={styles.fabMenuText}>New Request</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.fabMenuItem}
            onPress={() => {
              setShowFABMenu(false);
              router.push("/tasks-overview");
            }}
          >
            <AntDesign name="checkcircle" size={16} color="#fff" />
            <Text style={styles.fabMenuText}>Tasks Overview</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Job Details Panel */}
      <JobDetailsPanel
        visible={showJobPanel}
        jobId={selectedJobId}
        onClose={() => setShowJobPanel(false)}
      />

      {/* Bulk Toolbar */}
      {isMultiSelectMode && selectedJobs.size > 0 && (
        <BulkToolbar
          selectedJobs={Array.from(selectedJobs)}
          onComplete={() => {
            setSelectedJobs(new Set());
            setIsMultiSelectMode(false);
          }}
        />
      )}

      {/* Mobile Modals */}
      <Modal visible={showRoster && width < 768} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Team Roster</Text>
            <TouchableOpacity onPress={() => setShowRoster(false)}>
              <AntDesign name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <EmployeeRoster employees={employees} jobs={jobs} />
        </View>
      </Modal>

      <Modal visible={showAlerts && width < 768} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Alerts</Text>
            <TouchableOpacity onPress={() => setShowAlerts(false)}>
              <AntDesign name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.alertsList}>
            {Array.isArray(alerts) && alerts.map((alert) => (
              <View key={alert.id} style={styles.alertItem}>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>
                  {alert.timestamp?.toLocaleTimeString?.() || 'Now'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>

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
    paddingVertical: 20,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
  },
  utilityBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1f2937",
  },
  utilityButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4facfe",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabMenu: {
    position: "absolute",
    bottom: 88,
    right: 24,
    gap: 8,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4facfe",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    elevation: 4,
  },
  fabMenuText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
  logoutButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  statCard: {
    flex: 1,
    height: 65,
    borderRadius: 10,
    overflow: "hidden",
    elevation: 2,
  },
  statGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginTop: 1,
  },
  dateRangeFilter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dateButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
  },
  dateButtonActive: {
    backgroundColor: "#4facfe",
  },
  dateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  dateButtonTextActive: {
    color: "#fff",
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#4facfe",
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  toggleTextActive: {
    color: "#fff",
  },
  liveOpsContainer: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  leftPanel: {
    flex: 2,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  mapContainer: {
    height: 180,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  jobListContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  jobListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  jobListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  multiSelectButton: {
    padding: 6,
  },
  jobList: {
    flex: 1,
  },
  jobItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 80,
  },
  selectedJobItem: {
    borderColor: "#4facfe",
    backgroundColor: "#eff6ff",
  },
  checkboxContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#4facfe",
    borderColor: "#4facfe",
  },
  jobContent: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  jobClient: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  jobAddress: {
    fontSize: 11,
    color: "#9ca3af",
    marginBottom: 4,
  },
  jobMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  assignedText: {
    fontSize: 10,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  rosterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 8,
  },
  rosterTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 8,
    marginTop: 16,
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  alertsBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginLeft: 4,
  },
  alertsList: {
    flex: 1,
  },
  alertItem: {
    backgroundColor: "#fef3c7",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
  },
  alertTime: {
    fontSize: 10,
    color: "#a16207",
    marginTop: 2,
  },
  mobileActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  mobileActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    position: "relative",
  },
  mobileActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  mobileBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    height: 140,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  actionGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginTop: 12,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
    marginTop: 24,
  },
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },
  navText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
    marginTop: 8,
    textAlign: "center",
  },
});