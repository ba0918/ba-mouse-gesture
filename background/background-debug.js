// デバッグ用バックグラウンドスクリプト
console.log('🔧 バックグラウンド: デバッグ版開始')

// 拡張機能インストール時
chrome.runtime.onInstalled.addListener(function (details) {
  console.log('📦 拡張機能インストール:', details.reason)
})

// メッセージ受信処理
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('📨 メッセージ受信:', request)
  console.log('📨 送信者:', sender)
    
  if (request.type === 'gesture') {
    console.log(`🎯 ジェスチャー処理: ${request.direction}`)
        
    handleSimpleGesture(request.direction, sender.tab)
      .then(result => {
        console.log('✅ 処理成功:', result)
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        console.error('❌ 処理失敗:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  }
    
  // その他のメッセージタイプ
  console.log('⚠️ 未知のメッセージタイプ:', request.type)
  sendResponse({ success: false, error: '未知のメッセージタイプ' })
})

// シンプルなジェスチャー処理
async function handleSimpleGesture(direction, tab) {
  console.log(`🔄 ジェスチャー実行開始: ${direction}, タブID: ${tab?.id}`)
    
  if (!tab || !tab.id) {
    throw new Error('タブ情報が無効です')
  }
    
  try {
    switch (direction) {
    case 'left':
      console.log('⬅️ 戻る実行')
      await chrome.tabs.goBack(tab.id)
      return '戻る操作を実行しました'
                
    case 'right':
      console.log('➡️ 進む実行')
      await chrome.tabs.goForward(tab.id)
      return '進む操作を実行しました'
                
    case 'up':
      console.log('⬆️ ページトップへスクロール')
      await chrome.tabs.sendMessage(tab.id, {
        type: 'scroll',
        direction: 'top'
      })
      return 'ページトップへスクロールしました'
                
    case 'down':
      console.log('⬇️ ページボトムへスクロール')
      await chrome.tabs.sendMessage(tab.id, {
        type: 'scroll',
        direction: 'bottom'
      })
      return 'ページボトムへスクロールしました'
                
    default:
      throw new Error(`未対応の方向: ${direction}`)
    }
  } catch (error) {
    console.error(`❌ ${direction} ジェスチャー失敗:`, error)
    throw error
  }
}

console.log('🎯 バックグラウンド: デバッグ版初期化完了')