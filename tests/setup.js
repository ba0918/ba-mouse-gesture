// Jest セットアップファイル - Chrome API モックの設定

// Chrome API のモック
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true })
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    lastError: null
  },
  
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        const defaultValues = {
          enabled: true,
          strokeColor: '#2196F3',
          strokeWidth: 3,
          excludeList: []
        }
        if (callback) {
          callback(defaultValues)
        }
        return Promise.resolve(defaultValues)
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback()
        return Promise.resolve()
      })
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  
  tabs: {
    goBack: jest.fn(() => Promise.resolve()),
    goForward: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    create: jest.fn(() => Promise.resolve({ id: 1 })),
    reload: jest.fn(() => Promise.resolve()),
    sendMessage: jest.fn((tabId, message, callback) => {
      if (callback) callback({ success: true })
      return Promise.resolve({ success: true })
    })
  },
  
  scripting: {
    executeScript: jest.fn(() => Promise.resolve())
  }
}

// DOM のモック設定
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn()
})

// Canvas のモック
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fillText: jest.fn(),
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'round',
  lineJoin: 'round',
  fillStyle: '',
  font: ''
}))

// localStorage のモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
global.localStorage = localStorageMock

// console メソッドのモック（必要に応じて）
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}