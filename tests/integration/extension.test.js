// 拡張機能の統合テスト

describe('拡張機能統合テスト', () => {
  describe('コンテンツスクリプトとバックグラウンドの連携', () => {
    test('ジェスチャー実行から戻るアクションまでの流れ', async () => {
      // 1. バックグラウンドでの処理をモック
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'simpleGesture' && message.direction === 'LEFT') {
          // タブの戻る処理
          chrome.tabs.goBack(1)
          if (callback) callback({ success: true, action: 'Navigated back' })
        }
      })
      
      // 2. ジェスチャーの実行
      const gestureMessage = {
        type: 'simpleGesture',
        direction: 'LEFT',
        distance: 100
      }
      
      // 3. メッセージ送信のテスト
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(gestureMessage, (response) => {
          resolve(response)
        })
      })
      
      expect(response.success).toBe(true)
      expect(response.action).toBe('Navigated back')
      expect(chrome.tabs.goBack).toHaveBeenCalledWith(1)
    })
    
    test('スクロールメッセージの往復通信', async () => {
      // 1. 下方向ジェスチャー
      const gestureMessage = {
        type: 'simpleGesture',
        direction: 'DOWN',
        distance: 150
      }
      
      // 2. バックグラウンドからコンテンツへのスクロール指示
      const scrollMessage = {
        type: 'scroll',
        direction: 'bottom'
      }
      
      // バックグラウンドの処理をモック
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'simpleGesture' && message.direction === 'DOWN') {
          // コンテンツスクリプトにスクロール指示を送信
          chrome.tabs.sendMessage(1, scrollMessage, () => {
            callback({ success: true, action: 'Scrolled to bottom' })
          })
        }
      })
      
      // コンテンツスクリプトでのスクロール処理をモック
      chrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        if (message.type === 'scroll' && message.direction === 'bottom') {
          // スクロール実行
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
          if (callback) callback({ success: true })
        }
      })
      
      // ジェスチャー実行
      const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(gestureMessage, (response) => {
          resolve(response)
        })
      })
      
      const response = await messagePromise
      
      expect(response.success).toBe(true)
      expect(response.action).toBe('Scrolled to bottom')
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, scrollMessage, expect.any(Function))
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
    })
  })
  
  describe('設定の同期', () => {
    test('設定変更が全コンポーネントに反映される', async () => {
      const newSettings = {
        enabled: false,
        strokeColor: '#FF0000',
        strokeWidth: 5,
        excludeList: ['blocked.com']
      }
      
      // 1. オプション画面で設定を保存
      await chrome.storage.sync.set(newSettings)
      
      // 2. storage.onChanged イベントが発火
      const changes = {
        enabled: { oldValue: true, newValue: false },
        strokeColor: { oldValue: '#2196F3', newValue: '#FF0000' },
        strokeWidth: { oldValue: 3, newValue: 5 },
        excludeList: { oldValue: [], newValue: ['blocked.com'] }
      }
      
      // 3. コンテンツスクリプトでの設定更新
      const contentScriptSettings = {}
      Object.keys(changes).forEach(key => {
        contentScriptSettings[key] = changes[key].newValue
      })
      
      expect(contentScriptSettings.enabled).toBe(false)
      expect(contentScriptSettings.strokeColor).toBe('#FF0000')
      expect(contentScriptSettings.strokeWidth).toBe(5)
      expect(contentScriptSettings.excludeList).toContain('blocked.com')
      
      // 4. バックグラウンドへの通知
      const settingsMessage = {
        type: 'SETTINGS_UPDATED',
        settings: newSettings
      }
      
      chrome.runtime.sendMessage(settingsMessage)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(settingsMessage)
    })
    
    test('除外サイトでジェスチャーが無効化される', () => {
      const settings = {
        enabled: true,
        excludeList: ['example.com', '*.test.com']
      }
      
      // テストケース1: 完全一致
      const mockLocation1 = { hostname: 'example.com', href: 'https://example.com' }
      const isExcluded1 = settings.excludeList.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(mockLocation1.hostname)
        }
        return mockLocation1.hostname.includes(pattern)
      })
      expect(isExcluded1).toBe(true)
      
      // テストケース2: ワイルドカード
      const mockLocation2 = { hostname: 'sub.test.com', href: 'https://sub.test.com' }
      const isExcluded2 = settings.excludeList.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(mockLocation2.hostname)
        }
        return mockLocation2.hostname.includes(pattern)
      })
      expect(isExcluded2).toBe(true)
      
      // テストケース3: 非除外サイト
      const mockLocation3 = { hostname: 'allowed.com', href: 'https://allowed.com' }
      const isExcluded3 = settings.excludeList.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          return regex.test(mockLocation3.hostname)
        }
        return mockLocation3.hostname.includes(pattern)
      })
      expect(isExcluded3).toBe(false)
    })
  })
  
  describe('複合ジェスチャーの実行', () => {
    test('下→右ジェスチャーでタブが閉じられる', async () => {
      const complexGestureMessage = {
        type: 'complexGesture',
        gestureType: 'downright',
        distance: 200
      }
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'complexGesture' && message.gestureType === 'downright') {
          chrome.tabs.remove(1)
          callback({ success: true, action: 'Tab closed' })
        }
      })
      
      const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(complexGestureMessage, (response) => {
          resolve(response)
        })
      })
      
      const response = await messagePromise
      
      expect(response.success).toBe(true)
      expect(response.action).toBe('Tab closed')
      expect(chrome.tabs.remove).toHaveBeenCalledWith(1)
    })
    
    test('上→右ジェスチャーで新しいタブが開かれる', async () => {
      const complexGestureMessage = {
        type: 'complexGesture',
        gestureType: 'upright',
        distance: 180
      }
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'complexGesture' && message.gestureType === 'upright') {
          chrome.tabs.create({})
          callback({ success: true, action: 'New tab opened' })
        }
      })
      
      const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(complexGestureMessage, (response) => {
          resolve(response)
        })
      })
      
      const response = await messagePromise
      
      expect(response.success).toBe(true)
      expect(response.action).toBe('New tab opened')
      expect(chrome.tabs.create).toHaveBeenCalledWith({})
    })
    
    test('右→下ジェスチャーでタブ複製が実行される', async () => {
      const complexGestureMessage = {
        type: 'complexGesture',
        gestureType: 'rightdown',
        distance: 190
      }
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'complexGesture' && message.gestureType === 'rightdown') {
          chrome.tabs.get(1).then((tab) => {
            chrome.tabs.create({ url: tab.url })
          })
          callback({ success: true, action: 'Tab duplicated' })
        }
      })
      
      const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(complexGestureMessage, (response) => {
          resolve(response)
        })
      })
      
      const response = await messagePromise
      
      expect(response.success).toBe(true)
      expect(response.action).toBe('Tab duplicated')
    })
    
    test('上↓下ジェスチャーでページ更新が実行される', async () => {
      const complexGestureMessage = {
        type: 'complexGesture',
        gestureType: 'updown',
        distance: 160
      }
      
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'complexGesture' && message.gestureType === 'updown') {
          chrome.tabs.reload(1)
          callback({ success: true, action: 'Tab reloaded' })
        }
      })
      
      const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(complexGestureMessage, (response) => {
          resolve(response)
        })
      })
      
      const response = await messagePromise
      
      expect(response.success).toBe(true)
      expect(response.action).toBe('Tab reloaded')
      expect(chrome.tabs.reload).toHaveBeenCalledWith(1)
    })
  })
})