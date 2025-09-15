import { useState, useEffect, useCallback, useMemo } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

const AUTH_ENABLED_KEY = 'kin_auth_enabled';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthEnabled, setIsAuthEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      console.log('[Auth] Checking authentication status...');
      
      if (Platform.OS === 'web') {
        console.log('[Auth] Web platform - authentication disabled');
        setIsAuthenticated(true);
        setIsAuthEnabled(false);
        setIsLoading(false);
        return;
      }

      // Check if biometric authentication is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      console.log('[Auth] Hardware available:', hasHardware, 'Enrolled:', isEnrolled);
      
      if (!hasHardware || !isEnrolled) {
        console.log('[Auth] Biometric authentication not available - skipping auth');
        setIsAuthenticated(true);
        setIsAuthEnabled(false);
        setIsLoading(false);
        return;
      }

      // Check if user has enabled authentication
      const authEnabledStr = await AsyncStorage.getItem(AUTH_ENABLED_KEY);
      const authEnabled = authEnabledStr === 'true';
      
      console.log('[Auth] Authentication enabled in settings:', authEnabled);
      
      setIsAuthEnabled(authEnabled);
      
      if (authEnabled) {
        // Require authentication on app start
        setIsAuthenticated(false);
      } else {
        // Authentication disabled - allow access
        setIsAuthenticated(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('[Auth] Error checking auth status:', error);
      // On error, allow access but disable auth features
      setIsAuthenticated(true);
      setIsAuthEnabled(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Auth] Starting biometric authentication...');
      
      if (Platform.OS === 'web') {
        console.log('[Auth] Web platform - authentication not supported');
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Kin',

        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      console.log('[Auth] Authentication result:', result.success);
      
      if (result.success) {
        setIsAuthenticated(true);
        return true;
      } else {
        console.log('[Auth] Authentication failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[Auth] Authentication error:', error);
      return false;
    }
  }, []);

  const enableAuth = useCallback(async (): Promise<void> => {
    try {
      console.log('[Auth] Enabling biometric authentication...');
      
      if (Platform.OS === 'web') {
        throw new Error('Biometric authentication is not available on web');
      }

      // Check if biometric authentication is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware) {
        throw new Error('Biometric hardware is not available on this device');
      }
      
      if (!isEnrolled) {
        throw new Error('No biometric credentials are enrolled on this device');
      }

      // Test authentication before enabling
      const testResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to enable app lock',

        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!testResult.success) {
        throw new Error('Authentication failed - app lock not enabled');
      }

      // Save the setting
      await AsyncStorage.setItem(AUTH_ENABLED_KEY, 'true');
      setIsAuthEnabled(true);
      
      console.log('[Auth] Biometric authentication enabled successfully');
    } catch (error) {
      console.error('[Auth] Error enabling authentication:', error);
      throw error;
    }
  }, []);

  const disableAuth = useCallback(async (): Promise<void> => {
    try {
      console.log('[Auth] Disabling biometric authentication...');
      
      // Remove the setting
      await AsyncStorage.removeItem(AUTH_ENABLED_KEY);
      setIsAuthEnabled(false);
      setIsAuthenticated(true); // Allow access when disabled
      
      console.log('[Auth] Biometric authentication disabled successfully');
    } catch (error) {
      console.error('[Auth] Error disabling authentication:', error);
      throw error;
    }
  }, []);

  const getSupportedAuthTypes = useCallback(async (): Promise<LocalAuthentication.AuthenticationType[]> => {
    try {
      if (Platform.OS === 'web') {
        return [];
      }
      
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('[Auth] Error getting supported auth types:', error);
      return [];
    }
  }, []);

  return useMemo(() => ({
    isAuthenticated,
    isAuthEnabled,
    isLoading,
    authenticate,
    enableAuth,
    disableAuth,
    checkAuthStatus,
    getSupportedAuthTypes,
  }), [isAuthenticated, isAuthEnabled, isLoading, authenticate, enableAuth, disableAuth, checkAuthStatus, getSupportedAuthTypes]);
});