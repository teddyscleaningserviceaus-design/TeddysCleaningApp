import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ClientHeader from '../../components/ClientHeader';


const modules = [
  {
    id: 'basics',
    title: 'Cleaning Science Basics',
    description: 'Understanding the fundamental principles of cleaning',
    progress: 0,
    lessons: 6,
    icon: 'flask-outline',
    color: '#4facfe'
  },
  {
    id: 'chemistry',
    title: 'Chemistry of Cleaning',
    description: 'How different chemicals work to remove dirt and stains',
    progress: 0,
    lessons: 8,
    icon: 'beaker-outline',
    color: '#00d4ff'
  },
  {
    id: 'microbiology',
    title: 'Microbiology & Hygiene',
    description: 'Understanding germs, bacteria, and effective sanitization',
    progress: 0,
    lessons: 5,
    icon: 'bug-outline',
    color: '#28a745'
  },
  {
    id: 'sustainability',
    title: 'Sustainable Cleaning',
    description: 'Eco-friendly practices and green cleaning solutions',
    progress: 0,
    lessons: 7,
    icon: 'leaf-outline',
    color: '#ffc107'
  }
];

const quickTips = [
  {
    title: 'pH Matters',
    description: 'Different pH levels are effective for different types of cleaning tasks',
    icon: 'water-outline'
  },
  {
    title: 'Temperature Effect',
    description: 'Heat increases chemical reaction rates, making cleaning more effective',
    icon: 'thermometer-outline'
  },
  {
    title: 'Contact Time',
    description: 'Disinfectants need proper contact time to be effective against pathogens',
    icon: 'time-outline'
  }
];

export default function TEDucation() {
  const handleModulePress = (moduleId: string) => {
    Alert.alert(
      'TED-ucation Module',
      'This educational content will be integrated from our comprehensive TED-ucation platform. Coming soon!',
      [{ text: 'OK' }]
    );
  };

  const handleWebsitePress = () => {
    Alert.alert(
      'Visit TED-ucation Website',
      'This will open our full TED-ucation platform in your browser with comprehensive cleaning science education.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      <ClientHeader title="TED-ucation" subtitle="Science meets cleaning" theme="education" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to TED-ucation! 🧪</Text>
          <Text style={styles.welcomeDescription}>
            Discover the fascinating science behind effective cleaning. Learn about chemistry, 
            microbiology, and sustainable practices that make Teddy's Cleaning so effective.
          </Text>
          <TouchableOpacity style={styles.websiteButton} onPress={handleWebsitePress}>
            <Ionicons name="globe-outline" size={20} color="#fff" />
            <Text style={styles.websiteButtonText}>Visit Full Platform</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Modules</Text>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => handleModulePress(module.id)}
            >
              <View style={styles.moduleHeader}>
                <View style={[styles.moduleIcon, { backgroundColor: `${module.color}20` }]}>
                  <Ionicons name={module.icon as any} size={28} color={module.color} />
                </View>
                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDescription}>{module.description}</Text>
                  <View style={styles.moduleStats}>
                    <Text style={styles.moduleStatsText}>{module.lessons} lessons</Text>
                    <Text style={styles.moduleStatsText}>•</Text>
                    <Text style={styles.moduleStatsText}>{module.progress}% complete</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${module.progress}%`, backgroundColor: module.color }
                    ]} 
                  />
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Science Tips</Text>
          {quickTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons name={tip.icon as any} size={24} color="#4facfe" />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured Content</Text>
          <TouchableOpacity style={styles.featuredCard}>
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.featuredGradient}>
              <View style={styles.featuredContent}>
                <Ionicons name="flask" size={32} color="#fff" />
                <Text style={styles.featuredTitle}>The pH Scale in Cleaning</Text>
                <Text style={styles.featuredDescription}>
                  Learn how acidity and alkalinity affect cleaning effectiveness
                </Text>
                <View style={styles.featuredButton}>
                  <Text style={styles.featuredButtonText}>Start Learning</Text>
                  <Ionicons name="arrow-forward" size={16} color="#4facfe" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Ionicons name="trophy-outline" size={24} color="#ffc107" />
              <Text style={styles.progressTitle}>Learning Journey</Text>
            </View>
            <Text style={styles.progressDescription}>
              You're just getting started! Complete modules to unlock advanced topics and earn certificates.
            </Text>
            <View style={styles.achievementsList}>
              <View style={styles.achievement}>
                <Ionicons name="star-outline" size={16} color="#ccc" />
                <Text style={styles.achievementText}>Complete first module</Text>
              </View>
              <View style={styles.achievement}>
                <Ionicons name="medal-outline" size={16} color="#ccc" />
                <Text style={styles.achievementText}>Earn cleaning science certificate</Text>
              </View>
              <View style={styles.achievement}>
                <Ionicons name="ribbon-outline" size={16} color="#ccc" />
                <Text style={styles.achievementText}>Master sustainable practices</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  welcomeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  welcomeDescription: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  websiteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#667eea', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
  websiteButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  moduleCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  moduleHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  moduleIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  moduleInfo: { flex: 1 },
  moduleTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  moduleDescription: { fontSize: 14, color: '#666', marginBottom: 8, lineHeight: 18 },
  moduleStats: { flexDirection: 'row', alignItems: 'center' },
  moduleStatsText: { fontSize: 12, color: '#999', marginRight: 8 },
  progressContainer: { flexDirection: 'row', alignItems: 'center' },
  progressBar: { flex: 1, height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, marginRight: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  tipCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tipIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f8ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  tipDescription: { fontSize: 12, color: '#666', lineHeight: 16 },
  featuredCard: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  featuredGradient: { padding: 20 },
  featuredContent: { alignItems: 'center' },
  featuredTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 8, marginBottom: 8 },
  featuredDescription: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  featuredButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  featuredButtonText: { color: '#4facfe', fontWeight: 'bold', marginRight: 4 },
  progressCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  progressDescription: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  achievementsList: { },
  achievement: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  achievementText: { fontSize: 14, color: '#999', marginLeft: 8 }
});