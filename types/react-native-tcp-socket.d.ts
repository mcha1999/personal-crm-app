declare module 'react-native-tcp-socket' {
  type Encoding =
    | 'ascii'
    | 'utf8'
    | 'utf-8'
    | 'utf16le'
    | 'ucs2'
    | 'ucs-2'
    | 'base64'
    | 'base64url'
    | 'latin1'
    | 'binary'
    | 'hex';

  export interface TcpSocketConnectOpts {
    host?: string;
    port: number;
    tls?: boolean | { rejectUnauthorized?: boolean; ca?: string | string[]; cert?: string; key?: string };
    timeout?: number;
    localAddress?: string;
    localPort?: number;
  }

  export interface TcpSocket {
    write(data: string | Uint8Array, encoding?: Encoding, callback?: (error?: Error | null) => void): void;
    end(): void;
    destroy(error?: Error): void;
    setEncoding(encoding: Encoding): void;
    setTimeout(timeout: number, callback?: () => void): void;
    on(event: 'data', listener: (data: any) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: (hadError: boolean) => void): this;
    on(event: 'connect', listener: () => void): this;
    once(event: 'data', listener: (data: any) => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
    once(event: 'close', listener: (hadError: boolean) => void): this;
    once(event: 'connect', listener: () => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
  }

  export function createConnection(
    options: TcpSocketConnectOpts,
    connectionListener?: () => void
  ): TcpSocket;

  export function connect(
    options: TcpSocketConnectOpts,
    connectionListener?: () => void
  ): TcpSocket;
}
