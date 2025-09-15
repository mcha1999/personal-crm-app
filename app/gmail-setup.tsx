import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { GmailSetupGuide } from '@/components/GmailSetupGuide';

export default function GmailSetupScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <GmailSetupGuide />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});