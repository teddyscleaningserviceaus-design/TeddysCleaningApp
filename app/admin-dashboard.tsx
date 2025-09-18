import { AntDesign, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../config/firebase";
import { collection, getDocs, doc, updateDoc, query, where, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

const { width } = Dimensions.get("window");

export default function AdminDashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addEmployeeModalVisible, setAddEmployeeModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ role: "", department: "" });
  const [newEmployeeForm, setNewEmployeeForm] = useState({ name: "", tempEmail: "" });
  const router = useRouter();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const usersQuery = query(collection(db, "users"), where("userType", "==", "employee"));
      const querySnapshot = await getDocs(usersQuery);
      const employeeList = [];
      
      querySnapshot.forEach((doc) => {
        employeeList.push({ id: doc.id, ...doc.data() });
      });
      
      setEmployees(employeeList);
    } catch (error) {
      Alert.alert("Error", "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEditForm({
      role: employee.role || "Cleaning Specialist",
      department: employee.department || "Operations"
    });
    setEditModalVisible(true);
  };

  const saveEmployeeChanges = async () => {
    if (!selectedEmployee) return;
    
    try {
      await updateDoc(doc(db, "users", selectedEmployee.id), {
        role: editForm.role,
        department: editForm.department,
        updatedAt: new Date(),
      });
      
      Alert.alert("Success", "Employee updated successfully!");
      setEditModalVisible(false);
      loadEmployees();
    } catch (error) {
      Alert.alert("Error", "Failed to update employee");
    }
  };

  const createPreRegisteredEmployee = async () => {
    if (!newEmployeeForm.name.trim()) {
      Alert.alert("Missing Information", "Please enter employee name.");
      return;
    }

    try {
      // Generate temporary credentials
      const tempEmail = `temp_${Date.now()}@teddyscleaning.temp`;
      const tempPassword = "TempPass123!";
      const employeeId = `TC-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, tempPassword);
      const user = userCredential.user;

      // Create user document
      await setDoc(doc(db, "users", user.uid), {
        name: newEmployeeForm.name.trim(),
        email: tempEmail,
        phone: "",
        address: "",
        emergencyContact: "",
        role: "Cleaning Specialist",
        department: "Operations",
        userType: "employee",
        employeeId: employeeId,
        startDate: new Date().toLocaleDateString(),
        profileCompleted: false,
        credentialsSetup: false,
        isPreRegistered: true,
        passwordChanged: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert(
        "Employee Pre-Registered! 🎉",
        `Employee: ${newEmployeeForm.name}\nTemp Email: ${tempEmail}\nTemp Password: ${tempPassword}\n\nShare these credentials with the employee to complete setup.`,
        [{ text: "OK" }]
      );

      setAddEmployeeModalVisible(false);
      setNewEmployeeForm({ name: "", tempEmail: "" });
      loadEmployees();
    } catch (error) {
      Alert.alert("Error", "Failed to create employee. Please try again.");
    }
  };

  const renderEmployee = ({ item }) => (
    <View style={styles.employeeCard}>
      <View style={styles.employeeInfo}>
        <View style={styles.employeeAvatar}>
          <AntDesign name="user" size={24} color="#4facfe" />
        </View>
        <View style={styles.employeeDetails}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <Text style={styles.employeeRole}>{item.role}</Text>
          <Text style={styles.employeeDepartment}>{item.department}</Text>
          <Text style={styles.employeeId}>ID: {item.employeeId}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => handleEditEmployee(item)}
      >
        <AntDesign name="edit" size={20} color="#4facfe" />
      </TouchableOpacity>
    </View>
  );

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
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Manage Employees</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{employees.length}</Text>
              <Text style={styles.statLabel}>Total Employees</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{employees.filter(e => e.role === "Cleaning Specialist").length}</Text>
              <Text style={styles.statLabel}>Specialists</Text>
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setAddEmployeeModalVisible(true)}
            >
              <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.actionButtonGradient}>
                <AntDesign name="plus" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Add Employee</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/admin-tasks')}
            >
              <LinearGradient colors={["#f093fb", "#f5576c"]} style={styles.actionButtonGradient}>
                <Feather name="list" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Task Manager</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Employee Management</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading employees...</Text>
            </View>
          ) : (
            <FlatList
              data={employees}
              renderItem={renderEmployee}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.employeeList}
            />
          )}
        </View>

        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Employee</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Role</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.role}
                  onChangeText={(text) => setEditForm({...editForm, role: text})}
                  placeholder="Employee role"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.department}
                  onChangeText={(text) => setEditForm({...editForm, department: text})}
                  placeholder="Employee department"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={saveEmployeeChanges}
                >
                  <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.saveButtonGradient}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={addEmployeeModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setAddEmployeeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Pre-Register Employee</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employee Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newEmployeeForm.name}
                  onChangeText={(text) => setNewEmployeeForm({...newEmployeeForm, name: text})}
                  placeholder="Enter employee full name"
                />
              </View>

              <Text style={styles.infoText}>
                ℹ️ Temporary credentials will be generated. The employee can set their own email and password during onboarding.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setAddEmployeeModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={createPreRegisteredEmployee}
                >
                  <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.saveButtonGradient}>
                    <Text style={styles.saveButtonText}>Create</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  background: { flex: 1 },
  backgroundImage: { opacity: 0.05 },

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
  headerCenter: { 
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginLeft: -40,
  },
  logo: { width: 36, height: 36, marginRight: 12, borderRadius: 18 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  headerRight: { width: 40 },

  content: { flex: 1, padding: 20 },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    elevation: 4,
  },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#1f2937", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#6b7280", fontWeight: "500" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 16 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#6b7280" },

  employeeList: { paddingBottom: 20 },
  employeeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
  },
  employeeInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  employeeDetails: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 2 },
  employeeRole: { fontSize: 14, color: "#4facfe", fontWeight: "600", marginBottom: 2 },
  employeeDepartment: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
  employeeId: { fontSize: 10, color: "#9ca3af" },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f9ff",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1f2937", marginBottom: 20, textAlign: "center" },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },

  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  cancelButtonText: { textAlign: "center", fontSize: 16, fontWeight: "600", color: "#6b7280" },
  saveButton: { flex: 1, borderRadius: 8, overflow: "hidden", marginLeft: 8 },
  saveButtonGradient: { padding: 12, alignItems: "center" },
  saveButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#6b7280",
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#0284c7",
  },
});