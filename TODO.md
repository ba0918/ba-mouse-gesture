# TODO.md - TypeScript + Svelte移行計画

## プロジェクト概要

Chrome拡張機能のマウスジェスチャーツールをより保守性の高い技術スタックに移行します。
- **現在**: VanillaJS + Clean Architecture
- **移行後**: TypeScript + Svelte + Clean Architecture
- **目標**: 型安全性と宣言的UI、開発効率向上

## 移行戦略

### **段階的移行**: JavaScriptからTypeScriptへの安全な移行
- **Phase 1**: TypeScript基盤構築（2-3日）
- **Phase 2**: Svelte導入（設定画面のみ）（1-2日）  
- **Phase 3**: 品質保証・最適化（1日）

### **バンドルサイズ制御**: Chrome拡張機能として軽量性を維持
- **現在**: 約211KB
- **目標**: +50KB以下（Svelte使用）
- **制約**: Chrome Web Store公開に向けサイズ最適化

---

## Phase 1: TypeScript基盤構築 📚 **未着手**

### 目標
既存JavaScriptコードをTypeScriptに移行し、型安全性を確보

### Phase 1-1: 環境セットアップ ⚙️ ✅ **完了**
- [x] **TypeScript導入**
  - [x] `typescript`パッケージインストール（v5.8.3）
  - [x] `@types/chrome`、`@types/jest`型定義追加
  - [x] `tsconfig.json`設定（Clean Architecture対応・厳格な型チェック）
  - [x] ESLint TypeScript対応設定（`@typescript-eslint`導入）

- [x] **ビルドシステム統合**
  - [x] esbuildのTypeScript統合設定（`.ts`ローダー追加）
  - [x] `scripts/build.js`のTS対応（tsconfig自動読み込み）
  - [x] 開発・本番ビルドでの型チェック（`typecheck`スクリプト追加）

### **Phase 1-1 完了成果**
- ✅ **開発環境**: TypeScript v5.8.3 + ESLint統合
- ✅ **ビルド統合**: esbuild + TypeScript統合（.js/.ts両対応）
- ✅ **型チェック**: `pnpm run typecheck`コマンド追加
- ✅ **品質保証**: ESLint TypeScript対応（.ts拡張子対応）

### Phase 1-2: Domain層のTypeScript化 🧠 ✅ **完了**
**依存関係なし、最優先実装**

- [x] **値オブジェクトのTS化**
  - [x] `src/domain/valueObjects/Point.js` → `.ts`（2D座標点・不変オブジェクト）
  - [x] `src/domain/valueObjects/GesturePattern.js` → `.ts`（`Direction`型定義追加）
  - [x] `src/domain/valueObjects/Threshold.js` → `.ts`（`SensitivityLevel`等型定義追加）
  - [x] 不変性・型安全性の強化
  - [x] `index.ts`統合エクスポート作成

- [x] **エンティティのTS化**
  - [x] `src/domain/entities/Gesture.js` → `.ts`（基底クラス・`GestureAction`型定義）
  - [x] `src/domain/entities/CustomGesture.js` → `.ts`（継承関係・`UsageStats`型定義）
  - [x] `src/domain/entities/Settings.js` → `.ts`（設定管理・インターフェース定義）
  - [x] TypeScript型定義・インターフェース追加
  - [x] `index.ts`統合エクスポート作成

- [x] **ドメインサービスのTS化**
  - [x] `src/domain/services/PatternMatcher.js` → `.ts`
  - [x] `src/domain/services/GestureRecognizer.js` → `.ts`
  - [x] `src/domain/services/SimpleGestureRecognizer.js` → `.ts`
  - [x] 関数型・メソッドの型定義
  - [x] `index.ts`統合エクスポート作成

### **Phase 1-2 完了成果**
- ✅ **型安全性向上**: 全メソッドに型注釈・インターフェース定義
- ✅ **可視性制御**: `private`修飾子による適切なカプセル化
- ✅ **継承明確化**: `override`キーワードによる継承関係の明確化
- ✅ **ES6 Module統一**: import/export文への統一・index.ts作成
- ✅ **ドメインサービス型安全化**: PatternMatcher、GestureRecognizer、SimpleGestureRecognizer完全TypeScript化
- ✅ **型チェック完了**: `tsc --noEmit`エラー0件・警告0件

### Phase 1-3: Application層のTypeScript化 📋 ✅ **完了**
**Domain層に依存**

- [x] **インターフェース定義のTS化**  
  - [x] `src/application/interfaces/IGestureService.js` → `.ts`
  - [x] `src/application/interfaces/ISettingsService.js` → `.ts`
  - [x] `src/application/interfaces/ISystemService.js` → `.ts`
  - [x] TypeScript interfaceへの変換
  - [x] `index.ts`統合エクスポート作成

- [x] **ユースケースのTS化**
  - [x] `src/application/usecases/SettingsManagementUseCase.js` → `.ts`
  - [x] `src/application/usecases/CustomGestureManagementUseCase.js` → `.ts`
  - [x] `src/application/usecases/GestureRecognitionUseCase.js` → `.ts`
  - [x] 戻り値・引数の型定義強化
  - [x] `index.ts`統合エクスポート作成

