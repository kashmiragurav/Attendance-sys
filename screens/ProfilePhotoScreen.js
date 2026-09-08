import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

export default function ProfilePhotoScreen({ navigation }) {
    const { user, updateProfile } = useAuth();
    const [selectedImage, setSelectedImage] = useState(user?.profilePhoto || null);
    const [loading, setLoading] = useState(false);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please grant permission to access your photos to upload a profile picture.'
            );
            return false;
        }
        return true;
    };

    const pickImageFromGallery = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5, // Compress to reduce size
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
            console.error('Image picker error:', error);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Please grant permission to access your camera to take a photo.'
            );
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo');
            console.error('Camera error:', error);
        }
    };

    const handleChoosePhoto = () => {
        Alert.alert(
            'Choose Photo',
            'Select an option',
            [
                {
                    text: 'Take Photo',
                    onPress: takePhoto,
                },
                {
                    text: 'Choose from Gallery',
                    onPress: pickImageFromGallery,
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ]
        );
    };

    const handleRemovePhoto = () => {
        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove your profile photo?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => setSelectedImage(null),
                },
            ]
        );
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const result = await updateProfile({
                profilePhoto: selectedImage,
            });

            if (result.success) {
                Alert.alert('Success', 'Profile photo updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', result.error || 'Failed to update photo');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

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
                <Text style={styles.headerTitle}>Profile Photo</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Photo Preview */}
                <View style={styles.photoSection}>
                    <View style={styles.photoContainer}>
                        {selectedImage ? (
                            <Image source={{ uri: selectedImage }} style={styles.photo} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Ionicons name="person" size={80} color="#BDC3C7" />
                            </View>
                        )}
                    </View>

                    <Text style={styles.userName}>{user?.name || 'User Name'}</Text>
                    <Text style={styles.userRole}>{user?.designation || 'Employee'}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsSection}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleChoosePhoto}
                    >
                        <View style={styles.actionIconContainer}>
                            <Ionicons name="camera" size={24} color="#37B46F" />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={styles.actionTitle}>
                                {selectedImage ? 'Change Photo' : 'Add Photo'}
                            </Text>
                            <Text style={styles.actionSubtitle}>
                                Take a photo or choose from gallery
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>

                    {selectedImage && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleRemovePhoto}
                        >
                            <View style={[styles.actionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                                <Ionicons name="trash" size={24} color="#E74C3C" />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={[styles.actionTitle, { color: '#E74C3C' }]}>
                                    Remove Photo
                                </Text>
                                <Text style={styles.actionSubtitle}>
                                    Delete your current profile photo
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Guidelines */}
                <View style={styles.guidelinesSection}>
                    <Text style={styles.guidelinesTitle}>Photo Guidelines</Text>
                    <View style={styles.guidelineItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#37B46F" />
                        <Text style={styles.guidelineText}>Use a clear, recent photo</Text>
                    </View>
                    <View style={styles.guidelineItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#37B46F" />
                        <Text style={styles.guidelineText}>Face should be clearly visible</Text>
                    </View>
                    <View style={styles.guidelineItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#37B46F" />
                        <Text style={styles.guidelineText}>Professional appearance recommended</Text>
                    </View>
                    <View style={styles.guidelineItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#37B46F" />
                        <Text style={styles.guidelineText}>Square format works best</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Save Button */}
            {selectedImage !== user?.profilePhoto && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>SAVE PHOTO</Text>
                        )}
                    </TouchableOpacity>
                </View>
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
    },
    content: {
        flex: 1,
    },
    photoSection: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 40,
        alignItems: 'center',
        marginBottom: 10,
    },
    photoContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 4,
        borderColor: '#37B46F',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ECF0F1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        color: '#7F8C8D',
    },
    actionsSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        marginBottom: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 2,
    },
    actionSubtitle: {
        fontSize: 13,
        color: '#7F8C8D',
    },
    guidelinesSection: {
        backgroundColor: '#FFFFFF',
        padding: 20,
    },
    guidelinesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 16,
    },
    guidelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    guidelineText: {
        fontSize: 14,
        color: '#2C3E50',
        flex: 1,
    },
    footer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    saveButton: {
        backgroundColor: '#37B46F',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
