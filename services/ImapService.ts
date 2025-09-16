import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { PersonDAO } from '@/database/PersonDAO';
import { ThreadDAO } from '@/database/ThreadDAO';
import { MessageDAO } from '@/database/MessageDAO';
import { InteractionDAO } from '@/database/InteractionDAO';
import { Person } from '@/models/Person';

const nodeRequire: ((module: string) => any) | null =
  typeof globalThis !== 'undefined' && typeof (globalThis as any).require === 'function'
    ? (globalThis as any).require
    : null;
let tlsModule: any = null;
let netModule: any = null;

if (nodeRequire) {
  try {
    tlsModule = nodeRequire('tls');
  } catch {
    tlsModule = null;
  }

  try {
    netModule = nodeRequire('net');
  } catch {
    netModule = null;
  }
}

type NodeSocket = any;

type ParsedAddress = {
  name?: string;
  email?: string | null;
};

type ParsedMessage = {
  uid: number;
  flags: string[];
  date: Date;
  envelope: {
    subject?: string | null;
    from: ParsedAddress[];
    to: ParsedAddress[];
    cc: ParsedAddress[];
    messageId?: string | null;
  };
};

export type EmailAccountConfig = {
  email: string;
  appPassword: string;
  host: string;
  port: number;
  tls: boolean;
  provider: string;
  createdAt: string;
};

export type ImapSyncResult = {
  success: boolean;
  messagesProcessed: number;
  contactsCreated: number;
  interactionsCreated: number;
  skipped: number;
  error?: string;
};

type SyncOptions = {
  limit?: number;
};

const CONFIG_STORAGE_KEY = 'email_config';

export class ImapService {
  private static instance: ImapService;

  private config: EmailAccountConfig | null = null;
  private lastSync: Date | null = null;
  private currentSync: Promise<ImapSyncResult> | null = null;

  private readonly personDAO = new PersonDAO();
  private readonly threadDAO = new ThreadDAO();
  private readonly messageDAO = new MessageDAO();
  private readonly interactionDAO = new InteractionDAO();

  private constructor() {}

  static getInstance(): ImapService {
    if (!ImapService.instance) {
      ImapService.instance = new ImapService();
    }
    return ImapService.instance;
  }

  async getConfig(): Promise<EmailAccountConfig | null> {
    if (this.config) {
      return this.config;
    }

    try {
      let stored: string | null = null;

      if (Platform.OS !== 'web') {
        stored = await SecureStore.getItemAsync(CONFIG_STORAGE_KEY);
      }

      if (!stored) {
        stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      }

      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as EmailAccountConfig;
      this.config = parsed;
      return parsed;
    } catch (error) {
      console.warn('[ImapService] Failed to load IMAP config:', error);
      return null;
    }
  }

