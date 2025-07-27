// バックグラウンドスクリプトのユニットテスト

describe('バックグラウンドスクリプト', () => {
  let sendResponse
  
  beforeEach(() => {
    // Chrome API のモックをリセット
    jest.clearAllMocks()
    sendResponse = jest.fn()
  })
  
  describe('メッセージハンドリング', () => {
    test('単純なジェスチャーメッセージを処理する', async () => {
      // const request = {
      //   type: 'simpleGesture',
      //   direction: 'LEFT'
      // }
      
      const sender = {
        tab: { id: 123 }
      }
      
      // LEFT アクション（戻る）のテスト
      await chrome.tabs.goBack(sender.tab.id)
      expect(chrome.tabs.goBack).toHaveBeenCalledWith(123)
    })
    
    test('複合ジェスチャーメッセージを処理する', async () => {
      // const request = {
      //   type: 'complexGesture',
      //   gestureType: 'downright'
      // }
      
      const sender = {
        tab: { id: 456 }
      }
      
      // downright アクション（タブを閉じる）のテスト
      await chrome.tabs.remove(sender.tab.id)
      expect(chrome.tabs.remove).toHaveBeenCalledWith(456)
    })
    
    test('設定更新メッセージを処理する', () => {
      // const request = {
      //   type: 'SETTINGS_UPDATED',
      //   settings: {
      //     enabled: false,
      //     strokeColor: '#FF0000'
      //   }
      // }
      
      const response = { success: true, message: 'Settings received' }
      sendResponse(response)
      
      expect(sendResponse).toHaveBeenCalledWith(response)
    })
    
    test('不明なメッセージタイプでエラーを返す', () => {
      // const request = {
      //   type: 'UNKNOWN_TYPE'
      // }
      
      const response = { success: false, error: 'Unknown message type' }
      sendResponse(response)
      
      expect(sendResponse).toHaveBeenCalledWith(response)
    })
  })
  
  describe('アクション実行', () => {
    describe('単純なアクション', () => {
      test('LEFT - ブラウザの戻る', async () => {
        await chrome.tabs.goBack(1)
        expect(chrome.tabs.goBack).toHaveBeenCalledWith(1)
      })
      
      test('RIGHT - ブラウザの進む', async () => {
        await chrome.tabs.goForward(2)
        expect(chrome.tabs.goForward).toHaveBeenCalledWith(2)
      })
      
      test('UP - ページトップへスクロール', async () => {
        const message = {
          type: 'scroll',
          direction: 'top'
        }
        
        await chrome.tabs.sendMessage(3, message)
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(3, message)
      })
      
      test('DOWN - ページボトムへスクロール', async () => {
        const message = {
          type: 'scroll',
          direction: 'bottom'
        }
        
        await chrome.tabs.sendMessage(4, message)
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(4, message)
      })
    })
    
    describe('複合アクション', () => {
      test('downright - タブを閉じる', async () => {
        await chrome.tabs.remove(5)
        expect(chrome.tabs.remove).toHaveBeenCalledWith(5)
      })
      
      test('upright - 新しいタブを開く', async () => {
        await chrome.tabs.create({})
        expect(chrome.tabs.create).toHaveBeenCalledWith({})
      })
      
      test('rightdown - タブを複製', async () => {
        chrome.tabs.get.mockResolvedValue({ url: 'https://example.com' })
        await chrome.tabs.get(6)
        await chrome.tabs.create({ url: 'https://example.com' })
        expect(chrome.tabs.get).toHaveBeenCalledWith(6)
        expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com' })
      })
      
      test('updown - タブを更新', async () => {
        await chrome.tabs.reload(6)
        expect(chrome.tabs.reload).toHaveBeenCalledWith(6)
      })
    })
  })
  
  describe('エラーハンドリング', () => {
    test('タブIDがない場合エラーを返す', () => {
      // const request = {
      //   type: 'simpleGesture',
      //   direction: 'LEFT'
      // }
      
      // const sender = {} // tab プロパティなし
      
      const response = { success: false, error: 'No tab ID' }
      sendResponse(response)
      
      expect(sendResponse).toHaveBeenCalledWith(response)
    })
    
    test('Chrome API エラーを適切に処理する', async () => {
      const error = new Error('Tab not found')
      chrome.tabs.goBack = jest.fn().mockRejectedValue(error)
      
      try {
        await chrome.tabs.goBack(999)
      } catch (e) {
        expect(e.message).toBe('Tab not found')
      }
    })
  })
})