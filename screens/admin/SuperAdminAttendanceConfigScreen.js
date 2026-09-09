import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../services/firebaseConfig';
import { DEFAULT_ATTENDANCE_CONFIG, resolveConfig } from '../../utils/attendanceConfig';

const SETTINGS_DOC = 'settings_default';

export default function SuperAdminAttendanceConfigScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState(DEFAULT_ATTENDANCE_CONFIG);

    useEffect(() => { loadConfig(); }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const doc = await db.collection('office_settings').doc(SETTINGS_DOC).get();
            setConfig(resolveConfig(doc.exists ? doc.data() : null));
        } catch (e) {
            Alert.alert('Error', 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Basic validation
        if (!config.officeStartTime.match(/^\d{2}:\d{2}$/)) {
            Alert.alert('Validation', 'Office Start Time must be HH:MM (e.g. 09:30)');
            return;
        }
        if (!config.officeEndTime.match(/^\d{2}:\d{2}$/)) {
            Alert.alert('Validation', 'Office End Time must be HH:MM (e.g. 18:30)');
            return;
        }

        try {
            setSaving(true);
            await db.collection('office_settings').doc(SETTINGS_DOC).set(config);
            Alert.alert('Saved ✅', 'Attendance configuration updated. Changes take effect on next punch-in/out.');
        } catch (e) {
            Alert.alert('Error', 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const set = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));
    const setGeo = (key, value) => setConfig(prev => ({
        ...prev,
        geoFencing: { ...prev.geoFencing, [key]: value },
    }));

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#1a2a6c" />
                <Text style={styles.loaderText}>Loading configuration...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient colors={['#1a2a6c', '#b21f1f']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Attendance Configuration</Text>
                    <Text style={styles.headerSub}>office_settings / settings_default</Text>
                </View>
            </LinearGradient>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                {/* ── PUNCH IN ─────────────────────────────────── */}
                <Section title="Punch In" icon="log-in-outline">
                    <Field label="Office Start Time (HH:MM)">
                        <TextInput
                            style={styles.input}
                            value={config.officeStartTime}
                            onChangeText={v => set('officeStartTime', v)}
                            placeholder="09:30"
                            maxLength={5}
                        />
                    </Field>

                    <Field label="Grace Period (minutes)" hint="Punch-in within this window is not marked Late">
                        <TextInput
                            style={styles.input}
                            value={String(config.gracePeriodMinutes)}
                            onChangeText={v => set('gracePeriodMinutes', parseInt(v) || 0)}
                            keyboardType="numeric"
                            placeholder="10"
                        />
                    </Field>

                    <Field label="Punch-In Window (minutes)" hint="0 = no limit. After this window punch-in is blocked.">
                        <TextInput
                            style={styles.input}
                            value={String(config.punchInWindowMinutes)}
                            onChangeText={v => set('punchInWindowMinutes', parseInt(v) || 0)}
                            keyboardType="numeric"
                            placeholder="120"
                        />
                    </Field>

                    <Field label="Late Punch-In Handling">
                        <ToggleGroup
                            options={[
                                { label: 'Mark Late', value: 'mark_late' },
                                { label: 'Half Day', value: 'mark_half_day' },
                                { label: 'Deny', value: 'deny' },
                            ]}
                            value={config.latePunchInHandling}
                            onChange={v => set('latePunchInHandling', v)}
                        />
                    </Field>
                </Section>

                {/* ── PUNCH OUT ────────────────────────────────── */}
                <Section title="Punch Out" icon="log-out-outline">
                    <Field label="Office End Time (HH:MM)">
                        <TextInput
                            style={styles.input}
                            value={config.officeEndTime}
                            onChangeText={v => set('officeEndTime', v)}
                            placeholder="18:30"
                            maxLength={5}
                        />
                    </Field>

                    <Field label="Min Hours Before Checkout Allowed" hint="Employee must work at least this many hours">
                        <TextInput
                            style={styles.input}
                            value={String(config.minWorkingHoursForCheckout)}
                            onChangeText={v => set('minWorkingHoursForCheckout', parseFloat(v) || 0)}
                            keyboardType="numeric"
                            placeholder="4"
                        />
                    </Field>

                    <Field label="Early Checkout Handling">
                        <ToggleGroup
                            options={[
                                { label: 'Half Day', value: 'mark_half_day' },
                                { label: 'Absent', value: 'mark_absent' },
                                { label: 'Allow', value: 'allow' },
                            ]}
                            value={config.earlyCheckoutHandling}
                            onChange={v => set('earlyCheckoutHandling', v)}
                        />
                    </Field>
                </Section>

                {/* ── WORKING HOURS ────────────────────────────── */}
                <Section title="Working Hours" icon="time-outline">
                    <Field label="Full Day Hours" hint="Hours required to count as a full day">
                        <TextInput
                            style={styles.input}
                            value={String(config.fullDayHours)}
                            onChangeText={v => set('fullDayHours', parseFloat(v) || 0)}
                            keyboardType="numeric"
                            placeholder="9"
                        />
                    </Field>

                    <Field label="Half Day Hours" hint="Minimum hours to count as a half day">
                        <TextInput
                            style={styles.input}
                            value={String(config.halfDayHours)}
                            onChangeText={v => set('halfDayHours', parseFloat(v) || 0)}
                            keyboardType="numeric"
                            placeholder="4.5"
                        />
                    </Field>

                    <Field label="Overtime Tracking">
                        <ToggleSwitch
                            value={config.overtimeEnabled}
                            onChange={v => set('overtimeEnabled', v)}
                            label={config.overtimeEnabled ? 'Enabled' : 'Disabled'}
                        />
                    </Field>

                    {config.overtimeEnabled && (
                        <Field label="Overtime Starts After (hours)">
                            <TextInput
                                style={styles.input}
                                value={String(config.overtimeThresholdHours)}
                                onChangeText={v => set('overtimeThresholdHours', parseFloat(v) || 0)}
                                keyboardType="numeric"
                                placeholder="9"
                            />
                        </Field>
                    )}
                </Section>

                {/* ── BREAK ────────────────────────────────────── */}
                <Section title="Break Rules" icon="cafe-outline">
                    <Field label="Break Tracking">
                        <ToggleSwitch
                            value={config.breakEnabled}
                            onChange={v => set('breakEnabled', v)}
                            label={config.breakEnabled ? 'Enabled' : 'Disabled'}
                        />
                    </Field>

                    {config.breakEnabled && (
                        <>
                            <Field label="Max Break Duration (minutes)">
                                <TextInput
                                    style={styles.input}
                                    value={String(config.maxBreakMinutes)}
                                    onChangeText={v => set('maxBreakMinutes', parseInt(v) || 0)}
                                    keyboardType="numeric"
                                    placeholder="60"
                                />
                            </Field>

                            <Field label="Max Number of Breaks">
                                <TextInput
                                    style={styles.input}
                                    value={String(config.maxBreakCount)}
                                    onChangeText={v => set('maxBreakCount', parseInt(v) || 0)}
                                    keyboardType="numeric"
                                    placeholder="2"
                                />
                            </Field>

                            <Field label="Deduct Break from Work Hours">
                                <ToggleSwitch
                                    value={config.breakDeductFromHours}
                                    onChange={v => set('breakDeductFromHours', v)}
                                    label={config.breakDeductFromHours ? 'Yes — deducted' : 'No — not deducted'}
                                />
                            </Field>
                        </>
                    )}
                </Section>

                {/* ── GEO-FENCING ──────────────────────────────── */}
                <Section title="Geo-Fencing" icon="location-outline">
                    <Field label="Geo-Fencing">
                        <ToggleSwitch
                            value={config.geoFencing.enabled}
                            onChange={v => setGeo('enabled', v)}
                            label={config.geoFencing.enabled ? 'Enabled' : 'Disabled'}
                        />
                    </Field>

                    {config.geoFencing.enabled && (
                        <>
                            <Field label="Office Latitude">
                                <TextInput
                                    style={styles.input}
                                    value={String(config.geoFencing.latitude)}
                                    onChangeText={v => setGeo('latitude', parseFloat(v) || 0)}
                                    keyboardType="numeric"
                                    placeholder="18.5204"
                                />
                            </Field>
                            <Field label="Office Longitude">
                                <TextInput
                                    style={styles.input}
                                    value={String(config.geoFencing.longitude)}
                                    onChangeText={v => setGeo('longitude', parseFloat(v) || 0)}
                                    keyboardType="numeric"
                                    placeholder="73.8567"
                                />
                            </Field>
                            <Field label="Allowed Radius (meters)">
                                <TextInput
                                    style={styles.input}
                                    value={String(config.geoFencing.radius)}
                                    onChangeText={v => setGeo('radius', parseInt(v) || 0)}
                                    keyboardType="numeric"
                                    placeholder="200"
                                />
                            </Field>
                        </>
                    )}
                </Section>

                {/* ── FACE RECOGNITION ─────────────────────────── */}
                <Section title="Face Recognition" icon="scan-outline">
                    <Field label="Match Threshold (0.0 – 1.0)" hint="Higher = stricter. Recommended: 0.6">
                        <TextInput
                            style={styles.input}
                            value={String(config.faceThreshold)}
                            onChangeText={v => set('faceThreshold', parseFloat(v) || 0.6)}
                            keyboardType="numeric"
                            placeholder="0.6"
                        />
                    </Field>
                </Section>

                {/* ── SAVE ─────────────────────────────────────── */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving
                        ? <ActivityIndicator color="#FFF" />
                        : <Text style={styles.saveBtnText}>SAVE CONFIGURATION</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity style={styles.resetBtn} onPress={() => {
                    Alert.alert('Reset to Defaults', 'This will restore all fields to system defaults. Continue?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reset', style: 'destructive', onPress: () => setConfig(DEFAULT_ATTENDANCE_CONFIG) },
                    ]);
                }}>
                    <Text style={styles.resetBtnText}>Reset to Defaults</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon} size={18} color="#1a2a6c" />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

function Field({ label, hint, children }) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {hint && <Text style={styles.fieldHint}>{hint}</Text>}
            {children}
        </View>
    );
}

