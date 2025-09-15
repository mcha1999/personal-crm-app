import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DatabaseProvider, useDatabase } from "@/contexts/DatabaseContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { AuthScreen } from "@/components/AuthScreen";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { BackgroundTaskManager } from "@/services/BackgroundTaskManager";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="contact/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ presentation: "modal", title: "Permissions" }} />
      <Stack.Screen name="health" options={{ presentation: "modal", title: "Health Check" }} />
      <Stack.Screen name="ai-demo" options={{ presentation: "modal", title: "AI Demo" }} />
    </Stack>
  );
}

function AppContent() {
  const { isInitialized, error } = useDatabase();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted, isLoading: onboardingLoading } = useOnboarding();

  useEffect(() => {
    if (isInitialized && !authLoading && !onboardingLoading) {
      SplashScreen.hideAsync();
      
      // Initialize background tasks when app is ready
      const initBackgroundTasks = async () => {
        try {
          const taskManager = BackgroundTaskManager.getInstance();
          await taskManager.scheduleBackgroundTasks();
          console.log('[App] Background tasks initialized');
        } catch (error) {
          console.error('[App] Failed to initialize background tasks:', error);
        }
      };
      
      initBackgroundTasks();
    }
  }, [isInitialized, authLoading, onboardingLoading]);

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to initialize database</Text>
        <Text style={styles.errorDetail}>{error}</Text>
      </View>
    );
  }

  if (!isInitialized || authLoading || onboardingLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {!isInitialized ? 'Initializing...' : authLoading ? 'Checking authentication...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }
  
  if (!isOnboardingCompleted) {
    return <OnboardingFlow />;
  }

  return <RootLayoutNav />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DatabaseProvider>
          <OnboardingProvider>
            <ContactsProvider>
              <GestureHandlerRootView style={styles.rootView}>
                <AppContent />
              </GestureHandlerRootView>
            </ContactsProvider>
          </OnboardingProvider>
        </DatabaseProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 32,
    textAlign: 'center',
  },
});