import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Database, Users, Mail, Calendar, Brain, CheckCircle, XCircle, AlertCircle, RefreshCw, Activity, HardDrive, Clock, Hash, FileText, Zap } from 'lucide-react-native';
import { useDatabase } from '@/contexts/DatabaseContext';
import { PersonDAO } from '@/database/PersonDAO';
import { InteractionDAO } from '@/database/InteractionDAO';
import { TaskDAO } from '@/database/TaskDAO';
import { PlaceDAO } from '@/database/PlaceDAO';
import { MeetingDAO } from '@/database/MeetingDAO';
import { ThreadDAO } from '@/database/ThreadDAO';
import { MessageDAO } from '@/database/MessageDAO';
import { PersonScoreDAO } from '@/database/PersonScoreDAO';
import { AnnotationDAO } from '@/database/AnnotationDAO';
import { CompanyDAO } from '@/database/CompanyDAO';
import { ContactsIngest } from '@/services/ContactsIngest';
import { CalendarListener } from '@/services/CalendarListener';
import { GmailSync } from '@/services/GmailSync';
import { BackgroundTaskManager } from '@/services/BackgroundTaskManager';
import { AIService } from '@/services/AIService';
import { LocalExport } from '@/database/LocalExport';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TableRowCount {
  table: string;
  count: number;
}

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'warning' | 'checking';
  message?: string;
}

interface SystemStatus {
  latestHistoryId?: string;
  pendingTasks: number;
  backgroundStatus: string;
  lastError?: string;
  lastSync?: Date;
  nextSync?: Date;
}

