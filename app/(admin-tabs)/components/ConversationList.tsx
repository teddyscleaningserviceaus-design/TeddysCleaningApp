import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  type: string;
  jobId?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  loading?: boolean;
}

export default function ConversationList({ 
  conversations, 
  selectedConversationId, 
  onConversationSelect,
  loading = false 
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'job-related' | 'clients' | 'employees'>('all');

  const getFilteredConversations = () => {
    let filtered = conversations;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.participants.some(p => p.toLowerCase().includes(query)) ||
        conv.lastMessage?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(conv => conv.unreadCount > 0);
        break;
      case 'job-related':
        filtered = filtered.filter(conv => conv.jobId);
        break;
      case 'clients':
        filtered = filtered.filter(conv => conv.type === 'client');
        break;
      case 'employees':
        filtered = filtered.filter(conv => conv.type === 'employee-chat' || conv.type === 'admin-employee');
        break;
    }

    return filtered;
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return timestamp.toLocaleDateString();
  };

  const getConversationType = (type: string) => {
    switch (type) {
      case 'admin-employee': return { color: '#8b5cf6', label: 'Admin' };
      case 'employee-chat': return { color: '#10b981', label: 'Team' };
      case 'client': return { color: '#4facfe', label: 'Client' };
      default: return { color: '#6b7280', label: 'General' };
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const typeInfo = getConversationType(item.type);
    const isSelected = item.id === selectedConversationId;
    
    return (
      <TouchableOpacity 
        style={[styles.conversationItem, isSelected && styles.selectedConversation]}
        onPress={() => onConversationSelect(item)}
      >
        <View style={styles.conversationHeader}>
          <View style={styles.participantsContainer}>
            <Text style={styles.participants} numberOfLines={1}>
              {item.participants.join(' & ')}
            </Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
                <Text style={styles.typeText}>{typeInfo.label}</Text>
              </View>
              {item.jobId && (
                <View style={styles.jobBadge}>
                  <MaterialIcons name="work" size={10} color="#4b5563" />
                </View>
              )}
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timestamp}>{formatTime(item.lastMessageAt)}</Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        
        <Text style={styles.lastMessage} numberOfLines={2}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredConversations = getFilteredConversations();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Conversations ({filteredConversations.length})</Text>
      </View>

      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={16} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'unread', 'job-related', 'clients', 'employees'] as const).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[styles.filterText, filter === filterType && styles.filterTextActive]}>
              {filterType === 'job-related' ? 'Jobs' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AntDesign name="message1" size={32} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {loading ? 'Loading conversations...' : 'No conversations found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#4facfe',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  conversationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedConversation: {
    backgroundColor: '#eff6ff',
    borderRightWidth: 3,
    borderRightColor: '#4facfe',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  participantsContainer: {
    flex: 1,
  },
  participants: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  jobBadge: {
    backgroundColor: '#f3f4f6',
    padding: 2,
    borderRadius: 4,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  lastMessage: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});