function ToggleSwitch({ value, onChange, label }) {
    return (
        <TouchableOpacity style={styles.switchRow} onPress={() => onChange(!value)}>
            <View style={[styles.switchTrack, { backgroundColor: value ? '#1a2a6c' : '#E0E0E0' }]}>
                <View style={[styles.switchKnob, { transform: [{ translateX: value ? 22 : 2 }] }]} />
            </View>
            <Text style={[styles.switchLabel, { color: value ? '#1a2a6c' : '#95A5A6' }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function ToggleGroup({ options, value, onChange }) {
    return (
        <View style={styles.toggleGroup}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt.value}
                    style={[styles.toggleChip, value === opt.value && styles.toggleChipActive]}
                    onPress={() => onChange(opt.value)}
                >
                    <Text style={[styles.toggleChipText, value === opt.value && styles.toggleChipTextActive]}>
                        {opt.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 12, color: '#7F8C8D' },
    header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    scroll: { flex: 1, padding: 16 },
    section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a2a6c' },
    field: { marginBottom: 14 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#34495E', marginBottom: 4 },
    fieldHint: { fontSize: 11, color: '#95A5A6', marginBottom: 6 },
    input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#2C3E50' },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    switchTrack: { width: 50, height: 28, borderRadius: 14, padding: 2 },
    switchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', elevation: 2 },
    switchLabel: { fontSize: 14, fontWeight: '600' },
    toggleGroup: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    toggleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF' },
    toggleChipActive: { backgroundColor: '#1a2a6c', borderColor: '#1a2a6c' },
    toggleChipText: { fontSize: 13, fontWeight: '600', color: '#7F8C8D' },
    toggleChipTextActive: { color: '#FFF' },
    saveBtn: { backgroundColor: '#1a2a6c', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12, elevation: 3 },
    saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    resetBtn: { alignItems: 'center', paddingVertical: 12 },
    resetBtnText: { color: '#E74C3C', fontWeight: '600', fontSize: 14 },
});
