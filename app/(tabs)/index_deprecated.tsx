/**
 * DEPRECATED - This file is no longer used
 * The app has moved to React Navigation
 * 
 * Entry Point: App.js
 * Screens: screens/ folder
 */

import React from 'react';
import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 18, color: '#666' }}>This route is deprecated</Text>
      <Text style={{ fontSize: 12, color: '#999', marginTop: 10 }}>Check App.js for current routes</Text>
    </View>
  );
}
