import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import FaceRegisterScreen from './src/screens/FaceRegisterScreen';
import ScanAttendanceScreen from './src/screens/ScanAttendanceScreen';
import AttendanceListScreen from './src/screens/AttendanceListScreen';
import AdminDashboard from './src/screens/AdminDashboardNew';
import EmployeeProfileScreen from './src/screens/EmployeeProfileScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Colors } from './src/constants/colors';
import './src/services/firebase';

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminLogin"
        component={AdminLoginScreen}
        options={{ 
          title: 'Admin Login',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
}

function UserStack() {
  const { isAdmin } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="Scan"
        component={ScanAttendanceScreen}
        options={{ title: 'Mark Attendance' }}
      />
      <Stack.Screen
        name="RegisterFace"
        component={FaceRegisterScreen}
        options={{ title: 'Register Your Face' }}
      />
      <Stack.Screen
        name="AttendanceList"
        component={AttendanceListScreen}
        options={{ title: 'My Attendance History' }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: 'My Statistics' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      
      {/* Admin screens - always register so they can be navigated to */}
      <Stack.Screen
        name="Admin"
        component={AdminDashboard}
        options={{ 
          title: 'Admin Dashboard',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="EmployeeProfile"
        component={EmployeeProfileScreen}
        options={{ 
          title: 'Employee Profile',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function RootStack() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <UserStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ErrorBoundary>
  );
}
