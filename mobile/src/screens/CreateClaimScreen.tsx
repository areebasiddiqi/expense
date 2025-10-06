import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Client {
  id: string;
  name: string;
}

export function CreateClaimScreen({ navigation }: any) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [claimantName, setClaimantName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadClients();
  }, []);

  const loadUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (data) {
      setClaimantName(data.full_name || '');
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (data) {
      setClients(data);
    }
  };

  const handleCreate = async () => {
    if (!description.trim() || !startDate || !endDate || !claimantName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('expense_claims')
      .insert({
        user_id: user?.id,
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
        client_id: clientId,
        claimant_name: claimantName.trim(),
        status: 'draft',
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to create claim');
      return;
    }

    Alert.alert('Success', 'Claim created successfully', [
      {
        text: 'OK',
        onPress: () => navigation.replace('ClaimDetails', { claimId: data.id }),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Your Name *</Text>
          <TextInput
            style={styles.input}
            value={claimantName}
            onChangeText={setClaimantName}
            placeholder="Enter your name"
            editable={!loading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Claim Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., January 2024 Business Expenses"
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfWidth]}>
            <Text style={styles.label}>Start Date *</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              editable={!loading}
            />
          </View>

          <View style={[styles.field, styles.halfWidth]}>
            <Text style={styles.label}>End Date *</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              editable={!loading}
            />
          </View>
        </View>

        {clients.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Client (Optional)</Text>
            <View style={styles.clientList}>
              <TouchableOpacity
                style={[
                  styles.clientButton,
                  clientId === null && styles.clientButtonActive,
                ]}
                onPress={() => setClientId(null)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.clientButtonText,
                    clientId === null && styles.clientButtonTextActive,
                  ]}
                >
                  No Client
                </Text>
              </TouchableOpacity>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientButton,
                    clientId === client.id && styles.clientButtonActive,
                  ]}
                  onPress={() => setClientId(client.id)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.clientButtonText,
                      clientId === client.id && styles.clientButtonTextActive,
                    ]}
                  >
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Claim</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  form: {
    padding: 16,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  clientList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clientButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  clientButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  clientButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  clientButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
