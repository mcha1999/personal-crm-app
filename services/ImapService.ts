import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { TcpSocket, TcpSocketConnectOpts } from 'react-native-tcp-socket';

type TcpSocketModule = typeof import('react-native-tcp-socket');

interface ImapAccountConfig {
  email: string;
  appPassword: string;
  host: string;
  port: number;
  tls: boolean;
  provider?: string;
  createdAt?: string;
}

export interface ImapSupportStatus {
  supported: boolean;
  reason?: string;
}

export interface ImapTestResult {
  success: boolean;
  error?: string;
  greeting?: string;
  capabilities?: string[];
}

export interface ImapSyncResult {
  success: boolean;
  mailbox?: string;
  messageUids?: string[];
  greeting?: string;
  capabilities?: string[];
  error?: string;
}

interface PendingCommand {
  resolve: (result: ImapCommandResult) => void;
  reject: (error: Error) => void;
  lines: string[];
  command: string;
  timer: ReturnType<typeof setTimeout>;
}

interface ImapCommandResult {
  tag: string;
  status: 'OK' | 'NO' | 'BAD';
  lines: string[];
  text: string;
}

interface OpenConnectionOptions {
  timeoutMs?: number;
  debug?: boolean;
}

class ImapCommandError extends Error {
  readonly status: 'OK' | 'NO' | 'BAD';
  readonly command: string;
  readonly responseLines: string[];
  readonly finalLine: string;

  constructor(command: string, status: 'OK' | 'NO' | 'BAD', responseLines: string[], finalLine: string) {
    super(`IMAP command failed (${status}): ${finalLine}`);
    this.name = 'ImapCommandError';
    this.status = status;
    this.command = command;
    this.responseLines = responseLines;
    this.finalLine = finalLine;
  }
}

class ImapConnection {
  private static async create(module: TcpSocketModule, config: ImapAccountConfig, options: OpenConnectionOptions): Promise<ImapConnection> {
    const socketOptions: TcpSocketConnectOpts = {
      host: config.host,
      port: config.port,
      tls: config.tls ? { rejectUnauthorized: false } : false,
      timeout: options.timeoutMs ?? 15000,
    };

    return await new Promise<ImapConnection>((resolve, reject) => {
      let resolved = false;
      const socket = module.createConnection(socketOptions);
      const connection = new ImapConnection(socket, options);

      const handleReady = async () => {
        try {
          await connection.waitForReady(options.timeoutMs);
          resolved = true;
          cleanup();
          resolve(connection);
        } catch (error) {
          cleanup();
          connection.close();
          reject(error instanceof Error ? error : new Error('IMAP connection failed to initialize'));
        }
      };

      const handleError = (error: Error) => {
        cleanup();
        if (!resolved) {
          reject(error);
        } else {
          connection.handleTransportError(error);
        }
      };

      const handleClose = () => {
        const error = new Error('IMAP connection closed before greeting');
        cleanup();
        if (!resolved) {
          reject(error);
        }
      };

      const cleanup = () => {
        socket.removeListener?.('error', handleError);
        socket.removeListener?.('close', handleClose);
        socket.removeListener?.('connect', handleReady);
      };

      socket.once('error', handleError);
      socket.once('close', handleClose);
      socket.once('connect', handleReady);
    });
  }

  private readonly socket: TcpSocket;
  private readonly debug: boolean;
  private readonly pendingCommands = new Map<string, PendingCommand>();
  private readonly pendingQueue: string[] = [];
  private tagCounter = 0;
  private buffer = '';
  private ready = false;
  private greetingLine: string | null = null;
  private readyResolver?: () => void;
  private readyRejector?: (error: Error) => void;
  private readyPromise: Promise<void>;
  private closed = false;

