import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function PasswordResetSentPage() {
  const router = useRouter();

  const handleBackToLogin = async () => {
    await auth.signOut();
    router.replace("/");
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
              <Text style={styles.headerTitle}>Password Reset</Text>
              <Text style={styles.headerSubtitle}>Check Your Email</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.messageCard}>
            <View style={styles.iconContainer}>
              <AntDesign name="mail" size={60} color="#4facfe" />
            </View>
            
            <Text style={styles.title}>Reset Link Sent! 📧</Text>
            
            <Text style={styles.message}>
              We've sent a password reset link to your email address. Please check your inbox and follow the instructions to set your new password.
            </Text>

            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Next Steps:</Text>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Check your email inbox</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Click the reset link</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Set your new password</Text>
              </View>
              <View style={styles.instructionItem}>
                <Text style={styles.stepNumber}>4</Text>
                <Text style={styles.stepText}>Return to login with new password</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
              <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.backButtonGradient}>
                <AntDesign name="arrowleft" size={20} color="#fff" />
                <Text style={styles.backButtonText}>Back to Login</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.helpText}>
              Didn't receive the email? Check your spam folder or contact your administrator.
            </Text>
          </View>
        </View>
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
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    elevation: 8,
  },
  headerCenter: { flexDirection: "row", alignItems: "center" },
  logo: { width: 40, height: 40, marginRight: 16, borderRadius: 20 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: "500" },

  content: { flex: 1, padding: 20, justifyContent: "center" },

  messageCard: {
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },

  message: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },

  instructionsContainer: {
    width: "100%",
    marginBottom: 32,
  },

  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 16,
  },

  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4facfe",
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
    marginRight: 12,
  },

  stepText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },

  backButton: {
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginBottom: 20,
  },

  backButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },

  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  helpText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
});