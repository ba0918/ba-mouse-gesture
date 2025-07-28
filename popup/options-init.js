// グローバルエラーハンドリング
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
  const loadingState = document.getElementById('loadingState')
  if (loadingState) {
    loadingState.innerHTML = 'エラーが発生しました。ページをリロードしてください。'
    loadingState.style.color = '#ea4335'
  }
})

// スクリプト読み込み後に実行される初期化処理
document.addEventListener('DOMContentLoaded', () => {
  console.log('Options page DOM loaded')
  
  // Clean Architecture エントリーポイントが読み込まれるまで待機
  const checkArchitectureReady = () => {
    if (window.cleanOptionsEntry && window.cleanOptionsEntry.isInitialized) {
      console.log('Clean Architecture is ready')
      document.getElementById('loadingState').style.display = 'none'
      document.getElementById('mainContent').style.display = 'block'
    } else {
      setTimeout(checkArchitectureReady, 100)
    }
  }
  
  checkArchitectureReady()
})