  private constructor(socket: TcpSocket, options: OpenConnectionOptions) {
    this.socket = socket;
    this.debug = options.debug ?? false;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolver = resolve;
      this.readyRejector = reject;
    });

    try {
      this.socket.setEncoding?.('utf8');
    } catch {
      // Some environments (like native) may not implement setEncoding - ignore
    }

    this.socket.on('data', this.handleData);
    this.socket.on('error', this.handleTransportError);
    this.socket.on('close', this.handleClose);
  }

  static async connect(module: TcpSocketModule, config: ImapAccountConfig, options: OpenConnectionOptions): Promise<ImapConnection> {
    return await ImapConnection.create(module, config, options);
  }

  getGreeting(): string | null {
    return this.greetingLine;
  }

  async waitForReady(timeoutMs?: number): Promise<void> {
    if (this.ready) {
      return;
    }

    const timeout = timeoutMs ?? 15000;

    return await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error('IMAP server greeting timed out');
        this.readyRejector?.(error);
      }, timeout);

      this.readyPromise
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private handleData = (data: any) => {
    if (!data || this.closed) return;

    let chunk: string;
    if (typeof data === 'string') {
      chunk = data;
    } else {
      const globalBuffer = (globalThis as any).Buffer;
      if (globalBuffer?.isBuffer?.(data)) {
        chunk = (data as { toString: (encoding?: string) => string }).toString('utf8');
      } else if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
        chunk = String.fromCharCode(...new Uint8Array(data));
      } else if (Array.isArray(data)) {
        chunk = String.fromCharCode(...data);
      } else if (typeof data?.toString === 'function') {
        chunk = data.toString();
      } else {
        chunk = '';
      }
    }

    if (!chunk) return;

    this.buffer += chunk;
    let newlineIndex = this.buffer.indexOf('\r\n');

    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 2);
      this.dispatchLine(line);
      newlineIndex = this.buffer.indexOf('\r\n');
    }
  };

  private dispatchLine(line: string) {
    if (!line) {
      return;
    }

    if (!this.ready) {
      const upper = line.toUpperCase();
      if (upper.startsWith('* OK') || upper.startsWith('* PREAUTH')) {
        this.ready = true;
        this.greetingLine = line;
        this.readyResolver?.();
      } else if (upper.startsWith('* BYE')) {
        const error = new Error(line);
        this.readyRejector?.(error);
        this.close();
      }
      return;
    }

    if (this.pendingQueue.length === 0) {
      if (this.debug) {
        console.debug('[ImapConnection] Unsolicited line:', line);
      }
      return;
    }

    const currentTag = this.pendingQueue[0];
    const pending = this.pendingCommands.get(currentTag);

    if (!pending) {
      return;
    }

    if (line.startsWith(currentTag + ' ')) {
      this.pendingQueue.shift();
      this.pendingCommands.delete(currentTag);
      clearTimeout(pending.timer);

      const statusText = line.slice(currentTag.length + 1).trim();
      const statusToken = (statusText.split(' ')[0] || '').toUpperCase();
      const status: 'OK' | 'NO' | 'BAD' = statusToken === 'NO' || statusToken === 'BAD' ? statusToken : 'OK';

      if (status === 'OK') {
        pending.resolve({
          tag: currentTag,
          status,
          lines: pending.lines.slice(),
          text: line,
        });
      } else {
        pending.reject(new ImapCommandError(pending.command, status, pending.lines.slice(), line));
      }
    } else {
      pending.lines.push(line);
    }
  }

  private handleTransportError = (error: Error) => {
    if (!this.ready) {
      this.readyRejector?.(error);
    }
    this.failPending(error);
  };

  private handleClose = (hadError: boolean) => {
    if (this.closed) return;
    this.closed = true;
    const error = hadError ? new Error('IMAP connection closed unexpectedly') : new Error('IMAP connection closed');
    if (!this.ready) {
      this.readyRejector?.(error);
    }
    this.failPending(error);
  };

  private failPending(error: Error) {
    for (const tag of this.pendingQueue.splice(0)) {
      const pending = this.pendingCommands.get(tag);
      if (pending) {
        clearTimeout(pending.timer);
        pending.reject(error);
        this.pendingCommands.delete(tag);
      }
    }
  }

  private createTag(): string {
    this.tagCounter += 1;
    return `A${this.tagCounter.toString().padStart(3, '0')}`;
  }

  async sendCommand(command: string, options: { sensitive?: boolean; timeoutMs?: number } = {}): Promise<ImapCommandResult> {
    await this.waitForReady(options.timeoutMs);

    if (this.closed) {
      throw new Error('IMAP connection is closed');
    }

    const tag = this.createTag();
    const payload = `${tag} ${command}\r\n`;

    return await new Promise<ImapCommandResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(tag);
        const queueIndex = this.pendingQueue.indexOf(tag);
        if (queueIndex >= 0) {
          this.pendingQueue.splice(queueIndex, 1);
        }
        reject(new Error(`IMAP command timed out: ${command}`));
      }, options.timeoutMs ?? 15000);

      this.pendingCommands.set(tag, {
        resolve,
        reject,
        lines: [],
        command,
        timer,
      });

      this.pendingQueue.push(tag);

      if (this.debug && !options.sensitive) {
        console.debug('[ImapConnection] =>', command);
      }

      try {
        this.socket.write(payload, 'utf8');
      } catch (error) {
        clearTimeout(timer);
        this.pendingCommands.delete(tag);
        this.pendingQueue.pop();
        reject(error instanceof Error ? error : new Error('Failed to write to IMAP socket'));
      }
    });
  }

  async login(username: string, password: string): Promise<void> {
    const escapedUser = this.escapeQuoted(username);
    const escapedPass = this.escapeQuoted(password);
    await this.sendCommand(`LOGIN "${escapedUser}" "${escapedPass}"`, { sensitive: true });
  }

  async capability(): Promise<string[]> {
    const response = await this.sendCommand('CAPABILITY');
    const capabilities: string[] = [];

    for (const line of response.lines) {
      const trimmed = line.trim();
      if (trimmed.toUpperCase().startsWith('* CAPABILITY')) {
        const tokens = trimmed.split(' ').slice(2);
        for (const token of tokens) {
          if (token) {
            capabilities.push(token.trim());
          }
        }
      }
    }

    return capabilities;
  }

  async selectMailbox(mailbox: string): Promise<void> {
    const escaped = this.escapeQuoted(mailbox);
    await this.sendCommand(`SELECT "${escaped}"`);
  }

  async uidSearch(criteria: string): Promise<string[]> {
    const response = await this.sendCommand(`UID SEARCH ${criteria}`);
    const uids: string[] = [];

    for (const line of response.lines) {
      const trimmed = line.trim();
      if (trimmed.toUpperCase().startsWith('* SEARCH')) {
        const parts = trimmed.split(' ').slice(2);
        for (const part of parts) {
          const value = part.trim();
          if (value) {
            uids.push(value);
          }
        }
      }
    }

    return uids;
  }

  async noop(): Promise<void> {
    await this.sendCommand('NOOP');
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand('LOGOUT', { timeoutMs: 5000 });
    } catch {
      // Many servers close the socket immediately after LOGOUT; swallow errors here
    }
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.socket.removeAllListeners();

    try {
      this.socket.end();
    } catch {
      // Ignore errors when closing the socket
    }

    try {
      this.socket.destroy();
    } catch {
      // Ignore errors when destroying the socket
    }
  }

  private escapeQuoted(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}

