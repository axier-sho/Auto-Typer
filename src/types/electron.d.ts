interface AutoTyperIPC {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
}

interface Window {
  autoTyperIPC?: AutoTyperIPC;
}
