# 🔄 スーパーリロード機能実装案

## 🎯 要望対応

ユーザー要望：**スーパーリロード機能（キャッシュクリア付きリロード）**

現在の↑↓ジェスチャーは通常のページ更新のみ対応。
Ctrl+Shift+R（またはCtrl+F5）相当の機能が欲しい。

## 📋 実装提案

### Option 1: 新規ジェスチャーパターン（推奨）

```
現在: ↑↓ = 通常リロード
追加: ↑↓↑ = スーパーリロード（キャッシュクリア付き）
```

**メリット**:
- 既存機能と干渉しない
- 直感的（「更に強力」を「さらにもう一回上」で表現）
- 3方向ジェスチャーの良い活用例

### Option 2: 修飾キー対応

```
現在: ↑↓ = 通常リロード
追加: Shift+↑↓ = スーパーリロード
```

**メリット**:
- OSのショートカットと整合性
- 既存ユーザーの学習コスト最小

**デメリット**:
- マウスジェスチャーの「マウスのみ」思想から逸脱
- 実装複雑化

### Option 3: 設定切り替え

```
設定で↑↓の動作を選択:
- 通常リロード
- スーパーリロード
- 両方（連続実行で切り替え）
```

## 🔧 技術実装詳細（Option 1採用）

### 1. ジェスチャー検出追加

**ファイル**: `content_scripts/gesture-simple.js`

```javascript
// 既存の複合ジェスチャー検出に追加
function analyzeComplexGesture(path) {
  const directions = analyzePath(path)
  
  // 既存のジェスチャー...
  if (directions === 'UPDOWN') {
    return 'refresh'
  }
  
  // 新規：スーパーリロード
  if (directions === 'UPDOWNUP') {
    return 'super_refresh'
  }
  
  // 他の新規ジェスチャー候補
  if (directions === 'LEFTRIGHT') {
    return 'prev_tab'  // 前のタブ
  }
  if (directions === 'RIGHTLEFT') {
    return 'next_tab'  // 次のタブ
  }
  
  return null
}
```

### 2. バックグラウンド処理追加

**ファイル**: `background/background-simple.js`

```javascript
// 新規アクション処理
async function executeAction(action, tabId) {
  switch (action) {
    // 既存...
    case 'refresh':
      await chrome.tabs.reload(tabId)
      return 'Page reloaded'
      
    // 新規：スーパーリロード
    case 'super_refresh':
      debugLog(LOG_LEVELS.INFO, 'Super reloading tab (↑↓↑) - tabId:', tabId)
      try {
        await chrome.tabs.reload(tabId, {bypassCache: true})
        debugLog(LOG_LEVELS.DEBUG, 'Super reload successful')
        return 'Page super reloaded (cache cleared)'
      } catch (error) {
        debugLog(LOG_LEVELS.ERROR, 'Super reload failed:', error)
        throw error
      }
      
    // 新規：タブ切り替え
    case 'prev_tab':
      await switchToPreviousTab()
      return 'Switched to previous tab'
      
    case 'next_tab':
      await switchToNextTab()
      return 'Switched to next tab'
  }
}

// タブ切り替えヘルパー関数
async function switchToPreviousTab() {
  const tabs = await chrome.tabs.query({currentWindow: true})
  const currentTab = await chrome.tabs.query({active: true, currentWindow: true})
  const currentIndex = tabs.findIndex(tab => tab.id === currentTab[0].id)
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
  await chrome.tabs.update(tabs[prevIndex].id, {active: true})
}

async function switchToNextTab() {
  const tabs = await chrome.tabs.query({currentWindow: true})
  const currentTab = await chrome.tabs.query({active: true, currentWindow: true})
  const currentIndex = tabs.findIndex(tab => tab.id === currentTab[0].id)
  const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
  await chrome.tabs.update(tabs[nextIndex].id, {active: true})
}
```

### 3. カスタムジェスチャー対応

**ファイル**: `content_scripts/custom-gesture-manager.js`

```javascript
// デフォルトアクションに追加
const DEFAULT_ACTIONS = {
  // 既存...
  'refresh': 'ページ更新',
  'super_refresh': 'スーパーリロード（キャッシュクリア）',
  'prev_tab': '前のタブ',
  'next_tab': '次のタブ'
}
```