const SOCKET_LIBRARY_NAME = 'react-native-tcp-socket';

export class ImapService {
  private static instance: ImapService | null = null;
  private transport: TcpSocketModule | null = null;
  private readonly configKey = 'email_config';

  static getInstance(): ImapService {
    if (!ImapService.instance) {
      ImapService.instance = new ImapService();
    }
    return ImapService.instance;
  }

  async isSyncSupported(): Promise<ImapSupportStatus> {
    if (Platform.OS === 'web') {
      return { supported: false, reason: 'IMAP sync requires a native runtime environment' };
    }

    try {
      this.loadTransport();
      return { supported: true };
    } catch (error) {
      return {
        supported: false,
        reason: error instanceof Error ? error.message : 'IMAP transport is unavailable',
      };
    }
  }

  async testConnection(config?: Partial<ImapAccountConfig>): Promise<ImapTestResult> {
    const account = config ? this.normalizeConfig(config) : await this.loadStoredConfig();

    if (!account) {
      return { success: false, error: 'IMAP account has not been configured yet' };
    }

    let connection: ImapConnection | null = null;

    try {
      connection = await this.openConnection(account);

      await connection.login(account.email, account.appPassword);
      const capabilities = await connection.capability().catch(() => []);
      await connection.noop();
      await connection.logout();

      return {
        success: true,
        greeting: connection.getGreeting() ?? undefined,
        capabilities,
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
      };
    } finally {
      connection?.close();
    }
  }

