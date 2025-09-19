import { NativeModules } from 'react-native';

type TcpSocketModule = typeof import('react-native-tcp-socket');

declare const require: (moduleId: string) => unknown;

const SOCKET_LIBRARY_NAME = 'react-native-tcp-socket';
const NATIVE_MODULE_KEYS = ['TcpSocket', 'TcpSockets'];

const hasNativeTcpModule = (): boolean => {
  try {
    const modules = NativeModules as Record<string, unknown> | undefined;

    if (!modules || typeof modules !== 'object') {
      return false;
    }

    return NATIVE_MODULE_KEYS.some(key => modules[key] != null);
  } catch {
    return false;
  }
};

const warnUnavailable = (reason: string): void => {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      `[TcpSocketTransport] "${SOCKET_LIBRARY_NAME}" is unavailable: ${reason}. IMAP sync will be disabled.`
    );
  }
};

const loadTcpSocketTransport = (): TcpSocketModule | null => {
  if (!hasNativeTcpModule()) {
    warnUnavailable('native module not detected');
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(SOCKET_LIBRARY_NAME) as TcpSocketModule;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    warnUnavailable(reason);
    return null;
  }
};

const TcpSocketTransport: TcpSocketModule | null = loadTcpSocketTransport();

export default TcpSocketTransport;
