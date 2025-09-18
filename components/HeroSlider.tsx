import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Ready for a spotless space?',
    subtitle: 'Professional cleaning in under 2 minutes',
    buttonText: 'Book Now - It\'s Easy!',
    action: '/client-job-request',
    gradient: ['#4facfe', '#00f2fe']
  },
  {
    id: 2,
    title: 'Eco-Friendly Solutions',
    subtitle: '100% biodegradable cleaning products',
    buttonText: 'Learn More',
    action: '/(client-tabs)/teducation',
    gradient: ['#28a745', '#20c997']
  },
  {
    id: 3,
    title: 'Smart Waste Management',
    subtitle: 'Sustainable collection solutions',
    buttonText: 'Request Bins',
    action: '/(client-tabs)/waste',
    gradient: ['#667eea', '#764ba2']
  }
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleAction = (action: string) => {
    router.push(action as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.slideContainer}>
        <LinearGradient 
          colors={slides[currentSlide].gradient} 
          style={styles.slide}
        >
          <View style={styles.slideContent}>
            <Text style={styles.slideTitle}>{slides[currentSlide].title}</Text>
            <Text style={styles.slideSubtitle}>{slides[currentSlide].subtitle}</Text>
            <TouchableOpacity 
              style={styles.slideButton}
              onPress={() => handleAction(slides[currentSlide].action)}
            >
              <Text style={styles.slideButtonText}>{slides[currentSlide].buttonText}</Text>
              <Ionicons name="arrow-forward" size={18} color="#4facfe" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
      
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.paginationDot,
              currentSlide === index && styles.paginationDotActive
            ]}
            onPress={() => setCurrentSlide(index)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140,
    marginBottom: 15
  },
  slideContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 20
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  slideContent: {
    alignItems: 'center'
  },
  slideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6
  },
  slideSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 16
  },
  slideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  slideButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4facfe'
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(79, 172, 254, 0.3)'
  },
  paginationDotActive: {
    backgroundColor: '#4facfe',
    width: 24
  }
});