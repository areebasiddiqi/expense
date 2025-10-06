import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Claim {
  id: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  client?: { name: string };
}

export function ClaimsListScreen({ navigation }: any) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const loadClaims = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('expense_claims')
      .select('*, client:clients(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClaims(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const onRefresh = () => {
    setRefreshing(true);
    loadClaims();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#94a3b8';
      case 'submitted':
        return '#3b82f6';
      case 'approved':
        return '#22c55e';
      case 'rejected':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderClaimItem = ({ item }: { item: Claim }) => (
    <TouchableOpacity
      style={styles.claimCard}
      onPress={() => navigation.navigate('ClaimDetails', { claimId: item.id })}
    >
      <View style={styles.claimHeader}>
        <Text style={styles.claimDescription} numberOfLines={1}>
          {item.description}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.claimDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>
            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
          </Text>
        </View>

        {item.client && (
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={14} color="#64748b" />
            <Text style={styles.detailText}>{item.client.name}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>
            Created {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Expenses</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateClaim')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {claims.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No expense claims yet</Text>
          <Text style={styles.emptyText}>Create your first claim to get started</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateClaim')}
          >
            <Text style={styles.createButtonText}>Create Claim</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={claims}
          renderItem={renderClaimItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  addButton: {
    backgroundColor: '#0f172a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  claimCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  claimDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  claimDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
