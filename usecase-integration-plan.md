# UseCase統合計画書

**作成日**: 2025-07-28  
**目的**: 重複するUseCaseクラスの統合によるClean Architecture統一  
**対象**: Settings系・CustomGesture系UseCase

---

## 🎯 統合目標

### 現状の問題
- **SettingsUseCase** (140行) vs **SettingsManagementUseCase** (420行)
- **CustomGestureUseCase** (115行) vs **CustomGestureManagementUseCase** (666行)
- 合計 **1,341行の重複・類似コード**
- Clean Architecture原則違反（同一責務の重複）

### 統合効果
- **コードベース30-40%削減**（1,341行 → 約800行）
- 保守性向上（単一責任の原則遵守）
- テスト統合による品質向上
- 開発者混乱の解消

---

## 📋 Phase 3.3: UseCase統合実行計画

### 🚨 優先度：最高（Clean Architecture違反解消）

#### 3.3.1 SettingsUseCase統合
**統合方針**: SettingsManagementUseCaseに統合（Clean Architecture準拠）

**統合内容**:
```javascript
// 統合後のSettingsManagementUseCase構成
class SettingsManagementUseCase {
  constructor(settingsRepository) {
    this.settingsRepository = settingsRepository
  }
  
  // 🔄 既存Management機能（保持）
  async getCurrentSettings()         // Repository経由の設定取得
  async toggleExtension(enabled)     // 拡張機能ON/OFF
  async updateTrailSettings(settings) // 軌跡設定更新
  async updateGestureThreshold(threshold) // 感度設定
  async updateExcludeList(list)      // 除外サイト管理
  
  // ➕ 旧SettingsUseCase機能（統合）
  async getSettings()                // 従来インターフェース維持
  async saveSettings(settings)       // 従来インターフェース維持
  chromeStorageGet(keys)            // contentScripts用互換メソッド
  chromeStorageSet(data)            // contentScripts用互換メソッド
  
  // 🆕 統合後新機能
  async migrateFromLegacyFormat()   // 旧形式からの移行
  async validateSettingsIntegrity() // 設定整合性チェック
}
```

**実装手順**:
1. SettingsManagementUseCaseに互換メソッド追加
2. window.SettingsUseCase登録をSettingsManagementUseCaseに変更
3. contentScripts参照更新
4. SettingsUseCase.js削除
5. テスト統合・実行

#### 3.3.2 CustomGestureUseCase統合
**統合方針**: CustomGestureManagementUseCaseに統合（Clean Architecture準拠）

**統合内容**:
```javascript
// 統合後のCustomGestureManagementUseCase構成
class CustomGestureManagementUseCase {
  constructor(gestureRepository, settingsRepository) {
    this.gestureRepository = gestureRepository
    this.settingsRepository = settingsRepository
  }
  
  // 🔄 既存Management機能（保持）
  async getAllCustomGestures()       // Repository経由取得
  async addCustomGesture(gesture)    // 高度な検証・追加
  async updateCustomGesture(id, data) // 更新処理
  async deleteCustomGesture(id)      // 削除処理
  async searchCustomGestures(query)  // 検索機能
  
  // ➕ 旧CustomGestureUseCase機能（統合）
  async getCustomGestures()         // 従来インターフェース維持
  async saveCustomGestures(gestures) // 従来インターフェース維持
  async resetCustomGestures()       // 従来インターフェース維持
  
  // 🆕 統合後新機能
  async validateGesturePattern(pattern) // パターン検証強化
  async optimizeGestureDatabase()    // データベース最適化
}
```

**実装手順**:
1. CustomGestureManagementUseCaseに互換メソッド追加
2. window.CustomGestureUseCase登録をCustomGestureManagementUseCaseに変更
3. contentScripts参照更新
4. CustomGestureUseCase.js削除
5. テスト統合・実行

---

## 📊 影響範囲分析

### 修正対象ファイル

#### ContentScripts（window.XxxUseCase参照）
- `src/presentation/contentScripts/index.js`
  - `window.SettingsUseCase` → `window.SettingsManagementUseCase`
  - `window.CustomGestureUseCase` → `window.CustomGestureManagementUseCase`

#### テストファイル
- Settings系テストの統合
- CustomGesture系テストの統合
- 互換性テストの追加

#### ビルド設定
- esbuildエントリーポイント更新
- window登録スクリプト更新

---

## 🧪 テスト戦略

### 統合テストアプローチ
1. **段階的統合**: 1クラスずつ統合・テスト
2. **互換性保証**: 既存インターフェース動作確認
3. **回帰テスト**: 全368テスト成功維持
4. **E2Eテスト**: 実ブラウザでの動作確認

### テスト項目
- [ ] Settings取得・保存の互換性
- [ ] CustomGesture CRUD操作の互換性
- [ ] contentScriptsでの動的参照
- [ ] エラーハンドリングの一貫性
- [ ] パフォーマンス劣化なし

---

## ⚠️ リスク管理

### 高リスク作業
1. **contentScripts動的参照変更**: 実行時エラーの可能性
2. **window登録名変更**: 既存コードとの互換性問題
3. **メソッドシグネチャ変更**: インターフェース破綻

### リスク軽減策
- 段階的統合（1クラスずつ）
- 互換性メソッドの一時的維持
- 入念なテスト実行
- ロールバック計画の準備

---

## 📈 完了条件

### Phase 3.3 成功指標
- [ ] SettingsUseCase.js削除完了
- [ ] CustomGestureUseCase.js削除完了
- [ ] 全368テスト成功維持
- [ ] コードベース30-40%削減達成
- [ ] Clean Architecture違反解消

### 品質指標
- テスト成功率: 100%維持
- ビルドサイズ: 現在の0.13MB維持
- 実行パフォーマンス: 劣化なし

---

**この統合により、真のClean Architecture準拠・保守性の高いコードベースを実現します。**