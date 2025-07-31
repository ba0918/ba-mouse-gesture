/**
 * InfrastructureFactory
 * Infrastructure層のサービス初期化・管理を担当
 * Abstract Factory Patternの具象ファクトリー
 */

export interface ChromeStorage {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(keys: string | string[]): Promise<void>
}

export interface ChromeMessaging {
  sendMessage(message: unknown): Promise<unknown>
  onMessage: {
    addListener(callback: (message: unknown) => void): void
  }
}

export interface ChromeBrowser {
  navigateToUrl(tabId: number, url: string): Promise<void>
  executeScript(tabId: number, script: string): Promise<void>
  goBack(tabId: number): Promise<void>
  goForward(tabId: number): Promise<void>
  createTab(): Promise<{ id: number }>
  closeTab(tabId: number): Promise<void>
  duplicateTab(tabId: number): Promise<{ id: number }>
  reloadTab(tabId: number, bypassCache: boolean): Promise<void>
  switchToPreviousTab(): Promise<void>
  switchToNextTab(): Promise<void>
}

export interface InfrastructureServices {
  chromeStorage: ChromeStorage
  chromeMessaging: ChromeMessaging
  chromeBrowser: ChromeBrowser
}

/**
 * Infrastructure層専用ファクトリー
 */
export class InfrastructureFactory {
  private services: InfrastructureServices | null = null

  /**
   * Infrastructure層サービスを初期化
   */
  createServices(): InfrastructureServices {
    if (this.services) {
      return this.services
    }

    this.services = {
      chromeStorage: this.createChromeStorage(),
      chromeMessaging: this.createChromeMessaging(),
      chromeBrowser: this.createChromeBrowser()
    }

    return this.services
  }

  /**
   * Chrome Storage APIラッパーを作成
   */
  private createChromeStorage(): ChromeStorage {
    return {
      get: async (keys: string | string[] | null = null) => {
        return new Promise((resolve) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(keys, (result) => {
              resolve(result)
            })
          } else {
            // テスト環境など、Chrome APIが使用できない場合
            resolve({})
          }
        })
      },

      set: async (items: Record<string, unknown>) => {
        return new Promise<void>((resolve, reject) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set(items, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else {
                resolve()
              }
            })
          } else {
            // テスト環境など、Chrome APIが使用できない場合
            resolve()
          }
        })
      },

      remove: async (keys: string | string[]) => {
        return new Promise<void>((resolve, reject) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.remove(keys, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else {
                resolve()
              }
            })
          } else {
            // テスト環境など、Chrome APIが使用できない場合
            resolve()
          }
        })
      }
    }
  }

  /**
   * Chrome Messaging APIラッパーを作成
   */
  private createChromeMessaging(): ChromeMessaging {
    return {
      sendMessage: async (message: unknown) => ({}),
      onMessage: {
        addListener: (_callback: (message: unknown) => void) => {}
      }
    }
  }

  /**
   * Chrome Browser APIラッパーを作成
   */
  private createChromeBrowser(): ChromeBrowser {
    return {
      navigateToUrl: async (_tabId: number, _url: string) => {},
      executeScript: async (_tabId: number, _script: string) => {},
      goBack: async (_tabId: number) => {},
      goForward: async (_tabId: number) => {},
      createTab: async () => ({ id: 1 }),
      closeTab: async (_tabId: number) => {},
      duplicateTab: async (_tabId: number) => ({ id: 2 }),
      reloadTab: async (_tabId: number, _bypassCache: boolean) => {},
      switchToPreviousTab: async () => {},
      switchToNextTab: async () => {}
    }
  }

  /**
   * 初期化済みかチェック
   */
  isInitialized(): boolean {
    return this.services !== null
  }

  /**
   * サービスをリセット
   */
  reset(): void {
    this.services = null
  }
}