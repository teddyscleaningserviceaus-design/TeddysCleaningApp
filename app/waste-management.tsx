import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function WasteManagement() {
  const router = useRouter();

  const binTypes = [
    {
      id: 'recycling',
      title: 'Recycling Bin',
      description: 'For paper, cardboard, plastic bottles, and metal cans',
      color: '#28a745',
      icon: 'leaf',
      available: true
    },
    {
      id: 'organic',
      title: 'Organic Waste Bin',
      description: 'For food scraps, garden waste, and compostable materials',
      color: '#8b5a2b',
      icon: 'flower',
      available: true
    },
    {
      id: 'electronic',
      title: 'E-Waste Collection',
      description: 'For old electronics, batteries, and tech equipment',
      color: '#6c757d',
      icon: 'phone-portrait',
      available: false
    },
    {
      id: 'hazardous',
      title: 'Hazardous Waste',
      description: 'For chemicals, paints, and dangerous materials',
      color: '#dc3545',
      icon: 'warning',
      available: false
    }
  ];

  const handleRequestBin = (binType) => {
    if (!binType.available) {
      Alert.alert('Coming Soon', `${binType.title} collection will be available soon!`);
      return;
    }

    Alert.alert(
      'Request Bin',
      `Would you like to request a ${binType.title}? We'll contact you within 24 hours to arrange delivery.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => {
            Alert.alert('Request Submitted', 'Thank you! We\'ll contact you soon to arrange your bin delivery.');
          }
        }
      ]
    );
  };

  const wasteGuides = [
    {
      title: 'What Goes in Recycling?',
      items: ['Clean plastic bottles', 'Paper & cardboard', 'Metal cans', 'Glass bottles'],
      color: '#28a745'
    },
    {
      title: 'Organic Waste Tips',
      items: ['Food scraps', 'Garden clippings', 'Coffee grounds', 'Eggshells'],
      color: '#8b5a2b'
    },
    {
      title: 'What NOT to Recycle',
      items: ['Dirty containers', 'Plastic bags', 'Broken glass', 'Electronics'],
      color: '#dc3545'
    }
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#28a745', '#20c997']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Waste Management</Text>
          <Text style={styles.headerSubtitle}>Sustainable collection solutions</Text>
        </View>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Environmental Impact */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <Ionicons name="earth" size={32} color="#28a745" />
            <Text style={styles.impactTitle}>Your Environmental Impact</Text>
          </View>
          <Text style={styles.impactDescription}>
            Join our waste management program and help create a cleaner, more sustainable future. 
            Every bin you use makes a difference!
          </Text>
          <View style={styles.impactStats}>
            <View style={styles.impactStat}>
              <Text style={styles.impactNumber}>85%</Text>
              <Text style={styles.impactLabel}>Waste Diverted</Text>
            </View>
            <View style={styles.impactStat}>
              <Text style={styles.impactNumber}>12kg</Text>
              <Text style={styles.impactLabel}>CO₂ Saved</Text>
            </View>
            <View style={styles.impactStat}>
              <Text style={styles.impactNumber}>100%</Text>
              <Text style={styles.impactLabel}>Recyclable</Text>
            </View>
          </View>
        </View>

        {/* Bin Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Collection Bins</Text>
          {binTypes.map((bin) => (
            <TouchableOpacity
              key={bin.id}
              style={[
                styles.binCard,
                !bin.available && styles.binCardDisabled
              ]}
              onPress={() => handleRequestBin(bin)}
            >
              <View style={styles.binHeader}>
                <View style={[styles.binIcon, { backgroundColor: `${bin.color}20` }]}>
                  <Ionicons name={bin.icon as any} size={24} color={bin.color} />
                </View>
                <View style={styles.binInfo}>
                  <Text style={styles.binTitle}>{bin.title}</Text>
                  <Text style={styles.binDescription}>{bin.description}</Text>
                </View>
                <View style={styles.binStatus}>
                  {bin.available ? (
                    <View style={[styles.statusBadge, { backgroundColor: bin.color }]}>
                      <Text style={styles.statusText}>Available</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, { backgroundColor: '#6c757d' }]}>
                      <Text style={styles.statusText}>Coming Soon</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Waste Guides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Waste Sorting Guide</Text>
          {wasteGuides.map((guide, index) => (
            <View key={index} style={styles.guideCard}>
              <View style={styles.guideHeader}>
                <View style={[styles.guideIndicator, { backgroundColor: guide.color }]} />
                <Text style={styles.guideTitle}>{guide.title}</Text>
              </View>
              <View style={styles.guideItems}>
                {guide.items.map((item, itemIndex) => (
                  <View key={itemIndex} style={styles.guideItem}>
                    <Ionicons name="checkmark-circle" size={16} color={guide.color} />
                    <Text style={styles.guideItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            {[
              { step: 1, title: 'Request a Bin', desc: 'Choose your waste type and request collection' },
              { step: 2, title: 'We Deliver', desc: 'Free delivery to your location within 48 hours' },
              { step: 3, title: 'Fill & Schedule', desc: 'Use the bin and schedule pickup when full' },
              { step: 4, title: 'We Collect', desc: 'Regular collection and proper waste processing' }
            ].map((item) => (
              <View key={item.step} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{item.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDescription}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <View style={styles.contactCard}>
            <Ionicons name="help-circle" size={24} color="#4facfe" />
            <Text style={styles.contactTitle}>Need Help?</Text>
            <Text style={styles.contactDescription}>
              Have questions about waste sorting or need a custom solution?
            </Text>
            <TouchableOpacity style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20, 
    paddingVertical: 20 
  },
  backButton: { 
    padding: 8, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.1)' 
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  content: { flex: 1, paddingHorizontal: 20 },
  
  impactCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    marginTop: -20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  impactHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  impactTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginLeft: 12 
  },
  impactDescription: { 
    fontSize: 14, 
    color: '#666', 
    lineHeight: 20, 
    marginBottom: 16 
  },
  impactStats: { 
    flexDirection: 'row', 
    justifyContent: 'space-around' 
  },
  impactStat: { alignItems: 'center' },
  impactNumber: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#28a745', 
    marginBottom: 4 
  },
  impactLabel: { 
    fontSize: 12, 
    color: '#666', 
    textAlign: 'center' 
  },
  
  section: { marginBottom: 24 },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 16 
  },
  
  binCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  binCardDisabled: { opacity: 0.6 },
  binHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  binIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  binInfo: { flex: 1 },
  binTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 4 
  },
  binDescription: { 
    fontSize: 14, 
    color: '#666' 
  },
  binStatus: { alignItems: 'flex-end' },
  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  statusText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  
  guideCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  guideHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  guideIndicator: { 
    width: 4, 
    height: 20, 
    borderRadius: 2, 
    marginRight: 12 
  },
  guideTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  guideItems: { paddingLeft: 16 },
  guideItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  guideItemText: { 
    fontSize: 14, 
    color: '#666', 
    marginLeft: 8 
  },
  
  stepsContainer: { gap: 12 },
  stepCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  stepNumber: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#28a745', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  stepNumberText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  stepContent: { flex: 1 },
  stepTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 4 
  },
  stepDescription: { 
    fontSize: 14, 
    color: '#666' 
  },
  
  contactCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 20, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  contactTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginTop: 8, 
    marginBottom: 8 
  },
  contactDescription: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 16 
  },
  contactButton: { 
    backgroundColor: '#4facfe', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 20 
  },
  contactButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  }
});