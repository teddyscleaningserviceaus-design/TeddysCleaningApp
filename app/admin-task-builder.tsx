import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
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

import { db } from "../config/firebase";

export default function AdminTaskBuilder() {
  const router = useRouter();
  const [templateName, setTemplateName] = useState("");
  const [siteType, setSiteType] = useState("residential");
  const [jobTypes, setJobTypes] = useState(["standard-clean"]);
  const [isRecurringTemplate, setIsRecurringTemplate] = useState(false);
  const [recurringVariations, setRecurringVariations] = useState({});
  const [estimatedTime, setEstimatedTime] = useState("");
  const [tasks, setTasks] = useState([
    { id: 1, title: "", description: "", estimatedTime: "", requiresPhoto: false, order: 1 }
  ]);

  const addTask = () => {
    const newTask = {
      id: Date.now(),
      title: "",
      description: "",
      estimatedTime: "",
      order: tasks.length + 1
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (taskId, field, value) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, [field]: value } : task
    ));
  };

  const removeTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const moveTask = (taskId, direction) => {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (
      (direction === 'up' && taskIndex === 0) ||
      (direction === 'down' && taskIndex === tasks.length - 1)
    ) return;

    const newTasks = [...tasks];
    const swapIndex = direction === 'up' ? taskIndex - 1 : taskIndex + 1;
    [newTasks[taskIndex], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[taskIndex]];
    
    // Update order numbers
    newTasks.forEach((task, index) => {
      task.order = index + 1;
    });
    
    setTasks(newTasks);
  };

  const saveTaskTemplate = async () => {
    if (!templateName.trim() || tasks.some(t => !t.title.trim())) {
      Alert.alert("Validation Error", "Please fill in template name and all task titles");
      return;
    }

    try {
      await addDoc(collection(db, "taskTemplates"), {
        templateName: templateName.trim(),
        siteType,
        jobTypes,
        isRecurringTemplate,
        recurringVariations,
        estimatedTime: estimatedTime.trim(),
        tasks: tasks.map(task => ({
          title: task.title.trim(),
          description: task.description.trim(),
          estimatedTime: task.estimatedTime.trim(),
          requiresPhoto: task.requiresPhoto,
          order: task.order
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert("Success", "Task template saved successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save task template");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Task Builder</Text>
          <Text style={styles.headerSubtitle}>Create Client Template</Text>
        </View>
        
        <TouchableOpacity onPress={saveTaskTemplate} style={styles.saveButton}>
          <AntDesign name="save" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Template Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Template Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Template Name *</Text>
            <TextInput
              style={styles.textInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="e.g., Commercial Bar Cleaning, Office Deep Clean"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Site Type</Text>
            <View style={styles.siteTypeGrid}>
              {['residential', 'commercial', 'industrial', 'hospitality'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.siteTypeButton, siteType === type && styles.siteTypeButtonActive]}
                  onPress={() => setSiteType(type)}
                >
                  <Text style={[styles.siteTypeText, siteType === type && styles.siteTypeTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Applicable Job Types</Text>
            <View style={styles.jobTypeGrid}>
              {['standard-clean', 'deep-clean', 'end-of-lease', 'maintenance'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.jobTypeButton, jobTypes.includes(type) && styles.jobTypeButtonActive]}
                  onPress={() => {
                    if (jobTypes.includes(type)) {
                      setJobTypes(jobTypes.filter(t => t !== type));
                    } else {
                      setJobTypes([...jobTypes, type]);
                    }
                  }}
                >
                  <Text style={[styles.jobTypeText, jobTypes.includes(type) && styles.jobTypeTextActive]}>
                    {type.replace('-', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.recurringToggle}
              onPress={() => setIsRecurringTemplate(!isRecurringTemplate)}
            >
              <AntDesign 
                name={isRecurringTemplate ? "checkcircle" : "checkcircleo"} 
                size={20} 
                color={isRecurringTemplate ? "#10b981" : "#d1d5db"} 
              />
              <Text style={styles.recurringLabel}>Recurring Job Template</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Total Estimated Time</Text>
            <TextInput
              style={styles.textInput}
              value={estimatedTime}
              onChangeText={setEstimatedTime}
              placeholder="e.g., 3 hours"
            />
          </View>
        </View>

        {/* Floor Plans & Media */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Floor Plans & Reference Media</Text>
          
          <TouchableOpacity style={styles.uploadButton}>
            <AntDesign name="picture" size={24} color="#4facfe" />
            <Text style={styles.uploadButtonText}>Upload Floor Plans</Text>
            <Text style={styles.uploadButtonSubtext}>Essential for commercial venues</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.uploadButton}>
            <AntDesign name="videocamera" size={24} color="#8b5cf6" />
            <Text style={styles.uploadButtonText}>Add Reference Videos</Text>
            <Text style={styles.uploadButtonSubtext}>Training & guidance materials</Text>
          </TouchableOpacity>
        </View>

        {/* Tasks */}
        <View style={styles.card}>
          <View style={styles.tasksHeader}>
            <Text style={styles.cardTitle}>Task Checklist</Text>
            <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
              <AntDesign name="plus" size={16} color="#4facfe" />
              <Text style={styles.addTaskText}>Add Task</Text>
            </TouchableOpacity>
          </View>

          {tasks.map((task, index) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskNumber}>
                  <Text style={styles.taskNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.taskControls}>
                  <TouchableOpacity 
                    style={styles.taskControl}
                    onPress={() => moveTask(task.id, 'up')}
                    disabled={index === 0}
                  >
                    <AntDesign name="up" size={16} color={index === 0 ? "#d1d5db" : "#6b7280"} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.taskControl}
                    onPress={() => moveTask(task.id, 'down')}
                    disabled={index === tasks.length - 1}
                  >
                    <AntDesign name="down" size={16} color={index === tasks.length - 1 ? "#d1d5db" : "#6b7280"} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.taskControl}
                    onPress={() => removeTask(task.id)}
                  >
                    <AntDesign name="delete" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Task Title *</Text>
                <TextInput
                  style={styles.textInput}
                  value={task.title}
                  onChangeText={(text) => updateTask(task.id, 'title', text)}
                  placeholder="e.g., Window & Metallic Surface Wiping"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Detailed Instructions</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={task.description}
                  onChangeText={(text) => updateTask(task.id, 'description', text)}
                  placeholder="Detailed step-by-step instructions..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.taskOptionsRow}>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.inputLabel}>Estimated Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={task.estimatedTime}
                    onChangeText={(text) => updateTask(task.id, 'estimatedTime', text)}
                    placeholder="45 min"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.photoToggle, task.requiresPhoto && styles.photoToggleActive]}
                  onPress={() => updateTask(task.id, 'requiresPhoto', !task.requiresPhoto)}
                >
                  <AntDesign name="camera" size={16} color={task.requiresPhoto ? "#fff" : "#4facfe"} />
                  <Text style={[styles.photoToggleText, task.requiresPhoto && styles.photoToggleTextActive]}>
                    Photo Required
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveTemplateButton} onPress={saveTaskTemplate}>
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.saveTemplateGradient}>
            <AntDesign name="save" size={24} color="#fff" />
            <Text style={styles.saveTemplateText}>Save Task Template</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  saveButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  content: {
    flex: 1,
    padding: 16,
  },

  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 16,
  },

  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  tasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4facfe",
    gap: 4,
  },
  addTaskText: {
    color: "#4facfe",
    fontSize: 14,
    fontWeight: "600",
  },

  taskCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4facfe",
    justifyContent: "center",
    alignItems: "center",
  },
  taskNumberText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  taskControls: {
    flexDirection: "row",
    gap: 8,
  },
  taskControl: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  saveTemplateButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveTemplateGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  saveTemplateText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  // Address verification
  addressContainer: {
    flexDirection: "row",
    gap: 12,
  },
  addressInput: {
    flex: 1,
  },
  verifyAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10b981",
    gap: 6,
  },
  verifyAddressText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },

  // Media upload
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    gap: 12,
  },
  uploadButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  siteTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  siteTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  siteTypeButtonActive: {
    backgroundColor: "#4facfe",
    borderColor: "#4facfe",
  },
  siteTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  siteTypeTextActive: {
    color: "#fff",
  },
  jobTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  jobTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  jobTypeButtonActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  jobTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "capitalize",
  },
  jobTypeTextActive: {
    color: "#fff",
  },
  recurringToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recurringLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  taskOptionsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#fff",
  },
  photoToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4facfe",
    backgroundColor: "#fff",
    gap: 6,
  },
  photoToggleActive: {
    backgroundColor: "#4facfe",
  },
  photoToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4facfe",
  },
  photoToggleTextActive: {
    color: "#fff",
  },
});