### **Phase 1-3 完了成果**
- ✅ **インターフェース型安全化**: IGestureService、ISettingsService、ISystemService完全TypeScript化
- ✅ **DTO型定義**: 全18個のDTO型定義（GestureExecutionResultDTO、SettingsDTO等）
- ✅ **UseCase型安全化**: SettingsManagementUseCase、CustomGestureManagementUseCase、GestureRecognitionUseCase完全TypeScript化
- ✅ **Clean Architecture境界**: Application層インターフェースの型安全な境界定義
- ✅ **型エラー修正完了**: Domain層サービス（PatternMatcher等）TypeScript化完了

### **Phase 1-4 完了成果**
- ✅ **Adapter型安全化**: ChromeStorageAdapter、CanvasRendererAdapter、DebugLogger完全TypeScript化
- ✅ **Chrome API統合**: @types/chrome型定義活用によるChrome拡張API型安全性向上
- ✅ **Repository型安全化**: SettingsRepository、GestureRepository完全TypeScript化
- ✅ **データ永続化型安全**: Chrome Storage操作の型安全性確保、エラー処理強化
- ✅ **型整合性確保**: Settings、CustomGestureエンティティとの型整合性100%確保

### Phase 1-4: Infrastructure層のTypeScript化 🔧 ✅ **完了**
**Application・Domain層に依存**

- [x] **アダプターのTS化**
  - [x] `src/infrastructure/adapters/ChromeStorageAdapter.js` → `.ts`
  - [x] `src/infrastructure/adapters/CanvasRendererAdapter.js` → `.ts`
  - [x] `src/infrastructure/adapters/DebugLogger.js` → `.ts`
  - [x] Chrome API型定義の活用

- [x] **リポジトリのTS化**
  - [x] `src/infrastructure/repositories/SettingsRepository.js` → `.ts`
  - [x] `src/infrastructure/storage/repositories/GestureRepository.js` → `.ts`
  - [x] データ永続化の型安全性向上

### Phase 1-5: Presentation層のTypeScript化 🎨 🔄 **進行中**
**全層に依存**

- [ ] **コントローラーのTS化**
  - [ ] `src/presentation/controllers/OptionsEventController.js` → `.ts`
  - [ ] `src/presentation/controllers/GestureListController.js` → `.ts`
  - [ ] `src/presentation/controllers/DebugSettingsController.js` → `.ts`
  - [ ] DOM操作・イベントハンドリングの型定義

- [ ] **ハンドラーのTS化**
  - [ ] `src/presentation/handlers/GestureEventHandler.js` → `.ts`
  - [ ] `src/presentation/background/index.js` → `.ts`
  - [ ] `src/presentation/contentScripts/index.js` → `.ts`
  - [ ] Chrome拡張機能API統合の型安全性

### Phase 1-6: テスト移行 🧪 **未着手**
- [ ] **Jest TypeScript設定**
  - [ ] `jest.config.js`のTypeScript対応
  - [ ] TypeScript用テストセットアップ
  - [ ] 型定義テストの追加

- [ ] **テストファイルのTS化**
  - [ ] 主要テストファイルの`.ts`変換
  - [ ] 型アサーションの追加
  - [ ] モック・スタブの型定義

### 完了基準
- [ ] 全JavaScriptファイルがTypeScript化完了
- [ ] `tsc --noEmit`で型エラー0件
- [ ] 既存テスト（368テスト）が全パス
- [ ] ビルドサイズ増加が最小限（+10KB以下）

---

## Phase 2: Svelte導入 🎨 **未着手**

### 目標
設定画面（popup）のみをSvelteで再実装、バンドルサイズ最小化

### Phase 2-1: Svelte環境構築 ⚙️ **未着手**
- [ ] **Svelte導入**
  - [ ] `svelte`、`@tsconfig/svelte`パッケージ追加
  - [ ] TypeScript + Svelteの設定統合
  - [ ] esbuildでのSvelteコンパイル設定

- [ ] **開発環境整備**
  - [ ] Svelte用のESLint設定
  - [ ] VS Code拡張機能対応
  - [ ] ホットリロード設定

### Phase 2-2: 設定画面のSvelte化 🖼️ **未着手**
- [ ] **コンポーネント設計**
  - [ ] `popup/OptionsApp.svelte`（メインコンポーネント）
  - [ ] `popup/components/GestureList.svelte`
  - [ ] `popup/components/SettingsPanel.svelte`
  - [ ] `popup/components/DebugPanel.svelte`

- [ ] **既存ロジック活用**
  - [ ] SettingsManagementUseCaseとの連携
  - [ ] CustomGestureManagementUseCaseとの連携
  - [ ] 既存のChrome storage API統合

- [ ] **UI/UX改善**
  - [ ] リアクティブな状態管理
  - [ ] アニメーション・トランジション
  - [ ] レスポンシブデザイン対応

### Phase 2-3: 統合・テスト 🔗 **未着手**
- [ ] **Svelte統合テスト**
  - [ ] コンポーネント単体テスト
  - [ ] ユーザー操作フローテスト
  - [ ] Chrome拡張機能環境での動作確認

