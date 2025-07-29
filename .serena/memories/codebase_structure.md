# コードベース構造

## Clean Architecture 4層構成
```
src/
├── domain/                    # ドメイン層（ビジネスロジック）
│   ├── entities/             # エンティティ（Settings, Gesture, CustomGesture）
│   ├── valueObjects/         # 値オブジェクト（Point, GesturePattern, Threshold）
│   └── services/             # ドメインサービス（PatternMatcher, GestureRecognizer）
├── application/              # アプリケーション層（ユースケース）
│   ├── usecases/            # ユースケース（SettingsManagement, CustomGestureManagement）  
│   ├── interfaces/          # インターフェース定義
│   └── services/            # アプリケーションサービス
├── infrastructure/          # インフラストラクチャ層（外部I/F）
│   ├── adapters/           # アダプター（ChromeStorage, CanvasRenderer）
│   ├── repositories/       # リポジトリ実装
│   └── messaging/          # Chrome拡張API統合
└── presentation/           # プレゼンテーション層（UI）
    ├── background/         # バックグラウンドスクリプト
    ├── contentScripts/     # コンテンツスクリプト
    ├── popup/             # オプション画面（Svelte）
    └── controllers/       # コントローラー
```

## ビルド出力構造
```
dist/
├── manifest.json           # 拡張機能メタデータ（Manifest V3）
├── background/
│   └── background.js      # バックグラウンドサービスワーカー
├── content_scripts/
│   └── gesture.js         # ジェスチャー認識・実行
├── popup/
│   ├── options.html       # 設定画面UI
│   └── options.js         # 設定画面ロジック
└── assets/                # アイコン等静的ファイル
```

## テスト構造
```
tests/
├── unit/                  # 単体テスト
├── integration/           # 統合テスト
├── ui/                    # UIテスト
├── e2e/                   # E2Eテスト
├── performance/           # パフォーマンステスト
└── __mocks__/            # モックファイル
```

## 設定ファイル
- `package.json`: 依存関係・スクリプト定義
- `tsconfig.json`: TypeScript設定（厳格モード）
- `eslint.config.js`: ESLint v9フラット設定
- `manifest.json`: Chrome拡張機能設定
- `scripts/build.js`: esbuildベースビルドスクリプト