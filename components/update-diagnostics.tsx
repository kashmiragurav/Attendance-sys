import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';

export default function UpdateDiagnostics() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        setChecking(true);
        setStatus('Checking for updates...');
        const res = await Updates.checkForUpdateAsync();
        if (!mounted) return;
        if (res.isAvailable) {
          setStatus('Update available — trying to fetch...');
          try {
            await Updates.fetchUpdateAsync();
            if (!mounted) return;
            setStatus('Update fetched. Will reload to apply.');
            // apply update by reloading
            await Updates.reloadAsync();
          } catch (fetchErr: any) {
            console.warn('fetchUpdateAsync error', fetchErr);
            setError(String(fetchErr?.message ?? fetchErr));
            setStatus('Failed to fetch update');
          }
        } else {
          setStatus('No update available');
        }
      } catch (err: any) {
        console.warn('checkForUpdateAsync error', err);
        setError(String(err?.message ?? err));
        setStatus('Update check failed');
      } finally {
        if (mounted) setChecking(false);
      }
    }

    // run once on mount
    check();

    return () => {
      mounted = false;
    };
  }, []);

  // Hide diagnostics UI in development mode (Expo Go / Metro), but still keep hooks order
  if (__DEV__) {
    return null;
  }

  return (
    <View style={styles.box} accessible>
      <Text style={styles.heading}>Update diagnostics</Text>
      <Text style={styles.line}>Status: {status ?? 'idle'}</Text>
      {checking && <ActivityIndicator style={styles.indicator} />}
      {error ? <Text style={styles.error}>Error: {error}</Text> : null}
      <Text style={styles.small}>
        Note: on Expo Go this will not use your standalone update URL; it helps show errors when a
        custom dev client or standalone app attempts an OTA download.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    width: '100%',
    backgroundColor: '#FAFAFA',
  },
  heading: {
    fontWeight: '700',
    marginBottom: 6,
  },
  line: {
    marginBottom: 6,
  },
  error: {
    color: 'crimson',
    marginTop: 6,
  },
  small: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  indicator: {
    marginVertical: 6,
  },
});
