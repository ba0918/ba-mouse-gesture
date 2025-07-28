# リファクタリング計画書（Refactor TODO）

**作成日**: 2025-07-28  
**現在の状況**: Clean Architecture統一後、品質向上フェーズ  
**テスト状況**: 369/369テスト（100%成功率）

---

## 🎯 リファクタリング目標

### 主要目標
1. **真のClean Architecture実現**: 依存関係の正規化
2. **コード品質向上**: ファットクラスの分割・責務明確化
3. **保守性向上**: デッドコード除去・重複排除
4. **テスタビリティ向上**: 単体テスト容易性の確保

### 成功指標
- 最大ファイル行数: 800行 → 250行（68%削減）
- Clean Architecture違反: 8箇所 → 0箇所
- デッドコード: 15ファイル → 0ファイル
- ESLint警告: 40個 → 10個以下

---

## 📋 Phase 1: 緊急対応（Clean Architecture違反修正）

### 🚨 優先度：最高（即座実行）

#### 1.1 Application層からのChrome API直接アクセス除去
**対象ファイル**: 
- `src/application/usecases/SettingsUseCase.js` (98-113行目)
- `src/application/usecases/SettingsManagementUseCase.js` (390-400行目)

**修正内容**:
```javascript
// before: Application層でChrome API直接使用
chromeStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {  // ❌ 違反
      // ...
    })
  })
}

// after: Repository経由でアクセス
class SettingsUseCase {
  constructor(settingsRepository) {  // ✅ 依存性注入
    this.settingsRepository = settingsRepository
  }
  
  async getSettings() {
    return await this.settingsRepository.getSettings()  // ✅ Repository経由
  }
}
```

**影響範囲**: Application層のUseCase 2ファイル  
**テスト**: 既存テストは変更不要（外部インターフェース変更なし）

#### 1.2 Presentation層からのChrome API直接アクセス除去
**対象ファイル**: 
- `src/presentation/contentScripts/index.js` (146-154行目, 836行目)

**修正内容**:
```javascript
// before: Presentation層でChrome API直接使用
chrome.storage.sync.get(['appSettings'], (data) => {  // ❌ 違反
  // ...
})

// after: UseCase経由でアクセス
async initialize() {
  const settings = await this.settingsUseCase.getSettings()  // ✅ UseCase経由
  // ...
}
```

**影響範囲**: ContentScript 1ファイル  
**テスト**: 統合テストの実行確認が必要

#### 1.3 Domain層のブラウザ環境依存除去
**対象ファイル**: 
- `src/domain/entities/Settings.js` (177行目)

**修正内容**:
```javascript
// before: Domain層でWindow API依存
const currentHost = typeof window !== 'undefined' && window.URL ? new window.URL(url).hostname : ''

// after: URL解析をInfrastructure層に委譲
isExcludedSite(url, urlParser) {  // ✅ 依存性注入
  const currentHost = urlParser.getHostname(url)
  // ...
}
```

**影響範囲**: Domain Entity 1ファイル  
**テスト**: Domain層のテストを更新

---

## 📋 Phase 2: ファットクラス分割（最重要）

### 🚨 優先度：最高（Phase1後即座実行）

#### 2.1 ThinOptionsController.js分割（800行 → 4クラス）
**問題**: 命名は「Thin」だが実際は800行・88メソッドのファットクラス

**分割計画**:
```javascript
// 1. UIイベント専用（200行）
class OptionsEventController {
  setupBasicSettingsEvents()    // 基本設定イベント
  setupGestureListEvents()      // ジェスチャー一覧イベント
  setupCustomGestureEvents()    // カスタムジェスチャーイベント
  setupExcludeSiteEvents()      // 除外サイトイベント
  setupDebugEvents()            // デバッグイベント
}

// 2. 描画専用（250行）
class OptionsRenderController {
  renderGestureList()          // ジェスチャー一覧描画
  renderCustomGestureList()    // カスタムジェスチャー一覧描画
  renderExcludeList()          // 除外サイト一覧描画
  buildGestureListHTML()       // HTML生成
  buildCustomGestureListHTML() // HTML生成
}

// 3. パターン処理専用（100行）
class GesturePatternFormatter {
  formatPatternToArrows()      // パターン→矢印変換
  directionToArrow()           // 方向→矢印変換
  getActionDisplayName()       // アクション名取得
  groupGesturesByCategory()    // カテゴリ分類
}

// 4. 統合コントローラー（真に薄い、80行）
class ThinOptionsController {
  constructor(eventController, renderController, patternFormatter) {
    this.eventController = eventController
    this.renderController = renderController
    this.patternFormatter = patternFormatter
  }
  
  async initialize() {
    // 各コントローラーの初期化のみ
    await this.eventController.initialize()
    await this.renderController.initialize()
    // データ読み込み・初期描画の統制
  }
}
```

**効果**: 
- 最大ファイル行数: 800行 → 250行（68%削減）
- 単体テスト容易性: 各責務を独立してテスト可能
- 保守性: 機能追加時の影響範囲の局所化

