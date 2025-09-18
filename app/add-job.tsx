import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, query, onSnapshot } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";


import { auth, db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function AddJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    client: "",
    contactNumber: "",
    address: "",
    priority: "Medium",
    scheduledDate: new Date(),
    startTime: new Date(),
    notes: "",
    latitude: null,
    longitude: null,
    jobType: "standard-clean",
    isRecurring: false,
    recurringDays: [],
    recurringFrequency: "weekly",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [addressValidated, setAddressValidated] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customTasks, setCustomTasks] = useState([]);
  const [taskMode, setTaskMode] = useState('auto'); // 'auto', 'template', or 'custom'
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [siteType, setSiteType] = useState('residential');

  useEffect(() => {
    // Load task templates
    const templatesQuery = query(collection(db, "taskTemplates"));
    const unsubscribeTemplates = onSnapshot(templatesQuery, 
      (snapshot) => {
        const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableTemplates(templates);
      },
      (error) => {
        console.error("Templates query error:", error);
      }
    );
    return () => unsubscribeTemplates();
  }, []);




  const validatePhone = (phone) => {
    const phoneRegex = /^(\+61|0)[2-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleAddJob = async () => {
    const validationErrors = {};
    
    if (!newJob.title.trim()) validationErrors.title = "Job title is required";
    if (!newJob.client.trim()) validationErrors.client = "Client name is required";
    if (!newJob.contactNumber.trim()) {
      validationErrors.contactNumber = "Contact number is required";
    } else if (!validatePhone(newJob.contactNumber)) {
      validationErrors.contactNumber = "Please enter a valid Australian phone number";
    }
    if (!newJob.address.trim()) validationErrors.address = "Address is required";
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert("Validation Error", "Please fix the errors and try again.");
      return;
    }

    setLoading(true);
    try {
      let finalLatitude = newJob.latitude;
      let finalLongitude = newJob.longitude;
      let finalAddress = newJob.address.trim();

      // If no coordinates, geocode the address
      if (!finalLatitude || !finalLongitude) {
        try {
          const encodedAddress = encodeURIComponent(newJob.address.trim());
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4`
          );
          const data = await response.json();
          
          if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            finalLatitude = result.geometry.location.lat;
            finalLongitude = result.geometry.location.lng;
            finalAddress = result.formatted_address;
          }
        } catch (geocodeError) {
          console.warn('Geocoding failed:', geocodeError);
        }
      }

      // Get tasks based on selection
      let jobTasks = [];
      if (taskMode === 'custom') {
        jobTasks = customTasks;
      } else if (taskMode === 'template' && selectedTemplate) {
        const template = availableTemplates.find(t => t.id === selectedTemplate);
        jobTasks = template ? template.tasks : getDefaultTasks(newJob.jobType);
      } else {
        // Auto mode - find best matching template
        const matchingTemplate = availableTemplates.find(t => 
          t.siteType === siteType && 
          t.jobTypes.includes(newJob.jobType)
        );
        jobTasks = matchingTemplate ? matchingTemplate.tasks : getDefaultTasks(newJob.jobType);
      }

      await addDoc(collection(db, "jobs"), {
        title: newJob.title.trim(),
        client: newJob.client.trim(),
        contactNumber: newJob.contactNumber.trim(),
        address: finalAddress,
        priority: newJob.priority,
        status: "pending",
        progress: 0,
        scheduledDate: newJob.scheduledDate.toLocaleDateString(),
        startTime: newJob.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes: newJob.notes.trim(),
        latitude: finalLatitude,
        longitude: finalLongitude,
        assignedTo: null,
        assignedToName: null,
        siteType: siteType,
        jobType: newJob.jobType,
        tasks: jobTasks,
        templateId: selectedTemplate,
        isRecurring: newJob.isRecurring,
        recurringDays: newJob.recurringDays,
        recurringFrequency: newJob.recurringFrequency,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      Alert.alert("Success", "Job added successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Add job error:", error);
      Alert.alert("Error", "Failed to add job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTasks = (jobType) => {
    const templates = {
      'standard-clean': [
        { id: 1, title: "Setup & Equipment Check", description: "Prepare cleaning supplies and equipment", estimatedTime: "5 min", requiresPhoto: false, completed: false, order: 1 },
        { id: 2, title: "Dusting & Wiping", description: "Dust all surfaces, wipe down furniture", estimatedTime: "20 min", requiresPhoto: true, completed: false, order: 2 },
        { id: 3, title: "Vacuuming", description: "Vacuum all carpeted areas and rugs", estimatedTime: "15 min", requiresPhoto: true, completed: false, order: 3 },
        { id: 4, title: "Mopping", description: "Mop all hard floor surfaces", estimatedTime: "15 min", requiresPhoto: true, completed: false, order: 4 },
        { id: 5, title: "Final Inspection", description: "Quality check and pack up equipment", estimatedTime: "5 min", requiresPhoto: false, completed: false, order: 5 }
      ],
      'deep-clean': [
        { id: 1, title: "Initial Assessment", description: "Survey area and plan cleaning approach", estimatedTime: "10 min", requiresPhoto: true, completed: false, order: 1 },
        { id: 2, title: "Declutter & Organize", description: "Remove items and organize space", estimatedTime: "30 min", requiresPhoto: false, completed: false, order: 2 },
        { id: 3, title: "Deep Dusting", description: "Detailed dusting including baseboards, vents", estimatedTime: "45 min", requiresPhoto: true, completed: false, order: 3 },
        { id: 4, title: "Window Cleaning", description: "Clean all windows inside and out", estimatedTime: "30 min", requiresPhoto: true, completed: false, order: 4 },
        { id: 5, title: "Floor Deep Clean", description: "Scrub, vacuum, and mop all floors", estimatedTime: "60 min", requiresPhoto: true, completed: false, order: 5 },
        { id: 6, title: "Final Details", description: "Touch-ups and final quality check", estimatedTime: "15 min", requiresPhoto: true, completed: false, order: 6 }
      ],
      'end-of-lease': [
        { id: 1, title: "Property Inspection", description: "Document initial condition with photos", estimatedTime: "15 min", requiresPhoto: true, completed: false, order: 1 },
        { id: 2, title: "Kitchen Deep Clean", description: "Oven, fridge, cabinets, countertops", estimatedTime: "90 min", requiresPhoto: true, completed: false, order: 2 },
        { id: 3, title: "Bathroom Deep Clean", description: "Tiles, grout, fixtures, mirrors", estimatedTime: "60 min", requiresPhoto: true, completed: false, order: 3 },
        { id: 4, title: "Wall & Ceiling Clean", description: "Remove marks, cobwebs, light fixtures", estimatedTime: "45 min", requiresPhoto: true, completed: false, order: 4 },
        { id: 5, title: "Floor Restoration", description: "Deep clean all flooring types", estimatedTime: "60 min", requiresPhoto: true, completed: false, order: 5 },
        { id: 6, title: "Final Walkthrough", description: "Complete inspection and documentation", estimatedTime: "20 min", requiresPhoto: true, completed: false, order: 6 }
      ]
    };
    return templates[jobType] || templates['standard-clean'];
  };

  const getTemplateTasksById = (templateId) => {
    if (templateId === 'sonder-bar') {
      return [
        { id: 1, title: "Unlock Equipment", description: "Carpet vacuum, chemicals, battery pac vac, extension cable", estimatedTime: "5 min", requiresPhoto: false, completed: false, order: 1 },
        { id: 2, title: "Window & Metallic Surface Wiping", description: "All doors, handrails, mirrors, taps, hand driers", estimatedTime: "45 min", requiresPhoto: true, completed: false, order: 2 },
        { id: 3, title: "Debris Collection", description: "Use dust pan and brush for large debris", estimatedTime: "15 min", requiresPhoto: false, completed: false, order: 3 },
        { id: 4, title: "Main Bar Mopping", description: "Mop all hard flooring areas with blue bucket", estimatedTime: "30 min", requiresPhoto: true, completed: false, order: 4 },
        { id: 5, title: "Toilet Cleaning", description: "Complete toilet cleaning with antibacterial spray", estimatedTime: "40 min", requiresPhoto: true, completed: false, order: 5 },
        { id: 6, title: "Vacuuming", description: "Carpet and hard-to-reach areas", estimatedTime: "35 min", requiresPhoto: true, completed: false, order: 6 },
        { id: 7, title: "Pack Up", description: "Secure all equipment and venue", estimatedTime: "10 min", requiresPhoto: false, completed: false, order: 7 }
      ];
    }
    return getDefaultTasks('standard-clean');
  };

  const addCustomTask = () => {
    const newTask = {
      id: Date.now(),
      title: '',
      description: '',
      estimatedTime: '15 min',
      requiresPhoto: false,
      completed: false,
      order: customTasks.length + 1
    };
    setCustomTasks([...customTasks, newTask]);
  };

  const updateCustomTask = (taskId, field, value) => {
    setCustomTasks(customTasks.map(task => 
      task.id === taskId ? { ...task, [field]: value } : task
    ));
  };

  const removeCustomTask = (taskId) => {
    setCustomTasks(customTasks.filter(task => task.id !== taskId));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setNewJob({...newJob, scheduledDate: selectedDate});
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setNewJob({...newJob, startTime: selectedTime});
    }
  };

  const validateAddress = async () => {
    if (!newJob.address.trim()) return;
    
    setValidatingAddress(true);
    try {
      const encodedAddress = encodeURIComponent(newJob.address.trim());
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        setNewJob({
          ...newJob,
          address: result.formatted_address,
          latitude: location.lat,
          longitude: location.lng,
        });
        setAddressValidated(true);
        Alert.alert('Success', 'Address verified and location found!');
      } else {
        Alert.alert('Invalid Address', 'Please enter a valid address that can be found on the map.');
        setAddressValidated(false);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      Alert.alert('Error', 'Failed to verify address. Please check your internet connection.');
      setAddressValidated(false);
    } finally {
      setValidatingAddress(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
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
              <Text style={styles.headerTitle}>Add New Job</Text>
              <Text style={styles.headerSubtitle}>Create Task</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView 
            contentContainerStyle={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.stepIndicator}>
                {[1, 2, 3, 4].map((step) => (
                  <View key={step} style={styles.stepRow}>
                    <View style={[
                      styles.stepCircle,
                      currentStep >= step && styles.stepCircleActive,
                      currentStep > step && styles.stepCircleComplete
                    ]}>
                      {currentStep > step ? (
                        <AntDesign name="check" size={16} color="#fff" />
                      ) : (
                        <Text style={[
                          styles.stepNumber,
                          currentStep >= step && styles.stepNumberActive
                        ]}>{step}</Text>
                      )}
                    </View>
                    {step < 4 && <View style={[
                      styles.stepLine,
                      currentStep > step && styles.stepLineComplete
                    ]} />}
                  </View>
                ))}
              </View>
              <Text style={styles.progressText}>
                Step {currentStep} of {totalSteps}: {
                  currentStep === 1 ? "Job Details" :
                  currentStep === 2 ? "Location" :
                  currentStep === 3 ? "Schedule" :
                  currentStep === 4 ? "Tasks" : "Final Details"
                }
              </Text>
            </View>

            {currentStep === 1 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AntDesign name="filetext1" size={24} color="#4facfe" />
                  <Text style={styles.cardTitle}>Job Details</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <AntDesign name="edit" size={18} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.modernInput, errors.title && styles.inputError]}
                      value={newJob.title}
                      onChangeText={(text) => {
                        setNewJob({...newJob, title: text});
                        if (errors.title) setErrors({...errors, title: null});
                      }}
                      placeholder="What's the job? (e.g., Office Deep Clean)"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <AntDesign name="user" size={18} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.modernInput, errors.client && styles.inputError]}
                      value={newJob.client}
                      onChangeText={(text) => {
                        setNewJob({...newJob, client: text});
                        if (errors.client) setErrors({...errors, client: null});
                      }}
                      placeholder="Client name (e.g., ABC Company)"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {errors.client && <Text style={styles.errorText}>{errors.client}</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <AntDesign name="phone" size={18} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.modernInput, errors.contactNumber && styles.inputError]}
                      value={newJob.contactNumber}
                      onChangeText={(text) => {
                        setNewJob({...newJob, contactNumber: text});
                        if (errors.contactNumber) setErrors({...errors, contactNumber: null});
                      }}
                      placeholder="Contact number (e.g., 0412 345 678)"
                      placeholderTextColor="#9ca3af"
                      keyboardType="phone-pad"
                    />
                  </View>
                  {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AntDesign name="enviromento" size={24} color="#10b981" />
                  <Text style={styles.cardTitle}>Location</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <View style={styles.inputWrapper}>
                    <AntDesign name="home" size={18} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.modernInput, errors.address && styles.inputError]}
                      value={newJob.address}
                      onChangeText={(text) => {
                        setNewJob({...newJob, address: text, latitude: null, longitude: null});
                        setAddressValidated(false);
                        if (errors.address) setErrors({...errors, address: null});
                      }}
                      placeholder="Enter full address"
                      placeholderTextColor="#9ca3af"
                      multiline
                    />
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.verifyButton, validatingAddress && styles.verifyButtonDisabled]}
                    onPress={validateAddress}
                    disabled={validatingAddress || !newJob.address.trim()}
                  >
                    <LinearGradient colors={["#10b981", "#059669"]} style={styles.verifyButtonGradient}>
                      {validatingAddress ? (
                        <AntDesign name="loading1" size={18} color="#fff" />
                      ) : (
                        <AntDesign name="search1" size={18} color="#fff" />
                      )}
                      <Text style={styles.verifyButtonText}>
                        {validatingAddress ? "Verifying..." : "Verify Address"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                  {addressValidated && newJob.latitude && (
                    <View style={styles.successBadge}>
                      <AntDesign name="checkcircle" size={16} color="#10b981" />
                      <Text style={styles.successText}>Location verified!</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AntDesign name="clockcircle" size={24} color="#f59e0b" />
                  <Text style={styles.cardTitle}>Schedule</Text>
                </View>
                
                <View style={styles.scheduleRow}>
                  <TouchableOpacity 
                    style={styles.scheduleButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <AntDesign name="calendar" size={20} color="#4facfe" />
                    <View style={styles.scheduleTextContainer}>
                      <Text style={styles.scheduleLabel}>Date</Text>
                      <Text style={styles.scheduleValue}>
                        {newJob.scheduledDate.toLocaleDateString('en-AU', { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.scheduleButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <AntDesign name="clockcircleo" size={20} color="#4facfe" />
                    <View style={styles.scheduleTextContainer}>
                      <Text style={styles.scheduleLabel}>Time</Text>
                      <Text style={styles.scheduleValue}>
                        {newJob.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentStep === 4 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AntDesign name="checklist" size={24} color="#8b5cf6" />
                  <Text style={styles.cardTitle}>Tasks & Job Type</Text>
                </View>
                
                <View style={styles.jobTypeGrid}>
                  {[
                    { label: "Standard Clean", value: "standard-clean", icon: "home" },
                    { label: "Deep Clean", value: "deep-clean", icon: "tool" },
                    { label: "End of Lease", value: "end-of-lease", icon: "key" }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.jobTypeCard,
                        newJob.jobType === type.value && styles.jobTypeCardSelected
                      ]}
                      onPress={() => setNewJob({...newJob, jobType: type.value})}
                    >
                      <AntDesign 
                        name={type.icon} 
                        size={20} 
                        color={newJob.jobType === type.value ? "#fff" : "#8b5cf6"} 
                      />
                      <Text style={[
                        styles.jobTypeLabel,
                        newJob.jobType === type.value && { color: "#fff" }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.siteTypeSection}>
                  <Text style={styles.sectionLabel}>Site Type:</Text>
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

                <View style={styles.taskModeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.taskModeButton,
                      taskMode === 'auto' && styles.taskModeButtonActive
                    ]}
                    onPress={() => setTaskMode('auto')}
                  >
                    <Text style={[
                      styles.taskModeText,
                      taskMode === 'auto' && styles.taskModeTextActive
                    ]}>Auto Select</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.taskModeButton,
                      taskMode === 'template' && styles.taskModeButtonActive
                    ]}
                    onPress={() => setTaskMode('template')}
                  >
                    <Text style={[
                      styles.taskModeText,
                      taskMode === 'template' && styles.taskModeTextActive
                    ]}>Use Template</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.taskModeButton,
                      taskMode === 'custom' && styles.taskModeButtonActive
                    ]}
                    onPress={() => setTaskMode('custom')}
                  >
                    <Text style={[
                      styles.taskModeText,
                      taskMode === 'custom' && styles.taskModeTextActive
                    ]}>Custom Tasks</Text>
                  </TouchableOpacity>
                </View>

                {taskMode === 'template' && (
                  <View style={styles.templateSelector}>
                    <Text style={styles.sectionLabel}>Select Template:</Text>
                    {availableTemplates
                      .filter(t => t.siteType === siteType && t.jobTypes.includes(newJob.jobType))
                      .map((template) => (
                        <TouchableOpacity
                          key={template.id}
                          style={[
                            styles.templateCard,
                            selectedTemplate === template.id && styles.templateCardSelected
                          ]}
                          onPress={() => setSelectedTemplate(template.id)}
                        >
                          <View style={styles.templateInfo}>
                            <Text style={styles.templateName}>{template.templateName}</Text>
                            <Text style={styles.templateDescription}>
                              {template.tasks?.length || 0} tasks • {template.estimatedTime || 'No time estimate'}
                            </Text>
                          </View>
                          <AntDesign 
                            name={selectedTemplate === template.id ? "checkcircle" : "checkcircleo"} 
                            size={20} 
                            color={selectedTemplate === template.id ? "#10b981" : "#d1d5db"} 
                          />
                        </TouchableOpacity>
                      ))
                    }
                    {availableTemplates.filter(t => t.siteType === siteType && t.jobTypes.includes(newJob.jobType)).length === 0 && (
                      <Text style={styles.noTemplatesText}>No templates available for {siteType} {newJob.jobType.replace('-', ' ')} jobs</Text>
                    )}
                  </View>
                )}

                {taskMode === 'custom' && (
                  <View style={styles.customTasksContainer}>
                    <View style={styles.customTasksHeader}>
                      <Text style={styles.sectionLabel}>Custom Tasks:</Text>
                      <TouchableOpacity style={styles.addTaskButton} onPress={addCustomTask}>
                        <AntDesign name="plus" size={16} color="#4facfe" />
                        <Text style={styles.addTaskText}>Add Task</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {customTasks.map((task, index) => (
                      <View key={task.id} style={styles.customTaskCard}>
                        <View style={styles.customTaskHeader}>
                          <Text style={styles.customTaskNumber}>{index + 1}</Text>
                          <TouchableOpacity onPress={() => removeCustomTask(task.id)}>
                            <AntDesign name="close" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={styles.customTaskInput}
                          value={task.title}
                          onChangeText={(text) => updateCustomTask(task.id, 'title', text)}
                          placeholder="Task title"
                          placeholderTextColor="#9ca3af"
                        />
                        <TextInput
                          style={[styles.customTaskInput, styles.customTaskDescription]}
                          value={task.description}
                          onChangeText={(text) => updateCustomTask(task.id, 'description', text)}
                          placeholder="Task description"
                          placeholderTextColor="#9ca3af"
                          multiline
                        />
                        <View style={styles.customTaskOptions}>
                          <TextInput
                            style={styles.timeInput}
                            value={task.estimatedTime}
                            onChangeText={(text) => updateCustomTask(task.id, 'estimatedTime', text)}
                            placeholder="15 min"
                            placeholderTextColor="#9ca3af"
                          />
                          <TouchableOpacity
                            style={[
                              styles.photoToggle,
                              task.requiresPhoto && styles.photoToggleActive
                            ]}
                            onPress={() => updateCustomTask(task.id, 'requiresPhoto', !task.requiresPhoto)}
                          >
                            <AntDesign name="camera" size={14} color={task.requiresPhoto ? "#fff" : "#4facfe"} />
                            <Text style={[
                              styles.photoToggleText,
                              task.requiresPhoto && styles.photoToggleTextActive
                            ]}>Photo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {currentStep === 5 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <AntDesign name="flag" size={24} color="#ef4444" />
                  <Text style={styles.cardTitle}>Priority & Notes</Text>
                </View>
                
                <View style={styles.priorityGrid}>
                  {[
                    { label: "Low", color: "#10b981", icon: "arrowdown" },
                    { label: "Medium", color: "#f59e0b", icon: "minus" },
                    { label: "High", color: "#ef4444", icon: "arrowup" }
                  ].map((priority) => (
                    <TouchableOpacity
                      key={priority.label}
                      style={[
                        styles.priorityCard,
                        newJob.priority === priority.label && { 
                          backgroundColor: priority.color,
                          transform: [{ scale: 1.05 }]
                        }
                      ]}
                      onPress={() => setNewJob({...newJob, priority: priority.label})}
                    >
                      <AntDesign 
                        name={priority.icon} 
                        size={20} 
                        color={newJob.priority === priority.label ? "#fff" : priority.color} 
                      />
                      <Text style={[
                        styles.priorityLabel,
                        newJob.priority === priority.label && { color: "#fff" }
                      ]}>
                        {priority.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.recurringSection}>
                  <TouchableOpacity
                    style={styles.recurringToggle}
                    onPress={() => setNewJob({...newJob, isRecurring: !newJob.isRecurring})}
                  >
                    <AntDesign 
                      name={newJob.isRecurring ? "checkcircle" : "checkcircleo"} 
                      size={20} 
                      color={newJob.isRecurring ? "#10b981" : "#d1d5db"} 
                    />
                    <Text style={styles.recurringLabel}>Recurring Job</Text>
                  </TouchableOpacity>
                  
                  {newJob.isRecurring && (
                    <View style={styles.recurringOptions}>
                      <Text style={styles.recurringSubLabel}>Select Days:</Text>
                      <View style={styles.daysGrid}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayButton,
                              newJob.recurringDays.includes(day) && styles.dayButtonSelected
                            ]}
                            onPress={() => {
                              const days = newJob.recurringDays.includes(day)
                                ? newJob.recurringDays.filter(d => d !== day)
                                : [...newJob.recurringDays, day];
                              setNewJob({...newJob, recurringDays: days});
                            }}
                          >
                            <Text style={[
                              styles.dayButtonText,
                              newJob.recurringDays.includes(day) && styles.dayButtonTextSelected
                            ]}>{day}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.notesWrapper}>
                    <AntDesign name="edit" size={18} color="#6b7280" style={styles.notesIcon} />
                    <TextInput
                      style={styles.notesInput}
                      value={newJob.notes}
                      onChangeText={(text) => setNewJob({...newJob, notes: text})}
                      placeholder="Any special instructions? (optional)"
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Navigation Buttons */}
            <View style={styles.buttonRow}>
              {currentStep > 1 && (
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => setCurrentStep(currentStep - 1)}
                >
                  <AntDesign name="arrowleft" size={20} color="#6b7280" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
                onPress={() => {
                  if (currentStep < totalSteps) {
                    // Validate current step
                    if (currentStep === 1) {
                      if (!newJob.title.trim() || !newJob.client.trim() || !newJob.contactNumber.trim()) {
                        Alert.alert("Missing Information", "Please fill in all required fields.");
                        return;
                      }
                      if (!validatePhone(newJob.contactNumber)) {
                        Alert.alert("Invalid Phone Number", "Please enter a valid Australian phone number.");
                        return;
                      }
                    } else if (currentStep === 2) {
                      if (!newJob.address.trim()) {
                        Alert.alert("Missing Address", "Please enter and verify the job address.");
                        return;
                      }
                      if (!addressValidated) {
                        Alert.alert("Address Not Verified", "Please verify the address before continuing.");
                        return;
                      }
                    } else if (currentStep === 4) {
                      if (taskMode === 'custom' && customTasks.length === 0) {
                        Alert.alert("No Tasks", "Please add at least one custom task or switch to template mode.");
                        return;
                      }
                      if (taskMode === 'custom') {
                        const incompleteTasks = customTasks.filter(task => !task.title.trim());
                        if (incompleteTasks.length > 0) {
                          Alert.alert("Incomplete Tasks", "Please fill in all task titles.");
                          return;
                        }
                      }
                    }
                    setCurrentStep(currentStep + 1);
                  } else {
                    handleAddJob();
                  }
                }}
                disabled={loading}
              >
                <LinearGradient 
                  colors={["#4facfe", "#00f2fe"]} 
                  style={styles.nextButtonGradient}
                >
                  {loading ? (
                    <AntDesign name="loading1" size={20} color="#fff" />
                  ) : currentStep < totalSteps ? (
                    <AntDesign name="arrowright" size={20} color="#fff" />
                  ) : (
                    <AntDesign name="check" size={20} color="#fff" />
                  )}
                  <Text style={styles.nextButtonText}>
                    {loading ? "Creating..." : 
                     currentStep < totalSteps ? "Next" : "Create Job"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        
        {showDatePicker && (
          <DateTimePicker
            value={newJob.scheduledDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
        
        {showTimePicker && (
          <DateTimePicker
            value={newJob.startTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  background: { flex: 1 },
  backgroundImage: { opacity: 0.03 },

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
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginLeft: -40,
  },
  logo: { width: 40, height: 40, marginRight: 12, borderRadius: 20 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  headerRight: { width: 40 },

  keyboardView: { flex: 1 },
  content: { flexGrow: 1, padding: 16 },

  // Progress
  progressContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  stepCircleActive: {
    backgroundColor: "#4facfe",
    borderColor: "#4facfe",
  },
  stepCircleComplete: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  stepNumberActive: {
    color: "#fff",
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 8,
  },
  stepLineComplete: {
    backgroundColor: "#10b981",
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },

  // Cards
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 12,
  },

  // Inputs
  inputGroup: { marginBottom: 16 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    paddingVertical: 16,
    fontWeight: "500",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: 8,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Address
  verifyButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 12,
    elevation: 3,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  successText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Schedule
  scheduleRow: {
    flexDirection: "row",
    gap: 12,
  },
  scheduleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  scheduleTextContainer: {
    marginLeft: 12,
  },
  scheduleLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 2,
  },
  scheduleValue: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "700",
  },

  // Priority
  priorityGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  priorityCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    color: "#64748b",
  },

  // Notes
  notesWrapper: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    padding: 16,
  },
  notesIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notesInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
    textAlignVertical: "top",
    minHeight: 80,
  },

  // Create Button
  createButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonDisabled: { 
    opacity: 0.7,
    elevation: 2,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 12,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  // Navigation Buttons
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6b7280",
  },
  nextButton: {
    flex: 2,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#4facfe",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  jobTypeGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  jobTypeCard: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  jobTypeCardSelected: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  jobTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    color: "#64748b",
    textAlign: "center",
  },
  taskModeSelector: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  taskModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  taskModeButtonActive: {
    backgroundColor: "#fff",
    elevation: 2,
  },
  taskModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  taskModeTextActive: {
    color: "#1e293b",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  templateSelector: {
    gap: 8,
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  templateCardSelected: {
    borderColor: "#10b981",
    backgroundColor: "#f0fdf4",
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  templateDescription: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  customTasksContainer: {
    gap: 12,
  },
  customTasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    gap: 4,
  },
  addTaskText: {
    color: "#4facfe",
    fontSize: 14,
    fontWeight: "600",
  },
  customTaskCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  customTaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customTaskNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4facfe",
  },
  customTaskInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  customTaskDescription: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  customTaskOptions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  timeInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    width: 80,
  },
  photoToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4facfe",
    gap: 4,
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
  recurringSection: {
    marginBottom: 20,
  },
  recurringToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  recurringLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  recurringOptions: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  recurringSubLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  dayButtonSelected: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  dayButtonTextSelected: {
    color: "#fff",
  },
  siteTypeSection: {
    marginBottom: 20,
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
  noTemplatesText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
});