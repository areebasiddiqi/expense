import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  expense_categories: { name: string } | null;
}

interface Claim {
  id: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  claimant_name: string;
  client: { name: string } | null;
}

export function ClaimDetailsScreen({ route, navigation }: any) {
  const { claimId } = route.params;
  const [claim, setClaim] = useState<Claim | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadClaimDetails = useCallback(async () => {
    const { data: claimData } = await supabase
      .from('expense_claims')
      .select('*, client:clients(name)')
      .eq('id', claimId)
      .single();

    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*, expense_categories(name)')
      .eq('claim_id', claimId)
      .order('expense_date', { ascending: false });

    if (claimData) setClaim(claimData);
    if (expensesData) setExpenses(expensesData);
    setLoading(false);
  }, [claimId]);

  useEffect(() => {
    loadClaimDetails();
  }, [loadClaimDetails]);

  const calculateTotal = () => {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  };

  const handleSubmitClaim = async () => {
    if (expenses.length === 0) {
      Alert.alert('Error', 'Please add at least one expense before submitting');
      return;
    }

    Alert.alert(
      'Submit Claim',
      'Are you sure you want to submit this claim for approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            const { error } = await supabase
              .from('expense_claims')
              .update({
                status: 'submitted',
                submitted_at: new Date().toISOString(),
              })
              .eq('id', claimId);

            setSubmitting(false);

            if (error) {
              Alert.alert('Error', 'Failed to submit claim');
            } else {
              Alert.alert('Success', 'Claim submitted successfully');
              navigation.goBack();
            }
          },
        },
      ]
    );
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.centerContainer}>
        <Text>Claim not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.claimInfo}>
          <View style={styles.claimHeader}>
            <Text style={styles.claimTitle}>{claim.description}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: getStatusColor(claim.status) + '20' }]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(claim.status) }]}>
                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.infoText}>
              {new Date(claim.start_date).toLocaleDateString()} -{' '}
              {new Date(claim.end_date).toLocaleDateString()}
            </Text>
          </View>

          {claim.client && (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={16} color="#64748b" />
              <Text style={styles.infoText}>{claim.client.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            {claim.status === 'draft' && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('AddExpense', { claimId: claim.id })
                }
              >
                <Ionicons name="add-circle" size={24} color="#0f172a" />
              </TouchableOpacity>
            )}
          </View>

          {expenses.length === 0 ? (
            <View style={styles.emptyExpenses}>
              <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>No expenses added yet</Text>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {expenses.map((expense) => (
                <View key={expense.id} style={styles.expenseCard}>
                  <View style={styles.expenseHeader}>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseTitle}>{expense.title}</Text>
                      <Text style={styles.expenseDescription}>{expense.description}</Text>
                      <View style={styles.expenseMeta}>
                        <Text style={styles.expenseDate}>
                          {new Date(expense.expense_date).toLocaleDateString()}
                        </Text>
                        {expense.expense_categories && (
                          <>
                            <Text style={styles.metaDivider}>•</Text>
                            <Text style={styles.expenseCategory}>
                              {expense.expense_categories.name}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Text style={styles.expenseAmount}>£{Number(expense.amount).toFixed(2)}</Text>
                  </View>
                  {expense.receipt_url && (
                    <TouchableOpacity style={styles.receiptButton}>
                      <Ionicons name="document-attach-outline" size={16} color="#3b82f6" />
                      <Text style={styles.receiptText}>View Receipt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>£{calculateTotal().toFixed(2)}</Text>
        </View>
      </ScrollView>

      {claim.status === 'draft' && expenses.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmitClaim}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit for Approval</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  scrollView: {
    flex: 1,
  },
  claimInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  claimTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptyExpenses: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  expensesList: {
    gap: 12,
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  expenseDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expenseDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  metaDivider: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  expenseCategory: {
    fontSize: 12,
    color: '#94a3b8',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  receiptText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  totalContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
