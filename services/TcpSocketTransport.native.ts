type TcpSocketModule = typeof import('react-native-tcp-socket');

const TcpSocketTransport: TcpSocketModule | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-tcp-socket') as TcpSocketModule;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    if (typeof console !== 'undefined') {
      console.warn(
        `[TcpSocketTransport] "react-native-tcp-socket" is unavailable: ${reason}. IMAP sync will be disabled.`
      );
    }

    return null;
  }
})();

export default TcpSocketTransport;
