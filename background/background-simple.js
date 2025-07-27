// 最もシンプルなバックグラウンドスクリプト

// シンプルなデバッグログ管理
let debugEnabled = true // 開発時はデフォルトでON（本番ビルド時に自動変更）
let debugLogLevel = 2 // INFO

// ログレベル定義
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

// デバッグ設定を読み込み
async function loadDebugSettings() {
  try {
    const result = await chrome.storage.local.get(['debugSettings'])
    if (result.debugSettings) {
      debugEnabled = result.debugSettings.enabled
      debugLogLevel = result.debugSettings.logLevel
    }
  } catch (error) {
    debugLog(LOG_LEVELS.ERROR, 'Failed to load debug settings:', error)
  }
}

// 条件付きログ関数
function debugLog(level, message, ...args) {
  if (!debugEnabled || level > debugLogLevel) return
  
  switch (level) {
  case LOG_LEVELS.ERROR:
    console.error('🚨 [ERROR]', message, ...args)
    break
  case LOG_LEVELS.WARN:
    console.warn('⚠️ [WARN]', message, ...args)
    break
  case LOG_LEVELS.INFO:
    console.log('ℹ️ [INFO]', message, ...args)
    break
  case LOG_LEVELS.DEBUG:
    console.log('🔧 [DEBUG]', message, ...args)
    break
  default:
    console.log(message, ...args)
  }
}

// 初期化
loadDebugSettings()

debugLog(LOG_LEVELS.INFO, 'Background: Simple version started')