export const HealthScreen: React.FC = () => {
  const { database, isInitialized } = useDatabase();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [tableCounts, setTableCounts] = useState<TableRowCount[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    pendingTasks: 0,
    backgroundStatus: 'Unknown',
  });
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { name: 'Contacts', status: 'checking' },
    { name: 'Calendar', status: 'checking' },
    { name: 'Gmail Seed', status: 'checking' },
    { name: 'Gmail Delta', status: 'checking' },
    { name: 'Background', status: 'checking' },
    { name: 'AI Service', status: 'checking' },
    { name: 'Export', status: 'checking' },
  ]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const loadTableCounts = async () => {
    if (!isInitialized || !database) return;

    try {
      const tables = [
        'persons',
        'interactions',
        'tasks',
        'places',
        'meetings',
        'threads',
        'messages',
        'person_scores',
        'annotations',
        'companies',
      ];

      const counts: TableRowCount[] = [];
      
      for (const table of tables) {
        try {
          const result = await database.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM ${table}`
          );
          counts.push({ table, count: result?.count || 0 });
        } catch (error) {
          console.error(`Error counting ${table}:`, error);
          counts.push({ table, count: -1 });
        }
      }

      setTableCounts(counts);
    } catch (error) {
      console.error('Error loading table counts:', error);
    }
  };

  const loadSystemStatus = async () => {
    try {
      // Get latest history ID from AsyncStorage
      const historyId = await AsyncStorage.getItem('gmail_history_id');
      
      // Get background task status
      const taskManager = BackgroundTaskManager.getInstance();
      const taskStatus = await taskManager.getTaskStatus();
      
      // Get pending tasks count
      const taskDAO = new TaskDAO();
      const pendingTasks = await taskDAO.getAll();
      const pendingCount = pendingTasks.filter(t => t.status === 'pending').length;
      
      // Get last error from AsyncStorage
      const lastError = await AsyncStorage.getItem('last_sync_error');
      
      setSystemStatus({
        latestHistoryId: historyId || undefined,
        pendingTasks: pendingCount,
        backgroundStatus: taskStatus?.gmailSync?.isRegistered ? 'Registered' : 'Not Registered',
        lastError: lastError || undefined,
        lastSync: taskStatus?.gmailSync?.lastRun || undefined,
        nextSync: taskStatus?.gmailSync?.nextRun || undefined,
      });
    } catch (error) {
      console.error('Error loading system status:', error);
    }
  };

  const loadErrorLogs = async () => {
    try {
      // Get recent error logs from AsyncStorage
      const logs: string[] = [];
      const errorKeys = ['last_sync_error', 'last_score_error', 'last_ai_error', 'last_export_error'];
      
      for (const key of errorKeys) {
        const error = await AsyncStorage.getItem(key);
        if (error) {
          const timestamp = await AsyncStorage.getItem(`${key}_timestamp`);
          logs.push(`[${timestamp || 'Unknown time'}] ${key}: ${error}`);
        }
      }
      
      setErrorLogs(logs);
    } catch (error) {
      console.error('Error loading error logs:', error);
    }
  };

  const runSelfTest = async () => {
    setIsRunningTest(true);
    const checks: HealthCheck[] = [];

    try {
      // Test Contacts
      try {
        const contactsIngest = new ContactsIngest();
        const hasPermission = await contactsIngest.requestPermissions();
        checks.push({
          name: 'Contacts',
          status: hasPermission ? 'ok' : 'warning',
          message: hasPermission ? 'Permissions granted' : 'Permissions not granted',
        });
      } catch (error) {
        checks.push({
          name: 'Contacts',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test Calendar
      try {
        const personDAO = new PersonDAO();
        const meetingDAO = new MeetingDAO();
        const placeDAO = new PlaceDAO();
        const interactionDAO = new InteractionDAO();
        
        const calendarListener = CalendarListener.getInstance(
          personDAO,
          meetingDAO,
          placeDAO,
          interactionDAO
        );
        const hasPermission = await calendarListener.requestPermissions();
        checks.push({
          name: 'Calendar',
          status: hasPermission ? 'ok' : 'warning',
          message: hasPermission ? 'Permissions granted' : 'Permissions not granted',
        });
      } catch (error) {
        checks.push({
          name: 'Calendar',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test Gmail Seed
      try {
        const gmailSync = GmailSync.getInstance();
        const isAuthenticated = await gmailSync.isAuthenticated();
        
        if (isAuthenticated) {
          // Try to get profile to verify connection
          const profile = await gmailSync.getUserProfile();
          checks.push({
            name: 'Gmail Seed',
            status: 'ok',
            message: `Connected as ${profile?.emailAddress || 'unknown'}`,
          });
        } else {
          checks.push({
            name: 'Gmail Seed',
            status: 'warning',
            message: 'Not authenticated',
          });
        }
      } catch (error) {
        checks.push({
          name: 'Gmail Seed',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test Gmail Delta
      try {
        const historyId = await AsyncStorage.getItem('gmail_history_id');
        if (historyId) {
          checks.push({
            name: 'Gmail Delta',
            status: 'ok',
            message: `History ID: ${historyId}`,
          });
        } else {
          checks.push({
            name: 'Gmail Delta',
            status: 'warning',
            message: 'No history ID found',
          });
        }
      } catch (error) {
        checks.push({
          name: 'Gmail Delta',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test Background Tasks
      try {
        const taskManager = BackgroundTaskManager.getInstance();
        const status = await taskManager.getTaskStatus();
        
        if (status?.gmailSync?.isRegistered && status?.indexScore?.isRegistered) {
          checks.push({
            name: 'Background',
            status: 'ok',
            message: 'All tasks registered',
          });
        } else {
          checks.push({
            name: 'Background',
            status: 'warning',
            message: 'Some tasks not registered',
          });
        }
      } catch (error) {
        checks.push({
          name: 'Background',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test AI Service
      try {
        const aiService = AIService.getInstance();
        const testThread = {
          id: 'test',
          subject: 'Test Thread',
          snippet: 'This is a test thread for health check',
          messages: [
            {
              id: 'msg1',
              threadId: 'test',
              from: 'test@example.com',
              to: ['user@example.com'],
              subject: 'Test',
              snippet: 'Test message',
              date: new Date(),
              labelIds: [],
            },
          ],
        };
        
        const summary = await aiService.threadSummary(testThread);
        if (summary && summary.summary) {
          checks.push({
            name: 'AI Service',
            status: 'ok',
            message: 'Service operational',
          });
        } else {
          checks.push({
            name: 'AI Service',
            status: 'warning',
            message: 'Service returned empty response',
          });
        }
      } catch (error) {
        checks.push({
          name: 'AI Service',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Test Export
      try {
        const exporter = new LocalExport();
        // Just check if we can create an exporter instance
        checks.push({
          name: 'Export',
          status: 'ok',
          message: 'Export service available',
        });
      } catch (error) {
        checks.push({
          name: 'Export',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      setHealthChecks(checks);
      Alert.alert('Self-Test Complete', `${checks.filter(c => c.status === 'ok').length}/${checks.length} checks passed`);
    } catch (error) {
      console.error('Self-test error:', error);
      Alert.alert('Self-Test Failed', 'An error occurred during the self-test');
    } finally {
      setIsRunningTest(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadTableCounts(),
      loadSystemStatus(),
      loadErrorLogs(),
    ]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isInitialized) {
      loadTableCounts();
      loadSystemStatus();
      loadErrorLogs();
    }
  }, [isInitialized]);

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle size={20} color="#27AE60" />;
      case 'error':
        return <XCircle size={20} color="#E74C3C" />;
      case 'warning':
        return <AlertCircle size={20} color="#F39C12" />;
      case 'checking':
        return <ActivityIndicator size="small" color="#3498DB" />;
    }
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>System Health</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={20} color={isRefreshing ? "#95A5A6" : "#3498DB"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Database Tables */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={20} color="#3498DB" />
            <Text style={styles.sectionTitle}>Database Tables</Text>
          </View>
          <View style={styles.card}>
            {tableCounts.map((table, index) => (
              <View
                key={table.table}
                style={[
                  styles.tableRow,
                  index < tableCounts.length - 1 && styles.borderBottom,
                ]}
              >
                <Text style={styles.tableName}>{table.table}</Text>
                <View style={styles.countBadge}>
                  <Hash size={14} color="#7F8C8D" />
                  <Text style={styles.tableCount}>
                    {table.count === -1 ? 'Error' : table.count.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* System Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity size={20} color="#9B59B6" />
            <Text style={styles.sectionTitle}>System Status</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Latest History ID</Text>
              <Text style={styles.statusValue}>
                {systemStatus.latestHistoryId || 'Not set'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Pending Tasks</Text>
              <Text style={styles.statusValue}>{systemStatus.pendingTasks}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Background Status</Text>
              <Text style={styles.statusValue}>{systemStatus.backgroundStatus}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Sync</Text>
              <Text style={styles.statusValue}>{formatDate(systemStatus.lastSync)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Next Sync</Text>
              <Text style={styles.statusValue}>{formatDate(systemStatus.nextSync)}</Text>
            </View>
          </View>
        </View>

        {/* Health Checks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={20} color="#27AE60" />
            <Text style={styles.sectionTitle}>Health Checks</Text>
          </View>
          <View style={styles.card}>
            {healthChecks.map((check, index) => (
              <View
                key={check.name}
                style={[
                  styles.healthRow,
                  index < healthChecks.length - 1 && styles.borderBottom,
                ]}
              >
                <View style={styles.healthLeft}>
                  {getStatusIcon(check.status)}
                  <Text style={styles.healthName}>{check.name}</Text>
                </View>
                {check.message && (
                  <Text style={styles.healthMessage}>{check.message}</Text>
                )}
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.testButton}
            onPress={runSelfTest}
            disabled={isRunningTest}
          >
            {isRunningTest ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Activity size={20} color="white" />
                <Text style={styles.testButtonText}>Run Self-Test</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Logs */}
        {errorLogs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color="#E74C3C" />
              <Text style={styles.sectionTitle}>Recent Errors</Text>
            </View>
            <View style={styles.card}>
              {errorLogs.map((log, index) => (
                <View
                  key={index}
                  style={[
                    styles.logRow,
                    index < errorLogs.length - 1 && styles.borderBottom,
                  ]}
                >
                  <Text style={styles.logText}>{log}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>System health diagnostics</Text>
          <Text style={styles.footerSubtext}>All checks run locally on device</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  tableName: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tableCount: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statusLabel: {
    fontSize: 15,
    color: '#7F8C8D',
  },
  statusValue: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  healthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthName: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  healthMessage: {
    fontSize: 13,
    color: '#7F8C8D',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  logRow: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  logText: {
    fontSize: 13,
    color: '#E74C3C',
    fontFamily: 'monospace',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#95A5A6',
  },
});