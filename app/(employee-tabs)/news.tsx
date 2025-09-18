import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Image,
  Alert,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons, AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  imageUrl?: string;
  createdAt: any;
  createdBy: string;
  isPublished: boolean;
}

export default function EmployeeNews() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    // Simple query without orderBy to avoid index requirement
    const q = query(
      collection(db, 'news'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('News snapshot size:', snapshot.size);
        const newsData = snapshot.docs
          .map(doc => {
            const data = doc.data();
            console.log('News item:', doc.id, data);
            return { id: doc.id, ...data } as NewsItem;
          })
          .filter(item => {
            const isPublished = item.isPublished === true || item.isPublished === undefined;
            console.log('News item published status:', item.id, item.title, 'isPublished:', isPublished);
            return isPublished;
          })
          .sort((a, b) => {
            // Sort manually by createdAt
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
        
        console.log('Filtered news data:', newsData.length, 'items');
        setNews(newsData);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error fetching news:', error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, []);

  const toggleSidebar = () => {
    const isOpening = !isSidebarOpen;
    sidebarX.value = withSpring(isOpening ? 0 : -SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withTiming(isOpening ? 0.5 : 0, { duration: 300 });
    setIsSidebarOpen(isOpening);
  };

  const onRefresh = () => {
    setRefreshing(true);
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPriorityColor = (priority: string) => {
    if (!priority || typeof priority !== 'string') return '#6b7280';
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (!priority || typeof priority !== 'string') return 'radio-button-off';
    switch (priority) {
      case 'high': return 'alert-circle';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'radio-button-off';
    }
  };

  const getCategoryIcon = (category: string) => {
    if (!category || typeof category !== 'string') return 'newspaper';
    switch (category.toLowerCase()) {
      case 'announcement': return 'megaphone';
      case 'policy': return 'document-text';
      case 'training': return 'school';
      case 'safety': return 'shield-checkmark';
      case 'event': return 'calendar';
      case 'recognition': return 'trophy';
      default: return 'newspaper';
    }
  };

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity 
      style={styles.newsCard}
      onPress={() => setSelectedNews(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={['#ffffff', '#f8fafc']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryContainer}>
            <Ionicons 
              name={getCategoryIcon(item.category)} 
              size={16} 
              color={getPriorityColor(item.priority)} 
            />
            <Text style={[styles.category, { color: getPriorityColor(item.priority) }]}>
              {item.category || 'General'}
            </Text>
          </View>
          <View style={styles.priorityBadge}>
            <Ionicons 
              name={getPriorityIcon(item.priority)} 
              size={14} 
              color={getPriorityColor(item.priority)} 
            />
          </View>
        </View>
        
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>
        
        <Text style={styles.newsContent} numberOfLines={3}>
          {item.content || 'No content available'}
        </Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.timestamp}>
            {formatDate(item.createdAt)}
          </Text>
          <TouchableOpacity style={styles.readMoreButton}>
            <Text style={styles.readMoreText}>Read More</Text>
            <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderNewsDetail = () => (
    <View style={styles.detailContainer}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setSelectedNews(null)}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>News Detail</Text>
            <Text style={styles.headerSubtitle}>Article</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>
      
      <FlatList
        data={[selectedNews]}
        renderItem={({ item }) => (
          <View style={styles.detailContent}>
            <View style={styles.detailCategoryContainer}>
              <Ionicons 
                name={getCategoryIcon(item.category)} 
                size={20} 
                color={getPriorityColor(item.priority)} 
              />
              <Text style={[styles.detailCategory, { color: getPriorityColor(item.priority) }]}>
                {item.category}
              </Text>
              <View style={[styles.detailPriorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.detailPriorityText}>{item.priority.toUpperCase()}</Text>
              </View>
            </View>
            
            <Text style={styles.detailNewsTitle}>{item.title}</Text>
            <Text style={styles.detailTimestamp}>{formatDate(item.createdAt)}</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.detailNewsContent}>{item.content}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  if (selectedNews) {
    return renderNewsDetail();
  }

  return (
    <SafeAreaView style={styles.container}>
      {isSidebarOpen && (
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableOpacity style={styles.overlayTouch} onPress={toggleSidebar} />
        </Animated.View>
      )}

      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.sidebarGradient}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarProfile}>
              <View style={styles.avatarContainer}>
                {userProfile?.profilePicture || userProfile?.profileImage ? (
                  <Image 
                    source={{ uri: userProfile.profilePicture || userProfile.profileImage }} 
                    style={styles.sidebarAvatarImage} 
                    onError={() => console.log('Profile image failed to load')}
                  />
                ) : (
                  <AntDesign name="user" size={24} color="#fff" />
                )}
              </View>
              <View>
                <Text style={styles.sidebarUserName}>Welcome Back{userProfile?.firstName ? `, ${userProfile.firstName}!` : userProfile?.name ? `, ${userProfile.name.split(' ')[0]}!` : '!'}</Text>
                <Text style={styles.sidebarUserRole}>Cleaning Professional</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
              <AntDesign name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarDivider} />

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.replace('/(employee-tabs)/dashboard'); toggleSidebar(); }}>
            <AntDesign name="home" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Employee Dashboard</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.replace('/(employee-tabs)/jobs'); toggleSidebar(); }}>
            <Feather name="briefcase" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Job Sites & Tracking</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.replace('/(employee-tabs)/messaging'); toggleSidebar(); }}>
            <AntDesign name="message1" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Messages</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.replace('/(employee-tabs)/news'); toggleSidebar(); }}>
            <MaterialCommunityIcons name="newspaper" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>News</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.replace('/(employee-tabs)/profile'); toggleSidebar(); }}>
            <AntDesign name="user" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Profile</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.replace('/(employee-tabs)/schedule'); toggleSidebar(); }}>
            <AntDesign name="calendar" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Schedule</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/settings"); toggleSidebar(); }}>
            <AntDesign name="setting" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Settings</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.logoutButton} onPress={() => {
              Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Sign Out", 
                    style: "destructive",
                    onPress: () => router.replace("/")
                  }
                ]
              );
            }}>
              <AntDesign name="logout" size={20} color="#fff" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <AntDesign name="menuunfold" size={26} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>Company News</Text>
            <Text style={styles.headerSubtitle}>Latest Updates</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading news...</Text>
        </View>
      ) : news.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No News Available</Text>
          <Text style={styles.emptySubtitle}>Check back later for updates</Text>
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.newsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 15,
  },
  overlayTouch: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 20,
    elevation: 16,
  },
  sidebarGradient: {
    flex: 1,
    paddingTop: 60,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sidebarUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sidebarUserRole: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  sidebarIcon: {
    marginRight: 16,
  },
  sidebarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  sidebarFooter: {
    marginTop: "auto",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginLeft: -40,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  newsList: {
    padding: 16,
  },
  newsCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  priorityBadge: {
    padding: 4,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  newsContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  detailContent: {
    padding: 20,
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
  },
  detailCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailCategory: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    marginRight: 12,
    textTransform: 'capitalize',
  },
  detailPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailPriorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  detailNewsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 32,
  },
  detailTimestamp: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  detailNewsContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});