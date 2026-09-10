import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';

export default function AdminEmployeesScreen({ navigation }) {
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { user, getUserLimit, FEATURES } = useAuth();

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadEmployees();
        });
        return unsubscribe;
    }, [navigation]);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const snapshot = await db.collection('users').where('companyId', '==', user.companyId);
            const users = snapshot.docs
                .map(doc => doc.data())
                .filter(u => u.role !== 'SUPER_ADMIN' && u.role !== 'COMPANY_ADMIN' && u.role !== 'admin')
                .sort((a, b) => a.name.localeCompare(b.name));

            setEmployees(users);
            setFilteredEmployees(users);
        } catch (error) {
            console.error('Error loading employees:', error);
            Alert.alert('Error', 'Failed to load employees list');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.trim() === '') {
            setFilteredEmployees(employees);
        } else {
            const query = text.toLowerCase();
            const filtered = employees.filter(emp =>
                emp.name.toLowerCase().includes(query) ||
                emp.employeeId.toLowerCase().includes(query) ||
                emp.department?.toLowerCase().includes(query)
            );
            setFilteredEmployees(filtered);
        }
    };

    const renderEmployeeItem = ({ item }) => (
        <TouchableOpacity
            style={styles.employeeCard}
            onPress={() => navigation.navigate('AdminEmployeeDetail', { employee: item })}
        >
            <View style={styles.avatar}>
                {item.profilePhoto ? (
                    <Image source={{ uri: item.profilePhoto }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                )}
                {item.faceRegistered && (
                    <View style={styles.badge}>
                        <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                    </View>
                )}
            </View>

            <View style={styles.info}>
                <Text style={styles.empName}>{item.name}</Text>
                <Text style={styles.empId}>{item.employeeId}</Text>
                <View style={styles.tagRow}>
                    <View style={styles.tag}>
                        <Text style={styles.tagText}>{item.department || 'General'}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: '#E1F5FE' }]}>
                        <Text style={[styles.tagText, { color: '#0288D1' }]}>{item.designation || 'Employee'}</Text>
                    </View>
                </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#BDC3C7" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Employees ({employees.length})</Text>
                <TouchableOpacity onPress={loadEmployees} style={styles.addButton}>
                    <Ionicons name="refresh" size={22} color="#4A90E2" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#95A5A6" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, ID or department..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor="#95A5A6"
                />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A90E2" />
                    <Text style={styles.loadingText}>Loading Employees...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredEmployees}
                    renderItem={renderEmployeeItem}
                    keyExtractor={item => item.uid}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={60} color="#BDC3C7" />
                            <Text style={styles.emptyText}>No employees found</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Add Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    const limit = getUserLimit();
                    if (employees.length >= limit) {
                        Alert.alert(
                            'User Limit Reached',
                            `Your plan allows a maximum of ${limit} users. Please upgrade to add more employees.`,
                            [{ text: 'OK' }]
                        );
                        return;
                    }
                    navigation.navigate('Register', {
                        companyId: user.companyId,
                        companyName: user.companyName
                    });
                }}
            >
                <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1C1C1E',
        flex: 1,
        marginLeft: 12,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EBF5FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: 16,
        paddingHorizontal: 15,
        borderRadius: 12,
        height: 46,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1C1C1E',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    employeeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 14,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: '#4A90E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        position: 'relative',
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 16,
    },
    avatarText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '800',
    },
    badge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#2ECC71',
        borderRadius: 10,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    info: {
        flex: 1,
        minWidth: 0,
    },
    empName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 2,
    },
    empId: {
        fontSize: 12,
        color: '#8E8E93',
        marginBottom: 6,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
    },
    tag: {
        backgroundColor: '#F0F4C3',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 11,
        color: '#827717',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#8E8E93',
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 15,
        color: '#AEAEB2',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 25,
        backgroundColor: '#4A90E2',
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
    }
});
