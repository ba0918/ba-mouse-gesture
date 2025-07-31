# TODO.md - Clean Architecture品質向上リファクタリング計画

## プロジェクト現状

**現在の状態**: ✅ **Phase 11.5完了** - Clean Architecture統一 + TypeScript + Svelte統合
- **TypeScript化**: 100%完了（型エラー0件）
- **Clean Architecture**: 4層構成完全統合
- **Svelte統合**: オプション画面モダンUI完成
- **品質保証**: 269テスト全パス（100%成功率）
- **Magic Numbers統一**: ✅ **2025-07-31完了**

---

## リファクタリング対象課題（分析結果）

### 🔥 **影響度High**（優先対応）

#### ✅ **完了**: Magic Numbers統一（2025-07-31）
- ✅ `DEFAULT_GESTURE_THRESHOLD = 15` → 8箇所統一完了
- ✅ `DEFAULT_STROKE_COLOR = '#2196F3'` → 6箇所統一完了
- ✅ `DEFAULT_STROKE_WIDTH = 3` → 6箇所統一完了
- ✅ `DIRECTION_ANGLES` → 角度計算定数化完了
- ✅ `GestureConstants.ts` → ドメイン層定数管理新規作成
- **効果**: 保守性向上、一貫性確保、変更容易性向上

#### 🔄 **未完了**: 設定初期化重複の解消
**問題**: 同じ設定初期化パターンが複数箇所で重複
```typescript
// 重複パターン（要修正）
{
  enabled: true,
  strokeColor: DEFAULT_STROKE_COLOR,
  strokeWidth: DEFAULT_STROKE_WIDTH,
  gestureThreshold: DEFAULT_GESTURE_THRESHOLD,
  excludeList: [],
}
```

**対象ファイル**:
- `src/domain/entities/Settings.ts:65-68`
- `src/presentation/controllers/GestureManager.ts:58-64`
- `src/presentation/handlers/GestureEventHandler.ts:61-64`
- `src/infrastructure/adapters/ChromeSettingsAdapter.ts:14-20`
- `src/application/usecases/GestureExecutionUseCase.ts:65-69`
- `src/presentation/popup/OptionsApp.svelte:39-44`

**改善提案**:
```typescript
// GestureSettingsFactory活用（既に作成済み）
import { GestureSettingsFactory } from '../../domain/definitions/GestureConstants';

// Before
private settings = { enabled: true, strokeColor: '#2196F3', ... };

// After  
private settings = GestureSettingsFactory.createDefaultSettings();
```

**影響度**: High - 6箇所の重複、保守性に直接影響

---

### ⚡ **影響度Medium**（次期対応）

#### 1. **長いメソッドの分割**（クラスサイズは許容範囲）

##### **GesturePattern.ts** (424行) - 一部メソッドが複雑
**注**: クラスサイズ自体は許容範囲。特定の複雑メソッドのみ要改善

**問題のある長いメソッド**:
- `levenshteinDistance()` - 26行（動的プログラミング実装）
- `longestCommonSubsequence()` - 38行（LCS実装）
- `fromPoints()` - 30行（点配列からパターン生成）

**改善方針**: クラス分割ではなく、**複雑メソッドの内部リファクタリング**
```typescript
// 改善例：fromPoints()の内部分割
static fromPoints(points: Point[], threshold: Threshold): GesturePattern {
  if (!this.isValidPointArray(points)) return GesturePattern.empty();
  
  const directions = this.extractDirections(points, threshold);
  return new GesturePattern(directions);
}

private static extractDirections(points: Point[], threshold: Threshold): Direction[] {
  // 30行の処理を論理的に分割
}
```

##### **Settings.ts** (361行) - 除外サイト管理が若干複雑
**注**: クラス全体は許容範囲。除外サイト管理のみ分離検討

**分離検討箇所**:
- 除外サイト管理メソッド群（60行程度）→ 独立クラス化は過剰
- **改善方針**: メソッドの内部リファクタリングで十分

##### **DebugSettings.ts** (359行) - 同期機能が複雑
**注**: デバッグ機能として妥当なサイズ

**改善方針**: 同期関連メソッドの内部整理のみ

#### 2. **命名改善**（略語多用の解消）

**対象箇所**:
- `ctx` → `canvasContext` (Canvas関連)
  - `src/infrastructure/adapters/CanvasRendererAdapter.ts:49`
  - `src/presentation/popup/components/OptionsTrackSettings.svelte:複数箇所`
