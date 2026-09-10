import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { FeatureGate } from '../components/FeatureGate';
import Colors, { shadows } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { attendanceHelpers, db } from '../services/firebaseConfig';
import { formatTime } from '../utils/attendance';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { user, isFeatureEnabled, FEATURES, refreshCompany } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isWFH, setIsWFH] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTodayAttendance();
      if (refreshCompany) refreshCompany();
    }, [])
  );

  const loadTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await attendanceHelpers.getTodayAttendanceDoc(user.uid, today);
      if (result.success && result.data) {
        setTodayAttendance({ ...result.data, id: result.id });
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const handleFaceScan = () => {
    const isFaceEnabled = isFeatureEnabled(FEATURES.FACE_RECOGNITION);

    if (!isFaceEnabled) {
      navigation.navigate('AttendanceScan', { isWFH });
      return;
    }

    navigation.navigate('RealTimeFaceScan', {
      action: todayAttendance?.checkIn && !todayAttendance?.checkOut ? 'check-out' : 'check-in',
      isWFH: isWFH,
      onSuccess: async () => {
        await loadTodayAttendance();
      }
    });
  };

  const isPunchedIn = todayAttendance && todayAttendance.checkIn && !todayAttendance.checkOut;

  const getLiveWorkHours = () => {
    if (!todayAttendance) return 0;
    let sessions = [];
    if (todayAttendance.sessions) {
      if (Array.isArray(todayAttendance.sessions)) {
        sessions = todayAttendance.sessions;
      } else if (typeof todayAttendance.sessions === 'string') {
        try { sessions = JSON.parse(todayAttendance.sessions); } catch (e) { sessions = []; }
      }
    }
    const completedHours = sessions.reduce((acc, s) => acc + (s.sessionHours || 0), 0);
    if (isPunchedIn) {
      const activeSession = sessions.find(s => !s.checkOut);
      if (activeSession) {
        const start = new Date(activeSession.checkIn);
        const now = new Date();
        const activeHours = (now - start) / (1000 * 60 * 60);
        return completedHours + activeHours;
      }
    }
    return todayAttendance.workHours || completedHours;
  };

  const currentWorkHours = getLiveWorkHours();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.userNameText}>{user?.name?.split(' ')[0] || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('AttendanceHistory')}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Company Badge */}
        <View style={styles.companyCard}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.companyGradient}
          >
            <Ionicons name="business" size={24} color="#FFF" style={{ opacity: 0.8 }} />
            <Text style={styles.companyName}>
              {user?.companyName || 'Digisahyadri PVT LTD'}
            </Text>
          </LinearGradient>
        </View>

        {/* Live Status Card */}
        <View style={styles.statusSection}>
          <View style={styles.statusBar}>
            <View style={[styles.statusIndicator, { backgroundColor: isPunchedIn ? Colors.success : Colors.error }]} />
            <Text style={styles.statusLabel}>
              {isPunchedIn ? 'Currently Working' : 'Not Clocked In'}
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Check In</Text>
              <Text style={styles.statValue}>
                {todayAttendance?.checkInTime || (todayAttendance?.checkIn ? formatTime(new Date(todayAttendance.checkIn)) : '--:--')}
              </Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EEE' }]}>
              <Text style={styles.statLabel}>Check Out</Text>
              <Text style={styles.statValue}>
                {todayAttendance?.checkOutTime || (todayAttendance?.checkOut ? formatTime(new Date(todayAttendance.checkOut)) : '--:--')}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Work Hours</Text>
              <Text style={styles.statValue}>{currentWorkHours.toFixed(1)}h</Text>
            </View>
          </View>
        </View>

        {/* WFH Mode Selection (Enterprise Only) */}
        <FeatureGate feature={FEATURES.WFH_MODE}>
          <TouchableOpacity
            style={[styles.wfhToggle, isWFH && styles.wfhToggleActive]}
            onPress={() => setIsWFH(!isWFH)}
          >
            <View style={styles.wfhLabelCol}>
              <View style={styles.wfhIconBox}>
                <Ionicons name="home" size={20} color={isWFH ? '#FFF' : '#F39C12'} />
              </View>
              <View>
                <Text style={[styles.wfhTitle, isWFH && { color: '#FFF' }]}>Work From Home Mode</Text>
                <Text style={[styles.wfhSubtitle, isWFH && { color: '#FFE' }]}>
                  {isWFH ? 'Geo-fence & WiFi validation bypassed' : 'Enable to work remotely'}
                </Text>
              </View>
            </View>
            <View style={[styles.toggleTrack, isWFH && styles.toggleTrackActive]}>
              <View style={[styles.toggleKnob, isWFH && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </FeatureGate>

        {/* Giant Punch Button Area */}
        <View style={styles.punchArea}>
          <TouchableOpacity
            style={styles.scanTarget}
            onPress={handleFaceScan}
            activeOpacity={0.9}
          >
            <View style={[styles.outerRing, { borderColor: isPunchedIn ? '#FFEBEB' : '#EBF5FF' }]}>
              <View style={[styles.innerRing, { backgroundColor: isPunchedIn ? '#FF475715' : '#4A90E215' }]}>
                <Ionicons
                  name={isPunchedIn ? "log-out" : "finger-print"}
                  size={80}
                  color={isPunchedIn ? '#FF4757' : '#4A90E2'}
                />
              </View>
            </View>
            <Text style={styles.punchHintText}>
              {isPunchedIn ? 'TAP TO CLOCK OUT' : 'TAP TO CLOCK IN'}
            </Text>
            <View style={styles.methodBadge}>
              <Ionicons
                name={isWFH ? "home" : (isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? "scan" : "location")}
                size={12}
                color={Colors.primary}
              />
              <Text style={styles.methodText}>
                {isWFH ? 'WFH MODE' : (isFeatureEnabled(FEATURES.FACE_RECOGNITION) ? 'Face Recognition' : 'Location Validation')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="calendar"
              title="History"
              onPress={() => navigation.navigate('AttendanceHistory')}
            />
            <ActionButton
              icon="person"
              title="Profile"
              onPress={() => navigation.navigate('Profile')}
            />
            <ActionButton
              icon="document-text"
              title="Documents"
              onPress={() => navigation.navigate('Documents')}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

const ActionButton = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <View style={styles.actionIconBox}>
      <Ionicons name={icon} size={24} color="#4A90E2" />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 25,
  },
  greetingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1C1C1E',
    marginTop: 2,
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#F2F2F7',
  },
  companyCard: {
    marginHorizontal: 25,
    marginBottom: 25,
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.small,
  },
  companyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 12,
  },
  companyName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusSection: {
    marginHorizontal: 25,
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 20,
    ...shadows.medium,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F9F9FB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1C1E',
  },
  punchArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  scanTarget: {
    alignItems: 'center',
  },
  outerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 10,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
    backgroundColor: '#FFF',
  },
  innerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchHintText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1C1E',
    letterSpacing: 1,
  },
  subHintText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 5,
  },
  quickActions: {
    paddingHorizontal: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    width: (width - 70) / 3,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    ...shadows.small,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  actionIconBox: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  wfhToggle: {
    marginHorizontal: 25,
    marginBottom: 30,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#F39C1233',
    ...shadows.small,
  },
  wfhToggleActive: {
    backgroundColor: '#F39C12',
    borderColor: '#F39C12',
  },
  wfhLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  wfhIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F39C1215',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wfhTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  wfhSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    padding: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#FFF',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    ...shadows.small,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
    backgroundColor: '#F39C12',
  },
  methodBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  methodText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4A90E2',
    letterSpacing: 0.5,
  }
});
