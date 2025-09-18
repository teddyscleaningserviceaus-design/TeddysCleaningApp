import { AntDesign, MaterialIcons } from "@expo/vector-icons";
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
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  Picker,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { generateTasksForJob, autoAssignTasks } from "../../services/taskAssignmentService";

const DEFAULT_TASKS = [
  "Vacuum all carpeted areas",
  "Mop hard floors",
  "Clean bathrooms",
  "Dust surfaces",
  "Empty trash bins",
  "Clean kitchen",
  "Wipe down windows",
  "Sanitize high-touch surfaces"
];

export default function JobTasksPage() {
  const { jobId } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    estimatedTime: 30,
    priority: 'Medium',
    instructions: '',
    equipment: [],
    videoLinks: [],
    requiredSkills: ['basic']
  });

  useEffect(() => {
    loadJobDetails();
    loadEmployees();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      // Try jobs collection first, then guest-bookings
      let jobDoc = await getDoc(doc(db, "jobs", jobId));
      let jobData = null;
      
      if (jobDoc.exists()) {
        jobData = { id: jobDoc.id, ...jobDoc.data() };
      } else {
        jobDoc = await getDoc(doc(db, "guest-bookings", jobId));
        if (jobDoc.exists()) {
          jobData = { id: jobDoc.id, ...jobDoc.data(), bookingType: 'guest' };
        }
      }
      
      if (jobData) {
        setJob(jobData);
        
        // Initialize tasks if none exist
        const existingTasks = jobData.tasks || [];
        if (existingTasks.length === 0) {
          // Generate smart tasks based on job type and building type
          const smartTasks = generateTasksForJob(jobData.jobType, jobData.buildingType);
          if (smartTasks.length > 0) {
            setTasks(smartTasks);
            // Auto-save the generated tasks
            await updateDoc(doc(db, "jobs", jobId), {
              tasks: smartTasks,
              updatedAt: new Date(),
            });
          } else {
            // Fallback to default tasks
            const defaultTasks = DEFAULT_TASKS.map((task, index) => ({
              id: `task_${index}`,
              title: task,
              assignedTo: null,
              assignedToName: null,
              completed: false,
              priority: "Medium",
              estimatedTime: 30
            }));
            setTasks(defaultTasks);
          }
        } else {
          setTasks(existingTasks);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const saveTasks = async () => {
    try {
      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      await updateDoc(doc(db, collection_name, jobId), {
        tasks: tasks,
        updatedAt: new Date(),
      });
      Alert.alert("Success", "Tasks saved successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to save tasks");
    }
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    
    const task = {
      id: `task_${Date.now()}`,
      title: newTask.trim(),
      description: newTask.trim(),
      assignedTo: null,
      assignedToName: null,
      completed: false,
      priority: "Medium",
      estimatedTime: 30,
      instructions: 'Follow standard procedures for this task',
      equipment: [],
      videoLinks: [],
      requiredSkills: ['basic']
    };
    
    setTasks([...tasks, task]);
    setNewTask("");
  };

  const addDetailedTask = () => {
    if (!taskForm.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }
    
    if (editingTaskId) {
      // Update existing task
      setTasks(tasks.map(task => 
        task.id === editingTaskId 
          ? { ...task, ...taskForm }
          : task
      ));
      setEditingTaskId(null);
    } else {
      // Add new task
      const task = {
        id: `task_${Date.now()}`,
        ...taskForm,
        assignedTo: null,
        assignedToName: null,
        completed: false
      };
      setTasks([...tasks, task]);
    }
    
    setTaskForm({
      title: '',
      description: '',
      estimatedTime: 30,
      priority: 'Medium',
      instructions: '',
      equipment: [],
      videoLinks: [],
      requiredSkills: ['basic']
    });
    setShowTaskModal(false);
  };

  const updateTaskForm = (field, value) => {
    setTaskForm(prev => ({ ...prev, [field]: value }));
  };

  const addEquipment = (equipment) => {
    if (equipment.trim() && !taskForm.equipment.includes(equipment.trim())) {
      setTaskForm(prev => ({
        ...prev,
        equipment: [...prev.equipment, equipment.trim()]
      }));
    }
  };

  const removeEquipment = (index) => {
    setTaskForm(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index)
    }));
  };

  const addVideoLink = (link) => {
    if (link.trim() && !taskForm.videoLinks.includes(link.trim())) {
      setTaskForm(prev => ({
        ...prev,
        videoLinks: [...prev.videoLinks, link.trim()]
      }));
    }
  };

  const removeVideoLink = (index) => {
    setTaskForm(prev => ({
      ...prev,
      videoLinks: prev.videoLinks.filter((_, i) => i !== index)
    }));
  };

  const assignTask = (taskId, employeeId, employeeName) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, assignedTo: employeeId, assignedToName: employeeName }
        : task
    ));
  };

  const removeTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const loadEmployees = () => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const employeesList = usersList.filter(user => user.userType === 'employee');
      setEmployees(employeesList);
    });
    return unsubscribe;
  };

  const smartAutoAssignTasks = async () => {
    try {
      // Step 1: Auto-assign best employees if none assigned
      let assignedEmployees = job?.assignedEmployees || [];
      if (assignedEmployees.length === 0) {
        // Get top 2-3 employees based on availability and skills
        const availableEmployees = employees.filter(emp => emp.availability?.available !== false);
        const topEmployees = availableEmployees.slice(0, Math.min(3, availableEmployees.length));
        
        if (topEmployees.length === 0) {
          Alert.alert("Error", "No available employees found");
          return;
        }
        
        assignedEmployees = topEmployees.map(emp => ({
          id: emp.id,
          name: emp.name || `${emp.firstName} ${emp.lastName}`.trim() || 'Employee'
        }));
        
        // Update job with assigned employees
        const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
        await updateDoc(doc(db, collection_name, jobId), {
          assignedEmployees,
          status: "Awaiting Confirmation",
          updatedAt: new Date(),
        });
        
        setJob(prev => ({ ...prev, assignedEmployees, status: "Awaiting Confirmation" }));
      }
      
      // Step 2: Generate detailed tasks if none exist or regenerate
      let jobTasks = tasks;
      if (tasks.length === 0 || tasks.every(t => !t.instructions)) {
        jobTasks = generateTasksForJob(job.jobType || job.serviceType, job.buildingType || job.propertyType);
        setTasks(jobTasks);
      }
      
      // Step 3: Smart assign tasks to employees
      const optimizedTasks = await autoAssignTasks(jobTasks, assignedEmployees, job);
      setTasks(optimizedTasks);
      
      // Step 4: Save everything
      const collection_name2 = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      await updateDoc(doc(db, collection_name2, jobId), {
        tasks: optimizedTasks,
        assignedEmployees,
        status: "Awaiting Confirmation",
        updatedAt: new Date(),
      });
      
      const distribution = assignedEmployees.map(emp => {
        const empTasks = optimizedTasks.filter(t => t.assignedTo === emp.id);
        return `${emp.name}: ${empTasks.length} tasks`;
      }).join('\n');
      
      Alert.alert(
        "Smart Assignment Complete", 
        `✅ Employees assigned: ${assignedEmployees.length}\n✅ Tasks generated: ${optimizedTasks.length}\n✅ Tasks distributed:\n\n${distribution}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Smart assignment error:', error);
      Alert.alert("Error", "Smart assignment failed. Please try manual assignment.");
    }
  };

  const simpleAutoAssignTasks = () => {
    const assignedEmployees = job?.assignedEmployees || [];
    const unassignedTasks = tasks.filter(task => !task.assignedTo);
    
    let updatedTasks = [...tasks];
    
    // Distribute tasks evenly among employees
    unassignedTasks.forEach((task, index) => {
      const employeeIndex = index % assignedEmployees.length;
      const employee = assignedEmployees[employeeIndex];
      
      const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        updatedTasks[taskIndex] = {
          ...task,
          assignedTo: employee.id,
          assignedToName: employee.name
        };
      }
    });
    
    setTasks(updatedTasks);
    
    const distribution = assignedEmployees.map(emp => {
      const empTasks = updatedTasks.filter(t => t.assignedTo === emp.id);
      return `${emp.name}: ${empTasks.length} tasks`;
    }).join('\n');
    
    Alert.alert(
      "Tasks Auto-Assigned", 
      `Tasks distributed among ${assignedEmployees.length} employees:\n\n${distribution}`,
      [{ text: "OK" }]
    );
  };

  const renderTaskItem = ({ item: task }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleRow}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.taskActions}>
            <TouchableOpacity 
              style={styles.taskInfoButton}
              onPress={() => setSelectedTask(task)}
            >
              <MaterialIcons name="info-outline" size={16} color="#4facfe" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.taskEditButton}
              onPress={() => {
                setTaskForm({
                  title: task.title || '',
                  description: task.description || '',
                  estimatedTime: task.estimatedTime || 30,
                  priority: task.priority || 'Medium',
                  instructions: task.instructions || '',
                  equipment: task.equipment || [],
                  videoLinks: task.videoLinks || [],
                  requiredSkills: task.requiredSkills || ['basic']
                });
                setEditingTaskId(task.id);
                setShowTaskModal(true);
              }}
            >
              <MaterialIcons name="edit" size={16} color="#f59e0b" />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => removeTask(task.id)}>
          <AntDesign name="close" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.taskDescription}>{task.description}</Text>
      
      <View style={styles.taskDetails}>
        <View style={styles.taskMeta}>
          <MaterialIcons name="schedule" size={14} color="#6b7280" />
          <Text style={styles.taskTime}>{task.estimatedTime} min</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
          <Text style={styles.priorityText}>{task.priority}</Text>
        </View>
        {task.equipment && task.equipment.length > 0 && (
          <View style={styles.taskMeta}>
            <MaterialIcons name="build" size={14} color="#6b7280" />
            <Text style={styles.equipmentCount}>{task.equipment.length} tools</Text>
          </View>
        )}
      </View>
      
      <View style={styles.taskAssignment}>
        {task.assignedTo ? (
          <View style={styles.assignedEmployee}>
            <Text style={styles.assignedText}>👤 {task.assignedToName}</Text>
            <TouchableOpacity onPress={() => assignTask(task.id, null, null)}>
              <Text style={styles.unassignText}>Unassign</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.employeeButtons}>
            {job?.assignedEmployees?.map(employee => (
              <TouchableOpacity
                key={employee.id}
                style={styles.assignButton}
                onPress={() => assignTask(task.id, employee.id, employee.name)}
              >
                <Text style={styles.assignButtonText}>{employee.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#ef4444";
      case "Medium": return "#f59e0b";
      case "Low": return "#10b981";
      default: return "#6b7280";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tasks...</Text>
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
          <Text style={styles.headerTitle}>Task Management</Text>
          <Text style={styles.headerSubtitle}>{job?.title}</Text>
        </View>
        
        <TouchableOpacity onPress={saveTasks} style={styles.saveButton}>
          <MaterialIcons name="save" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{tasks.length}</Text>
          <Text style={styles.summaryLabel}>Total Tasks</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{tasks.filter(t => t.assignedTo).length}</Text>
          <Text style={styles.summaryLabel}>Assigned</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{job?.assignedEmployees?.length || 0}</Text>
          <Text style={styles.summaryLabel}>Employees</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.autoAssignButton} onPress={smartAutoAssignTasks}>
          <MaterialIcons name="auto-fix-high" size={16} color="#fff" />
          <Text style={styles.autoAssignText}>Smart Assign All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addTaskContainer}>
        <TextInput
          style={styles.taskInput}
          placeholder="Quick task title (tap + for detailed task)"
          value={newTask}
          onChangeText={setNewTask}
          onSubmitEditing={() => setShowTaskModal(true)}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => {
          if (newTask.trim()) {
            setTaskForm(prev => ({ ...prev, title: newTask.trim(), description: newTask.trim() }));
            setNewTask('');
          }
          setShowTaskModal(true);
        }}>
          <AntDesign name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.tasksList}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="assignment" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No tasks added yet</Text>
          </View>
        )}
      />

      {/* Detailed Task Creation Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.taskModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTaskId ? 'Edit Task' : 'Create Detailed Task'}</Text>
              <TouchableOpacity onPress={() => {
                setShowTaskModal(false);
                setEditingTaskId(null);
              }}>
                <AntDesign name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Task Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter task title"
                  value={taskForm.title}
                  onChangeText={(text) => updateTaskForm('title', text)}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Describe what needs to be done"
                  value={taskForm.description}
                  onChangeText={(text) => updateTaskForm('description', text)}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="30"
                    value={String(taskForm.estimatedTime)}
                    onChangeText={(text) => updateTaskForm('estimatedTime', parseInt(text) || 30)}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.formGroupHalf}>
                  <Text style={styles.formLabel}>Priority</Text>
                  <View style={styles.prioritySelector}>
                    {['Low', 'Medium', 'High'].map(priority => (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.priorityOption,
                          taskForm.priority === priority && styles.priorityOptionSelected
                        ]}
                        onPress={() => updateTaskForm('priority', priority)}
                      >
                        <Text style={[
                          styles.priorityOptionText,
                          taskForm.priority === priority && styles.priorityOptionTextSelected
                        ]}>{priority}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Step-by-Step Instructions</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Detailed instructions for completing this task"
                  value={taskForm.instructions}
                  onChangeText={(text) => updateTaskForm('instructions', text)}
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Required Equipment</Text>
                <View style={styles.equipmentList}>
                  {taskForm.equipment.map((item, index) => (
                    <View key={index} style={styles.equipmentItem}>
                      <Text style={styles.equipmentText}>{item}</Text>
                      <TouchableOpacity onPress={() => removeEquipment(index)}>
                        <AntDesign name="close" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TextInput
                  style={styles.formInput}
                  placeholder="Add equipment (press Enter to add)"
                  onSubmitEditing={(e) => {
                    addEquipment(e.nativeEvent.text);
                    e.target.clear();
                  }}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Training Video Links</Text>
                <View style={styles.videoList}>
                  {taskForm.videoLinks.map((link, index) => (
                    <View key={index} style={styles.videoItem}>
                      <Text style={styles.videoText} numberOfLines={1}>{link}</Text>
                      <TouchableOpacity onPress={() => removeVideoLink(index)}>
                        <AntDesign name="close" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TextInput
                  style={styles.formInput}
                  placeholder="Add video URL (press Enter to add)"
                  onSubmitEditing={(e) => {
                    addVideoLink(e.nativeEvent.text);
                    e.target.clear();
                  }}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowTaskModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={addDetailedTask}
              >
                <Text style={styles.createButtonText}>{editingTaskId ? 'Update Task' : 'Create Task'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Detail View Modal */}
      <Modal
        visible={selectedTask !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.taskDetailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTask?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedTask(null)}>
                <AntDesign name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailText}>{selectedTask?.description}</Text>
              </View>
              
              {selectedTask?.instructions && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Instructions</Text>
                  <Text style={styles.detailText}>{selectedTask.instructions}</Text>
                </View>
              )}
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Task Details</Text>
                <Text style={styles.detailText}>Duration: {selectedTask?.estimatedTime} minutes</Text>
                <Text style={styles.detailText}>Priority: {selectedTask?.priority}</Text>
              </View>
              
              {selectedTask?.equipment && selectedTask.equipment.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Required Equipment</Text>
                  {selectedTask.equipment.map((item, index) => (
                    <Text key={index} style={styles.detailText}>• {item}</Text>
                  ))}
                </View>
              )}
              
              {selectedTask?.videoLinks && selectedTask.videoLinks.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Training Videos</Text>
                  {selectedTask.videoLinks.map((link, index) => (
                    <TouchableOpacity key={index} style={styles.videoLinkItem}>
                      <MaterialIcons name="play-circle-outline" size={20} color="#ef4444" />
                      <Text style={styles.videoLinkText}>Training Video {index + 1}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  saveButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  summary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4facfe",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  controls: {
    padding: 16,
    alignItems: "center",
  },
  autoAssignButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  autoAssignText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  addTaskContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  taskInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  addButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tasksList: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  taskDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 16,
  },
  taskTime: {
    fontSize: 12,
    color: "#6b7280",
  },
  taskPriority: {
    fontSize: 12,
    fontWeight: "600",
  },
  taskAssignment: {
    marginTop: 8,
  },
  assignedEmployee: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    padding: 8,
    borderRadius: 8,
  },
  assignedText: {
    fontSize: 14,
    color: "#0369a1",
    fontWeight: "600",
  },
  unassignText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  employeeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assignButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
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
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
  detailedTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginLeft: 12,
  },
  detailedTaskText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 4,
  },
  taskInfoButton: {
    padding: 4,
  },
  taskEditButton: {
    padding: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  equipmentCount: {
    fontSize: 12,
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  taskModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "90%",
    elevation: 8,
  },
  taskDetailModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    elevation: 8,
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
    fontWeight: "700",
    color: "#1f2937",
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formGroupHalf: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  prioritySelector: {
    flexDirection: "row",
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  priorityOptionSelected: {
    backgroundColor: "#4facfe",
    borderColor: "#4facfe",
  },
  priorityOptionText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  priorityOptionTextSelected: {
    color: "#fff",
  },
  equipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  equipmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  equipmentText: {
    fontSize: 12,
    color: "#374151",
  },
  videoList: {
    gap: 8,
    marginBottom: 8,
  },
  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  videoText: {
    fontSize: 12,
    color: "#374151",
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#4facfe",
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  videoLinkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
    gap: 8,
  },
  videoLinkText: {
    fontSize: 14,
    color: "#4facfe",
    fontWeight: "500",
  },
});