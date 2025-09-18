import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
  View,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!auth.currentUser?.email) {
      Alert.alert("Error", "No email found for current user.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      
      Alert.alert(
        "Reset Link Sent! 📧",
        "A password reset link has been sent to your email. Please check your inbox and follow the instructions.",
        [
          { 
            text: "OK", 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to send password reset email. Please try again.");
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require("../assets/teddy-logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>Change Password</Text>
              <Text style={styles.headerSubtitle}>Security Settings</Text>
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
            <View style={styles.infoCard}>
              <View style={styles.iconContainer}>
                <AntDesign name="lock" size={40} color="#4facfe" />
              </View>
              
              <Text style={styles.title}>Secure Password Reset</Text>
              
              <Text style={styles.description}>
                For your security, we'll send a password reset link to your registered email address. This ensures only you can change your password.
              </Text>

              <View style={styles.emailContainer}>
                <Text style={styles.emailLabel}>Reset link will be sent to:</Text>
                <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.resetButton, loading && styles.resetButtonDisabled]} 
                onPress={handlePasswordReset}
                disabled={loading}
              >
                <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.resetButtonGradient}>
                  <AntDesign name="mail" size={20} color="#fff" />
                  <Text style={styles.resetButtonText}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.securityNote}>
                <AntDesign name="infocirlce" size={16} color="#6b7280" />
                <Text style={styles.securityText}>
                  The reset link will expire in 1 hour for security purposes.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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

  keyboardView: { flex: 1 },
  content: { flexGrow: 1, padding: 20, justifyContent: "center" },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },

  description: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },

  emailContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#4facfe",
  },

  emailLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4,
  },

  emailText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "600",
  },

  resetButton: {
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginBottom: 20,
  },

  resetButtonDisabled: { opacity: 0.6 },

  resetButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },

  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },

  securityText: {
    fontSize: 12,
    color: "#92400e",
    marginLeft: 8,
    flex: 1,
  },
});