import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ImageBackground,
  Dimensions,
  Modal
} from 'react-native';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function TaskExecution() {
  const { taskId } = useLocalSearchParams();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [taskTemplate, setTaskTemplate] = useState(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskTemplate();
  }, [taskId]);

  useEffect(() => {
    let interval;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const loadTaskTemplate = async () => {
    try {
      const docRef = doc(db, 'taskTemplates', taskId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setTaskTemplate({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert('Error', 'Task template not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading task:', error);
      Alert.alert('Error', 'Failed to load task template');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const startJob = () => {
    setStartTime(Date.now());
    setIsRunning(true);
    setShowTaskModal(true);
  };

  const completeCurrentTask = async () => {
    const currentTask = taskTemplate.tasks[currentTaskIndex];
    const taskCompletionTime = Date.now();
    
    const completedTask = {
      ...currentTask,
      completedAt: taskCompletionTime,
      completedBy: userProfile?.name || 'Unknown',
      timeSpent: startTime ? taskCompletionTime - startTime : 0
    };

    setCompletedTasks([...completedTasks, completedTask]);

    // Notify completion
    await logTaskCompletion(completedTask);

    if (currentTaskIndex < taskTemplate.tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
      setShowTaskModal(true);
    } else {
      // All tasks completed
      completeJob();
    }
  };

  const logTaskCompletion = async (task) => {
    try {
      await addDoc(collection(db, 'taskCompletions'), {
        taskTemplateId: taskId,
        taskTitle: task.title,
        completedBy: userProfile?.uid || 'unknown',
        completedByName: userProfile?.name || 'Unknown',
        completedAt: new Date(),
        timeSpent: task.timeSpent,
        clientName: taskTemplate.clientName,
        address: taskTemplate.address
      });
    } catch (error) {
      console.error('Error logging task completion:', error);
    }
  };

  const completeJob = () => {
    setIsRunning(false);
    const totalTime = Date.now() - startTime;
    
    Alert.alert(
      'Job Completed! 🎉',
      `All tasks completed in ${formatTime(totalTime)}`,
      [
        {
          text: 'View Summary',
          onPress: () => router.push(`/job-summary?taskId=${taskId}&totalTime=${totalTime}`)
        },
        {
          text: 'Back to Tasks',
          onPress: () => router.back()
        }
      ]
    );
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCurrentTask = () => {
    return taskTemplate?.tasks?.[currentTaskIndex];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    );
  }

  if (!taskTemplate) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const currentTask = getCurrentTask();
  const progress = ((currentTaskIndex + completedTasks.length) / taskTemplate.tasks.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.venueBackground}>
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
          style={styles.overlay}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <AntDesign name="arrowleft" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.clientName}>{taskTemplate.clientName}</Text>
              <Text style={styles.address}>{taskTemplate.address}</Text>
            </View>
            
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {completedTasks.length} of {taskTemplate.tasks.length} completed
            </Text>
          </View>

          {/* Task Overlay */}
          <View style={styles.taskOverlay}>
            {!isRunning ? (
              <View style={styles.startContainer}>
                <Text style={styles.startTitle}>Ready to Start</Text>
                <Text style={styles.startSubtitle}>
                  {taskTemplate.tasks.length} tasks • Est. {taskTemplate.estimatedTime}
                </Text>
                <TouchableOpacity style={styles.startButton} onPress={startJob}>
                  <LinearGradient colors={['#10b981', '#059669']} style={styles.startButtonGradient}>
                    <Feather name="play" size={24} color="#fff" />
                    <Text style={styles.startButtonText}>Start Job</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : currentTask ? (
              <View style={styles.currentTaskContainer}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskNumber}>
                    <Text style={styles.taskNumberText}>{currentTaskIndex + 1}</Text>
                  </View>
                  <Text style={styles.taskTitle}>{currentTask.title}</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.viewTaskButton}
                  onPress={() => setShowTaskModal(true)}
                >
                  <Text style={styles.viewTaskText}>View Details</Text>
                  <AntDesign name="eye" size={16} color="#4facfe" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.completeButton}
                  onPress={completeCurrentTask}
                >
                  <LinearGradient colors={['#10b981', '#059669']} style={styles.completeButtonGradient}>
                    <MaterialIcons name="check-circle" size={24} color="#fff" />
                    <Text style={styles.completeButtonText}>Mark Complete</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Completed Tasks List */}
          {completedTasks.length > 0 && (
            <View style={styles.completedContainer}>
              <Text style={styles.completedTitle}>Completed Tasks</Text>
              {completedTasks.slice(-3).map((task, index) => (
                <View key={index} style={styles.completedTask}>
                  <MaterialIcons name="check-circle" size={16} color="#10b981" />
                  <Text style={styles.completedTaskText}>{task.title}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Task Detail Modal */}
      <Modal
        visible={showTaskModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Task {currentTaskIndex + 1}</Text>
              <TouchableOpacity onPress={() => setShowTaskModal(false)}>
                <AntDesign name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            {currentTask && (
              <>
                <Text style={styles.modalTaskTitle}>{currentTask.title}</Text>
                {currentTask.description && (
                  <Text style={styles.modalTaskDescription}>{currentTask.description}</Text>
                )}
                {currentTask.estimatedTime && (
                  <Text style={styles.modalTaskTime}>Est. Time: {currentTask.estimatedTime}</Text>
                )}
                
                <TouchableOpacity 
                  style={styles.modalCompleteButton}
                  onPress={() => {
                    setShowTaskModal(false);
                    completeCurrentTask();
                  }}
                >
                  <LinearGradient colors={['#10b981', '#059669']} style={styles.modalCompleteGradient}>
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <Text style={styles.modalCompleteText}>Mark Complete</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  venueBackground: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#1f2937',
  },
  overlay: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  clientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  address: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  timerContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  taskOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: width * 0.8,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  currentTaskContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 24,
    minWidth: width * 0.8,
    alignItems: 'center',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  viewTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  viewTaskText: {
    color: '#4facfe',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  completeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  completedContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 16,
    maxWidth: width * 0.6,
  },
  completedTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  completedTask: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  completedTaskText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalTaskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  modalTaskDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalTaskTime: {
    fontSize: 14,
    color: '#4facfe',
    fontWeight: '600',
    marginBottom: 24,
  },
  modalCompleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalCompleteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  modalCompleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
});