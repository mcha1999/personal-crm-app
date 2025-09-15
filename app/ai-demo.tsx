import React from 'react';
import { Stack } from 'expo-router';
import { AIServiceDemo } from '@/components/AIServiceDemo';

export default function AIDemoScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'AI Service Demo',
          headerStyle: { backgroundColor: '#f5f5f5' },
          headerTintColor: '#333',
        }} 
      />
      <AIServiceDemo testId="ai-demo-screen" />
    </>
  );
}