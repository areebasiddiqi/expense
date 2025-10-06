import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ClaimsListScreen } from './src/screens/ClaimsListScreen';
import { ClaimDetailsScreen } from './src/screens/ClaimDetailsScreen';
import { CreateClaimScreen } from './src/screens/CreateClaimScreen';
import { AddExpenseScreen } from './src/screens/AddExpenseScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#0f172a',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="ClaimsList"
        component={ClaimsListScreen}
        options={({ navigation }) => ({
          headerShown: false,
          headerRight: () => (
            <TouchableOpacity onPress={signOut}>
              <Ionicons name="log-out-outline" size={24} color="#0f172a" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="ClaimDetails"
        component={ClaimDetailsScreen}
        options={{
          title: 'Claim Details',
        }}
      />
      <Stack.Screen
        name="CreateClaim"
        component={CreateClaimScreen}
        options={{
          title: 'Create Claim',
        }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{
          title: 'Add Expense',
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
