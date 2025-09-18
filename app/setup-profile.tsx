import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
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
  View,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function SetupProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Redirect if user logs out or closes app
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/");
      }
    });
    return unsubscribe;
  }, []);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    emergencyContact: "",
  });

  const isFormValid = () => {
    return formData.name.trim() && 
           formData.phone.trim() && 
           formData.address.trim() && 
           formData.emergencyContact.trim();
  };

  const handleComplete = async () => {
    if (!isFormValid()) {
      Alert.alert("Incomplete Information", "Please fill in all required fields to continue.");
      return;
    }

    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      // Generate employee ID
      const employeeId = `TC-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        emergencyContact: formData.emergencyContact.trim(),
        role: "Cleaning Specialist", // Default role
        department: "Operations", // Default department
        userType: "employee", // Default user type
        employeeId: employeeId,
        startDate: new Date().toLocaleDateString(),
        email: auth.currentUser.email,
        profileCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      router.replace("/dashboard");
    } catch (error) {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
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
          <View style={styles.headerCenter}>
            <Image source={require("../assets/teddy-logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>Complete Your Profile</Text>
              <Text style={styles.headerSubtitle}>Required to Continue</Text>
            </View>
          </View>
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
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Welcome to Teddy's Cleaning! 🎉</Text>
            <Text style={styles.welcomeText}>
              To get started, we need some basic information to set up your employee profile.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Personal Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                placeholder="Enter your full name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({...formData, phone: text})}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Home Address *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.address}
                onChangeText={(text) => setFormData({...formData, address: text})}
                placeholder="Enter your complete address"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Emergency Contact *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.emergencyContact}
                onChangeText={(text) => setFormData({...formData, emergencyContact: text})}
                placeholder="Name and phone number"
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.completeButton, 
                !isFormValid() && styles.completeButtonDisabled,
                loading && styles.completeButtonDisabled
              ]} 
              onPress={handleComplete}
              disabled={!isFormValid() || loading}
            >
              <LinearGradient 
                colors={isFormValid() ? ["#11998e", "#38ef7d"] : ["#9CA3AF", "#6B7280"]} 
                style={styles.completeButtonGradient}
              >
                <Text style={styles.completeButtonText}>
                  {loading ? "Setting up..." : "Complete Setup"}
                </Text>
                <AntDesign name="arrowright" size={20} color="#fff" style={styles.buttonIcon} />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.requiredNote}>* All fields are required to access the dashboard</Text>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  background: { flex: 1 },
  backgroundImage: { opacity: 0.05 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    elevation: 8,
  },
  headerCenter: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  logo: { 
    width: 40, 
    height: 40, 
    marginRight: 16,
    borderRadius: 20,
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },

  keyboardView: {
    flex: 1,
  },
  content: { 
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },

  welcomeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },

  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
    minHeight: 50,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  completeButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
    marginBottom: 16,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginLeft: 8,
  },
  requiredNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});