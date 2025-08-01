// Jest セットアップファイル - Chrome API モックの設定（TypeScript版）

// global拡張を外部モジュールとして宣言
export {};

// Chrome API のモック
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn((message: any, callback?: (response: any) => void) => {
      if (callback) callback({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    lastError: null,
  },

  storage: {
    sync: {
      get: jest.fn((keys: string | string[] | null, callback?: (result: any) => void) => {
        const defaultValues = {
          enabled: true,
          strokeColor: '#2196F3',
          strokeWidth: 3,
          excludeList: [],
        };
        if (callback) {
          callback(defaultValues);
        }
        return Promise.resolve(defaultValues);
      }),
      set: jest.fn((items: Record<string, any>, callback?: () => void) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },

  tabs: {
    goBack: jest.fn(() => Promise.resolve()),
    goForward: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    create: jest.fn(() => Promise.resolve({ id: 1 })),
    reload: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve({ url: 'https://example.com' })),
    sendMessage: jest.fn((tabId: number, message: any, callback?: (response: any) => void) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
  },

  scripting: {
    executeScript: jest.fn(() => Promise.resolve()),
  },
} as any;

// DOM のモック設定
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Canvas のモック
HTMLCanvasElement.prototype.getContext = jest.fn((contextId: string) => {
  if (contextId === '2d') {
    return {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round' as CanvasLineCap,
      lineJoin: 'round' as CanvasLineJoin,
      fillStyle: '',
      font: '',
    } as Partial<CanvasRenderingContext2D>;
  }
  return null;
}) as any;

// localStorage のモック
const localStorageMock: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// console メソッドのモック（必要に応じて）
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
