import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, FlatList, Switch, Modal, Linking } from 'react-native';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { jobService } from '../../../services/jobService';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  skills: string[];
  availability: any;
  homeAddress?: string;
  latitude?: number;
  longitude?: number;
  equipment?: string[];
  workload?: number;
  score?: number;
  suitabilityScore?: number;
  scoreBreakdown?: {
    distance: number;
    availability: number;
    experience: number;
    feedback: number;
    workload: number;
    recency: number;
  };
  lastJobDate?: Date;
  avgRating?: number;
  totalJobs?: number;
  profilePicture?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  estimatedDuration: number;
  requiredSkills: string[];
  assignedTo?: string[];
  instructions?: string;
  equipment?: string[];
  videoLinks?: string[];
  priority?: string;
  assignedToName?: string;
}

export default function EmployeeAllocation() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [job, setJob] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [taskAssignments, setTaskAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [maxDistance, setMaxDistance] = useState(50); // km
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    loadJobAndEmployees();
  }, [jobId]);

  const loadJobAndEmployees = async () => {
    try {
      console.log('Loading job for allocation, jobId:', jobId);
      
      // Handle guest job IDs (prefixed with 'guest_')
      let actualJobId = jobId as string;
      let isGuestJob = false;
      
      if (actualJobId.startsWith('guest_')) {
        actualJobId = actualJobId.replace('guest_', '');
        isGuestJob = true;
        console.log('Guest job detected, using actualJobId:', actualJobId);
      }
      
      // Try jobs collection first, then guest-bookings
      let jobDoc = await getDoc(doc(db, 'jobs', actualJobId));
      let jobData = null;
      
      if (jobDoc.exists()) {
        jobData = { id: jobDoc.id, ...jobDoc.data() };
        console.log('Found job in jobs collection');
      } else {
        jobDoc = await getDoc(doc(db, 'guest-bookings', actualJobId));
        if (jobDoc.exists()) {
          jobData = { id: jobDoc.id, ...jobDoc.data(), bookingType: 'guest' };
          console.log('Found job in guest-bookings collection');
        }
      }
      
      if (!jobData) {
        Alert.alert('Error', 'Job not found');
        setLoading(false);
        return;
      }

      setJob(jobData);
      
      let currentTasks: Task[];
      if (!jobData.tasks || jobData.tasks.length === 0) {
        currentTasks = generateTasksByJobType(jobData.jobType, jobData.buildingType);
      } else {
        currentTasks = jobData.tasks || [];
      }
      setTasks(currentTasks);

      // Load employees from users collection (consistent with auth system)
      const employeesQuery = query(collection(db, 'users'), where('userType', '==', 'employee'));
      const employeesSnapshot = await getDocs(employeesQuery);
      console.log('Employee allocation - Found employees:', employeesSnapshot.size);
      const employeesList = await Promise.all(employeesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const employee = {
          id: doc.id,
          name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unknown',
          email: data.email || '',
          phone: data.phone || '',
          skills: data.skills || ['cleaning'],
          availability: data.availability || { available: true },
          homeAddress: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          equipment: data.equipment || [],
          workload: data.workload || 0,
          profilePicture: data.profileImage || data.profilePicture
        };
        
        // Get work history and ratings
        const workHistory = await getEmployeeWorkHistory(doc.id);
        employee.lastJobDate = workHistory.lastJobDate;
        employee.avgRating = workHistory.avgRating;
        employee.totalJobs = workHistory.totalJobs;
        
        console.log('Employee allocation - Processing employee:', employee.id, employee.name);
        return employee;
      }));
      
      console.log('Employee allocation - Total employees processed:', employeesList.length);

      const scoredEmployees = employeesList.map(emp => {
        const suitability = calculateSuitabilityScore(emp, jobData, currentTasks);
        return {
          ...emp,
          suitabilityScore: suitability.totalScore,
          scoreBreakdown: suitability.breakdown,
          score: suitability.totalScore // Keep for backward compatibility
        };
      }).sort((a, b) => (b.suitabilityScore || 0) - (a.suitabilityScore || 0));

      setEmployees(scoredEmployees);
      setLoading(false);
    } catch (error) {
      console.error('Error loading job and employees:', error);
      Alert.alert('Error', 'Failed to load job details');
      setLoading(false);
    }
  };

  const generateTasksByJobType = (jobType: string, buildingType: string): Task[] => {
    const tasks: Task[] = [];
    let taskId = 1;
    
    // Base cleaning tasks for all jobs
    tasks.push(
      { 
        id: String(taskId++), 
        title: 'Initial Setup', 
        description: 'Set up equipment and supplies', 
        estimatedDuration: 10, 
        requiredSkills: ['cleaning'],
        instructions: 'Unpack cleaning supplies, set up equipment, review job requirements',
        equipment: ['cleaning cart', 'vacuum', 'mop bucket'],
        videoLinks: ['https://example.com/setup-guide'],
        priority: 'High'
      },
      { 
        id: String(taskId++), 
        title: 'Vacuum/Sweep Floors', 
        description: 'Clean all floor surfaces', 
        estimatedDuration: 30, 
        requiredSkills: ['cleaning'],
        instructions: 'Start from farthest corner, work toward exit, use appropriate attachments',
        equipment: ['vacuum cleaner', 'broom', 'dustpan'],
        videoLinks: ['https://example.com/vacuum-technique'],
        priority: 'High'
      },
      { 
        id: String(taskId++), 
        title: 'Dust Surfaces', 
        description: 'Dust furniture, shelves, and surfaces', 
        estimatedDuration: 25, 
        requiredSkills: ['cleaning'],
        instructions: 'Work top to bottom, use microfiber cloths, spray lightly',
        equipment: ['microfiber cloths', 'dusting spray', 'extendable duster'],
        videoLinks: ['https://example.com/dusting-best-practices'],
        priority: 'Medium'
      }
    );
    
    // Job type specific tasks
    if (jobType === 'deep' || jobType === 'deep-cleaning') {
      tasks.push(
        { 
          id: String(taskId++), 
          title: 'Deep Clean Bathrooms', 
          description: 'Scrub tiles, sanitize fixtures, clean mirrors', 
          estimatedDuration: 45, 
          requiredSkills: ['cleaning', 'sanitization'],
          instructions: 'Apply cleaners, let sit 5 minutes, scrub grout, sanitize all surfaces',
          equipment: ['toilet brush', 'scrub brush', 'disinfectant', 'glass cleaner'],
          videoLinks: ['https://example.com/bathroom-deep-clean'],
          priority: 'High'
        },
        { 
          id: String(taskId++), 
          title: 'Kitchen Deep Clean', 
          description: 'Clean appliances inside/out, scrub surfaces', 
          estimatedDuration: 60, 
          requiredSkills: ['cleaning', 'kitchen'],
          instructions: 'Clean inside oven, fridge, microwave, degrease surfaces, sanitize counters',
          equipment: ['degreaser', 'oven cleaner', 'scrub pads', 'sanitizer'],
          videoLinks: ['https://example.com/kitchen-deep-clean'],
          priority: 'High'
        },
        { 
          id: String(taskId++), 
          title: 'Window Cleaning', 
          description: 'Clean interior and exterior windows', 
          estimatedDuration: 40, 
          requiredSkills: ['window-cleaning'],
          instructions: 'Use squeegee technique, clean frames, check for streaks',
          equipment: ['squeegee', 'window cleaner', 'lint-free cloths'],
          videoLinks: ['https://example.com/window-cleaning-pro'],
          priority: 'Medium'
        }
      );
    } else if (jobType === 'regular') {
      tasks.push(
        { 
          id: String(taskId++), 
          title: 'Clean Bathrooms', 
          description: 'Standard bathroom cleaning and sanitizing', 
          estimatedDuration: 25, 
          requiredSkills: ['cleaning', 'sanitization'],
          instructions: 'Clean toilet, sink, mirror, mop floor, restock supplies',
          equipment: ['toilet brush', 'all-purpose cleaner', 'paper towels'],
          videoLinks: ['https://example.com/bathroom-standard'],
          priority: 'High'
        },
        { 
          id: String(taskId++), 
          title: 'Kitchen Clean', 
          description: 'Clean counters, sink, and appliance surfaces', 
          estimatedDuration: 30, 
          requiredSkills: ['cleaning'],
          instructions: 'Wipe counters, clean sink, sanitize surfaces, sweep floor',
          equipment: ['all-purpose cleaner', 'sponges', 'dish soap'],
          videoLinks: ['https://example.com/kitchen-standard'],
          priority: 'High'
        }
      );
    } else if (jobType === 'office') {
      tasks.push(
        { 
          id: String(taskId++), 
          title: 'Empty Trash Bins', 
          description: 'Empty all waste bins and replace liners', 
          estimatedDuration: 15, 
          requiredSkills: ['cleaning'],
          instructions: 'Empty bins, replace liners, sanitize bin edges, collect recycling',
          equipment: ['trash bags', 'sanitizer', 'gloves'],
          videoLinks: ['https://example.com/office-waste-management'],
          priority: 'High'
        },
        { 
          id: String(taskId++), 
          title: 'Clean Workstations', 
          description: 'Wipe desks, keyboards, and monitors', 
          estimatedDuration: 35, 
          requiredSkills: ['cleaning', 'electronics'],
          instructions: 'Use electronics-safe cleaner, wipe gently, organize desk items',
          equipment: ['electronics cleaner', 'microfiber cloths', 'compressed air'],
          videoLinks: ['https://example.com/electronics-cleaning'],
          priority: 'Medium'
        }
      );
    }
    
    // Building type adjustments
    if (buildingType === 'apartment') {
      tasks.push(
        { 
          id: String(taskId++), 
          title: 'Balcony/Patio Clean', 
          description: 'Clean outdoor living spaces', 
          estimatedDuration: 20, 
          requiredSkills: ['cleaning'],
          instructions: 'Sweep debris, wipe furniture, clean glass doors',
          equipment: ['broom', 'outdoor cleaner', 'hose'],
          videoLinks: ['https://example.com/outdoor-cleaning'],
          priority: 'Low'
        }
      );
    } else if (buildingType === 'house') {
      tasks.push(
        { 
          id: String(taskId++), 
          title: 'Multiple Bedroom Clean', 
          description: 'Clean and organize all bedrooms', 
          estimatedDuration: 50, 
          requiredSkills: ['cleaning'],
          instructions: 'Make beds, dust surfaces, vacuum floors, organize items',
          equipment: ['vacuum', 'dusting cloths', 'fresh linens'],
          videoLinks: ['https://example.com/bedroom-cleaning'],
          priority: 'Medium'
        }
      );
    }
    
    // Final tasks
    tasks.push(
      { 
        id: String(taskId++), 
        title: 'Final Inspection', 
        description: 'Quality check and touch-ups', 
        estimatedDuration: 15, 
        requiredSkills: ['cleaning'],
        instructions: 'Walk through all areas, check quality, make final touch-ups',
        equipment: ['checklist', 'touch-up supplies'],
        videoLinks: ['https://example.com/quality-inspection'],
        priority: 'High'
      },
      { 
        id: String(taskId++), 
        title: 'Equipment Cleanup', 
        description: 'Clean and pack equipment', 
        estimatedDuration: 10, 
        requiredSkills: ['cleaning'],
        instructions: 'Clean all equipment, pack supplies, secure cleaning cart',
        equipment: ['cleaning cart', 'storage containers'],
        videoLinks: ['https://example.com/equipment-care'],
        priority: 'Medium'
      }
    );
    
    return tasks;
  };

  const autoGenerateTasks = () => {
    const jobType = job?.serviceType || job?.jobType || 'regular';
    const buildingType = job?.propertyType || job?.buildingType || 'house';
    const generatedTasks = generateTasksByJobType(jobType, buildingType);
    setTasks(generatedTasks);
    Alert.alert('Success', `Generated ${generatedTasks.length} tasks for ${jobType} cleaning of ${buildingType}`);
  };

  const getEmployeeWorkHistory = async (employeeId: string) => {
    try {
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('assignedTo', '==', employeeId),
        where('status', '==', 'Completed'),
        orderBy('completedAt', 'desc'),
        limit(10)
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      
      let totalRating = 0;
      let ratingCount = 0;
      let lastJobDate = null;
      
      jobsSnapshot.docs.forEach(doc => {
        const job = doc.data();
        if (job.clientRating) {
          totalRating += job.clientRating;
          ratingCount++;
        }
        if (!lastJobDate && job.completedAt) {
          lastJobDate = job.completedAt.toDate();
        }
      });
      
      return {
        avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        totalJobs: jobsSnapshot.docs.length,
        lastJobDate
      };
    } catch (error) {
      return { avgRating: 0, totalJobs: 0, lastJobDate: null };
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateSuitabilityScore = (employee: Employee, job: any, currentTasks: Task[]) => {
    const weights = {
      distance: 25,
      availability: 20,
      experience: 20,
      feedback: 15,
      workload: 10,
      recency: 10
    };
    
    const breakdown = {
      distance: 0,
      availability: 0,
      experience: 0,
      feedback: 0,
      workload: 0,
      recency: 0
    };
    
    // Distance Score (0-100)
    if (job.latitude && job.longitude && employee.latitude && employee.longitude) {
      const distance = calculateDistance(job.latitude, job.longitude, employee.latitude, employee.longitude);
      breakdown.distance = Math.max(0, 100 - (distance * 2)); // Closer = higher score
    } else {
      breakdown.distance = 50; // Neutral if no location data
    }
    
    // Availability Score (0-100)
    breakdown.availability = employee.availability?.available ? 100 : 0;
    
    // Experience Score (0-100)
    const requiredSkills = currentTasks.flatMap(task => task.requiredSkills);
    const skillsMatch = employee.skills?.filter(skill => requiredSkills.includes(skill)).length || 0;
    const skillsScore = requiredSkills.length > 0 ? (skillsMatch / requiredSkills.length) * 100 : 50;
    const jobsScore = Math.min(100, (employee.totalJobs || 0) * 5); // 5 points per completed job, max 100
    breakdown.experience = (skillsScore + jobsScore) / 2;
    
    // Feedback Score (0-100)
    breakdown.feedback = employee.avgRating ? (employee.avgRating / 5) * 100 : 50;
    
    // Workload Score (0-100) - Lower workload = higher score
    breakdown.workload = Math.max(0, 100 - (employee.workload || 0));
    
    // Recency Score (0-100)
    if (employee.lastJobDate) {
      const daysSinceLastJob = (Date.now() - employee.lastJobDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastJob < 1) {
        breakdown.recency = 70; // Recently worked, slightly lower
      } else if (daysSinceLastJob > 7) {
        breakdown.recency = 100; // Been a while, prioritize
      } else {
        breakdown.recency = 85; // Good balance
      }
    } else {
      breakdown.recency = 90; // New employee, give chance
    }
    
    // Calculate weighted total
    const totalScore = Math.round(
      (breakdown.distance * weights.distance +
       breakdown.availability * weights.availability +
       breakdown.experience * weights.experience +
       breakdown.feedback * weights.feedback +
       breakdown.workload * weights.workload +
       breakdown.recency * weights.recency) / 100
    );
    
    return { totalScore, breakdown };
  };

  const autoAssignTasksToEmployees = (tasks: Task[], assignedEmployees: any[]) => {
    if (assignedEmployees.length === 0) return tasks;
    
    return tasks.map((task, index) => {
      // Try skill-based assignment first
      const skillMatchEmployees = assignedEmployees.filter(emp => {
        const employee = employees.find(e => e.id === emp.id);
        return employee?.skills?.some(skill => task.requiredSkills.includes(skill));
      });
      
      let assignedEmployee;
      if (skillMatchEmployees.length > 0) {
        assignedEmployee = skillMatchEmployees[index % skillMatchEmployees.length];
      } else {
        assignedEmployee = assignedEmployees[index % assignedEmployees.length];
      }
      
      return {
        ...task,
        assignedTo: assignedEmployee.id,
        assignedToName: assignedEmployee.name,
        status: 'pending',
        assignedAt: new Date()
      };
    });
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
      const newAssignments = { ...taskAssignments };
      Object.keys(newAssignments).forEach(taskId => {
        newAssignments[taskId] = newAssignments[taskId].filter(id => id !== employeeId);
      });
      setTaskAssignments(newAssignments);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const assignTaskToEmployee = (taskId: string, employeeId: string) => {
    const newTasks = tasks.map(task => {
      if (task.id === taskId) {
        const employee = employees.find(e => e.id === employeeId);
        return {
          ...task,
          assignedTo: employeeId,
          assignedToName: employee?.name || 'Unknown',
          assignedAt: new Date()
        };
      }
      return task;
    });
    setTasks(newTasks);
  };

  const saveAllocation = async () => {
    try {
      const assignedEmployees = Array.from(selectedEmployees).map(empId => {
        const emp = employees.find(e => e.id === empId);
        return { id: empId, name: emp?.name || 'Unknown' };
      });

      const updatedTasks = tasks.map(task => ({
        ...task,
        assignedTo: taskAssignments[task.id] || []
      }));

      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      
      // Get the actual document ID (strip guest_ prefix if present)
      const actualJobId = (jobId as string).startsWith('guest_') ? 
        (jobId as string).replace('guest_', '') : 
        jobId as string;
      
      console.log('Saving allocation - jobId:', jobId, 'actualJobId:', actualJobId, 'collection:', collection_name);
      
      // Auto-assign employees to tasks
      const autoAssignedTasks = autoAssignTasksToEmployees(updatedTasks, assignedEmployees);
      
      // Use jobService for consistent assignment logic
      if (collection_name === 'jobs') {
        await jobService.assignEmployees(actualJobId, assignedEmployees);
        await jobService.updateTasks(actualJobId, autoAssignedTasks);
      } else {
        // For guest bookings, update directly
        await updateDoc(doc(db, collection_name, actualJobId), {
          assignedEmployees: assignedEmployees.map(emp => ({ ...emp, status: 'pending', assignedAt: new Date() })),
          tasks: autoAssignedTasks,
          status: 'Schedule-Pending',
          updatedAt: new Date()
        });
      }
      
      // Store allocation audit trail (optional, remove if permissions issue)
      try {
        await addDoc(collection(db, 'jobAllocations'), {
          jobId: actualJobId,
          assignedEmployees,
          allocatedBy: user?.uid || 'admin',
          allocatedAt: new Date(),
          allocationMethod: 'manual'
        });
      } catch (auditError) {
        console.log('Audit trail skipped:', auditError);
      }

      Alert.alert('Success', 'Employees allocated and awaiting confirmation', [
        { text: 'OK', onPress: () => router.push('/(admin-tabs)/jobs') }
      ]);
    } catch (error) {
      console.error('Error saving allocation:', error);
      Alert.alert('Error', 'Failed to save allocation');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };
  
  const getMatchLevel = (score: number) => {
    if (score >= 85) return 'Ideal Match';
    if (score >= 70) return 'Good Fit';
    if (score >= 50) return 'Possible';
    return 'Poor Fit';
  };

  const renderEmployee = ({ item: employee }: { item: Employee }) => {
    const score = employee.suitabilityScore || 0;
    const isIdealMatch = score >= 85;
    const isAlreadyAssigned = job?.assignedEmployees?.some(emp => emp.id === employee.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.employeeCard,
          selectedEmployees.has(employee.id) && styles.employeeCardSelected,
          isIdealMatch && styles.idealMatchCard,
          isAlreadyAssigned && styles.alreadyAssignedCard
        ]}
        onPress={() => toggleEmployeeSelection(employee.id)}
      >
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.employeeName}>{employee.name}</Text>
              {isAlreadyAssigned && <Text style={styles.assignedBadge}>✅ ASSIGNED</Text>}
              {isIdealMatch && !isAlreadyAssigned && <Text style={styles.idealBadge}>⭐ IDEAL</Text>}
            </View>
            <Text style={styles.employeeContact}>{employee.phone || employee.email}</Text>
            <Text style={styles.matchLevel} style={{ color: getScoreColor(score) }}>
              {getMatchLevel(score)}
            </Text>
          </View>
          <View style={[styles.scoreContainer, { backgroundColor: getScoreColor(score) + '20' }]}>
            <Text style={[styles.scoreText, { color: getScoreColor(score) }]}>{score}</Text>
            <Text style={styles.scoreLabel}>Score</Text>
          </View>
        </View>
        
        {/* Key Factors */}
        <View style={styles.factorsContainer}>
          <View style={styles.factorRow}>
            <View style={styles.factor}>
              <Feather name="map-pin" size={12} color="#6b7280" />
              <Text style={styles.factorText}>
                {job?.latitude && employee.latitude ? 
                  `${calculateDistance(job.latitude, job.longitude, employee.latitude, employee.longitude).toFixed(1)}km` : 
                  'No location'
                }
              </Text>
            </View>
            <View style={styles.factor}>
              <MaterialIcons name="star" size={12} color="#f59e0b" />
              <Text style={styles.factorText}>
                {employee.avgRating ? `${employee.avgRating.toFixed(1)}/5` : 'No ratings'}
              </Text>
            </View>
            <View style={styles.factor}>
              <MaterialIcons name="work" size={12} color="#8b5cf6" />
              <Text style={styles.factorText}>{employee.totalJobs || 0} jobs</Text>
            </View>
          </View>
          <View style={styles.factorRow}>
            <View style={styles.factor}>
              <MaterialIcons name="schedule" size={12} color="#10b981" />
              <Text style={styles.factorText}>
                {employee.lastJobDate ? 
                  `${Math.floor((Date.now() - employee.lastJobDate.getTime()) / (1000 * 60 * 60 * 24))}d ago` : 
                  'New employee'
                }
              </Text>
            </View>
            <View style={styles.factor}>
              <MaterialIcons name="trending-up" size={12} color="#ef4444" />
              <Text style={styles.factorText}>Load: {employee.workload || 0}%</Text>
            </View>
          </View>
        </View>
        
        {/* Skills */}
        {employee.skills && employee.skills.length > 0 && (
          <View style={styles.skillsContainer}>
            {employee.skills.slice(0, 4).map((skill, index) => (
              <View key={index} style={styles.skillBadge}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {employee.skills.length > 4 && (
              <Text style={styles.moreSkills}>+{employee.skills.length - 4}</Text>
            )}
          </View>
        )}
        
        {/* Score Breakdown Toggle */}
        {showScoreBreakdown && employee.scoreBreakdown && (
          <View style={styles.scoreBreakdown}>
            <Text style={styles.breakdownTitle}>Score Breakdown:</Text>
            <View style={styles.breakdownGrid}>
              <Text style={styles.breakdownItem}>Distance: {Math.round(employee.scoreBreakdown.distance)}</Text>
              <Text style={styles.breakdownItem}>Available: {Math.round(employee.scoreBreakdown.availability)}</Text>
              <Text style={styles.breakdownItem}>Experience: {Math.round(employee.scoreBreakdown.experience)}</Text>
              <Text style={styles.breakdownItem}>Feedback: {Math.round(employee.scoreBreakdown.feedback)}</Text>
              <Text style={styles.breakdownItem}>Workload: {Math.round(employee.scoreBreakdown.workload)}</Text>
              <Text style={styles.breakdownItem}>Recency: {Math.round(employee.scoreBreakdown.recency)}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTask = ({ item: task }: { item: Task }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleRow}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <TouchableOpacity 
            style={styles.taskDetailButton}
            onPress={() => setSelectedTask(task)}
          >
            <MaterialIcons name="info-outline" size={16} color="#4facfe" />
          </TouchableOpacity>
        </View>
        {task.priority && (
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
            <Text style={styles.priorityText}>{task.priority}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.taskDescription}>{task.description}</Text>
      
      <View style={styles.taskMeta}>
        <View style={styles.metaItem}>
          <MaterialIcons name="schedule" size={14} color="#6b7280" />
          <Text style={styles.taskDuration}>{task.estimatedDuration} min</Text>
        </View>
        {task.equipment && task.equipment.length > 0 && (
          <View style={styles.metaItem}>
            <MaterialIcons name="build" size={14} color="#6b7280" />
            <Text style={styles.equipmentCount}>{task.equipment.length} tools</Text>
          </View>
        )}
        {task.videoLinks && task.videoLinks.length > 0 && (
          <View style={styles.metaItem}>
            <MaterialIcons name="play-circle-outline" size={14} color="#6b7280" />
            <Text style={styles.videoCount}>{task.videoLinks.length} videos</Text>
          </View>
        )}
      </View>
      
      <View style={styles.taskAssignments}>
        <Text style={styles.assignmentLabel}>Assigned to:</Text>
        {task.assignedToName ? (
          <View style={styles.currentAssignment}>
            <Text style={styles.assignedEmployeeName}>👤 {task.assignedToName}</Text>
            <TouchableOpacity 
              style={styles.reassignButton}
              onPress={() => {
                const newTasks = tasks.map(t => 
                  t.id === task.id ? { ...t, assignedTo: null, assignedToName: null } : t
                );
                setTasks(newTasks);
              }}
            >
              <Text style={styles.reassignText}>Unassign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.assignmentButtons}>
            {Array.from(selectedEmployees).map(empId => {
              const employee = employees.find(e => e.id === empId);
              return (
                <TouchableOpacity
                  key={empId}
                  style={styles.assignmentButton}
                  onPress={() => assignTaskToEmployee(task.id, empId)}
                >
                  <Text style={styles.assignmentButtonText}>
                    {employee?.name || 'Unknown'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(admin-tabs)/jobs')} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Employee Allocation</Text>
          <Text style={styles.headerSubtitle}>{job?.title}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowScoreBreakdown(!showScoreBreakdown)} style={styles.toggleButton}>
            <MaterialIcons name="analytics" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={autoGenerateTasks} style={styles.generateButton}>
            <MaterialIcons name="auto-fix-high" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={saveAllocation} style={styles.saveButton}>
            <MaterialIcons name="save" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Employees ({selectedEmployees.size})</Text>
            <View style={styles.filters}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Available Only</Text>
                <Switch
                  value={showAvailableOnly}
                  onValueChange={setShowAvailableOnly}
                  trackColor={{ false: '#d1d5db', true: '#4facfe' }}
                  thumbColor={showAvailableOnly ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>
          <FlatList
            data={employees.filter(emp => 
              !showAvailableOnly || emp.availability?.available
            )}
            renderItem={renderEmployee}
            keyExtractor={(item) => `alloc_employee_${item.id}`}
            horizontal={false}
            scrollEnabled={false}
          />
        </View>

        {selectedEmployees.size > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assign Tasks</Text>
            <FlatList
              data={tasks}
              renderItem={renderTask}
              keyExtractor={(item) => `task_${item.id}`}
              scrollEnabled={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Task Detail Modal */}
      <Modal
        visible={selectedTask !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.taskDetailModal}>
            <View style={styles.taskDetailHeader}>
              <Text style={styles.taskDetailTitle}>{selectedTask?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <AntDesign name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.taskDetailContent}>
              <View style={styles.taskDetailSection}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.sectionText}>{selectedTask?.description}</Text>
              </View>
              
              {selectedTask?.instructions && (
                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
                  <Text style={styles.sectionText}>{selectedTask.instructions}</Text>
                </View>
              )}
              
              <View style={styles.taskDetailSection}>
                <Text style={styles.sectionTitle}>Task Details</Text>
                <View style={styles.detailRow}>
                  <MaterialIcons name="schedule" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>Duration: {selectedTask?.estimatedDuration} minutes</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="flag" size={16} color={getPriorityColor(selectedTask?.priority)} />
                  <Text style={styles.detailText}>Priority: {selectedTask?.priority || 'Medium'}</Text>
                </View>
              </View>
              
              {selectedTask?.equipment && selectedTask.equipment.length > 0 && (
                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionTitle}>Required Equipment</Text>
                  {selectedTask.equipment.map((item, index) => (
                    <View key={index} style={styles.equipmentItem}>
                      <MaterialIcons name="build" size={14} color="#8b5cf6" />
                      <Text style={styles.equipmentText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              
              {selectedTask?.requiredSkills && selectedTask.requiredSkills.length > 0 && (
                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionTitle}>Required Skills</Text>
                  <View style={styles.skillsContainer}>
                    {selectedTask.requiredSkills.map((skill, index) => (
                      <View key={index} style={styles.skillBadge}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {selectedTask?.videoLinks && selectedTask.videoLinks.length > 0 && (
                <View style={styles.taskDetailSection}>
                  <Text style={styles.sectionTitle}>Training Videos</Text>
                  {selectedTask.videoLinks.map((link, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.videoLink}
                      onPress={() => Linking.openURL(link)}
                    >
                      <MaterialIcons name="play-circle-outline" size={20} color="#ef4444" />
                      <Text style={styles.videoLinkText}>Training Video {index + 1}</Text>
                      <MaterialIcons name="open-in-new" size={16} color="#6b7280" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'High': return '#ef4444';
    case 'Medium': return '#f59e0b';
    case 'Low': return '#10b981';
    default: return '#6b7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  generateButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
  },
  employeeCardSelected: {
    borderColor: '#4facfe',
    backgroundColor: '#eff6ff',
  },
  idealMatchCard: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
    borderWidth: 3,
  },
  alreadyAssignedCard: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
  },
  assignedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  employeeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  idealBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  employeeContact: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  matchLevel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'center',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  skillBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skillText: {
    fontSize: 10,
    color: '#4338ca',
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  factorsContainer: {
    marginVertical: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  factorText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  scoreBreakdown: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownItem: {
    fontSize: 10,
    color: '#6b7280',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filters: {
    alignItems: 'flex-end',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  toggleButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  taskDuration: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '500',
    marginBottom: 12,
  },
  taskAssignments: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  assignmentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  assignmentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assignmentButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  assignmentButtonActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  assignmentButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  assignmentButtonTextActive: {
    color: '#fff',
  },
  currentAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  assignedEmployeeName: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  reassignButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reassignText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  taskDetailButton: {
    padding: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  equipmentCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  videoCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskDetailModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 8,
  },
  taskDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  taskDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  taskDetailContent: {
    padding: 20,
  },
  taskDetailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  equipmentText: {
    fontSize: 14,
    color: '#6b7280',
  },
  videoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  videoLinkText: {
    fontSize: 14,
    color: '#4facfe',
    fontWeight: '500',
    flex: 1,
  },
});