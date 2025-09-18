import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../config/firebase";

export default function EnhancedLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'client' | 'employee'>('client');
  const router = useRouter();

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const isAdmin = email.toLowerCase() === "tewedross12@gmail.com";
        const role = isAdmin ? 'admin' : userType;
        
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          userType: role,
          role: isAdmin ? "Administrator" : userType === 'client' ? "Client" : "Cleaning Specialist",
          createdAt: new Date(),
        });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.container}>
      <View style={styles.card}>
        <Image source={require("../assets/teddy-logo.png")} style={styles.logo} />
        
        {/* Role Selection Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, userType === 'client' && styles.activeTab]}
            onPress={() => setUserType('client')}
          >
            <Text style={[styles.tabText, userType === 'client' && styles.activeTabText]}>Client</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, userType === 'employee' && styles.activeTab]}
            onPress={() => setUserType('employee')}
          >
            <Text style={[styles.tabText, userType === 'employee' && styles.activeTabText]}>Employee</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          {isLogin ? "Welcome Back 👋" : `Join as ${userType === 'client' ? 'Client' : 'Employee'} 🚀`}
        </Text>
        <Text style={styles.subtitle}>
          {userType === 'client'
            ? isLogin ? "Access your bookings and service history" : "Book cleaning services and manage appointments"
            : isLogin ? "Manage jobs, schedules, and team tasks" : "Join our cleaning team and manage jobs"}
        </Text>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        <TouchableOpacity style={styles.button} onPress={handleAuth}>
          <Text style={styles.buttonText}>{isLogin ? "Login" : "Sign Up"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>

        {/* Guest Booking Option for Clients */}
        {userType === 'client' && (
          <View style={styles.guestSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity style={styles.guestButton} onPress={() => router.push('/guest-booking')}>
              <Text style={styles.guestButtonText}>Book as Guest</Text>
              <Text style={styles.guestSubtext}>No account needed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { backgroundColor: "white", padding: 24, borderRadius: 20, width: "85%", alignItems: "center" },
  logo: { width: 90, height: 90, marginBottom: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 20, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#4facfe' },
  tabText: { fontSize: 16, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  title: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 20 },
  input: { width: "100%", height: 50, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#4facfe", paddingVertical: 12, borderRadius: 12, width: "100%", alignItems: "center", marginBottom: 12 },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  switchText: { color: "#4facfe", fontSize: 14, marginTop: 8 },
  guestSection: { marginTop: 20, width: '100%' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { marginHorizontal: 16, color: '#666', fontSize: 14 },
  guestButton: { backgroundColor: '#f8f9fa', borderWidth: 2, borderColor: '#4facfe', borderStyle: 'dashed', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  guestButtonText: { color: '#4facfe', fontSize: 16, fontWeight: 'bold' },
  guestSubtext: { color: '#666', fontSize: 12, marginTop: 4 },
});