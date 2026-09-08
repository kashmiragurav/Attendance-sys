import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

export default function DocumentsScreen({ navigation }) {
    const { user, updateProfile } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = () => {
        // Load documents from user profile
        if (user?.documents && Array.isArray(user.documents)) {
            setDocuments(user.documents);
        }
    };

    const handleAddDocument = () => {
        Alert.alert(
            'Add Document',
            'Document upload feature coming soon. You will be able to upload:\n\n• Aadhaar Card\n• PAN Card\n• Educational Certificates\n• Experience Letters\n• Other Documents',
            [{ text: 'OK' }]
        );
    };

    const handleDocumentPress = (document) => {
        Alert.alert(
            document.name,
            `Type: ${document.type}\nUploaded: ${document.uploadedDate}`,
            [
                { text: 'View', onPress: () => viewDocument(document) },
                { text: 'Delete', onPress: () => deleteDocument(document), style: 'destructive' },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const viewDocument = (document) => {
        Alert.alert('View Document', 'Document viewer coming soon');
    };

    const deleteDocument = async (document) => {
        Alert.alert(
            'Delete Document',
            `Are you sure you want to delete ${document.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const updatedDocuments = documents.filter(doc => doc.id !== document.id);
                        setDocuments(updatedDocuments);
                        await updateProfile({ documents: updatedDocuments });
                        Alert.alert('Success', 'Document deleted successfully');
                    },
                },
            ]
        );
    };

    const renderDocument = ({ item }) => (
        <TouchableOpacity
            style={styles.documentCard}
            onPress={() => handleDocumentPress(item)}
        >
            <View style={styles.documentIcon}>
                <Ionicons name="document-text" size={32} color="#37B46F" />
            </View>
            <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{item.name}</Text>
                <Text style={styles.documentType}>{item.type}</Text>
                <Text style={styles.documentDate}>Uploaded: {item.uploadedDate}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="folder-open-outline" size={80} color="#BDC3C7" />
            </View>
            <Text style={styles.emptyTitle}>No Documents Yet</Text>
            <Text style={styles.emptyText}>
                Upload your important documents like Aadhaar, PAN, certificates, etc.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddDocument}>
                <Ionicons name="add-circle" size={20} color="#37B46F" />
                <Text style={styles.emptyButtonText}>Add Your First Document</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{user?.name}'s Documents</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            {documents.length === 0 ? (
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {renderEmptyState()}
                </ScrollView>
            ) : (
                <FlatList
                    data={documents}
                    renderItem={renderDocument}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Add Document Button (Floating) */}
            {documents.length > 0 && (
                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={handleAddDocument}
                >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                    <Text style={styles.floatingButtonText}>Add Document</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: '#2C3E50',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
        marginRight: 40,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    listContent: {
        padding: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#7F8C8D',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
    },
    emptyButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#37B46F',
    },
    documentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    documentIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    documentInfo: {
        flex: 1,
    },
    documentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    documentType: {
        fontSize: 13,
        color: '#37B46F',
        marginBottom: 2,
    },
    documentDate: {
        fontSize: 12,
        color: '#95A5A6',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#37B46F',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        gap: 8,
    },
    floatingButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
