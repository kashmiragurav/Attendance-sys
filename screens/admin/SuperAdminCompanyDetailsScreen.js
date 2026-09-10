import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { FEATURES, FEATURE_LABELS } from '../../constants/Plans';
import { db } from '../../services/firebaseConfig';

export default function SuperAdminCompanyDetailsScreen({ route, navigation }) {
    const { companyId } = route.params;
    const [company, setCompany] = useState(null);
    const [admins, setAdmins] = useState([]);
    const [summaryStats, setSummaryStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalAttendanceRecords: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Admin States
    const [isCreateAdminVisible, setIsCreateAdminVisible] = useState(false);
    const [isEditAdminVisible, setIsEditAdminVisible] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', employeeId: '' });
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', password: '', employeeId: '' });

    // Subscription States
    const [isEditSubVisible, setIsEditSubVisible] = useState(false);
    const [subForm, setSubForm] = useState({
        type: 'Basic',
        status: 'Active',
        expiryDate: '',
        paymentStatus: 'Paid',
        slug: '',
        featureOverrides: {}
    });

    // WiFi Management States
    const [isWifiModalVisible, setIsWifiModalVisible] = useState(false);
    const [wifiList, setWifiList] = useState([]);
    const [newWifiSSID, setNewWifiSSID] = useState('');
    const [newWifiBSSID, setNewWifiBSSID] = useState('');
    const [wifiRestrictionEnabled, setWifiRestrictionEnabled] = useState(false);

    useEffect(() => {
        loadCompanyDetails();
    }, []);

    const loadCompanyDetails = async () => {
        try {
            setLoading(true);

            // 1. Fetch Company Metadata
            const companyDoc = await db.collection('companies').doc(companyId).get();
            if (companyDoc.exists) {
                const data = companyDoc.data();
                setCompany({ id: companyDoc.id, ...data });

                // Load WiFi Settings — normalise legacy string array to object array
                const rawWifis = data.allowedWifis || [];
                const normalisedWifis = rawWifis.map(w =>
                    typeof w === 'string' ? { ssid: w } : w
                );
                setWifiList(normalisedWifis);
                setWifiRestrictionEnabled(data.wifiRestrictionEnabled || false);
            }

            // 2. Fetch Aggregated Statistics (No internal employee details shown)
            const [usersSnap, attendanceSnap] = await Promise.all([
                db.collection('users').where('companyId', '==', companyId),
                db.collection('attendance').where('companyId', '==', companyId)
            ]);

            const allUsers = usersSnap.docs.map(doc => doc.data());
            const companyAdmins = allUsers.filter(u => u.role === 'COMPANY_ADMIN' || u.role === 'admin');

            setAdmins(companyAdmins);
            setSummaryStats({
                totalUsers: allUsers.length,
                activeUsers: allUsers.filter(u => u.isActive !== false).length,
                totalAttendanceRecords: attendanceSnap.docs.length
            });

        } catch (error) {
            console.error('Error loading company details:', error);
            Alert.alert('Error', 'Failed to load company information');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!company) return;
        const newStatus = company.status === 'active' ? 'suspended' : 'active';
        try {
            setLoading(true);
            await db.collection('companies').doc(companyId).set({ ...company, status: newStatus });
            setCompany({ ...company, status: newStatus });
            Alert.alert('Success', `Company ${newStatus === 'active' ? 'Activated' : 'Suspended'}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAdminStatus = async (admin) => {
        const newStatus = !admin.isActive;
        try {
            setLoading(true);
            await db.collection('users').doc(admin.uid).set({ ...admin, isActive: newStatus });
            loadCompanyDetails();
            Alert.alert('Success', `Admin account ${newStatus ? 'Activated' : 'Deactivated'}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update admin status');
        } finally {
            setLoading(false);
        }
    };

    const handleResetAdminPassword = (admin) => {
        Alert.alert('Reset Password', `Reset password for ${admin.name}? New password will be 123456`, [
            { text: 'Cancel' },
            {
                text: 'Reset',
                onPress: async () => {
                    const simpleHash = (p) => {
                        let h = 0;
                        for (let i = 0; i < p.length; i++) {
                            h = ((h << 5) - h) + p.charCodeAt(i);
                            h = h & h;
                        }
                        return h.toString(36);
                    };
                    await db.collection('users').doc(admin.uid).set({
                        ...admin,
                        passwordHash: simpleHash('123456'),
                        plainPassword: '123456'
                    });
                    Alert.alert('Success', 'Password reset to 123456');
                }
            }
        ]);
    };

    const handleEditAdmin = (admin) => {
        setEditingAdmin(admin);
        setEditForm({
            name: admin.name,
            email: admin.email,
            password: admin.plainPassword || '',
            employeeId: admin.employeeId
        });
        setIsEditAdminVisible(true);
    };

    const handleUpdateAdmin = async () => {
        const { name, email, password, employeeId } = editForm;
        if (!name || !email || !employeeId) {
            Alert.alert('Error', 'Name, Email and Employee ID are required');
            return;
        }

        try {
            setLoading(true);
            const simpleHash = (p) => {
                let h = 0;
                for (let i = 0; i < p.length; i++) {
                    h = ((h << 5) - h) + p.charCodeAt(i);
                    h = h & h;
                }
                return h.toString(36);
            };

            const normalizedEmpId = employeeId.trim().toUpperCase();

            const updatedData = {
                ...editingAdmin,
                name,
                email,
                employeeId: normalizedEmpId,
                updatedAt: new Date().toISOString()
            };

            // Only update password if provided
            if (password.trim().length > 0) {
                updatedData.passwordHash = simpleHash(password);
                updatedData.plainPassword = password;
            }

            await db.collection('users').doc(editingAdmin.uid).set(updatedData);
            Alert.alert('Success', 'Admin details updated');
            setIsEditAdminVisible(false);
            loadCompanyDetails();
        } catch (error) {
            Alert.alert('Error', 'Failed to update admin');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAdmin = async () => {
        const { name, email, password, employeeId } = newAdmin;
        if (!name || !email || !password || !employeeId) {
            Alert.alert('Error', 'All fields are required');
            return;
        }

        try {
            setLoading(true);
            const uid = `user_${Date.now()}`;
            const simpleHash = (p) => {
                let h = 0;
                for (let i = 0; i < p.length; i++) {
                    h = ((h << 5) - h) + p.charCodeAt(i);
                    h = h & h;
                }
                return h.toString(36);
            };

            const normalizedEmpId = employeeId.trim().toUpperCase();

            const adminData = {
                uid,
                name,
                email,
                passwordHash: simpleHash(password),
                plainPassword: password,
                employeeId: normalizedEmpId,
                role: 'COMPANY_ADMIN',
                companyId: companyId,
                companyName: company?.name,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await db.collection('users').doc(uid).set(adminData);
            Alert.alert('Success', 'Company Admin created');
            setIsCreateAdminVisible(false);
            setNewAdmin({ name: '', email: '', password: '', employeeId: '' });
            loadCompanyDetails();
        } catch (error) {
            Alert.alert('Error', 'Failed to create admin');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateWifiSettings = async () => {
        try {
            setLoading(true);
            await db.collection('companies').doc(companyId).update({
                allowedWifis: wifiList,
                wifiRestrictionEnabled: wifiRestrictionEnabled,
                updatedAt: new Date().toISOString()
            });

            setCompany(prev => ({
                ...prev,
                allowedWifis: wifiList,
                wifiRestrictionEnabled: wifiRestrictionEnabled
            }));

            setIsWifiModalVisible(false);
            Alert.alert('Success', 'WiFi settings updated successfully');
        } catch (error) {
            console.error('Update wifi error:', error);
            Alert.alert('Error', 'Failed to update WiFi settings');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWifi = () => {
        const ssid = newWifiSSID.trim();
        if (!ssid) return;
        const bssid = newWifiBSSID.trim().toLowerCase() || undefined;
        if (wifiList.some(w => w.ssid?.toLowerCase() === ssid.toLowerCase())) {
            Alert.alert('Error', 'This WiFi SSID is already on the list');
            return;
        }
        setWifiList([...wifiList, bssid ? { ssid, bssid } : { ssid }]);
        setNewWifiSSID('');
        setNewWifiBSSID('');
    };

    const handleRemoveWifi = (ssid) => {
        setWifiList(wifiList.filter(w => w.ssid !== ssid));
    };

    const handleUpdateSubscription = async () => {
        try {
            setLoading(true);
            const updatedSubscription = {
                ...company.subscription,
                type: subForm.type,
                status: subForm.status,
                paymentStatus: subForm.paymentStatus,
                expiryDate: subForm.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            };

            const { id, ...companyData } = company;
            const finalSlug = subForm.slug ? subForm.slug.trim().toLowerCase().replace(/\s/g, '') : '';

            await db.collection('companies').doc(companyId).set({
                ...companyData,
                slug: finalSlug,
                plan: subForm.type,
                subscription: updatedSubscription,
                featureOverrides: subForm.featureOverrides
            });

            setCompany({
                ...company,
                slug: finalSlug,
                plan: subForm.type,
                subscription: updatedSubscription,
                featureOverrides: subForm.featureOverrides
            });
            setIsEditSubVisible(false);
            Alert.alert('Success', 'Subscription updated successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to update subscription');
        } finally {
            setLoading(false);
        }
    };

    const openEditSub = () => {
        setSubForm({
            type: company?.subscription?.type || 'Basic',
            status: company?.subscription?.status || 'Active',
            expiryDate: company?.subscription?.expiryDate || new Date().toISOString().split('T')[0],
            paymentStatus: company?.subscription?.paymentStatus || 'Paid',
            slug: company?.slug || '',
            featureOverrides: company?.featureOverrides || {}
        });
        setIsEditSubVisible(true);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadCompanyDetails();
        setRefreshing(false);
    };

    if (loading && !refreshing && !company) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#1a2a6c" />
                <Text style={styles.loaderText}>Fetching Company Metadata...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={['#1a2a6c', '#b21f1f']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tenant Console</Text>
                    <View style={{ width: 24 }} />
                </View>

                {company && (
                    <View style={styles.companyHeaderInfo}>
                        <Text style={styles.mainCompanyName}>{company.name}</Text>
                        <View style={styles.headerBadges}>
                            <View style={[styles.hBadge, { backgroundColor: company.status === 'active' ? '#2ECC71' : '#E74C3C' }]}>
                                <Text style={styles.hBadgeText}>{company.status.toUpperCase()}</Text>
                            </View>
                            <View style={[styles.hBadge, { backgroundColor: '#4A90E2' }]}>
                                <Text style={styles.hBadgeText}>{company.plan?.toUpperCase() || 'BASIC'}</Text>
                            </View>
                            <View style={[styles.hBadge, { backgroundColor: '#E67E22' }]}>
                                <Text style={styles.hBadgeText}>{company.subscription?.expiryDate?.split('T')[0] || 'NO DATE'}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </LinearGradient>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* 1. Summary Statistics (Aggregated Only) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Aggregated Summary</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Ionicons name="people-outline" size={24} color="#1a2a6c" />
                            <Text style={styles.statValue}>{summaryStats.totalUsers}</Text>
                            <Text style={styles.statLabel}>Total Users</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="stats-chart-outline" size={24} color="#2ECC71" />
                            <Text style={styles.statValue}>{summaryStats.activeUsers}</Text>
                            <Text style={styles.statLabel}>Active Status</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Ionicons name="finger-print-outline" size={24} color="#E67E22" />
                            <Text style={styles.statValue}>{summaryStats.totalAttendanceRecords}</Text>
                            <Text style={styles.statLabel}>Total Logs</Text>
                        </View>
                    </View>
                </View>

                {/* 2. Admin Management */}
                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>Company Administrators</Text>
                        <TouchableOpacity
                            style={styles.actionBtnTiny}
                            onPress={() => setIsCreateAdminVisible(true)}
                        >
                            <Ionicons name="add" size={16} color="#FFF" />
                            <Text style={styles.actionBtnTinyText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {admins.map(admin => (
                        <View key={admin.uid} style={styles.adminCard}>
                            <View style={styles.adminMain}>
                                <View style={styles.adminAvatar}>
                                    <Text style={styles.adminInitial}>{admin.name.charAt(0)}</Text>
                                </View>
                                <View style={styles.adminInfo}>
                                    <Text style={styles.adminName}>{admin.name}</Text>
                                    <Text style={styles.adminEmail}>{admin.email}</Text>
                                    <Text style={styles.adminMeta}>Role: {admin.role} • ID: {admin.employeeId}</Text>
                                    <Text style={[styles.adminMeta, { color: '#E67E22', fontWeight: 'bold' }]}>Pass: {admin.plainPassword}</Text>
                                </View>
                            </View>
                            <View style={styles.adminActions}>
                                <TouchableOpacity onPress={() => handleEditAdmin(admin)} title="Edit Admin">
                                    <Ionicons name="create-outline" size={22} color="#4A90E2" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleResetAdminPassword(admin)} title="Reset Pass">
                                    <Ionicons name="key-outline" size={20} color="#E67E22" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleToggleAdminStatus(admin)}>
                                    <Ionicons
                                        name={admin.isActive ? "checkmark-circle" : "close-circle"}
                                        size={20}
                                        color={admin.isActive ? "#2ECC71" : "#E74C3C"}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* 3. Subscription & Billing */}
                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>Subscription & Usage</Text>
                        <TouchableOpacity
                            style={styles.actionBtnTiny}
                            onPress={openEditSub}
                        >
                            <Ionicons name="create-outline" size={16} color="#FFF" />
                            <Text style={styles.actionBtnTinyText}>Manage</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.usageCard}>
                        <View style={styles.usageItem}>
                            <Text style={styles.usageLabel}>Current Plan</Text>
                            <View style={[styles.planBadge, { backgroundColor: company?.subscription?.type === 'Pro' ? '#FFD70020' : '#4A90E220' }]}>
                                <Text style={[styles.planBadgeText, { color: company?.subscription?.type === 'Pro' ? '#B8860B' : '#4A90E2' }]}>
                                    {company?.subscription?.type || 'Standard Basic'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.usageItem}>
                            <Text style={styles.usageLabel}>Payment Status</Text>
                            <Text style={[styles.usageValue, { color: company?.subscription?.paymentStatus === 'Paid' ? '#2ECC71' : '#E74C3C' }]}>
                                {company?.subscription?.paymentStatus || 'Paid'}
                            </Text>
                        </View>
                        <View style={styles.usageItem}>
                            <Text style={styles.usageLabel}>Renewal Date</Text>
                            <Text style={styles.usageValue}>
                                {company?.subscription?.expiryDate ? new Date(company.subscription.expiryDate).toLocaleDateString() : '31/Dec/2026'}
                            </Text>
                        </View>
                        <View style={styles.usageItem}>
                            <Text style={styles.usageLabel}>Monthly API Count</Text>
                            <Text style={styles.usageValue}>1,240 / 5,000</Text>
                        </View>
                    </View>
                </View>

                {/* 4. Company Governance */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tenant Governance</Text>
                    <View style={styles.governanceBox}>
                        <Text style={styles.govLabel}>Global Status Control</Text>
                        <TouchableOpacity
                            style={[styles.statusToggleBtn, { backgroundColor: company?.status === 'active' ? '#E74C3C' : '#2ECC71' }]}
                            onPress={handleToggleStatus}
                        >
                            <Ionicons name={company?.status === 'active' ? "hand-right-outline" : "play-outline"} size={20} color="#FFF" />
                            <Text style={styles.statusToggleBtnText}>
                                {company?.status === 'active' ? 'Suspend Company Access' : 'Restore Company Access'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <Text style={styles.govLabel}>Network Security</Text>
                        <TouchableOpacity
                            style={[styles.statusToggleBtn, { backgroundColor: '#34495E', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 }]}
                            onPress={() => setIsWifiModalVisible(true)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons name="wifi" size={20} color="#FFF" />
                                <Text style={styles.statusToggleBtnText}>Manage WiFi Restrictions</Text>
                            </View>
                            <Text style={{ color: '#BDC3C7', fontSize: 12 }}>
                                {wifiRestrictionEnabled ? 'ON' : 'OFF'} • {wifiList.length} Allowed
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.govHint}>
                            Suspending a company prevents all its employees and admins from logging in immediately.
                            WiFi restrictions force employees to be connected to allowed networks for attendance.
                        </Text>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* WiFi Management Modal */}
            <Modal visible={isWifiModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>WiFi Restrictions</Text>

                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Enable Restrictions</Text>
                                <Text style={styles.settingSub}>Users must be connected to one of the allowed networks to punch in/out.</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setWifiRestrictionEnabled(!wifiRestrictionEnabled)}
                                style={[styles.toggleSwitch, { backgroundColor: wifiRestrictionEnabled ? '#2ECC71' : '#E0E0E0' }]}
                            >
                                <View style={[styles.toggleKnob, { transform: [{ translateX: wifiRestrictionEnabled ? 22 : 2 }] }]} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Add Allowed WiFi Network</Text>
                        <View style={styles.addWifiRow}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder="SSID (e.g. Office_WiFi_5G)"
                                value={newWifiSSID}
                                onChangeText={setNewWifiSSID}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity style={styles.addWifiBtn} onPress={handleAddWifi}>
                                <Ionicons name="add" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.input, { marginBottom: 16 }]}
                            placeholder="BSSID/MAC (optional, e.g. aa:bb:cc:dd:ee:ff)"
                            value={newWifiBSSID}
                            onChangeText={setNewWifiBSSID}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Text style={styles.inputLabel}>Allowed Networks List ({wifiList.length})</Text>
                        <ScrollView style={styles.wifiList} nestedScrollEnabled>
                            {wifiList.map((network, index) => (
                                <View key={index} style={styles.wifiItem}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                        <Ionicons name="wifi" size={18} color="#2C3E50" />
                                        <View>
                                            <Text style={styles.wifiName}>{network.ssid}</Text>
                                            {network.bssid && (
                                                <Text style={styles.wifiBssid}>{network.bssid}</Text>
                                            )}
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => handleRemoveWifi(network.ssid)}>
                                        <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {wifiList.length === 0 && (
                                <Text style={styles.emptyText}>No networks added yet.</Text>
                            )}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsWifiModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateWifiSettings}>
                                <Text style={styles.saveText}>Save Settings</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Create Admin Modal */}
            <Modal visible={isCreateAdminVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Company Admin</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={newAdmin.name}
                            onChangeText={text => setNewAdmin({ ...newAdmin, name: text })}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            value={newAdmin.email}
                            onChangeText={text => setNewAdmin({ ...newAdmin, email: text })}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Employee ID"
                            value={newAdmin.employeeId}
                            onChangeText={text => setNewAdmin({ ...newAdmin, employeeId: text.toUpperCase() })}
                            autoCapitalize="characters"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            secureTextEntry
                            value={newAdmin.password}
                            onChangeText={text => setNewAdmin({ ...newAdmin, password: text })}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreateAdminVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleCreateAdmin}>
                                <Text style={styles.saveText}>Authorize Admin</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Admin Modal */}
            <Modal visible={isEditAdminVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Admin Details</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={editForm.name}
                            onChangeText={text => setEditForm({ ...editForm, name: text })}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            value={editForm.email}
                            onChangeText={text => setEditForm({ ...editForm, email: text })}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Employee ID"
                            value={editForm.employeeId}
                            onChangeText={text => setEditForm({ ...editForm, employeeId: text.toUpperCase() })}
                            autoCapitalize="characters"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Admin Password"
                            secureTextEntry={false}
                            value={editForm.password}
                            onChangeText={text => setEditForm({ ...editForm, password: text })}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditAdminVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateAdmin}>
                                <Text style={styles.saveText}>Update Admin</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Subscription Modal */}
            <Modal visible={isEditSubVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Manage Subscription</Text>

                        <Text style={styles.inputLabel}>Plan Type</Text>
                        <View style={styles.toggleRow}>
                            {['Free', 'Basic', 'Pro', 'Enterprise'].map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.toggleBtn, subForm.type === p && styles.toggleBtnActive]}
                                    onPress={() => setSubForm({ ...subForm, type: p })}
                                >
                                    <Text style={[styles.toggleBtnText, subForm.type === p && styles.toggleBtnTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Payment Status</Text>
                        <View style={styles.toggleRow}>
                            {['Paid', 'Pending', 'Overdue'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.toggleBtn, subForm.paymentStatus === s && styles.toggleBtnActive]}
                                    onPress={() => setSubForm({ ...subForm, paymentStatus: s })}
                                >
                                    <Text style={[styles.toggleBtnText, subForm.paymentStatus === s && styles.toggleBtnTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Expiry Date (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-12-31"
                            value={subForm.expiryDate}
                            onChangeText={text => setSubForm({ ...subForm, expiryDate: text })}
                        />

                        <Text style={styles.inputLabel}>Company Access Code (Slug)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. sahyadri-tech"
                            value={subForm.slug}
                            onChangeText={text => setSubForm({ ...subForm, slug: text.toLowerCase().replace(/\s/g, '') })}
                            autoCapitalize="none"
                        />

                        <Text style={styles.inputLabel}>Feature Permissions & Overrides</Text>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true}>
                            {Object.values(FEATURES).map(f => {
                                const isOverridden = subForm.featureOverrides[f] !== undefined;
                                const val = subForm.featureOverrides[f];

                                return (
                                    <View key={f} style={styles.featureOverrideItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.featureLabel}>{FEATURE_LABELS[f]?.label || f}</Text>
                                            <Text style={styles.featureSub}>{isOverridden ? 'Manual Override' : 'Plan Default'}</Text>
                                        </View>
                                        <View style={styles.overrideButtons}>
                                            <TouchableOpacity
                                                style={[styles.ovBtn, val === true && styles.ovBtnActiveGreen]}
                                                onPress={() => setSubForm({
                                                    ...subForm,
                                                    featureOverrides: { ...subForm.featureOverrides, [f]: true }
                                                })}
                                            >
                                                <Text style={[styles.ovBtnText, val === true && styles.ovBtnTextActive]}>ON</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.ovBtn, val === false && styles.ovBtnActiveRed]}
                                                onPress={() => setSubForm({
                                                    ...subForm,
                                                    featureOverrides: { ...subForm.featureOverrides, [f]: false }
                                                })}
                                            >
                                                <Text style={[styles.ovBtnText, val === false && styles.ovBtnTextActive]}>OFF</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.ovBtn, val === undefined && styles.ovBtnActiveGray]}
                                                onPress={() => {
                                                    const newOverrides = { ...subForm.featureOverrides };
                                                    delete newOverrides[f];
                                                    setSubForm({ ...subForm, featureOverrides: newOverrides });
                                                }}
                                            >
                                                <Text style={[styles.ovBtnText, val === undefined && styles.ovBtnTextActive]}>DEF</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditSubVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateSubscription}>
                                <Text style={styles.saveText}>Update Subscription</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 15, color: '#7F8C8D', fontSize: 13 },
    header: { paddingTop: 50, paddingBottom: 30, paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { padding: 5 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    companyHeaderInfo: { alignItems: 'center' },
    mainCompanyName: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
    headerBadges: { flexDirection: 'row', gap: 10, marginTop: 12 },
    hBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    hBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    content: { flex: 1, padding: 20 },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2C3E50', marginBottom: 15 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    statsGrid: { flexDirection: 'row', gap: 12 },
    statBox: { flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 16, alignItems: 'center', elevation: 2 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#2C3E50', marginVertical: 4 },
    statLabel: { fontSize: 10, color: '#95A5A6', textAlign: 'center' },
    actionBtnTiny: { backgroundColor: '#1a2a6c', flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center', gap: 5 },
    actionBtnTinyText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    adminCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, elevation: 1 },
    adminMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    adminAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EBF5FB', justifyContent: 'center', alignItems: 'center' },
    adminInitial: { color: '#4A90E2', fontWeight: 'bold', fontSize: 18 },
    adminInfo: { marginLeft: 12, flex: 1 },
    adminName: { fontSize: 15, fontWeight: 'bold', color: '#2C3E50' },
    adminEmail: { fontSize: 12, color: '#7F8C8D' },
    adminMeta: { fontSize: 10, color: '#BDC3C7', marginTop: 2 },
    adminActions: { flexDirection: 'row', gap: 15 },
    usageCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, elevation: 1 },
    usageItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
    usageLabel: { color: '#7F8C8D', fontSize: 14 },
    usageValue: { color: '#2C3E50', fontWeight: 'bold', fontSize: 14 },
    governanceBox: { backgroundColor: '#FFF', padding: 20, borderRadius: 18, elevation: 1 },
    govLabel: { fontSize: 14, color: '#7F8C8D', marginBottom: 15 },
    statusToggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 12, gap: 10 },
    statusToggleBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    govHint: { fontSize: 11, color: '#95A5A6', marginTop: 12, lineHeight: 18, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a2a6c', marginBottom: 20 },
    input: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E9ECEF' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10 },
    cancelBtn: { padding: 12 },
    saveBtn: { backgroundColor: '#1a2a6c', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    cancelText: { color: '#7F8C8D', fontWeight: 'bold' },
    saveText: { color: '#FFF', fontWeight: 'bold' },
    planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    planBadgeText: { fontSize: 13, fontWeight: 'bold' },
    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 1, borderColor: '#E9ECEF' },
    toggleBtnActive: { backgroundColor: '#1a2a6c', borderColor: '#1a2a6c' },
    toggleBtnText: { color: '#7F8C8D', fontWeight: 'bold', fontSize: 13 },
    toggleBtnTextActive: { color: '#FFF' },
    featureOverrideItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
    featureLabel: { fontSize: 13, fontWeight: '700', color: '#2C3E50' },
    featureSub: { fontSize: 10, color: '#95A5A6' },
    overrideButtons: { flexDirection: 'row', gap: 5 },
    ovBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD' },
    ovBtnActiveGreen: { backgroundColor: '#2ECC71', borderColor: '#2ECC71' },
    ovBtnActiveRed: { backgroundColor: '#E74C3C', borderColor: '#E74C3C' },
    ovBtnActiveGray: { backgroundColor: '#BDC3C7', borderColor: '#BDC3C7' },
    ovBtnText: { fontSize: 10, fontWeight: 'bold', color: '#7F8C8D' },
    ovBtnTextActive: { color: '#FFF' },
    divider: { height: 1, backgroundColor: '#ECF0F1', marginVertical: 15 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    settingLabel: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
    settingSub: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
    toggleSwitch: { width: 50, height: 28, borderRadius: 20, padding: 2 },
    toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    addWifiRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    addWifiBtn: { backgroundColor: '#2ECC71', borderRadius: 12, width: 50, justifyContent: 'center', alignItems: 'center' },
    wifiList: { maxHeight: 200, backgroundColor: '#F8F9FA', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#ECF0F1', marginBottom: 20 },
    wifiItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    wifiName: { fontSize: 14, color: '#2C3E50', fontWeight: '500' },
    wifiBssid: { fontSize: 11, color: '#95A5A6', marginTop: 1 },
    emptyText: { textAlign: 'center', color: '#BDC3C7', marginVertical: 20 },
});