- `res` → `response` (レスポンス関連)
- `req` → `request` (リクエスト関連)

**改善例**:
```typescript
// Before
const ctx = canvas.getContext('2d');
if (!ctx) return;

// After  
const canvasContext = canvas.getContext('2d');
if (!canvasContext) return;
```

#### 3. **ファイル構造改善**

**大きすぎるディレクトリ**:
- `src/presentation/popup/components/` - 7個のSvelteコンポーネント
  - 機能別サブディレクトリ分割を検討

**改善提案**:
```
src/presentation/popup/components/
├── settings/           // 設定関連
│   ├── BasicSettings.svelte
│   ├── TrackSettings.svelte
│   └── DebugPanel.svelte
├── gestures/          // ジェスチャー関連
│   ├── GestureList.svelte
│   └── CustomGesturePanel.svelte
└── management/        // 管理機能
    └── ExcludeList.svelte
```

---

### 📋 **影響度Low**（将来対応）

#### 1. **インターフェース設計統一**
- オプションパラメータの統一性（`?:` vs `undefined`チェック）
- 型定義の散在（各ファイルで似たような型定義重複）

#### 2. **エラーハンドリング統一**
- try-catchの統一性
- エラーメッセージの一貫性

#### 3. **共通型定義の統一**
```typescript
// 改善提案
src/domain/types/
├── CommonTypes.ts     // 共通型定義
├── ServiceTypes.ts    // サービス層型定義
└── UITypes.ts         // UI層型定義
```

---

## 作業優先順位・スケジュール

### **第1段階**: 影響度High（設定初期化重複）
**推定工数**: 2時間
**対象**: 6ファイルの設定初期化をFactory Pattern統一

### **第2段階**: 影響度Medium（複雑メソッドの内部リファクタリング）
**推定工数**: 2-3時間
**対象**: 長いメソッドの内部分割・可読性向上

### **第3段階**: 影響度Medium（命名・構造改善）
**推定工数**: 3-4時間
**対象**: 略語解消、ディレクトリ構造最適化

### **第4段階**: 影響度Low（統一性向上）
**推定工数**: 4-5時間
**対象**: インターフェース統一、エラーハンドリング統一

---

## 品質保証

### **各段階の完了基準**
- ✅ **テスト**: 269テスト全パス維持
- ✅ **型チェック**: TypeScriptエラー0件維持
- ✅ **ESLint**: 静的解析エラー0件維持
- ✅ **ビルド**: 正常ビルド成功（サイズ増加+5%以下）

### **品質ゲート**
- husky pre-commit: ESLint + 関連テスト自動実行
- husky pre-push: 全テストスイート強制実行

---

## 期待される効果

### **技術的価値**
1. **保守性向上**: Factory Pattern統一による設定変更の一元化
2. **可読性向上**: 複雑メソッドの内部分割による理解容易性
3. **命名改善**: 意味のある命名による理解しやすさ
4. **テスタビリティ**: 論理的に分割されたメソッドによるテスト容易性

### **開発効率向上**
1. **変更容易性**: 影響範囲の局所化
2. **バグ削減**: 責任分離によるバグ発生率低下
3. **コードレビュー効率**: 小さな単位での変更確認

### **長期的価値**
1. **技術負債削減**: 適切な粒度でのコード管理
2. **新機能追加効率**: 既存コードへの影響最小化
3. **保守コスト削減**: 理解しやすいメソッド構造

---

## リスク管理

### **技術リスク**
- **既存機能への影響**: リファクタリング時の機能破綻リスク
- **テスト維持**: 269テストの継続パス保証

### **軽減策**  
- **段階的実装**: 小さな単位での変更・テスト
- **feature/ブランチ**: 安全な実験環境
- **継続的テスト**: 各変更後の即座テスト実行
- **ロールバック準備**: 問題発生時の迅速復旧

---

## 現在の作業状況

**最終更新**: 2025-07-31
**作業ブランチ**: `feature/refactor-options-components`
**完了済み**: Magic Numbers統一リファクタリング
**次のアクション**: 設定初期化重複の解消（Factory Pattern適用）

### **直近のコミット**
```
6080278 refactor: Magic Numbers統一 - 定数管理の一元化
84f4e09 fix: TypeScriptエラー修正とClean Architecture統一
52bf120 refactor: 不要ファイル削除完了 - Clean Architecture統一
```

**準備完了**: 次の段階（設定初期化重複解消）の実装準備完了