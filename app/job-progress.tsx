import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc as firestoreDoc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import * as Location from 'expo-location';

import { auth, db } from "../config/firebase";
import { firebaseImageService } from "../services/firebaseImageService";

export default function JobProgressPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [totalEstimatedTime, setTotalEstimatedTime] = useState(7200); // Default 2 hours
  const [completedTasks, setCompletedTasks] = useState([]);
  const [taskIssues, setTaskIssues] = useState({});
  const [taskPhotos, setTaskPhotos] = useState({});
  const [jobStarted, setJobStarted] = useState(false);
  const [jobStartTime, setJobStartTime] = useState(null);
  const isAdminView = params.adminView === 'true';

  const [tasks, setTasks] = useState([]);
  const [job, setJob] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(null);
  const [taskNote, setTaskNote] = useState('');
  const [isJobCompleted, setIsJobCompleted] = useState(false);
  const [employeeLocation, setEmployeeLocation] = useState(null);
  const [distanceToJob, setDistanceToJob] = useState(null);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);

  // Load job data including tasks
  useEffect(() => {
    if (!params.jobId) return;

    // Check if user is authenticated before setting up Firestore listener
    if (!auth.currentUser) {
      console.log('Job progress: No authenticated user, skipping Firestore listener');
      return;
    }

    // Try jobs collection first
    const jobDoc = firestoreDoc(db, "jobs", params.jobId as string);
    const unsubscribe = onSnapshot(jobDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          const jobData = { id: docSnap.id, ...docSnap.data() };
          console.log('Job data loaded from jobs:', jobData.status, 'Tasks count:', jobData.tasks?.length || 0);
          setJob(jobData);
          
          // Check if job is completed - prevent any timer/restart functionality
          const completed = jobData.status === 'Completed';
          setIsJobCompleted(completed);
          
          if (completed) {
            console.log('Job is completed - disabling timer and interactions');
            setJobStarted(false);
            setJobStartTime(null);
          }
          
          const jobTasks = jobData.tasks || [];
          console.log('Raw job tasks:', jobTasks);
          console.log('Job data keys:', Object.keys(jobData));
          console.log('Full job data:', JSON.stringify(jobData, null, 2));
          // Ensure tasks have proper structure for display
          const formattedTasks = jobTasks.map(task => ({
            ...task,
            title: task.title || 'Unnamed Task',
            description: task.description || task.title || 'No description',
            estimatedTime: typeof task.estimatedTime === 'number' ? `${task.estimatedTime} min` : (task.estimatedTime || '30 min'),
            requiresPhoto: task.requiresPhoto || false
          }));
          
          console.log('Formatted tasks:', formattedTasks.length, formattedTasks);
          
          // Always ensure tasks are set - either from job data or defaults
          if (!jobTasks || jobTasks.length === 0) {
            console.log('No tasks found in job data - using defaults');
            const defaultTasks = [
              { id: 'task_1', title: 'Vacuum all carpeted areas', description: 'Thoroughly vacuum all carpets and rugs', estimatedTime: '30 min', completed: false, requiresPhoto: false },
              { id: 'task_2', title: 'Mop hard floors', description: 'Clean and mop all hard floor surfaces', estimatedTime: '25 min', completed: false, requiresPhoto: false },
              { id: 'task_3', title: 'Clean bathrooms', description: 'Clean toilets, sinks, mirrors, and floors', estimatedTime: '45 min', completed: false, requiresPhoto: true },
              { id: 'task_4', title: 'Dust surfaces', description: 'Dust all furniture and surfaces', estimatedTime: '20 min', completed: false, requiresPhoto: false }
            ];
            setTasks(defaultTasks);
          } else {
            setTasks(formattedTasks);
          }
          
          // Calculate total estimated time - use job's estimatedDuration or calculate from tasks
          let totalSeconds = 7200; // Default 2 hours
          
          if (jobData.estimatedDuration) {
            // Use job's estimated duration if available
            totalSeconds = jobData.estimatedDuration * 60; // Convert minutes to seconds
          } else {
            // Calculate from tasks
            const tasksToUse = formattedTasks.length > 0 ? formattedTasks : [
              { estimatedTime: '30 min' },
              { estimatedTime: '25 min' },
              { estimatedTime: '45 min' },
              { estimatedTime: '20 min' }
            ];
            
            const totalMinutes = tasksToUse.reduce((total, task) => {
              let minutes = 0;
              if (typeof task.estimatedTime === 'string') {
                minutes = parseInt(task.estimatedTime.match(/\d+/)?.[0] || '0');
              } else if (typeof task.estimatedTime === 'number') {
                minutes = task.estimatedTime;
              }
              return total + minutes;
            }, 0);
            totalSeconds = totalMinutes * 60;
          }
          
          setTotalEstimatedTime(totalSeconds);
          
          // Set completed tasks from job data
          const completedTaskIds = jobTasks.filter(task => task.completed).map(task => task.id) || [];
          setCompletedTasks(completedTaskIds);
          
          // Only set job start time if job is not completed and has startedAt
          if (jobData.startedAt && !completed) {
            setJobStartTime(jobData.startedAt.toDate());
            setJobStarted(true);
          }
        } else {
          // Try guest-bookings collection
          const guestDoc = firestoreDoc(db, "guest-bookings", params.jobId as string);
          const unsubscribeGuest = onSnapshot(guestDoc,
            (guestDocSnap) => {
              if (guestDocSnap.exists()) {
                const jobData = { id: guestDocSnap.id, ...guestDocSnap.data(), bookingType: 'guest' };
                console.log('Job data loaded from guest-bookings:', jobData.status, 'Tasks count:', jobData.tasks?.length || 0);
                setJob(jobData);
                
                // Process job data same as above...
                const completed = jobData.status === 'Completed';
                setIsJobCompleted(completed);
                
                if (completed) {
                  console.log('Job is completed - disabling timer and interactions');
                  setJobStarted(false);
                  setJobStartTime(null);
                }
                
                const jobTasks = jobData.tasks || [];
                const formattedTasks = jobTasks.map(task => ({
                  ...task,
                  title: task.title || 'Unnamed Task',
                  description: task.description || task.title || 'No description',
                  estimatedTime: typeof task.estimatedTime === 'number' ? `${task.estimatedTime} min` : (task.estimatedTime || '30 min'),
                  requiresPhoto: task.requiresPhoto || false
                }));
                
                if (!jobTasks || jobTasks.length === 0) {
                  const defaultTasks = [
                    { id: 'task_1', title: 'Vacuum all carpeted areas', description: 'Thoroughly vacuum all carpets and rugs', estimatedTime: '30 min', completed: false, requiresPhoto: false },
                    { id: 'task_2', title: 'Mop hard floors', description: 'Clean and mop all hard floor surfaces', estimatedTime: '25 min', completed: false, requiresPhoto: false },
                    { id: 'task_3', title: 'Clean bathrooms', description: 'Clean toilets, sinks, mirrors, and floors', estimatedTime: '45 min', completed: false, requiresPhoto: true },
                    { id: 'task_4', title: 'Dust surfaces', description: 'Dust all furniture and surfaces', estimatedTime: '20 min', completed: false, requiresPhoto: false }
                  ];
                  setTasks(defaultTasks);
                } else {
                  setTasks(formattedTasks);
                }
                
                let totalSeconds = 7200;
                if (jobData.estimatedDuration) {
                  totalSeconds = jobData.estimatedDuration * 60;
                } else {
                  const tasksToUse = formattedTasks.length > 0 ? formattedTasks : [
                    { estimatedTime: '30 min' },
                    { estimatedTime: '25 min' },
                    { estimatedTime: '45 min' },
                    { estimatedTime: '20 min' }
                  ];
                  
                  const totalMinutes = tasksToUse.reduce((total, task) => {
                    let minutes = 0;
                    if (typeof task.estimatedTime === 'string') {
                      minutes = parseInt(task.estimatedTime.match(/\d+/)?.[0] || '0');
                    } else if (typeof task.estimatedTime === 'number') {
                      minutes = task.estimatedTime;
                    }
                    return total + minutes;
                  }, 0);
                  totalSeconds = totalMinutes * 60;
                }
                
                setTotalEstimatedTime(totalSeconds);
                
                const completedTaskIds = jobTasks.filter(task => task.completed).map(task => task.id) || [];
                setCompletedTasks(completedTaskIds);
                
                if (jobData.startedAt && !completed) {
                  setJobStartTime(jobData.startedAt.toDate());
                  setJobStarted(true);
                }
              }
            },
            (error) => {
              console.error('Guest booking progress error:', error);
            }
          );
          return unsubscribeGuest;
        }
      },
      (error) => {
        console.error('Job progress error:', error);
        // Don't show error if user is logging out
        if (!auth.currentUser) {
          console.log('Job progress: Ignoring error during logout');
          return;
        }
      }
    );

    return () => unsubscribe();
  }, [params.jobId]);

  useEffect(() => {
    if (!isAdminView && job && job.status !== 'Completed' && !isJobCompleted) {
      setupLocationTracking();
    }
  }, [isAdminView, job, isJobCompleted]);

  const setupLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 50, // Update every 50 meters
        },
        (location) => {
          setEmployeeLocation(location.coords);
          
          if (job?.latitude && job?.longitude) {
            const distance = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              job.latitude,
              job.longitude
            );
            setDistanceToJob(distance);
            
            // Auto-start job if within 100 meters and not already started
            if (distance <= 0.1 && !jobStarted && job.status !== 'In Progress') {
              setAutoStartEnabled(true);
              Alert.alert(
                'Arrived at Job Site',
                'You are now at the job location. Would you like to start the job?',
                [
                  { text: 'Not Yet', style: 'cancel' },
                  { text: 'Start Job', onPress: startJob }
                ]
              );
            }
          }
        }
      );

      return () => {
        locationSubscription.remove();
      };
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    let interval;
    if (jobStarted && jobStartTime && !isJobCompleted && job?.status !== 'Completed') {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - jobStartTime) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobStarted, jobStartTime, isJobCompleted, job?.status]);

  const startJob = async () => {
    if (job?.status === 'Completed' || isJobCompleted) {
      console.log('Attempted to start completed job - blocking');
      Alert.alert('Job Already Completed', 'This job has been completed and cannot be restarted.');
      return;
    }
    
    try {
      const startTime = new Date();
      const collectionName = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      await updateDoc(firestoreDoc(db, collectionName, params.jobId as string), {
        status: "In Progress",
        progress: 10,
        startedAt: startTime,
        updatedAt: startTime,
      });
      setJobStartTime(startTime);
      setJobStarted(true);
    } catch (error) {
      Alert.alert("Error", "Failed to start job");
    }
  };

  const toggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const isCompleted = completedTasks.includes(taskId);
    
    if (isCompleted) {
      // Mark as incomplete
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, completed: false, completedAt: null } : t
      );
      setCompletedTasks(completedTasks.filter(id => id !== taskId));
      
      try {
        const collectionName = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
        await updateDoc(firestoreDoc(db, collectionName, params.jobId as string), {
          tasks: updatedTasks,
          updatedAt: new Date(),
          lastTaskUpdate: new Date(), // For live updates
        });
      } catch (error) {
        Alert.alert("Error", "Failed to update task status");
      }
    } else {
      // Check if photo is required and not provided
      if (task?.requiresPhoto && !taskPhotos[taskId]) {
        Alert.alert(
          "Photo Required", 
          "This task requires a photo to be completed. Please take a photo first.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Take Photo", onPress: () => handleTaskPhoto(taskId) }
          ]
        );
        return;
      }
      
      // Mark as completed
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, completed: true, completedAt: new Date() } : t
      );
      setCompletedTasks([...completedTasks, taskId]);
      
      try {
        const collectionName = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
        await updateDoc(firestoreDoc(db, collectionName, params.jobId as string), {
          tasks: updatedTasks,
          updatedAt: new Date(),
          lastTaskUpdate: new Date(), // For live updates
          progress: Math.round((updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 100)
        });
      } catch (error) {
        Alert.alert("Error", "Failed to update task status");
      }
    }
  };

  const handleTaskIssue = (taskId) => {
    setShowTaskModal(taskId);
    setTaskNote(taskIssues[taskId] || '');
  };

  const saveTaskIssue = () => {
    if (taskNote.trim()) {
      setTaskIssues({...taskIssues, [showTaskModal]: taskNote.trim()});
      Alert.alert("Issue Reported", "Task issue has been reported to admin.");
    }
    setShowTaskModal(null);
    setTaskNote('');
  };

  const handleTaskPhoto = (taskId) => {
    router.push({
      pathname: '/job-attachments',
      params: {
        jobId: params.jobId,
        jobTitle: params.jobTitle,
        taskId: taskId,
        taskName: tasks.find(t => t.id === taskId)?.title
      }
    });
  };

  const requestAdditionalTask = () => {
    router.push({
      pathname: '/request-work',
      params: {
        jobId: params.jobId,
        jobTitle: params.jobTitle,
        client: params.client,
        address: params.address
      }
    });
  };

  const completeJob = async () => {
    Alert.alert(
      "Complete Job?",
      "Are you sure you want to mark this job as completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              const collectionName = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
              await updateDoc(firestoreDoc(db, collectionName, params.jobId as string), {
                status: "Completed",
                progress: 100,
                completedAt: new Date(),
                updatedAt: new Date(),
              });
              Alert.alert("Success", "Job completed!", [
                { text: "OK", onPress: () => router.push("/(employee-tabs)/jobs") }
              ]);
            } catch (error) {
              Alert.alert("Error", "Failed to complete job");
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = () => {
    const remaining = totalEstimatedTime - timeElapsed;
    return Math.max(0, remaining);
  };
  
  const getOvertimeAmount = () => {
    const remaining = totalEstimatedTime - timeElapsed;
    return remaining < 0 ? Math.abs(remaining) : 0;
  };

  const getTimeStatus = () => {
    const timeRemaining = getTimeRemaining();
    const overtimeAmount = getOvertimeAmount();
    const percentageUsed = totalEstimatedTime > 0 ? (timeElapsed / totalEstimatedTime) : 0;
    
    if (overtimeAmount > 0) {
      return {
        status: 'overtime',
        color: '#ef4444',
        text: 'OVERTIME',
        icon: 'exclamationcircle'
      };
    } else if (percentageUsed > 0.8) {
      return {
        status: 'warning',
        color: '#f59e0b',
        text: 'RUNNING LATE',
        icon: 'clockcircle'
      };
    }
    return {
      status: 'normal',
      color: '#10b981',
      text: 'ON TIME',
      icon: 'checkcircle'
    };
  };

  const progressPercentage = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  // If job is completed, show completed view
  if (isJobCompleted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
        
        <LinearGradient colors={["#38ef7d", "#11998e"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{params.jobTitle}</Text>
            <Text style={styles.headerSubtitle}>Job Completed</Text>
          </View>
          
          <View style={styles.completeButton}>
            <AntDesign name="checkcircle" size={20} color="#fff" />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.completedCard}>
            <AntDesign name="checkcircle" size={48} color="#38ef7d" />
            <Text style={styles.completedTitle}>Job Completed!</Text>
            <Text style={styles.completedSubtitle}>This job has been successfully completed.</Text>
          </View>
          
          {/* Show tasks in read-only mode */}
          <View style={styles.tasksContainer}>
            <Text style={styles.tasksTitle}>Completed Tasks</Text>
            {tasks.map((task, index) => (
              <View key={task.id} style={[styles.taskCard, styles.taskCardCompleted]}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskLeft}>
                    <View style={[styles.taskNumber, styles.taskNumberCompleted]}>
                      <AntDesign name="check" size={16} color="#fff" />
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTitle, styles.taskTitleCompleted]}>
                        {task.title}
                      </Text>
                      <Text style={styles.taskTime}>{task.estimatedTime}</Text>
                    </View>
                  </View>
                  <AntDesign name="checkcircle" size={24} color="#10b981" />
                </View>
                <Text style={[styles.taskDescription, styles.taskDescriptionCompleted]}>
                  {task.description}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{params.jobTitle}</Text>
          <Text style={styles.headerSubtitle}>
            {isAdminView ? `👁️ Admin View • ${params.client}` : params.client}
          </Text>
        </View>
        
        <TouchableOpacity onPress={completeJob} style={styles.completeButton}>
          <AntDesign name="check" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Job Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedTasks.length} of {tasks.length} tasks completed
          </Text>
        </View>

        {/* Timer Card */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <AntDesign name={getTimeStatus().icon} size={24} color={getTimeStatus().color} />
            <Text style={styles.timerTitle}>
              {isAdminView ? 'Time Elapsed' : (getOvertimeAmount() > 0 ? 'Overtime' : 'Time Remaining')}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getTimeStatus().color }]}>
              <Text style={styles.statusText}>{getTimeStatus().text}</Text>
            </View>
          </View>
          <Text style={[styles.timerText, { color: getTimeStatus().color }]}>
            {isAdminView ? formatTime(timeElapsed) : 
             (getOvertimeAmount() > 0 ? `+${formatTime(getOvertimeAmount())}` : formatTime(getTimeRemaining()))}
          </Text>
          <Text style={styles.timerSubtext}>
            {isAdminView ? 
              `Started: ${jobStartTime ? jobStartTime.toLocaleTimeString() : 'Unknown'}` :
              `Estimated total: ${formatTime(totalEstimatedTime)}`
            }
          </Text>
          
          {/* Location Status for Employee */}
          {!isAdminView && distanceToJob !== null && (
            <View style={styles.locationStatus}>
              <AntDesign name="enviromento" size={16} color={distanceToJob <= 0.1 ? '#10b981' : '#f59e0b'} />
              <Text style={[styles.locationText, { color: distanceToJob <= 0.1 ? '#10b981' : '#f59e0b' }]}>
                {distanceToJob <= 0.1 ? 'At job site' : `${distanceToJob.toFixed(1)}km away`}
              </Text>
            </View>
          )}
        </View>

        {/* Tasks List */}
        <View style={styles.tasksContainer}>
          <Text style={styles.tasksTitle}>Task Checklist</Text>
          {tasks.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                completedTasks.includes(task.id) && styles.taskCardCompleted,
                taskIssues[task.id] && styles.taskCardIssue
              ]}
            >
              <TouchableOpacity onPress={() => toggleTask(task.id)}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskLeft}>
                    <View style={[
                      styles.taskNumber,
                      completedTasks.includes(task.id) && styles.taskNumberCompleted,
                      taskIssues[task.id] && styles.taskNumberIssue
                    ]}>
                      {completedTasks.includes(task.id) ? (
                        <AntDesign name="check" size={16} color="#fff" />
                      ) : taskIssues[task.id] ? (
                        <AntDesign name="exclamation" size={16} color="#fff" />
                      ) : (
                        <Text style={styles.taskNumberText}>{index + 1}</Text>
                      )}
                    </View>
                    <View style={styles.taskInfo}>
                      <View style={styles.taskTitleRow}>
                        <Text style={[
                          styles.taskTitle,
                          completedTasks.includes(task.id) && styles.taskTitleCompleted
                        ]}>
                          {task.title}
                        </Text>
                        {task.requiresPhoto && (
                          <AntDesign name="camera" size={14} color="#4facfe" />
                        )}
                      </View>
                      <Text style={styles.taskTime}>{task.estimatedTime}</Text>
                      {task.assignedToName && (
                        <Text style={styles.taskAssignee}>👤 {task.assignedToName}</Text>
                      )}
                      {taskIssues[task.id] && (
                        <Text style={styles.taskIssueText}>⚠️ Issue reported</Text>
                      )}
                    </View>
                  </View>
                  <AntDesign 
                    name={completedTasks.includes(task.id) ? "checkcircle" : "checkcircleo"} 
                    size={24} 
                    color={completedTasks.includes(task.id) ? "#10b981" : "#d1d5db"} 
                  />
                </View>
                <Text style={[
                  styles.taskDescription,
                  completedTasks.includes(task.id) && styles.taskDescriptionCompleted
                ]}>
                  {task.description}
                </Text>
              </TouchableOpacity>
              
              {/* Task Actions */}
              {!isAdminView && (
                <View style={styles.taskActions}>
                  {task.requiresPhoto && (
                    <TouchableOpacity 
                      style={[styles.taskActionButton, styles.photoButton]}
                      onPress={() => handleTaskPhoto(task.id)}
                    >
                      <AntDesign name="camera" size={14} color="#4facfe" />
                      <Text style={styles.taskActionText}>Photo</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.taskActionButton, styles.issueButton]}
                    onPress={() => handleTaskIssue(task.id)}
                  >
                    <AntDesign name="exclamationcircleo" size={14} color="#ef4444" />
                    <Text style={styles.taskActionText}>Issue</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Admin View - Show Photos */}
              {isAdminView && task.requiresPhoto && (
                <View style={styles.adminPhotoSection}>
                  <Text style={styles.adminPhotoLabel}>📷 Employee Photos:</Text>
                  <TouchableOpacity 
                    style={styles.viewPhotosButton}
                    onPress={() => router.push({
                      pathname: '/job-attachments',
                      params: {
                        jobId: params.jobId,
                        taskId: task.id,
                        adminView: 'true'
                      }
                    })}
                  >
                    <Text style={styles.viewPhotosText}>View Photos</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Job Actions */}
        {!isAdminView && (
          <View style={styles.jobActions}>
            <TouchableOpacity 
              style={styles.mediaButton}
              onPress={() => router.push({
                pathname: '/job-attachments',
                params: {
                  jobId: params.jobId,
                  jobTitle: params.jobTitle
                }
              })}
            >
              <AntDesign name="picture" size={20} color="#4facfe" />
              <Text style={styles.mediaButtonText}>Add Photos/Videos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.additionalWorkButton}
              onPress={requestAdditionalTask}
            >
              <AntDesign name="plus" size={20} color="#f59e0b" />
              <Text style={styles.additionalWorkButtonText}>Request Additional Work</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Admin Actions */}
        {isAdminView && (
          <View style={styles.adminActions}>
            <TouchableOpacity 
              style={styles.adminButton}
              onPress={() => router.push({
                pathname: '/job-attachments',
                params: {
                  jobId: params.jobId,
                  adminView: 'true'
                }
              })}
            >
              <AntDesign name="eye" size={20} color="#4facfe" />
              <Text style={styles.adminButtonText}>View All Photos</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Complete Job Button - Only for Employee */}
        {!isAdminView && (
          <TouchableOpacity style={styles.completeJobButton} onPress={completeJob}>
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.completeJobGradient}>
              <AntDesign name="checkcircle" size={24} color="#fff" />
              <Text style={styles.completeJobText}>Complete Job</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Task Issue Modal */}
      {showTaskModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Task Issue</Text>
            <Text style={styles.modalSubtitle}>
              {tasks.find(t => t.id === showTaskModal)?.title}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={taskNote}
              onChangeText={setTaskNote}
              placeholder="Describe the issue or additional requirements..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowTaskModal(null);
                  setTaskNote('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSaveButton}
                onPress={saveTaskIssue}
              >
                <Text style={styles.modalSaveText}>Report Issue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  completeButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  content: {
    flex: 1,
    padding: 16,
  },

  // Progress Card
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4facfe",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4facfe",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },

  // Timer Card
  timerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    width: '100%',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  adminPhotoSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  adminPhotoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  viewPhotosButton: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewPhotosText: {
    color: '#4facfe',
    fontSize: 12,
    fontWeight: '600',
  },
  adminActions: {
    marginBottom: 16,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4facfe',
    gap: 8,
  },
  adminButtonText: {
    color: '#4facfe',
    fontSize: 16,
    fontWeight: '700',
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  timerText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#4facfe",
    fontFamily: "monospace",
  },
  timerWarning: {
    color: "#ef4444",
  },
  timerSubtext: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Tasks
  tasksContainer: {
    marginBottom: 20,
  },
  tasksTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  taskCardCompleted: {
    backgroundColor: "#f0fdf4",
    borderWidth: 2,
    borderColor: "#10b981",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  taskLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskNumberCompleted: {
    backgroundColor: "#10b981",
  },
  taskNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#64748b",
  },
  taskTime: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  taskAssignee: {
    fontSize: 11,
    color: "#8b5cf6",
    fontWeight: "600",
    marginTop: 2,
  },
  taskDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  taskDescriptionCompleted: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },

  // Complete Job Button
  completeJobButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completeJobGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  completeJobText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  // Job Actions
  jobActions: {
    marginBottom: 16,
  },
  mediaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#4facfe",
    gap: 8,
  },
  mediaButtonText: {
    color: "#4facfe",
    fontSize: 16,
    fontWeight: "700",
  },
  additionalWorkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#f59e0b",
    gap: 8,
    marginTop: 12,
  },
  additionalWorkButtonText: {
    color: "#f59e0b",
    fontSize: 16,
    fontWeight: "700",
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskIssueText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
    marginTop: 2,
  },
  taskCardIssue: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  taskNumberIssue: {
    backgroundColor: "#ef4444",
  },
  taskActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  taskActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  photoButton: {
    backgroundColor: "#eff6ff",
  },
  issueButton: {
    backgroundColor: "#fef2f2",
  },
  taskActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  modalSaveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  
  // Completed job styles
  completedCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    marginBottom: 16,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#38ef7d",
    marginTop: 16,
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
});