### 4. オプション画面更新

**ファイル**: `popup/options.html`

```html
<!-- ジェスチャー一覧セクション追加 -->
<section class="options-section">
  <h3>🎯 ジェスチャー一覧</h3>
  <div class="gesture-list">
    <div class="gesture-item">
      <span class="gesture-pattern">↑↓</span>
      <span class="gesture-action">通常リロード</span>
    </div>
    <div class="gesture-item new">
      <span class="gesture-pattern">↑↓↑</span>
      <span class="gesture-action">スーパーリロード</span>
      <span class="gesture-badge">NEW</span>
    </div>
    <div class="gesture-item new">
      <span class="gesture-pattern">←→</span>
      <span class="gesture-action">前のタブ</span>
      <span class="gesture-badge">NEW</span>
    </div>
    <div class="gesture-item new">
      <span class="gesture-pattern">→←</span>
      <span class="gesture-action">次のタブ</span>
      <span class="gesture-badge">NEW</span>
    </div>
  </div>
</section>
```

## 🧪 テスト実装

### 1. 単体テスト

**ファイル**: `tests/unit/gesture-detection.test.js`

```javascript
describe('新規ジェスチャー検出', () => {
  test('↑↓↑パターンでスーパーリロードを検出', () => {
    const mockPath = [
      {x: 100, y: 100}, // 開始点
      {x: 100, y: 50},  // 上
      {x: 100, y: 150}, // 下
      {x: 100, y: 50}   // 上
    ]
    
    const result = analyzeComplexGesture(mockPath)
    expect(result).toBe('super_refresh')
  })
  
  test('←→パターンで前のタブ切り替えを検出', () => {
    const mockPath = [
      {x: 100, y: 100}, // 開始点
      {x: 50, y: 100},  // 左
      {x: 150, y: 100}  // 右
    ]
    
    const result = analyzeComplexGesture(mockPath)
    expect(result).toBe('prev_tab')
  })
})
```

### 2. E2Eテスト

**ファイル**: `tests/e2e/new-gestures.spec.js`

```javascript
test('スーパーリロードジェスチャーが動作する', async () => {
  // ページにナビゲート
  await page.goto('https://example.com')
  
  // スーパーリロードジェスチャーを実行
  await page.mouse.move(200, 200)
  await page.mouse.down({button: 'right'})
  await page.mouse.move(200, 150) // 上
  await page.mouse.move(200, 250) // 下
  await page.mouse.move(200, 150) // 上
  await page.mouse.up({button: 'right'})
  
  // リロードが実行されることを確認
  await expect(page).toHaveTitle(/example/i)
})
```

## 📊 実装スケジュール

### Phase 10-1: スーパーリロード機能（2-3時間）
1. **ジェスチャー検出実装**（30分）
2. **バックグラウンド処理実装**（30分）
3. **テスト作成・実行**（60分）
4. **オプション画面更新**（30分）

### Phase 10-2: タブ切り替え機能（2-3時間）
1. **←→、→←ジェスチャー実装**（60分）
2. **タブ切り替えロジック実装**（60分）
3. **テスト作成・実行**（60分）

### Phase 10-3: UI改善（2-4時間）
1. **ジェスチャー一覧画面**（120分）
2. **視覚的フィードバック改善**（120分）

## 🎯 追加検討事項

### その他の有用なジェスチャー
```
↑← : ウィンドウを閉じる
↓↑ : ブックマーク追加
円運動 : 設定画面を開く
L字(→↑) : ページ内検索
```

### 設定オプション
- ジェスチャーの有効/無効個別設定
- 感度調整（3方向ジェスチャー用）
- カスタマイズ可能な追加ジェスチャー

### パフォーマンス考慮
- 3方向ジェスチャーの認識精度調整
- レスポンス時間の最適化
- メモリ使用量の監視

## 🚀 実装開始の準備

この実装案は現在のアーキテクチャに自然に統合でき、既存機能への影響は最小限です。

**実装開始の合図をいただければ、Phase 10-1から順次実装を開始できます。**