chrome.runtime.onInstalled.addListener(function (details) {
  debugLog(LOG_LEVELS.INFO, 'Extension installed:', details.reason)
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  debugLog(LOG_LEVELS.DEBUG, 'Message received:', request)
  debugLog(LOG_LEVELS.DEBUG, 'Sender tab ID:', sender.tab?.id)
    
  if (request.type === 'simpleGesture') {
    const direction = request.direction
    const tabId = sender.tab?.id
        
    debugLog(LOG_LEVELS.INFO, `Processing gesture: ${direction} for tab ${tabId}`)
        
    if (!tabId) {
      debugLog(LOG_LEVELS.ERROR, 'No tab ID available')
      sendResponse({ success: false, error: 'No tab ID' })
      return
    }
        
    // シンプルなアクション実行
    executeSimpleAction(direction, tabId)
      .then(result => {
        debugLog(LOG_LEVELS.INFO, 'Action completed:', result)
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        debugLog(LOG_LEVELS.ERROR, 'Action failed:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  } else if (request.type === 'customGesture') {
    // カスタムジェスチャーハンドリング
    const action = request.action
    const name = request.name
    const tabId = sender.tab?.id
        
    debugLog(LOG_LEVELS.INFO, `Processing custom gesture: ${name} (${action}) for tab ${tabId}`)
        
    if (!tabId) {
      debugLog(LOG_LEVELS.ERROR, 'No tab ID available')
      sendResponse({ success: false, error: 'No tab ID' })
      return
    }
        
    // カスタムアクション実行
    executeCustomAction(action, tabId)
      .then(result => {
        debugLog(LOG_LEVELS.INFO, 'Custom action completed:', result)
        sendResponse({ success: true, action: result, gestureType: 'custom', name: name })
      })
      .catch(error => {
        debugLog(LOG_LEVELS.ERROR, 'Custom action failed:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  } else if (request.type === 'complexGesture') {
    const gestureType = request.gestureType
    const tabId = sender.tab?.id
        
    debugLog(LOG_LEVELS.INFO, `Processing complex gesture: ${gestureType} for tab ${tabId}`)
        
    if (!tabId) {
      debugLog(LOG_LEVELS.ERROR, 'No tab ID available')
      sendResponse({ success: false, error: 'No tab ID' })
      return
    }
        
    // 複合ジェスチャーアクション実行
    executeComplexAction(gestureType, tabId)
      .then(result => {
        debugLog(LOG_LEVELS.INFO, 'Complex action completed:', result)
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        debugLog(LOG_LEVELS.ERROR, 'Complex action failed:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  } else if (request.type === 'SETTINGS_UPDATED') {
    debugLog(LOG_LEVELS.INFO, 'Settings updated:', request.settings)
    sendResponse({ success: true, message: 'Settings received' })
    return false
  }
    
  debugLog(LOG_LEVELS.WARN, 'Unknown message type:', request.type)
  sendResponse({ success: false, error: 'Unknown message type' })
})

async function executeSimpleAction(direction, tabId) {
  debugLog(LOG_LEVELS.DEBUG, `Executing ${direction} action for tab ${tabId}`)
    
  try {
    switch (direction) {
    case 'LEFT':
      debugLog(LOG_LEVELS.DEBUG, 'Going back')
      await chrome.tabs.goBack(tabId)
      return 'Navigated back'
                
    case 'RIGHT':
      debugLog(LOG_LEVELS.DEBUG, 'Going forward')
      await chrome.tabs.goForward(tabId)
      return 'Navigated forward'
                
    case 'UP':
      debugLog(LOG_LEVELS.DEBUG, 'Scrolling to top')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'top'
      })
      return 'Scrolled to top'
                
    case 'DOWN':
      debugLog(LOG_LEVELS.DEBUG, 'Scrolling to bottom')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'bottom'
      })
      return 'Scrolled to bottom'
                
    default:
      throw new Error(`Unknown direction: ${direction}`)
    }
  } catch (error) {
    debugLog(LOG_LEVELS.ERROR, `${direction} action failed:`, error)
    throw error
  }
}

async function executeComplexAction(gestureType, tabId) {
  debugLog(LOG_LEVELS.DEBUG, `Executing complex gesture: ${gestureType} for tab ${tabId}`)
    
  try {
    switch (gestureType) {
    case 'downright':
      debugLog(LOG_LEVELS.DEBUG, 'Closing tab (↓→)')
      await chrome.tabs.remove(tabId)
      return 'Tab closed'
                
    case 'upright':
      debugLog(LOG_LEVELS.DEBUG, 'Opening new tab (↑→)')
      await chrome.tabs.create({})
      return 'New tab opened'
                
    case 'rightdown': {
      debugLog(LOG_LEVELS.DEBUG, 'Duplicating tab (→↓)')
      const currentTab = await chrome.tabs.get(tabId)
      await chrome.tabs.create({ url: currentTab.url })
      return 'Tab duplicated'
    }
                
    case 'updown':
      debugLog(LOG_LEVELS.DEBUG, 'Reloading tab (↑↓) - tabId:', tabId)
      try {
        await chrome.tabs.reload(tabId)
        debugLog(LOG_LEVELS.DEBUG, 'Tab reload successful')
        return 'Tab reloaded'
      } catch (error) {
        debugLog(LOG_LEVELS.ERROR, 'Tab reload failed:', error)
        throw error
      }

    case 'super_refresh':
      debugLog(LOG_LEVELS.DEBUG, 'Super reloading tab (↑↓↑) - tabId:', tabId)
      try {
        await chrome.tabs.reload(tabId, {bypassCache: true})
        debugLog(LOG_LEVELS.DEBUG, 'Super reload successful')
        return 'Tab super reloaded (cache cleared)'
      } catch (error) {
        debugLog(LOG_LEVELS.ERROR, 'Super reload failed:', error)
        throw error
      }

    case 'prev_tab': {
      debugLog(LOG_LEVELS.DEBUG, 'Switching to previous tab (←→)')
      try {
        const tabs = await chrome.tabs.query({currentWindow: true})
        const currentIndex = tabs.findIndex(tab => tab.id === tabId)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
        await chrome.tabs.update(tabs[prevIndex].id, {active: true})
        debugLog(LOG_LEVELS.DEBUG, 'Switched to previous tab successfully')
        return 'Switched to previous tab'
      } catch (error) {
        debugLog(LOG_LEVELS.ERROR, 'Previous tab switch failed:', error)
        throw error
      }
    }

    case 'next_tab': {
      debugLog(LOG_LEVELS.DEBUG, 'Switching to next tab (→←)')
      try {
        const tabs = await chrome.tabs.query({currentWindow: true})
        const currentIndex = tabs.findIndex(tab => tab.id === tabId)
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
        await chrome.tabs.update(tabs[nextIndex].id, {active: true})
        debugLog(LOG_LEVELS.DEBUG, 'Switched to next tab successfully')
        return 'Switched to next tab'
      } catch (error) {
        debugLog(LOG_LEVELS.ERROR, 'Next tab switch failed:', error)
        throw error
      }
    }
                
    default:
      throw new Error(`Unknown complex gesture: ${gestureType}`)
    }
  } catch (error) {
    debugLog(LOG_LEVELS.ERROR, `${gestureType} complex action failed:`, error)
    throw error
  }
}

// カスタムアクション実行関数
async function executeCustomAction(action, tabId) {
  debugLog(LOG_LEVELS.DEBUG, `Executing custom action: ${action} for tab ${tabId}`)
    
  try {
    // デフォルトアクションのマッピング（後方互換性）
    const actionMap = {
      'back': 'LEFT',
      'forward': 'RIGHT', 
      'scroll_up': 'UP',
      'scroll_down': 'DOWN',
      'close_tab': 'downright',
      'new_tab': 'upright',
      'refresh': 'updown',           // ↑↓で更新
      'super_refresh': 'super_refresh', // ↑↓↑でスーパーリロード
      'prev_tab': 'prev_tab',        // ←→で前のタブ
      'next_tab': 'next_tab',        // →←で次のタブ
      'duplicate_tab': 'rightdown'   // →↓でタブ複製
    }
    
    // 既存のアクションにマップできる場合
    if (actionMap[action]) {
      const mappedAction = actionMap[action]
      if (['LEFT', 'RIGHT', 'UP', 'DOWN'].includes(mappedAction)) {
        return await executeSimpleAction(mappedAction, tabId)
      } else {
        return await executeComplexAction(mappedAction, tabId)
      }
    }
    
    // カスタムアクションの個別処理
    switch (action) {
    case 'reload':
    case 'refresh':
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Reloading tab')
      await chrome.tabs.reload(tabId)
      return 'Tab reloaded (custom)'

    case 'super_refresh':
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Super reloading tab')
      await chrome.tabs.reload(tabId, {bypassCache: true})
      return 'Tab super reloaded (custom)'

    case 'prev_tab': {
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Switching to previous tab')
      const tabs = await chrome.tabs.query({currentWindow: true})
      const currentIndex = tabs.findIndex(tab => tab.id === tabId)
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
      await chrome.tabs.update(tabs[prevIndex].id, {active: true})
      return 'Switched to previous tab (custom)'
    }

    case 'next_tab': {
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Switching to next tab')
      const tabs = await chrome.tabs.query({currentWindow: true})
      const currentIndex = tabs.findIndex(tab => tab.id === tabId)
      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
      await chrome.tabs.update(tabs[nextIndex].id, {active: true})
      return 'Switched to next tab (custom)'
    }
      
    case 'duplicate_tab': {
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Duplicating tab')
      const currentTab = await chrome.tabs.get(tabId)
      await chrome.tabs.create({ url: currentTab.url })
      return 'Tab duplicated'
    }
      
    case 'close_tab':
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Closing tab')
      await chrome.tabs.remove(tabId)
      return 'Tab closed (custom)'
      
    case 'scroll_top':
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Scrolling to top')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'top'
      })
      return 'Scrolled to top (custom)'
      
    case 'scroll_bottom':
      debugLog(LOG_LEVELS.DEBUG, 'Custom: Scrolling to bottom')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'bottom'
      })
      return 'Scrolled to bottom (custom)'
      
    default:
      debugLog(LOG_LEVELS.WARN, `Unknown custom action: ${action}`)
      return `Custom action executed: ${action}`
    }
  } catch (error) {
    debugLog(LOG_LEVELS.ERROR, `Custom action ${action} failed:`, error)
    throw error
  }
}

debugLog(LOG_LEVELS.INFO, 'Background: Simple version ready')