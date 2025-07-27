// 最もシンプルなバックグラウンドスクリプト
console.log('🔧 Background: Simple version started')

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('📦 Extension installed:', details.reason)
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('📨 Message received:', request)
  console.log('📨 Sender tab ID:', sender.tab?.id)
    
  if (request.type === 'simpleGesture') {
    const direction = request.direction
    const tabId = sender.tab?.id
        
    console.log(`🎯 Processing gesture: ${direction} for tab ${tabId}`)
        
    if (!tabId) {
      console.error('❌ No tab ID available')
      sendResponse({ success: false, error: 'No tab ID' })
      return
    }
        
    // シンプルなアクション実行
    executeSimpleAction(direction, tabId)
      .then(result => {
        console.log('✅ Action completed:', result)
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        console.error('❌ Action failed:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  } else if (request.type === 'customGesture') {
    // カスタムジェスチャーハンドリング
    const action = request.action
    const name = request.name
    const tabId = sender.tab?.id
        
    console.log(`✨ Processing custom gesture: ${name} (${action}) for tab ${tabId}`)
        
    if (!tabId) {
      console.error('❌ No tab ID available')
      sendResponse({ success: false, error: 'No tab ID' })
      return
    }
        
    // カスタムアクション実行
    executeCustomAction(action, tabId, request)
      .then(result => {
        console.log('✅ Custom action completed:', result)
        sendResponse({ success: true, action: result, gestureType: 'custom', name: name })
      })
      .catch(error => {
        console.error('❌ Custom action failed:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  } else if (request.type === 'complexGesture') {
    const gestureType = request.gestureType
    const tabId = sender.tab?.id
        
    console.log(`🎯 Processing complex gesture: ${gestureType} for tab ${tabId}`)
        
    if (!tabId) {
      console.error('❌ No tab ID available')
      sendResponse({ success: false, error: 'No tab ID' })
      return
    }
        
    // 複合ジェスチャーアクション実行
    executeComplexAction(gestureType, tabId)
      .then(result => {
        console.log('✅ Complex action completed:', result)
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        console.error('❌ Complex action failed:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  } else if (request.type === 'SETTINGS_UPDATED') {
    console.log('⚙️ Settings updated:', request.settings)
    sendResponse({ success: true, message: 'Settings received' })
    return false
  }
    
  console.log('⚠️ Unknown message type:', request.type)
  sendResponse({ success: false, error: 'Unknown message type' })
})

async function executeSimpleAction(direction, tabId) {
  console.log(`🔄 Executing ${direction} action for tab ${tabId}`)
    
  try {
    switch (direction) {
    case 'LEFT':
      console.log('⬅️ Going back')
      await chrome.tabs.goBack(tabId)
      return 'Navigated back'
                
    case 'RIGHT':
      console.log('➡️ Going forward')
      await chrome.tabs.goForward(tabId)
      return 'Navigated forward'
                
    case 'UP':
      console.log('⬆️ Scrolling to top')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'top'
      })
      return 'Scrolled to top'
                
    case 'DOWN':
      console.log('⬇️ Scrolling to bottom')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'bottom'
      })
      return 'Scrolled to bottom'
                
    default:
      throw new Error(`Unknown direction: ${direction}`)
    }
  } catch (error) {
    console.error(`❌ ${direction} action failed:`, error)
    throw error
  }
}

async function executeComplexAction(gestureType, tabId) {
  console.log(`🔄 Executing complex gesture: ${gestureType} for tab ${tabId}`)
    
  try {
    switch (gestureType) {
    case 'downright':
      console.log('🗑️ Closing tab (↓→)')
      await chrome.tabs.remove(tabId)
      return 'Tab closed'
                
    case 'upright':
      console.log('➕ Opening new tab (↑→)')
      await chrome.tabs.create({})
      return 'New tab opened'
                
    case 'rightdown':
      console.log('📄 Duplicating tab (→↓)')
      const currentTab = await chrome.tabs.get(tabId)
      await chrome.tabs.create({ url: currentTab.url })
      return 'Tab duplicated'
                
    case 'updown':
      console.log('🔄 Reloading tab (↑↓) - tabId:', tabId)
      try {
        await chrome.tabs.reload(tabId)
        console.log('✅ Tab reload successful')
        return 'Tab reloaded'
      } catch (error) {
        console.error('❌ Tab reload failed:', error)
        throw error
      }
                
    default:
      throw new Error(`Unknown complex gesture: ${gestureType}`)
    }
  } catch (error) {
    console.error(`❌ ${gestureType} complex action failed:`, error)
    throw error
  }
}

// カスタムアクション実行関数
async function executeCustomAction(action, tabId, request) {
  console.log(`✨ Executing custom action: ${action} for tab ${tabId}`)
    
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
      console.log('🔄 Custom: Reloading tab')
      await chrome.tabs.reload(tabId)
      return 'Tab reloaded (custom)'
      
    case 'duplicate_tab':
      console.log('📄 Custom: Duplicating tab')
      const currentTab = await chrome.tabs.get(tabId)
      await chrome.tabs.create({ url: currentTab.url })
      return 'Tab duplicated'
      
    case 'close_tab':
      console.log('🗑️ Custom: Closing tab')
      await chrome.tabs.remove(tabId)
      return 'Tab closed (custom)'
      
    case 'scroll_top':
      console.log('⬆️ Custom: Scrolling to top')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'top'
      })
      return 'Scrolled to top (custom)'
      
    case 'scroll_bottom':
      console.log('⬇️ Custom: Scrolling to bottom')
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'bottom'
      })
      return 'Scrolled to bottom (custom)'
      
    default:
      console.log(`🤖 Unknown custom action: ${action}`)
      return `Custom action executed: ${action}`
    }
  } catch (error) {
    console.error(`❌ Custom action ${action} failed:`, error)
    throw error
  }
}

console.log('🎯 Background: Simple version ready')