- [ ] **パフォーマンス検証**
  - [ ] バンドルサイズ確認（目標: +30KB以下）
  - [ ] 初期表示速度測定
  - [ ] メモリ使用量確認

### 完了基準
- [ ] 設定画面がSvelteで動作
- [ ] 既存機能100%維持
- [ ] バンドルサイズ増加が50KB以下
- [ ] ユーザビリティ向上

---

## Phase 3: 品質保証・最適化 ✅ **未着手**

### Phase 3-1: テスト拡充 🧪 **未着手**
- [ ] **TypeScript型テスト**
  - [ ] 型安全性の検証テスト
  - [ ] インターフェース整合性テスト
  - [ ] 型推論の動作確認

- [ ] **Svelteコンポーネントテスト**
  - [ ] `@testing-library/svelte`導入
  - [ ] コンポーネント単体テスト
  - [ ] E2E テスト追加

### Phase 3-2: パフォーマンス最適化 ⚡ **未着手**
- [ ] **バンドル最適化**
  - [ ] Tree shaking設定確認
  - [ ] 不要なコード除去
  - [ ] Svelte コンパイル最適化

- [ ] **Chrome拡張機能最適化**
  - [ ] マニフェスト最適化
  - [ ] 権限最小化確認
  - [ ] 起動時間最適化

### Phase 3-3: 品質ゲート更新 🛡️ **未着手**
- [ ] **ESLint設定更新**
  - [ ] TypeScript用ルール追加
  - [ ] Svelte用ルール追加
  - [ ] 品質基準の明確化

- [ ] **CI/CD更新**
  - [ ] GitHub Actions TypeScript対応
  - [ ] 型チェック自動化
  - [ ] Svelte ベンチマーク追加

### 完了基準
- [ ] 型エラー0件、ESLintエラー0件
- [ ] 全テスト（TypeScript化後）パス
- [ ] パフォーマンスベンチマーク基準クリア
- [ ] Chrome Web Store公開準備完了

---

## 技術的詳細・制約

### TypeScript設定方針
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "skipLibCheck": true,
    "types": ["chrome", "jest"]
  }
}
```

### Svelte導入指針
- **軽量性重視**: 設定画面のみの限定導入
- **既存アーキテクチャ活用**: Clean ArchitectureのUseCaseを変更せず
- **段階的移行**: 一度に全面置き換えしない
- **バンドルサイズ制御**: 50KB増加以下に制限

### 品質保証戦略
- **既存テスト維持**: 368テストの互換性確保
- **型安全性**: TypeScriptによるコンパイル時エラー検出
- **E2E保護**: Playwright テストでユーザー体験保証
- **段階的検証**: 各Phase完了時の品質確認

---

## リスク管理

### 技術リスク
- **バンドルサイズ増加**: Svelte導入による軽量性への影響
- **既存機能破綻**: TypeScript移行時のロジック変更
- **学習コスト**: 新技術習得の時間コスト

### 軽減策
- **段階的移行**: 一度に多くを変更しない
- **別ブランチ作業**: `feature/typescript-migration`
- **継続的テスト**: 各段階でのテスト実行
- **ロールバック準備**: 問題発生時の復旧計画

---

## 期待される効果

### **開発効率向上**
- **型安全性**: ランタイムエラーの大幅削減
- **IDE支援**: オートコンプリート・リファクタリング支援
- **保守性向上**: インターフェース明確化による理解容易性

### **ユーザー体験向上**  
- **UI品質**: Svelteによる宣言的・リアクティブUI
- **パフォーマンス**: より効率的なDOM更新
- **応答性**: 型安全性による安定動作

### **長期的価値**
- **技術負債削減**: モダンな技術スタックへの移行
- **拡張性**: 新機能追加時の開発効率
- **保守コスト削減**: バグ発生率の低下

**次のアクション**: Phase 1-5のPresentation層TypeScript化に進行

---

## 進捗管理

- **現在のステータス**: 🔥 **Phase 1-4完了、Infrastructure層TypeScript化達成**
- **作業ブランチ**: `feature/typescript-migration`
- **完了進捗**: Phase 1-1（環境）✅ + Phase 1-2（Domain層）✅ + Phase 1-3（Application層）✅ + Phase 1-4（Infrastructure層）✅
- **次期作業**: Phase 1-5（Presentation層）→ Phase 1-6（テスト移行）→ 完了チェック
- **品質基準**: 既存機能100%維持 + 型安全性向上 + バンドルサイズ制御

### **実績サマリー**
- ✅ **TypeScript環境構築**: v5.8.3 + ESLint統合 + esbuild統合
- ✅ **Domain層完全移行**: 値オブジェクト3個 + エンティティ3個 + ドメインサービス3個
- ✅ **Application層完全移行**: インターフェース3個 + UseCase3個（全主要UseCase）
- ✅ **型定義拡充**: Direction、GestureAction、DebugSettings、RecognitionMetadata等20+型定義
- ✅ **品質保証**: `tsc --noEmit`エラー0件、型安全性100%達成