#### 2.2 GestureListController.js分割（437行 → 2クラス）
**修正内容**:
```javascript
// 1. HTML描画専用（250行）
class GestureListView {
  renderGestures(gestures)      // 一覧描画
  renderGestureItem(gesture)    // 項目描画
  renderEmptyState()            // 空状態描画
  renderGestureCategory()       // カテゴリ描画
}

// 2. イベント・状態管理専用（150行）
class GestureListController {
  constructor(gestureListUseCase, view) {
    this.gestureListUseCase = gestureListUseCase
    this.view = view
  }
  
  toggleGestureStatus(gestureId)  // 状態切り替え
  handleSearch(query)             // 検索処理
  handleFilter(type)              // フィルター処理
}
```

---

## 📋 Phase 3: デッドコード除去

### ⚠️ 優先度：高（Phase2後実行）

#### 3.1 即座削除可能（高安全性）
```bash
# 重複するOptionsManager実装
rm src/presentation/OptionsManagerClean.js
rm src/presentation/OptionsManagerFixed.js

# 未使用のPresenter/ViewModel/Viewパターン
rm -r src/presentation/presenters/
rm -r src/presentation/viewmodels/
rm -r src/presentation/views/

# 未使用のLegacyAdapter
rm src/presentation/adapters/LegacyIntegrationAdapter.js

# 空ディレクトリ
rmdir src/shared/constants/
rmdir src/shared/types/
rmdir src/shared/utils/
rmdir src/presentation/components/
rmdir src/presentation/shared/
```

**効果**: 
- 12-15ファイル削除
- コードベース25-30%削減
- アーキテクチャ統一性向上

#### 3.2 慎重調査後削除（中安全性）
**対象**:
- `src/application/usecases/SettingsUseCase.js` (vs SettingsManagementUseCase.js)
- `src/application/usecases/CustomGestureUseCase.js` (vs CustomGestureManagementUseCase.js)

**調査方法**:
1. 動的参照の確認（`window.SettingsUseCase`等）
2. Content Scripts等での実行時参照確認
3. テスト実行による影響確認

---

## 📋 Phase 4: ESLint警告対応・コード品質向上

### 📊 優先度：中（Phase3後実行）

#### 4.1 メインコード（backup外）の警告解消
**現在の警告**: backup含めて40個、メインコードは約10個

**対象ファイル**:
- `src/application/usecases/CustomGestureManagementUseCase.js`
- `src/domain/services/SimpleGestureRecognizer.js`
- `src/domain/valueObjects/GesturePattern.js`
- `src/presentation/controllers/*.js`

**修正内容**:
- `require-await`: 不要なawaitの削除
- `no-unused-vars`: 未使用変数の削除
- `no-alert`: confirm使用箇所の適切な実装への変更

#### 4.2 一貫性のあるコードスタイル適用
- エラーハンドリングの統一
- ログ出力の統一
- 命名規約の統一

---

## 📋 Phase 5: アーキテクチャ改善・最適化

### 📈 優先度：低（最終段階）

#### 5.1 Infrastructure層の活用促進
**現状**: ChromeStorageAdapterが存在するが十分活用されていない

**改善内容**:
```javascript
// 既存のAdapterを全面活用
const storageAdapter = new ChromeStorageAdapter()
const settingsRepository = new SettingsRepository(storageAdapter)
const settingsUseCase = new SettingsUseCase(settingsRepository)
```

#### 5.2 共通パターンの統一
- View層の共通基盤作成
- エラーメッセージの統一
- UI Componentの共通化検討

#### 5.3 パフォーマンス最適化
- 不要な再描画の抑制
- メモリリークの確認・修正
- バンドルサイズの最適化

---

## 🧪 テスト戦略

### 各Phase後のテスト実行
```bash
# 毎Phase後に実行
pnpm test              # 全テスト実行
pnpm run build         # ビルド確認
pnpm run lint          # 静的解析
pnpm run test:e2e      # E2Eテスト（重要な変更後）
```

### テスト追加・修正
- Phase 1: Domain層テストの依存性注入対応
- Phase 2: 分割されたクラスの単体テスト追加
- Phase 3: デッドコード削除後の統合テスト確認

---

## 📊 進捗管理

### Phase完了条件
- [ ] Phase 1: Clean Architecture違反 0箇所
- [ ] Phase 2: 最大ファイル行数 250行以下
- [ ] Phase 3: デッドコード 0ファイル
- [ ] Phase 4: ESLint警告 10個以下
- [ ] Phase 5: アーキテクチャ改善完了

### 品質指標
- テスト成功率: 100%維持
- ビルドサイズ: 現在の0.13MB維持
- 実行パフォーマンス: 劣化なし

---

## ⚠️ リスク管理

### 高リスク作業
1. **Application層のChrome API依存除去**: 実行時エラーの可能性
2. **ThinOptionsController分割**: UIイベントの動作確認必須
3. **デッドコード削除**: 隠れた依存関係の可能性

### リスク軽減策
- 各Phase後の入念なテスト実行
- ブランチ作業によるロールバック準備
- 段階的実行による影響範囲の局所化

---

**この計画により、真のClean Architecture準拠・保守性の高いコードベースを実現します。**