  async saveConfig(config: EmailAccountConfig): Promise<void> {
    const normalized: EmailAccountConfig = {
      ...config,
      createdAt: config.createdAt || new Date().toISOString(),
    };

    this.config = normalized;

    const serialized = JSON.stringify(normalized);

    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(CONFIG_STORAGE_KEY, serialized);
    }
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, serialized);

    await AsyncStorage.removeItem(this.getLastUidKey(normalized.email));
    await AsyncStorage.removeItem(this.getLastSyncKey(normalized.email));
    await this.clearThreadCache(normalized.email);
  }

  async clearConfig(): Promise<void> {
    this.config = null;
    this.lastSync = null;

    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(CONFIG_STORAGE_KEY);
    }
    await AsyncStorage.removeItem(CONFIG_STORAGE_KEY);
  }

  async testConnection(config: EmailAccountConfig): Promise<void> {
    if (Platform.OS === 'web') {
      // On web we cannot open raw socket connections, simulate quick success
      await new Promise(resolve => setTimeout(resolve, 200));
      return;
    }

    const socket = await this.openConnection(config);

    try {
      await this.readGreeting(socket);
      await this.sendCommand(socket, 'A1', `LOGIN "${this.escapeString(config.email)}" "${this.escapeString(config.appPassword)}"`);
      await this.sendCommand(socket, 'A2', 'LOGOUT');
    } finally {
      this.closeSocket(socket);
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    if (this.lastSync) {
      return this.lastSync;
    }

    const config = await this.getConfig();
    if (!config) return null;

    const stored = await AsyncStorage.getItem(this.getLastSyncKey(config.email));
    if (!stored) return null;

    const date = new Date(stored);
    this.lastSync = date;
    return date;
  }

  async syncMailbox(options: SyncOptions = {}): Promise<ImapSyncResult> {
    const config = await this.getConfig();

    if (!config) {
      return {
        success: false,
        messagesProcessed: 0,
        contactsCreated: 0,
        interactionsCreated: 0,
        skipped: 0,
        error: 'IMAP account not configured',
      };
    }

    if (Platform.OS === 'web') {
      return {
        success: false,
        messagesProcessed: 0,
        contactsCreated: 0,
        interactionsCreated: 0,
        skipped: 0,
        error: 'IMAP sync is not supported on web platform',
      };
    }

    if (!this.personDAO.isAvailable()) {
      return {
        success: false,
        messagesProcessed: 0,
        contactsCreated: 0,
        interactionsCreated: 0,
        skipped: 0,
        error: 'Database not initialized',
      };
    }

    if (this.currentSync) {
      return this.currentSync;
    }

    const syncPromise = this.performSync(config, options);
    this.currentSync = syncPromise.finally(() => {
      this.currentSync = null;
    });
    return syncPromise;
  }

  private async performSync(config: EmailAccountConfig, options: SyncOptions): Promise<ImapSyncResult> {
    const stats: ImapSyncResult = {
      success: false,
      messagesProcessed: 0,
      contactsCreated: 0,
      interactionsCreated: 0,
      skipped: 0,
    };

    let socket: NodeSocket | null = null;

    try {
      socket = await this.openConnection(config);
      await this.readGreeting(socket);
      await this.sendCommand(socket, 'A1', `LOGIN "${this.escapeString(config.email)}" "${this.escapeString(config.appPassword)}"`);

      const selectResponse = await this.sendCommand(socket, 'A2', 'SELECT INBOX');
      const totalMessages = this.parseExistsCount(selectResponse);

      const lastUid = await this.getLastUid(config.email);
      const limit = options.limit ?? 25;

      let fetchResponse: string | null = null;

      if (totalMessages > 0) {
        if (lastUid) {
          fetchResponse = await this.sendCommand(socket, 'A3', `UID FETCH ${lastUid + 1}:* (UID FLAGS INTERNALDATE ENVELOPE)`);
        } else {
          const start = Math.max(totalMessages - limit + 1, 1);
          fetchResponse = await this.sendCommand(socket, 'A3', `FETCH ${start}:${totalMessages} (UID FLAGS INTERNALDATE ENVELOPE)`);
        }
      }

      let maxUid = lastUid ?? 0;

      if (fetchResponse) {
        const parsedMessages = this.parseFetchResponse(fetchResponse);
        const messagesToProcess = !lastUid && parsedMessages.length > limit
          ? parsedMessages.slice(-limit)
          : parsedMessages;

        for (const message of messagesToProcess) {
          await this.processParsedMessage(message, config, stats);
          if (message.uid > maxUid) {
            maxUid = message.uid;
          }
        }
      }

      await this.sendCommand(socket, 'A4', 'LOGOUT');

      if (maxUid && maxUid !== lastUid) {
        await AsyncStorage.setItem(this.getLastUidKey(config.email), String(maxUid));
      }

      const syncTime = new Date();
      await AsyncStorage.setItem(this.getLastSyncKey(config.email), syncTime.toISOString());
      this.lastSync = syncTime;

      stats.success = true;
      return stats;
    } catch (error) {
      console.error('[ImapService] IMAP sync failed:', error);
      return {
        ...stats,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      if (socket) {
        this.closeSocket(socket);
      }
    }
  }

  private async processParsedMessage(message: ParsedMessage, config: EmailAccountConfig, stats: ImapSyncResult): Promise<void> {
    try {
      const subject = message.envelope.subject ? this.decodeMimeWords(message.envelope.subject) : 'No subject';
      const myAddress = config.email.toLowerCase();
      const fromAddresses = message.envelope.from || [];
      const toAddresses = message.envelope.to || [];
      const ccAddresses = message.envelope.cc || [];

      const messageFromMe = fromAddresses.some(addr => this.isSameAddress(addr.email, myAddress));

      const contactAddress = messageFromMe
        ? this.findExternalAddress([...toAddresses, ...ccAddresses], myAddress)
        : this.findExternalAddress(fromAddresses, myAddress);

      if (!contactAddress || !contactAddress.email) {
        stats.skipped += 1;
        return;
      }

      let person = await this.personDAO.findByEmail(contactAddress.email);
      let createdNewContact = false;

      if (!person) {
        const { firstName, lastName } = this.deriveName(contactAddress.name, contactAddress.email);
        person = await this.personDAO.create({
          firstName,
          lastName,
          email: contactAddress.email,
          relationship: 'acquaintance',
          tags: [],
          lastInteraction: message.date,
        });
        createdNewContact = true;
      } else {
        await this.personDAO.update(person.id, {
          lastInteraction: message.date,
        });
      }

      const threadId = await this.ensureThread(config.email, person, subject, message.date);

      await this.messageDAO.create({
        threadId,
        senderId: person.id,
        content: `${messageFromMe ? 'Sent' : 'Received'} email: ${subject}`,
        sentAt: message.date,
        isFromMe: messageFromMe,
      });

      const existingInteraction = await this.interactionDAO.findByPersonAndDate(person.id, message.date);
      if (!existingInteraction) {
        await this.interactionDAO.create({
          personId: person.id,
          type: 'email',
          date: message.date,
          notes: subject ? `Email: ${subject}` : 'Email interaction',
        });
        stats.interactionsCreated += 1;
      }

      if (createdNewContact) {
        stats.contactsCreated += 1;
      }
      stats.messagesProcessed += 1;
    } catch (error) {
      console.warn('[ImapService] Failed to process message:', error);
      stats.skipped += 1;
    }
  }

  private async ensureThread(accountEmail: string, person: Person, subject: string, messageDate: Date): Promise<string> {
    const key = this.getThreadKey(accountEmail, person.id);
    const existingId = await AsyncStorage.getItem(key);

    if (existingId) {
      await this.threadDAO.update(existingId, {
        lastMessageAt: messageDate,
        subject,
      });
      await this.threadDAO.addParticipant(existingId, person.id);
      return existingId;
    }

    const thread = await this.threadDAO.create({
      personIds: [person.id],
      subject: subject || `Conversation with ${person.firstName}`,
      lastMessageAt: messageDate,
      platform: 'email',
      unreadCount: 0,
    });

    await this.threadDAO.addParticipant(thread.id, person.id);
    await AsyncStorage.setItem(key, thread.id);
    return thread.id;
  }

  private parseExistsCount(response: string): number {
    const match = response.match(/\*\s+(\d+)\s+EXISTS/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseFetchResponse(response: string): ParsedMessage[] {
    const lines = response.split(/\r?\n/);
    const messages: ParsedMessage[] = [];

    for (const line of lines) {
      if (!line.startsWith('*') || !line.includes('FETCH')) {
        continue;
      }

      const parsed = this.parseFetchLine(line);
      if (parsed) {
        messages.push(parsed);
      }
    }

    return messages;
  }

  private parseFetchLine(line: string): ParsedMessage | null {
    const uidMatch = line.match(/UID\s+(\d+)/i);
    if (!uidMatch) return null;

    const uid = parseInt(uidMatch[1], 10);

    const flagsMatch = line.match(/FLAGS\s*\(([^)]*)\)/i);
    const flags = flagsMatch ? flagsMatch[1].split(/\s+/).filter(Boolean) : [];

    const internalDateMatch = line.match(/INTERNALDATE\s+"([^"]+)"/i);
    const internalDate = internalDateMatch ? new Date(internalDateMatch[1]) : new Date();

    const envelopeIndex = line.indexOf('ENVELOPE ');
    if (envelopeIndex === -1) {
      return null;
    }

    const envelopeStr = line.slice(envelopeIndex + 'ENVELOPE '.length);
    const state = { index: 0 };
    const value = this.parseImapValue(envelopeStr, state);

    if (!Array.isArray(value) || value.length < 10) {
      return null;
    }

    const envelope = this.normalizeEnvelope(value);

    return {
      uid,
      flags,
      date: internalDate,
      envelope,
    };
  }

  private parseImapValue(str: string, state: { index: number }): any {
    this.skipWhitespace(str, state);

    if (state.index >= str.length) {
      return null;
    }

    const char = str[state.index];

    if (char === '(') {
      state.index += 1;
      const list: any[] = [];
      while (state.index < str.length) {
        this.skipWhitespace(str, state);
        if (str[state.index] === ')') {
          state.index += 1;
          break;
        }
        const value = this.parseImapValue(str, state);
        list.push(value);
        this.skipWhitespace(str, state);
      }
      return list;
    }

    if (char === '"') {
      state.index += 1;
      let result = '';
      while (state.index < str.length) {
        const current = str[state.index];
        if (current === '"') {
          state.index += 1;
          break;
        }
        if (current === '\\') {
          state.index += 1;
          if (state.index < str.length) {
            result += str[state.index];
          }
        } else {
          result += current;
        }
        state.index += 1;
      }
      return result;
    }

    if (str.toUpperCase().startsWith('NIL', state.index)) {
      state.index += 3;
      return null;
    }

    const start = state.index;
    while (state.index < str.length) {
      const current = str[state.index];
      if (current === ' ' || current === ')' || current === '\r' || current === '\n') {
        break;
      }
      state.index += 1;
    }

    return str.slice(start, state.index);
  }

  private normalizeEnvelope(value: any[]): ParsedMessage['envelope'] {
    const subject = typeof value[1] === 'string' ? value[1] : null;
    const from = this.parseAddresses(value[2]);
    const to = this.parseAddresses(value[5]);
    const cc = this.parseAddresses(value[6]);
    const messageId = typeof value[9] === 'string' ? value[9] : null;

    return {
      subject,
      from,
      to,
      cc,
      messageId,
    };
  }

  private parseAddresses(value: any): ParsedAddress[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const addresses: ParsedAddress[] = [];
    for (const entry of value) {
      if (!Array.isArray(entry) || entry.length < 4) {
        continue;
      }
      const name = typeof entry[0] === 'string' ? this.decodeMimeWords(entry[0]) : undefined;
      const mailbox = typeof entry[2] === 'string' ? entry[2] : null;
      const host = typeof entry[3] === 'string' ? entry[3] : null;
      const email = mailbox && host ? `${mailbox}@${host}` : null;
      addresses.push({
        name,
        email,
      });
    }
    return addresses;
  }

  private decodeMimeWords(input: string): string {
    const regex = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g;
    return input.replace(regex, (_match, _charset, encoding, text) => {
      const enc = encoding.toUpperCase();
      if (enc === 'B') {
        return this.decodeBase64(text);
      }
      if (enc === 'Q') {
        return this.decodeQuotedPrintable(text);
      }
      return text;
    });
  }

  private decodeBase64(encoded: string): string {
    try {
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(encoded.replace(/\s+/g, ''), 'base64').toString('utf-8');
      }
      if (typeof globalThis.atob === 'function') {
        const binary = globalThis.atob(encoded.replace(/\s+/g, ''));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        if (typeof TextDecoder !== 'undefined') {
          return new TextDecoder('utf-8').decode(bytes);
        }
        return binary;
      }
    } catch (error) {
      console.warn('[ImapService] Base64 decode failed:', error);
    }
    return encoded;
  }

  private decodeQuotedPrintable(input: string): string {
    return input
      .replace(/_/g, ' ')
      .replace(/=([A-Fa-f0-9]{2})/g, (_match, hex) => {
        const code = parseInt(hex, 16);
        return String.fromCharCode(code);
      });
  }

  private findExternalAddress(addresses: ParsedAddress[], myAddress: string): ParsedAddress | null {
    for (const address of addresses) {
      if (address.email && !this.isSameAddress(address.email, myAddress)) {
        return address;
      }
    }
    return null;
  }

  private deriveName(name: string | undefined, email: string): { firstName: string; lastName: string } {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
      return { firstName: firstName || email.split('@')[0], lastName };
    }

    const localPart = email.split('@')[0];
    const clean = localPart.replace(/[._-]+/g, ' ');
    const parts = clean.split(' ');
    const firstName = parts[0] ? this.capitalize(parts[0]) : email;
    const lastName = parts.length > 1 ? this.capitalize(parts[1]) : '';
    return { firstName, lastName };
  }

  private capitalize(input: string): string {
    if (!input) return '';
    return input.charAt(0).toUpperCase() + input.slice(1);
  }

  private escapeString(input: string): string {
    return input.replace(/"/g, '\\"');
  }

  private skipWhitespace(str: string, state: { index: number }) {
    while (state.index < str.length) {
      const char = str[state.index];
      if (char !== ' ' && char !== '\r' && char !== '\n' && char !== '\t') {
        break;
      }
      state.index += 1;
    }
  }

  private isSameAddress(address: string | null | undefined, other: string): boolean {
    if (!address) return false;
    return address.trim().toLowerCase() === other.trim().toLowerCase();
  }

  private async openConnection(config: EmailAccountConfig): Promise<NodeSocket> {
    const useTls = config.tls !== false;
    const module = useTls ? tlsModule : netModule;

    if (!module) {
      throw new Error('IMAP networking libraries are not available in this environment');
    }

    return await new Promise<NodeSocket>((resolve, reject) => {
      const options = {
        host: config.host,
        port: config.port,
        rejectUnauthorized: false,
      } as any;

      let settled = false;

      const onError = (error: any) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      const handleConnect = (socket: NodeSocket) => {
        if (settled) return;
        settled = true;
        socket.setEncoding('utf8');
        socket.removeListener('error', onError);
        resolve(socket);
      };

      try {
        const socket: NodeSocket = useTls
          ? module.connect(options)
          : module.createConnection(options);

        const eventName = useTls ? 'secureConnect' : 'connect';
        socket.once(eventName, () => handleConnect(socket));
        socket.once('error', onError);
      } catch (error) {
        reject(error);
      }
    });
  }

  private closeSocket(socket: NodeSocket) {
    try {
      if (socket?.end) {
        socket.end();
      }
    } catch {}

    try {
      if (socket?.destroy) {
        socket.destroy();
      }
    } catch {}
  }

  private readGreeting(socket: NodeSocket): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('IMAP server did not respond in time'));
      }, 10000);

      const cleanup = () => {
        clearTimeout(timer);
        socket.off?.('data', onData);
        socket.off?.('error', onError);
      };

      const onData = (chunk: any) => {
        cleanup();
        resolve(chunk.toString());
      };

      const onError = (error: any) => {
        cleanup();
        reject(error);
      };

      socket.once('data', onData);
      socket.once('error', onError);
    });
  }

  private sendCommand(socket: NodeSocket, tag: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`IMAP command timeout: ${command}`));
      }, 15000);

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off?.('data', onData);
        socket.off?.('error', onError);
      };

      const onData = (chunk: any) => {
        buffer += chunk.toString();
        const upper = buffer.toUpperCase();
        if (upper.includes(`${tag} OK`) || upper.includes(`${tag} NO`) || upper.includes(`${tag} BAD`)) {
          cleanup();
          if (upper.includes(`${tag} OK`)) {
            resolve(buffer);
          } else {
            const message = this.extractStatusMessage(buffer, tag);
            reject(new Error(message));
          }
        }
      };

      const onError = (error: any) => {
        cleanup();
        reject(error);
      };

      socket.on('data', onData);
      socket.once('error', onError);

      socket.write(`${tag} ${command}\r\n`);
    });
  }

  private extractStatusMessage(response: string, tag: string): string {
    const regex = new RegExp(`${tag} (OK|NO|BAD) (.*)`, 'i');
    const match = response.match(regex);
    if (match && match[2]) {
      return match[2].trim();
    }
    return 'IMAP server returned an error';
  }

  private getLastUidKey(email: string): string {
    return `imap:lastUid:${email.toLowerCase()}`;
  }

  private getLastSyncKey(email: string): string {
    return `imap:lastSync:${email.toLowerCase()}`;
  }

  private getThreadKey(email: string, personId: string): string {
    return `imap:thread:${email.toLowerCase()}:${personId}`;
  }

  private async getLastUid(email: string): Promise<number | null> {
    const stored = await AsyncStorage.getItem(this.getLastUidKey(email));
    if (!stored) return null;
    const uid = parseInt(stored, 10);
    return Number.isFinite(uid) ? uid : null;
  }

  private async clearThreadCache(email: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const prefix = `imap:thread:${email.toLowerCase()}:`;
      const targets = keys.filter(key => key.startsWith(prefix));
      if (targets.length > 0) {
        await AsyncStorage.multiRemove(targets);
      }
    } catch (error) {
      console.warn('[ImapService] Failed to clear thread cache:', error);
    }
  }
}
