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
      console.log('🗑️ Closing tab')
      await chrome.tabs.remove(tabId)
      return 'Tab closed'
                
    case 'upright':
      console.log('➕ Opening new tab')
      await chrome.tabs.create({})
      return 'New tab opened'
                
    case 'rightdown':
      console.log('🔄 Reloading tab')
      await chrome.tabs.reload(tabId)
      return 'Tab reloaded'
                
    default:
      throw new Error(`Unknown complex gesture: ${gestureType}`)
    }
  } catch (error) {
    console.error(`❌ ${gestureType} complex action failed:`, error)
    throw error
  }
}

console.log('🎯 Background: Simple version ready')