import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, collection, query, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { getEmployeeTravelTime } from "../../services/travelTimeService";

export default function EmployeeAllocationPage() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [sortedEmployees, setSortedEmployees] = useState([]);

  useEffect(() => {
    loadJobDetails();
    loadEmployees();
    loadJobs();
  }, [jobId]);

  useEffect(() => {
    if (employees.length > 0 && job) {
      getSortedEmployees().then(setSortedEmployees);
    }
  }, [employees, job, jobs]);

  const loadJobs = () => {
    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJobs(jobsList);
    });
    return unsubscribe;
  };

  const loadJobDetails = async () => {
    try {
      const jobDoc = await getDoc(doc(db, "jobs", jobId));
      if (jobDoc.exists()) {
        setJob({ id: jobDoc.id, ...jobDoc.data() });
      } else {
        Alert.alert("Error", "Job not found");
        router.back();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = () => {
    // Load from users collection where userType is employee (consistent with admin employees page)
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('All users loaded:', usersList.length);
      
      // Filter for active employees only
      const employeesList = usersList.filter(user => {
        const isEmployee = user.userType === 'employee';
        const isActive = user.status !== 'inactive';
        const hasName = !!(user.displayName || user.name || user.email);
        
        console.log(`User ${user.email}: employee=${isEmployee}, active=${isActive}, hasName=${hasName}`);
        
        return isEmployee && isActive && hasName;
      });
      
      console.log('Filtered employees:', employeesList.length);
      setEmployees(employeesList);
    });
    return unsubscribe;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateTravelTime = (distance) => {
    if (!distance) return null;
    // Estimate travel time: 30 km/h average in city traffic
    const timeInHours = distance / 30;
    const timeInMinutes = Math.round(timeInHours * 60);
    return timeInMinutes;
  };

  const getEquipmentMatch = (employee, jobEquipment) => {
    if (!employee.equipment || !jobEquipment) return { match: 0, missing: [] };
    
    const employeeEquipment = employee.equipment || [];
    const requiredEquipment = jobEquipment || [];
    
    const matches = requiredEquipment.filter(req => 
      employeeEquipment.some(emp => emp.toLowerCase().includes(req.toLowerCase()))
    );
    
    const missing = requiredEquipment.filter(req => 
      !employeeEquipment.some(emp => emp.toLowerCase().includes(req.toLowerCase()))
    );
    
    return {
      match: requiredEquipment.length > 0 ? (matches.length / requiredEquipment.length) * 100 : 100,
      missing
    };
  };

  const getEmployeeDistance = (employee) => {
    if (!job?.latitude || !job?.longitude || !employee?.latitude || !employee?.longitude) {
      return null;
    }
    return calculateDistance(job.latitude, job.longitude, employee.latitude, employee.longitude);
  };

  const getAvailabilityStatus = (employee) => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    console.log(`Checking availability for ${getEmployeeName(employee)}: status=${employee.status}`);
    
    // Check if employee is inactive
    if (employee.status === 'inactive' || employee.status === 'unavailable') {
      console.log(`Employee ${getEmployeeName(employee)} is inactive`);
      return { status: 'inactive', color: '#ef4444', priority: 0 };
    }
    
    // Check if employee has active jobs (only if jobs are loaded)
    if (jobs && jobs.length > 0) {
      const activeJobs = jobs.filter(job => 
        job.assignedTo === employee.id && 
        (job.status === 'In Progress' || job.status === 'in-progress')
      );
      
      if (activeJobs.length > 0) {
        console.log(`Employee ${getEmployeeName(employee)} is busy with ${activeJobs.length} jobs`);
        return { status: 'busy', color: '#f59e0b', priority: 1 };
      }
      
      // Check for scheduled jobs on the same day
      const scheduledJobs = jobs.filter(job => {
        if (job.assignedTo !== employee.id || !job.scheduledDate) return false;
        
        let jobDate;
        if (job.scheduledDate?.toDate) {
          jobDate = job.scheduledDate.toDate();
        } else if (typeof job.scheduledDate === 'string') {
          jobDate = new Date(job.scheduledDate);
        } else {
          jobDate = job.scheduledDate;
        }
        
        return jobDate && jobDate.toDateString() === now.toDateString();
      });
      
      if (scheduledJobs.length >= 3) {
        return { status: 'overbooked', color: '#ef4444', priority: 0 };
      } else if (scheduledJobs.length >= 2) {
        return { status: 'busy-today', color: '#f59e0b', priority: 2 };
      }
    }
    
    // Check working hours and days
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
      return { status: 'weekend', color: '#f59e0b', priority: 3 };
    }
    
    if (hour < 7 || hour > 18) {
      console.log(`Employee ${getEmployeeName(employee)} is off-hours (current hour: ${hour})`);
      return { status: 'off-hours', color: '#f59e0b', priority: 3 };
    }
    
    console.log(`Employee ${getEmployeeName(employee)} is available`);
    return { status: 'available', color: '#10b981', priority: 5 };
  };

  const getEmployeeName = (employee) => {
    return employee.displayName || employee.name || employee.email?.split('@')[0] || 'Employee';
  };

  const getEmployeeAddress = (employee) => {
    return employee.address || employee.location || 'Address not provided';
  };

  const getEmployeePhone = (employee) => {
    return employee.phone || employee.phoneNumber || employee.contactNumber || 'Phone not provided';
  };

  const getProfileCompleteness = (employee) => {
    let completeness = 0;
    const fields = [
      employee.displayName || employee.name,
      employee.email,
      employee.phone || employee.phoneNumber || employee.contactNumber,
      employee.address || employee.location,
      employee.role || employee.jobTitle
    ];
    
    fields.forEach(field => {
      if (field && field !== 'Phone not provided' && field !== 'Address not provided') {
        completeness += 20;
      }
    });
    
    return completeness;
  };

  const getEmployeeJobsForDay = (employeeId, dayOfWeek) => {
    if (!jobs || jobs.length === 0) return 0;
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + dayOfWeek);
    
    return jobs.filter(job => {
      if (job.assignedTo !== employeeId || !job.scheduledDate) return false;
      
      let jobDate;
      if (job.scheduledDate?.toDate) {
        jobDate = job.scheduledDate.toDate();
      } else if (typeof job.scheduledDate === 'string') {
        jobDate = new Date(job.scheduledDate);
      } else {
        jobDate = job.scheduledDate;
      }
      
      return jobDate && jobDate.toDateString() === startOfWeek.toDateString();
    }).length;
  };

  const allocateEmployee = async (employeeId, employeeName) => {
    try {
      const currentAssignees = job?.assignedEmployees || [];
      const isAlreadyAssigned = currentAssignees.some(emp => emp.id === employeeId);
      
      if (isAlreadyAssigned) {
        Alert.alert("Info", `${employeeName} is already assigned to this job`);
        return;
      }
      
      const newAssignee = {
        id: employeeId,
        name: employeeName,
        assignedAt: new Date(),
        tasks: []
      };
      
      const updatedAssignees = [...currentAssignees, newAssignee];
      
      await updateDoc(doc(db, "jobs", jobId), {
        assignedEmployees: updatedAssignees,
        // Keep legacy fields for backward compatibility
        assignedTo: updatedAssignees[0]?.id || employeeId,
        assignedToName: updatedAssignees[0]?.name || employeeName,
        status: "scheduled",
        progress: 25,
        updatedAt: new Date(),
      });
      
      Alert.alert(
        "Success", 
        `${employeeName} added to job (${updatedAssignees.length} total employees)`,
        [
          { text: "Add More", onPress: () => {} },
          { text: "Manage Tasks", onPress: () => router.push(`/job-tasks/${jobId}`) },
          { text: "Done", onPress: () => router.back() }
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to allocate job");
    }
  };

  const getSortedEmployees = async () => {
    console.log('Raw employees before processing:', employees.length);
    
    const processedEmployees = await Promise.all(employees.map(async emp => {
      const distance = getEmployeeDistance(emp);
      const availability = getAvailabilityStatus(emp);
      const equipmentMatch = getEquipmentMatch(emp, job?.equipment);
      
      // Get travel time from Google Maps API
      let travelInfo = null;
      try {
        travelInfo = await getEmployeeTravelTime(emp, job);
      } catch (error) {
        console.error('Error getting travel time:', error);
      }
      
      console.log(`Employee ${getEmployeeName(emp)}: availability=${availability.status}, distance=${distance}`);
      
      return {
        ...emp,
        distance,
        availability,
        equipmentMatch,
        travelInfo
      };
    }));
    
    const sorted = processedEmployees.sort((a, b) => {
      // Priority 1: Availability priority score (higher is better)
      if (a.availability.priority !== b.availability.priority) {
        return b.availability.priority - a.availability.priority;
      }
      
      // Priority 2: Equipment match (higher percentage first)
      if (Math.abs(a.equipmentMatch.match - b.equipmentMatch.match) > 5) {
        return b.equipmentMatch.match - a.equipmentMatch.match;
      }
      
      // Priority 3: Travel time (shorter first)
      if (a.travelInfo?.duration?.value && b.travelInfo?.duration?.value) {
        return a.travelInfo.duration.value - b.travelInfo.duration.value;
      }
      
      // Priority 4: Distance (closer first) - fallback
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    
    console.log('Final sorted employees:', sorted.length);
    return sorted;
  };

  const renderEmployeeItem = ({ item: employee }) => (
    <TouchableOpacity
      style={styles.employeeCard}
      onPress={() => {
        Alert.alert(
          "Allocate Job",
          `Assign this job to ${getEmployeeName(employee)}?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Assign", onPress: () => allocateEmployee(employee.id, getEmployeeName(employee)) }
          ]
        );
      }}
    >
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{getEmployeeName(employee)}</Text>
          <Text style={styles.employeeRole}>{employee.role || employee.jobTitle || 'Cleaner'}</Text>
        </View>
        <View style={[styles.availabilityBadge, { backgroundColor: employee.availability?.color || '#6b7280' }]}>
          <Text style={styles.availabilityText}>{employee.availability?.status || 'unknown'}</Text>
        </View>
      </View>

      <View style={styles.employeeDetails}>
        {/* Priority Score */}
        <View style={styles.detailRow}>
          <MaterialIcons name="star" size={14} color="#fbbf24" />
          <Text style={styles.detailText}>
            Match Score: {employee.availability.priority}/5 
            {employee.availability.status === 'available' ? ' (Perfect match!)' : 
             employee.availability.status === 'busy-today' ? ' (Has other jobs today)' :
             employee.availability.status === 'weekend' ? ' (Weekend work)' :
             employee.availability.status === 'off-hours' ? ' (After hours)' : ''}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <AntDesign name="home" size={14} color="#6b7280" />
          <Text style={styles.detailText}>{getEmployeeAddress(employee)}</Text>
        </View>
        
        {(employee.travelInfo || employee.distance) && (
          <View style={styles.detailRow}>
            <AntDesign name="enviromento" size={14} color="#8b5cf6" />
            <Text style={styles.detailText}>
              {employee.travelInfo ? 
                `${employee.travelInfo.distance.text} • ${employee.travelInfo.duration.text} drive` :
                employee.distance ? `${employee.distance.toFixed(1)} km from job site` : 'Distance unknown'
              }
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <AntDesign name="phone" size={14} color="#10b981" />
          <Text style={styles.detailText}>{getEmployeePhone(employee)}</Text>
        </View>
        
        {job?.equipment && job.equipment.length > 0 && (
          <View style={styles.detailRow}>
            <AntDesign name="tool" size={14} color={employee.equipmentMatch?.match >= 80 ? '#10b981' : employee.equipmentMatch?.match >= 50 ? '#f59e0b' : '#ef4444'} />
            <Text style={styles.detailText}>
              Equipment: {employee.equipmentMatch?.match?.toFixed(0) || 0}% match
            </Text>
            {employee.equipmentMatch?.missing?.length > 0 && (
              <Text style={styles.missingEquipment}>
                Missing: {employee.equipmentMatch.missing.join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Today's workload */}
        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={14} color="#8b5cf6" />
          <Text style={styles.detailText}>
            Today's jobs: {jobs.filter(j => j.assignedTo === employee.id && 
              j.scheduledDate && new Date(j.scheduledDate).toDateString() === new Date().toDateString()).length}
          </Text>
        </View>
        
        {/* Weekly availability view */}
        <View style={styles.weeklySchedule}>
          <Text style={styles.scheduleTitle}>This Week:</Text>
          <View style={styles.weekDays}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
              const dayJobs = getEmployeeJobsForDay(employee.id, index + 1);
              const dayColor = dayJobs === 0 ? '#10b981' : dayJobs === 1 ? '#f59e0b' : '#ef4444';
              return (
                <View key={day} style={[styles.dayIndicator, { backgroundColor: dayColor }]}>
                  <Text style={styles.dayText}>{day}</Text>
                  <Text style={styles.dayCount}>{dayJobs}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.employeeActions}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.scheduleButton}
            onPress={() => {
              // Navigate to employee schedule view
              router.push({
                pathname: '/employee-schedule',
                params: {
                  employeeId: employee.id,
                  employeeName: getEmployeeName(employee)
                }
              });
            }}
          >
            <MaterialIcons name="calendar-today" size={16} color="#8b5cf6" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.assignButton, 
              employee.availability?.priority < 3 && styles.assignButtonDisabled,
              employee.availability?.priority === 5 && styles.assignButtonPerfect,
              job?.assignedEmployees?.some(emp => emp.id === employee.id) && styles.assignButtonAssigned
            ]}
            onPress={() => allocateEmployee(employee.id, getEmployeeName(employee))}
            disabled={employee.availability?.status === 'inactive'}
          >
            <Text style={styles.assignButtonText}>
              {job?.assignedEmployees?.some(emp => emp.id === employee.id) ? '✓ Assigned' :
               employee.availability?.priority === 5 ? '✓ Best Match' :
               employee.availability?.priority >= 3 ? 'Add to Job' : 'Not Ideal'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Allocate Employee</Text>
          <Text style={styles.headerSubtitle}>{job?.title}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.viewToggleButton}
          onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
        >
          <Feather name={viewMode === 'map' ? 'list' : 'map'} size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.jobSummary}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job?.title}</Text>
          <Text style={styles.jobAddress}>📍 {job?.address}</Text>
          <Text style={styles.jobTime}>🗓️ {job?.scheduledDate}{job?.startTime ? ` • ⏰ ${job.startTime}` : ''}</Text>
          {job?.assignedEmployees?.length > 0 && (
            <Text style={styles.assignedEmployees}>
              👥 {job.assignedEmployees.length} assigned: {job.assignedEmployees.map(emp => emp.name).join(', ')}
            </Text>
          )}
        </View>
        <View style={styles.employeeCount}>
          <Text style={styles.employeeCountText}>{sortedEmployees.length}</Text>
          <Text style={styles.employeeCountLabel}>Available</Text>
          <Text style={styles.assignedCountText}>{job?.assignedEmployees?.length || 0}</Text>
          <Text style={styles.assignedCountLabel}>Assigned</Text>
        </View>
      </View>

      {/* Debug info - remove after testing */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>Debug: {employees.length} employees loaded, {sortedEmployees.length} after processing</Text>
        {employees.length > 0 && (
          <Text style={styles.debugText}>First employee: {getEmployeeName(employees[0])}</Text>
        )}
      </View>

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          {job?.latitude && job?.longitude ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: job.latitude,
                longitude: job.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              <Marker
                coordinate={{ latitude: job.latitude, longitude: job.longitude }}
                pinColor="#ff6b35"
                title="Job Location"
                description={job.address}
              />
              
              {sortedEmployees
                .filter(emp => emp.latitude && emp.longitude)
                .map((employee) => (
                  <Marker
                    key={employee.id}
                    coordinate={{ latitude: employee.latitude, longitude: employee.longitude }}
                    pinColor={employee.availability?.color || '#6b7280'}
                    title={getEmployeeName(employee)}
                    description={`${employee.distance?.toFixed(1) || '?'} km away`}
                    onPress={() => allocateEmployee(employee.id, getEmployeeName(employee))}
                  />
                ))
              }
            </MapView>
          ) : (
            <View style={styles.noMapContainer}>
              <AntDesign name="enviromento" size={48} color="#9ca3af" />
              <Text style={styles.noMapText}>Job location not available</Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={sortedEmployees}
          renderItem={renderEmployeeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <AntDesign name="team" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No employees found</Text>
              <Text style={styles.emptySubtext}>
                {employees.length === 0 
                  ? "No employees have been added to the system yet."
                  : "All employees are currently filtered out."}
              </Text>
            </View>
          )}
        />
      )}
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
  viewToggleButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  jobSummary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    elevation: 2,
    alignItems: "center",
  },
  jobInfo: { flex: 1 },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  jobAddress: { fontSize: 14, color: "#6b7280", marginBottom: 2 },
  jobTime: { fontSize: 14, color: "#6b7280" },
  assignedEmployees: { fontSize: 12, color: "#8b5cf6", marginTop: 4, fontWeight: "600" },
  assignedCountText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8b5cf6",
  },
  assignedCountLabel: {
    fontSize: 10,
    color: "#8b5cf6",
    fontWeight: "600",
  },
  employeeCount: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  employeeCountText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4facfe",
  },
  employeeCountLabel: {
    fontSize: 12,
    color: "#4facfe",
    fontWeight: "600",
  },
  availableCount: {
    fontSize: 10,
    color: "#10b981",
    fontWeight: "600",
    marginTop: 2,
  },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  noMapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noMapText: { fontSize: 16, color: "#9ca3af", marginTop: 12 },
  listContent: { padding: 16 },
  employeeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  employeeInfo: { flex: 1 },
  employeeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },
  employeeRole: { fontSize: 14, color: "#6b7280", fontWeight: "500" },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  availabilityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  employeeDetails: { marginBottom: 16 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  detailText: { fontSize: 14, color: "#4b5563", flex: 1 },
  employeeActions: { flexDirection: "row" },
  actionButtons: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  scheduleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  assignButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#10b981",
  },
  assignButtonDisabled: { backgroundColor: "#d1d5db" },
  assignButtonPerfect: { 
    backgroundColor: "#059669",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  assignButtonAssigned: {
    backgroundColor: "#8b5cf6",
  },
  assignButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
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
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { fontSize: 16, color: "#6b7280" },
  debugContainer: {
    backgroundColor: "#fef3c7",
    padding: 8,
    margin: 8,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  missingEquipment: {
    fontSize: 11,
    color: '#ef4444',
    fontStyle: 'italic',
    marginLeft: 22,
    marginTop: 2,
  },
  priorityScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  weeklySchedule: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  scheduleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '600',
  },
  dayCount: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
});