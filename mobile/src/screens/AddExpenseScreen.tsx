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
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

interface Category {
  id: string;
  name: string;
}

export function AddExpenseScreen({ route, navigation }: any) {
  const { claimId } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vatAmount, setVatAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('id, name')
      .eq('active', true)
      .order('name');

    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setCategoryId(data[0].id);
      }
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const uploadReceipt = async (expenseId: string) => {
    if (!receiptUri) return null;

    setUploading(true);

    try {
      const response = await fetch(receiptUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const fileExt = receiptUri.split('.').pop() || 'jpg';
      const fileName = `${expenseId}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !amount || !categoryId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        claim_id: claimId,
        title: title.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        vat_amount: vatAmount ? parseFloat(vatAmount) : 0,
        expense_date: expenseDate,
        category_id: categoryId,
      })
      .select()
      .single();

    if (expenseError || !expense) {
      Alert.alert('Error', 'Failed to save expense');
      setLoading(false);
      return;
    }

    if (receiptUri) {
      const receiptUrl = await uploadReceipt(expense.id);
      if (receiptUrl) {
        await supabase
          .from('expenses')
          .update({ receipt_url: receiptUrl })
          .eq('id', expense.id);
      }
    }

    setLoading(false);
    Alert.alert('Success', 'Expense added successfully');
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Client lunch"
            editable={!loading && !uploading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Additional details..."
            multiline
            numberOfLines={3}
            editable={!loading && !uploading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Amount (£) *</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!loading && !uploading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>VAT Amount (£)</Text>
          <TextInput
            style={styles.input}
            value={vatAmount}
            onChangeText={setVatAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={!loading && !uploading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date *</Text>
          <TextInput
            style={styles.input}
            value={expenseDate}
            onChangeText={setExpenseDate}
            placeholder="YYYY-MM-DD"
            editable={!loading && !uploading}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryList}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  categoryId === category.id && styles.categoryButtonActive,
                ]}
                onPress={() => setCategoryId(category.id)}
                disabled={loading || uploading}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    categoryId === category.id && styles.categoryButtonTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Receipt</Text>
          {receiptUri ? (
            <View style={styles.receiptContainer}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
              <TouchableOpacity
                style={styles.removeReceiptButton}
                onPress={() => setReceiptUri(null)}
              >
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.receiptButtons}>
              <TouchableOpacity
                style={styles.receiptButton}
                onPress={takePhoto}
                disabled={loading || uploading}
              >
                <Ionicons name="camera" size={24} color="#0f172a" />
                <Text style={styles.receiptButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptButton}
                onPress={pickImage}
                disabled={loading || uploading}
              >
                <Ionicons name="images" size={24} color="#0f172a" />
                <Text style={styles.receiptButtonText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (loading || uploading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading || uploading}
        >
          {loading || uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Expense</Text>
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
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#64748b',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  receiptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  receiptButtonText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  receiptContainer: {
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  removeReceiptButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
