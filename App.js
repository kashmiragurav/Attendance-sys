import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Colors from './constants/Colors';
import { AuthProvider, useAuth } from './context/AuthContext';
import AccountScreen from './screens/AccountScreen';
import AttendanceHistoryScreen from './screens/AttendanceHistoryScreen';
import AttendanceScanScreen from './screens/AttendanceScanScreen';
import BankDetailsScreen from './screens/BankDetailsScreen';
import DashboardScreen from './screens/DashboardScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import EmploymentDetailsScreen from './screens/EmploymentDetailsScreen';
import FaceRegistrationScreen from './screens/FaceRegistrationScreen';
import FaceScanVerificationScreen from './screens/FaceScanVerificationScreen';
import LoginScreen from './screens/LoginScreen';
import PersonalDetailsScreen from './screens/PersonalDetailsScreen';
import ProfileDetailsScreen from './screens/ProfileDetailsScreen';
import ProfilePhotoScreen from './screens/ProfilePhotoScreen';
import ProfileScreen from './screens/ProfileScreen';
import RealTimeFaceScanScreen from './screens/RealTimeFaceScanScreen';
import RegisterScreen from './screens/RegisterScreen';
import ShiftTimingsScreen from './screens/ShiftTimingsScreen';

import AdminAdvancedSearchScreen from './screens/admin/AdminAdvancedSearchScreen';
import AdminAttendanceScreen from './screens/admin/AdminAttendanceScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import AdminEditAttendanceScreen from './screens/admin/AdminEditAttendanceScreen';
import AdminEmployeeDetailScreen from './screens/admin/AdminEmployeeDetailScreen';
import AdminEmployeeHistoryScreen from './screens/admin/AdminEmployeeHistoryScreen';
import AdminEmployeeLocationHistoryScreen from './screens/admin/AdminEmployeeLocationHistoryScreen';
import AdminEmployeesScreen from './screens/admin/AdminEmployeesScreen';
import AdminLocationMapScreen from './screens/admin/AdminLocationMapScreen';
import AdminLogsScreen from './screens/admin/AdminLogsScreen';
import AdminWorkReportScreen from './screens/admin/AdminWorkReportScreen';
import SuperAdminCompanyDetailsScreen from './screens/admin/SuperAdminCompanyDetailsScreen';
import SuperAdminDashboardScreen from './screens/admin/SuperAdminDashboardScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function SuperAdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
      <Stack.Screen name="SuperAdminCompanyDetails" component={SuperAdminCompanyDetailsScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminEmployees" component={AdminEmployeesScreen} />
      <Stack.Screen name="AdminAttendance" component={AdminAttendanceScreen} />
      <Stack.Screen name="AdminLocationMap" component={AdminLocationMapScreen} />
      <Stack.Screen name="AdminLogs" component={AdminLogsScreen} />
      <Stack.Screen name="AdminEmployeeDetail" component={AdminEmployeeDetailScreen} />
      <Stack.Screen name="AdminAdvancedSearch" component={AdminAdvancedSearchScreen} />
      <Stack.Screen name="AdminEmployeeHistory" component={AdminEmployeeHistoryScreen} />
      <Stack.Screen name="AdminEmployeeLocationHistory" component={AdminEmployeeLocationHistoryScreen} />
      <Stack.Screen name="AdminEditAttendance" component={AdminEditAttendanceScreen} />
      <Stack.Screen name="AdminWorkReport" component={AdminWorkReportScreen} />
      <Stack.Screen name="EmploymentDetails" component={EmploymentDetailsScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AttendanceScan" component={AttendanceScanScreen} />
      <Stack.Screen name="FaceScanVerification" component={FaceScanVerificationScreen} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
      <Stack.Screen name="FaceRegistration" component={FaceRegistrationScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      <Stack.Screen name="PersonalDetails" component={PersonalDetailsScreen} />
      <Stack.Screen name="EmploymentDetails" component={EmploymentDetailsScreen} />
      <Stack.Screen name="ShiftTimings" component={ShiftTimingsScreen} />
      <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="ProfilePhoto" component={ProfilePhotoScreen} />
      <Stack.Screen
        name="RealTimeFaceScan"
        component={RealTimeFaceScanScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        user?.role === 'SUPER_ADMIN' ? (
          <SuperAdminStack />
        ) : user?.role === 'admin' || user?.role === 'COMPANY_ADMIN' ? (
          <AdminStack />
        ) : (
          <AppStack />
        )
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
