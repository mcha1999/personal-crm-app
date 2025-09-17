import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DatabaseProvider, useDatabase } from "@/contexts/DatabaseContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ContactsProvider } from "@/contexts/ContactsContext";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { BackgroundTaskManager } from "@/services/BackgroundTaskManager";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

type RootLayoutNavProps = {
  initialRouteName: string;
};

function RootLayoutNav({ initialRouteName }: RootLayoutNavProps) {
  return (
    <Stack initialRouteName={initialRouteName} screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="contact/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ presentation: "modal", title: "Permissions" }} />
      <Stack.Screen name="health" options={{ presentation: "modal", title: "Health Check" }} />
      <Stack.Screen name="ai-demo" options={{ presentation: "modal", title: "AI Demo" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="email-setup" options={{ presentation: "modal", title: "Email Setup" }} />
    </Stack>
  );
}

function AppContent() {
  const { isInitialized, error } = useDatabase();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted, isLoading: onboardingLoading } = useOnboarding();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isInitialized && !authLoading && !onboardingLoading) {
      SplashScreen.hideAsync();

      // Initialize background tasks when app is ready
      // Note: Background tasks don't work in Expo Go, but will work in production builds
      const initBackgroundTasks = async () => {
        try {
          const taskManager = BackgroundTaskManager.getInstance();
          await taskManager.scheduleBackgroundTasks();
          console.log('[App] Background tasks initialized');
        } catch (error) {
          // This is expected in Expo Go or when background fetch is not available
          console.log('[App] Background tasks not available in Expo Go (will work in production)');
        }
      };

      initBackgroundTasks();
    }
  }, [isInitialized, authLoading, onboardingLoading]);

  useEffect(() => {
    if (!isInitialized || authLoading || onboardingLoading) {
      return;
    }

    if (!isAuthenticated) {
      if (pathname !== "/auth") {
        router.replace("/auth");
      }
      return;
    }

    const onboardingPaths = ["/onboarding", "/email-setup", "/gmail-setup"];
    const isInOnboardingFlow = pathname ? onboardingPaths.some(path => pathname.startsWith(path)) : false;

    if (!isOnboardingCompleted) {
      if (!isInOnboardingFlow) {
        router.replace("/onboarding");
      }
      return;
    }

    if (pathname === "/onboarding" || pathname === "/auth") {
      router.replace("/(tabs)");
    }
  }, [
    authLoading,
    isAuthenticated,
    isInitialized,
    isOnboardingCompleted,
    onboardingLoading,
    pathname,
    router,
  ]);

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

  const initialRouteName = !isAuthenticated
    ? 'auth'
    : !isOnboardingCompleted
      ? 'onboarding'
      : '(tabs)';

  return <RootLayoutNav key={initialRouteName} initialRouteName={initialRouteName} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.rootView}>
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider>
          <AuthProvider>
            <OnboardingProvider>
              <ContactsProvider>
                <AppContent />
              </ContactsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </DatabaseProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
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