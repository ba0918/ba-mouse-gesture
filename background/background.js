// マウスジェスチャー バックグラウンドスクリプト
console.log('マウスジェスチャーツール: バックグラウンドスクリプト起動')

// 拡張機能のインストール/アップデート時の処理
chrome.runtime.onInstalled.addListener(function (details) {
  console.log('マウスジェスチャーツール: 拡張機能インストール完了')
    
  if (details.reason === 'install') {
    console.log('初回インストール')
    // 初期設定をストレージに保存
    chrome.storage.local.set({
      'mouseGestureEnabled': true,
      'gestureMinDistance': 50,
      'gestureMaxTime': 2000,
      'trailColor': '#4285f4',
      'trailWidth': 3
    })
  } else if (details.reason === 'update') {
    console.log('アップデート')
  }
})

// コンテンツスクリプトからのメッセージを処理
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('バックグラウンド: メッセージ受信', request)
    
  if (request.type === 'gesture') {
    handleGestureAction(request.direction, sender.tab)
      .then(result => {
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        console.error('ジェスチャー処理エラー:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    // 非同期レスポンスを送信するためにtrueを返す
    return true
  } else if (request.type === 'complexGesture') {
    handleComplexGestureAction(request.sequence, sender.tab)
      .then(result => {
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        console.error('複合ジェスチャー処理エラー:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    // 非同期レスポンスを送信するためにtrueを返す
    return true
  }
})

/**
 * ジェスチャーに基づいてブラウザアクションを実行
 * @param {string} direction ジェスチャーの方向
 * @param {Object} tab 送信者のタブ情報
 * @returns {Promise<string>} 実行されたアクションの説明
 */
async function handleGestureAction(direction, tab) {
  console.log(`ジェスチャー処理開始: ${direction}, タブID: ${tab.id}`)
    
  try {
    switch (direction) {
    case 'left':
      // 戻る
      await chrome.tabs.goBack(tab.id)
      return 'ブラウザの戻る操作を実行'
                
    case 'right':
      // 進む
      await chrome.tabs.goForward(tab.id)
      return 'ブラウザの進む操作を実行'
                
    case 'up':
      // ページトップへスクロール
      await chrome.tabs.sendMessage(tab.id, {
        type: 'scroll',
        direction: 'top'
      })
      return 'ページトップへスクロール'
                
    case 'down':
      // ページボトムへスクロール
      await chrome.tabs.sendMessage(tab.id, {
        type: 'scroll',
        direction: 'bottom'
      })
      return 'ページボトムへスクロール'
                
    default:
      throw new Error(`未知のジェスチャー方向: ${direction}`)
    }
  } catch (error) {
    console.error(`ジェスチャー処理失敗: ${direction}`, error)
    throw error
  }
}

/**
 * タブ操作に関するヘルパー関数
 */
const TabUtils = {
  /**
     * 新しいタブを開く
     * @param {string} url 開くURL（省略時は新しいタブページ）
     * @returns {Promise<Object>} 作成されたタブ情報
     */
  async createNewTab(url = 'chrome://newtab/') {
    return await chrome.tabs.create({ url: url })
  },
    
  /**
     * 現在のタブを閉じる
     * @param {number} tabId タブID
     * @returns {Promise<void>}
     */
  async closeTab(tabId) {
    return await chrome.tabs.remove(tabId)
  },
    
  /**
     * タブを更新
     * @param {number} tabId タブID
     * @returns {Promise<Object>} 更新されたタブ情報
     */
  async reloadTab(tabId) {
    return await chrome.tabs.reload(tabId)
  }
}

// 将来の複合ジェスチャー用の状態管理
const gestureSequence = {
  sequence: [],
  lastGestureTime: 0,
  maxSequenceTime: 1000  // 複合ジェスチャーの最大間隔（ミリ秒）
}

/**
 * 複合ジェスチャーに基づいてブラウザアクションを実行
 * @param {string} sequence ジェスチャーシーケンス
 * @param {Object} tab 送信者のタブ情報
 * @returns {Promise<string>} 実行されたアクションの説明
 */
async function handleComplexGestureAction(sequence, tab) {
  console.log(`複合ジェスチャー処理開始: ${sequence}, タブID: ${tab.id}`)
    
  try {
    switch (sequence) {
    case 'downright':
      // タブを閉じる
      await TabUtils.closeTab(tab.id)
      return 'タブを閉じる操作を実行'
                
    case 'upright':
      // 新しいタブを開く
      await TabUtils.createNewTab()
      return '新しいタブを開く操作を実行'
                
    case 'rightdown':
      // タブを更新
      await TabUtils.reloadTab(tab.id)
      return 'タブを更新する操作を実行'
                
    default:
      throw new Error(`未知の複合ジェスチャー: ${sequence}`)
    }
  } catch (error) {
    console.error(`複合ジェスチャー処理失敗: ${sequence}`, error)
    throw error
  }
}

/**
 * 旧関数（Phase 1との互換性のため保持）
 * @param {string} direction 新しいジェスチャー方向
 * @param {Object} tab タブ情報
 * @returns {Promise<string|null>} 実行されたアクションまたはnull
 */
async function handleComplexGesture(direction, tab) {
  const now = Date.now()
    
  // シーケンスのタイムアウトチェック
  if (now - gestureSequence.lastGestureTime > gestureSequence.maxSequenceTime) {
    gestureSequence.sequence = []
  }
    
  gestureSequence.sequence.push(direction)
  gestureSequence.lastGestureTime = now
    
  const sequence = gestureSequence.sequence.join('')
    
  // Phase 2で複合ジェスチャー対応完了:
  // - 'downright': タブを閉じる
  // - 'upright': 新しいタブを開く
  // - 'rightdown': タブを更新
    
  return null
}

console.log('マウスジェスチャーツール: バックグラウンドスクリプト初期化完了')