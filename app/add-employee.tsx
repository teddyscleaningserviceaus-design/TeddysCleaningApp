import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../config/firebase";

export default function AddEmployee() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    latitude: null,
    longitude: null
  });
  const [errors, setErrors] = useState({});
  const [addressValidated, setAddressValidated] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+61|0)[2-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateAddress = async () => {
    if (!employee.address.trim()) return;
    
    setValidatingAddress(true);
    try {
      const encodedAddress = encodeURIComponent(employee.address.trim());
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        setEmployee({
          ...employee,
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

  const validateForm = () => {
    const newErrors = {};

    if (!employee.firstName.trim()) newErrors.firstName = "First name is required";
    if (!employee.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!employee.username.trim()) {
      newErrors.username = "Username is required";
    } else if (employee.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(employee.username.trim())) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }
    
    if (!employee.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(employee.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!employee.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(employee.phone)) {
      newErrors.phone = "Please enter a valid Australian phone number";
    }

    if (!employee.address.trim()) {
      newErrors.address = "Address is required";
    } else if (!addressValidated) {
      newErrors.address = "Please verify the address before continuing";
    }

    if (!employee.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordReqs = {
        length: employee.password.length >= 8,
        uppercase: /[A-Z]/.test(employee.password),
        lowercase: /[a-z]/.test(employee.password),
        number: /\d/.test(employee.password)
      };
      if (!Object.values(passwordReqs).every(Boolean)) {
        newErrors.password = "Password must be 8+ chars with uppercase, lowercase, and number";
      }
    }

    if (employee.password !== employee.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        employee.email.trim(), 
        employee.password
      );

      // Use provided username or generate from email
      const username = employee.username.trim() || employee.email.trim().split('@')[0].toLowerCase();
      
      // Create user document in both collections for compatibility
      const employeeData = {
        firstName: employee.firstName.trim(),
        lastName: employee.lastName.trim(),
        displayName: `${employee.firstName.trim()} ${employee.lastName.trim()}`,
        username: username,
        email: employee.email.trim().toLowerCase(),
        phone: employee.phone.trim(),
        address: employee.address.trim(),
        latitude: employee.latitude,
        longitude: employee.longitude,
        userType: "employee",
        emailVerified: true, // Auto-verify admin-created employees
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: auth.currentUser?.uid
      };

      // Create in users collection (for auth)
      await setDoc(doc(db, "users", userCredential.user.uid), employeeData);
      
      // Also create in employees collection (for dashboard compatibility)
      await setDoc(doc(db, "employees", userCredential.user.uid), employeeData);

      Alert.alert("Success", "Employee added successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Add employee error:", error);
      Alert.alert("Error", error.message || "Failed to add employee");
    } finally {
      setLoading(false);
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
          <Text style={styles.headerTitle}>Add Employee</Text>
          <Text style={styles.headerSubtitle}>Create new team member</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Employee Details</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <View style={[styles.inputWrapper, errors.firstName && styles.inputError]}>
                <AntDesign name="user" size={18} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={employee.firstName}
                  onChangeText={(text) => {
                    setEmployee({...employee, firstName: text});
                    if (errors.firstName) setErrors({...errors, firstName: null});
                  }}
                  placeholder="First name"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <View style={[styles.inputWrapper, errors.lastName && styles.inputError]}>
                <AntDesign name="user" size={18} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={employee.lastName}
                  onChangeText={(text) => {
                    setEmployee({...employee, lastName: text});
                    if (errors.lastName) setErrors({...errors, lastName: null});
                  }}
                  placeholder="Last name"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username *</Text>
            <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
              <AntDesign name="user" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={employee.username}
                onChangeText={(text) => {
                  setEmployee({...employee, username: text});
                  if (errors.username) setErrors({...errors, username: null});
                }}
                placeholder="employee_username"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
            </View>
            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              <AntDesign name="mail" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={employee.email}
                onChangeText={(text) => {
                  setEmployee({...employee, email: text});
                  if (errors.email) setErrors({...errors, email: null});
                }}
                placeholder="employee@teddyscleaning.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
              <AntDesign name="phone" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={employee.phone}
                onChangeText={(text) => {
                  setEmployee({...employee, phone: text});
                  if (errors.phone) setErrors({...errors, phone: null});
                }}
                placeholder="0412 345 678"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <View style={[styles.inputWrapper, errors.address && styles.inputError]}>
              <AntDesign name="home" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={employee.address}
                onChangeText={(text) => {
                  setEmployee({...employee, address: text, latitude: null, longitude: null});
                  setAddressValidated(false);
                  if (errors.address) setErrors({...errors, address: null});
                }}
                placeholder="Employee home address"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.verifyButton, validatingAddress && styles.verifyButtonDisabled]}
              onPress={validateAddress}
              disabled={validatingAddress || !employee.address.trim()}
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
            {addressValidated && employee.latitude && (
              <View style={styles.successBadge}>
                <AntDesign name="checkcircle" size={16} color="#10b981" />
                <Text style={styles.successText}>Address verified!</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password *</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
              <AntDesign name="lock" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={employee.password}
                onChangeText={(text) => {
                  setEmployee({...employee, password: text});
                  if (errors.password) setErrors({...errors, password: null});
                }}
                placeholder="8+ chars, uppercase, lowercase, number"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <AntDesign name="lock" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={employee.confirmPassword}
                onChangeText={(text) => {
                  setEmployee({...employee, confirmPassword: text});
                  if (errors.confirmPassword) setErrors({...errors, confirmPassword: null});
                }}
                placeholder="Confirm password"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddEmployee}
          disabled={loading}
        >
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.addButtonGradient}>
            {loading ? (
              <AntDesign name="loading1" size={24} color="#fff" />
            ) : (
              <AntDesign name="plus" size={24} color="#fff" />
            )}
            <Text style={styles.addButtonText}>
              {loading ? "Adding Employee..." : "Add Employee"}
            </Text>
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
  headerRight: {
    width: 40,
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
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
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
  input: {
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
  addButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
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
});