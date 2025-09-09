export {};

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      selectedAddress?: string;
      chainId?: string;
      networkVersion?: string;
      isConnected?: () => boolean;
      providers?: any[];
      send?: (method: string, params?: any[]) => Promise<any>;
      sendAsync?: (request: { method: string; params?: any[] }, callback: (error: any, result: any) => void) => void;
      autoRefreshOnNetworkChange?: boolean;
    };
  }
}