  async syncMailbox(options: { mailbox?: string; limit?: number } = {}): Promise<ImapSyncResult> {
    const account = await this.loadStoredConfig();
    if (!account) {
      return { success: false, error: 'IMAP account configuration was not found' };
    }

    const support = await this.isSyncSupported();
    if (!support.supported) {
      return { success: false, error: support.reason ?? 'IMAP sync is not supported in this environment' };
    }

    let connection: ImapConnection | null = null;

    try {
      connection = await this.openConnection(account);

      await connection.login(account.email, account.appPassword);
      const mailbox = options.mailbox ?? 'INBOX';
      await connection.selectMailbox(mailbox);

      let uids = await connection.uidSearch('RECENT');

      if (uids.length === 0) {
        uids = await connection.uidSearch('ALL');
      }

      const limit = options.limit ?? 50;
      if (limit > 0 && uids.length > limit) {
        uids = uids.slice(-limit);
      }

      const capabilities = await connection.capability().catch(() => []);
      await connection.logout();

      return {
        success: true,
        mailbox,
        messageUids: uids,
        greeting: connection.getGreeting() ?? undefined,
        capabilities,
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
      };
    } finally {
      connection?.close();
    }
  }

  async handleManualImapSync(options: { mailbox?: string; limit?: number } = {}): Promise<ImapSyncResult> {
    try {
      const support = await this.isSyncSupported();
      if (!support.supported) {
        return {
          success: false,
          error: support.reason ?? 'IMAP sync is unavailable on this platform',
        };
      }

      return await this.syncMailbox(options);
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error),
      };
    }
  }

  private async openConnection(account: ImapAccountConfig, options: OpenConnectionOptions = {}): Promise<ImapConnection> {
    const module = this.loadTransport();
    return await ImapConnection.connect(module, account, options);
  }

  private loadTransport(): TcpSocketModule {
    if (this.transport) {
      return this.transport;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.transport = require('react-native-tcp-socket') as TcpSocketModule;
      return this.transport;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load ${SOCKET_LIBRARY_NAME}. Ensure the library is installed and linked. ${reason}`);
    }
  }

  private async loadStoredConfig(): Promise<ImapAccountConfig | null> {
    try {
      const raw = Platform.OS === 'web'
        ? await AsyncStorage.getItem(this.configKey)
        : await SecureStore.getItemAsync(this.configKey);

      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<ImapAccountConfig>;
      return this.normalizeConfig(parsed);
    } catch (error) {
      console.warn('[ImapService] Failed to read stored IMAP configuration:', error);
      return null;
    }
  }

  private normalizeConfig(config?: Partial<ImapAccountConfig> | null): ImapAccountConfig | null {
    if (!config) {
      return null;
    }

    const port = typeof config.port === 'string' ? parseInt(config.port, 10) : config.port;

    if (!config.email || !config.appPassword || !config.host || !port) {
      return null;
    }

    return {
      email: config.email,
      appPassword: config.appPassword,
      host: config.host,
      port,
      tls: Boolean(config.tls),
      provider: config.provider,
      createdAt: config.createdAt,
    };
  }

  private formatError(error: unknown): string {
    if (!error) {
      return 'Unknown IMAP error';
    }

    if (error instanceof ImapCommandError) {
      return `${error.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

export const imapService = ImapService.getInstance();
