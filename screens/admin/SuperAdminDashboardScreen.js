import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    FlatList,
    Modal,
    TextInput,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';

export default function SuperAdminDashboardScreen({ navigation }) {
    const { logout } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const [summaryStats, setSummaryStats] = useState({
        totalCompanies: 0,
        activeCompanies: 0,
        totalUsersAcrossTenants: 0
    });

    const [newCompany, setNewCompany] = useState({
        name: '',
        slug: '',
        industry: '',
        email: '',
        contact: '',
        plan: 'Basic'
    });

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        try {
            setLoading(true);
            const snapshot = await db.collection('companies').getDocs();
            const companyList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    slug: (data.slug && String(data.slug).trim()) ? String(data.slug).trim() : doc.id
                };
            });

            // Calculate summary stats (High level only)
            const active = companyList.filter(c => c.status === 'active').length;

            setCompanies(companyList);
            setSummaryStats({
                totalCompanies: companyList.length,
                activeCompanies: active,
                totalUsersAcrossTenants: '...' // Would require a high-level aggregation query
            });
        } catch (error) {
            console.error('Error loading companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompany = async () => {
        const { name, slug, industry, email, contact, plan } = newCompany;
        if (!name || !slug || !industry) {
            Alert.alert('Error', 'Please fill required fields');
            return;
        }

        try {
            const companyId = `comp_${Date.now()}`;
            await db.collection('companies').doc(companyId).set({
                name,
                slug,
                industry,
                email,
                contact,
                plan,
                status: 'active',
                createdAt: new Date().toISOString(),
                subscription: {
                    type: plan,
                    startDate: new Date().toISOString(),
                    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                    status: 'Active'
                }
            });
            setIsModalVisible(false);
            setNewCompany({ name: '', slug: '', industry: '', email: '', contact: '', plan: 'Basic' });
            loadCompanies();
        } catch (error) {
            console.error('Error creating company:', error);
            Alert.alert('Error', 'Failed to create company');
        }
    };

    const handleDeleteCompany = async (companyId, companyName) => {
        Alert.alert(
            'Delete Company',
            `Are you sure you want to delete ${companyName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await db.collection('companies').doc(companyId).delete();
                            loadCompanies();
                        } catch (error) {
                            console.error('Error deleting company:', error);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadCompanies();
        setRefreshing(false);
    };

    const renderSummaryCard = (label, value, icon, color) => (
        <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View>
                <Text style={styles.summaryValue}>{value}</Text>
                <Text style={styles.summaryLabel}>{label}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#1a2a6c', '#b21f1f']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>SaaS Super Admin</Text>
                        <Text style={styles.headerSubtitle}>Multi-Tenant Control Center</Text>
                    </View>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.summaryRow}>
                    {renderSummaryCard('Companies', summaryStats.totalCompanies, 'business', '#4A90E2')}
                    {renderSummaryCard('Active', summaryStats.activeCompanies, 'checkmark-circle', '#2ECC71')}
                </View>
            </LinearGradient>

            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Tenants List</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setIsModalVisible(true)}
                    >
                        <Ionicons name="add" size={20} color="#FFF" />
                        <Text style={styles.addBtnText}>Create Tenant</Text>
                    </TouchableOpacity>
                </View>

                {loading && !refreshing ? (
                    <ActivityIndicator size="large" color="#1a2a6c" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={companies}
                        keyExtractor={item => item.id}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        contentContainerStyle={{ paddingBottom: 30 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.companyCard}
                                onPress={() => navigation.navigate('SuperAdminCompanyDetails', {
                                    companyId: item.id,
                                    companyName: item.name
                                })}
                            >
                                <View style={styles.companyMain}>
                                    <View style={styles.companyIcon}>
                                        <Text style={styles.companyInitial}>{item.name.charAt(0)}</Text>
                                    </View>
                                    <View style={styles.companyDetails}>
                                        <Text style={styles.companyName}>{item.name}</Text>
                                        <Text style={styles.companyIndustry}>{item.industry || 'Industry N/A'} • {item.slug}</Text>
                                        <Text style={styles.companyDate}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                </View>

                                <View style={styles.companySide}>
                                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#E8F5E9' : '#FFEBEE' }]}>
                                        <Text style={[styles.statusText, { color: item.status === 'active' ? '#2E7D32' : '#C62828' }]}>
                                            {item.status.toUpperCase()}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteCompany(item.id, item.name)}
                                        style={styles.deleteBtn}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyText}>No companies onboarded yet.</Text>}
                    />
                )}
            </View>

            {/* Create Company Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScroll}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Onboard New Company</Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#7F8C8D" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Basic Information</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Company Name"
                                value={newCompany.name}
                                onChangeText={text => setNewCompany({ ...newCompany, name: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Unique Slug (e.g. acme-it)"
                                value={newCompany.slug}
                                onChangeText={text => setNewCompany({ ...newCompany, slug: text.toLowerCase() })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Industry Type"
                                value={newCompany.industry}
                                onChangeText={text => setNewCompany({ ...newCompany, industry: text })}
                            />

                            <Text style={styles.inputLabel}>Contact & Plan</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Admin Email"
                                keyboardType="email-address"
                                value={newCompany.email}
                                onChangeText={text => setNewCompany({ ...newCompany, email: text })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Contact Number"
                                keyboardType="phone-pad"
                                value={newCompany.contact}
                                onChangeText={text => setNewCompany({ ...newCompany, contact: text })}
                            />

                            <View style={styles.planSelector}>
                                {['Free', 'Basic', 'Pro'].map(p => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[styles.planChip, newCompany.plan === p && styles.planChipActive]}
                                        onPress={() => setNewCompany({ ...newCompany, plan: p })}
                                    >
                                        <Text style={[styles.planChipText, newCompany.plan === p && styles.planChipTextActive]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.createBtn}
                                onPress={handleCreateCompany}
                            >
                                <Text style={styles.createBtnText}>CREATE COMPANY</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4F7F6' },
    header: { paddingTop: 60, paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 35, borderBottomRightRadius: 35 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    logoutBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
    summaryRow: { flexDirection: 'row', gap: 15, position: 'absolute', bottom: -40, left: 20, right: 20 },
    summaryCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    summaryIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
    summaryLabel: { fontSize: 11, color: '#95A5A6' },
    content: { flex: 1, marginTop: 60, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a2a6c', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
    addBtnText: { color: '#FFF', marginLeft: 8, fontWeight: 'bold', fontSize: 13 },
    companyCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    companyMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    companyIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#F4F7F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
    companyInitial: { fontSize: 22, fontWeight: 'bold', color: '#1a2a6c' },
    companyDetails: { marginLeft: 15, flex: 1 },
    companyName: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50' },
    companyIndustry: { fontSize: 12, color: '#7F8C8D', marginTop: 2 },
    companyDate: { fontSize: 10, color: '#BDC3C7', marginTop: 4 },
    companySide: { alignItems: 'flex-end', gap: 10 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    deleteBtn: { padding: 8, backgroundColor: '#FFF5F5', borderRadius: 10 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#95A5A6', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
    modalScroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a2a6c' },
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#34495E', marginBottom: 10, marginTop: 5 },
    input: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#E9ECEF', fontSize: 15 },
    planSelector: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    planChip: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E9ECEF', alignItems: 'center' },
    planChipActive: { backgroundColor: '#1a2a6c', borderColor: '#1a2a6c' },
    planChipText: { fontWeight: 'bold', color: '#7F8C8D' },
    planChipTextActive: { color: '#FFF' },
    createBtn: { backgroundColor: '#2ECC71', paddingVertical: 16, borderRadius: 15, alignItems: 'center', elevation: 3 },
    createBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
