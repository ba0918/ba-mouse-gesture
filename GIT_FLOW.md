# Git-Flow開発フロー

## 📋 ブランチ戦略

このプロジェクトではGit-Flowベースの開発フローを採用しています。

### 🌟 メインブランチ

| ブランチ | 用途 | 説明 |
|----------|------|------|
| `main` | 本番リリース | 安定版のみ。リリースタグが付与される |
| `develop` | 開発統合 | 開発中の機能が統合される。次回リリースの準備 |

### 🔧 サポートブランチ

| ブランチ | 命名規則 | 作成元 | マージ先 |
|----------|----------|--------|----------|
| **Feature** | `feature/<機能名>` | `develop` | `develop` |
| **Release** | `release/<バージョン>` | `develop` | `main` & `develop` |
| **Hotfix** | `hotfix/<修正内容>` | `main` | `main` & `develop` |

## 🚀 開発フロー

### 1. 新機能開発（Feature）

```bash
# 1. developから機能ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/新機能名

# 2. 開発・テスト・コミット
# ... 開発作業 ...
git add .
git commit -m "feat: 新機能の実装"

# 3. developにマージ（プルリクエスト推奨）
git checkout develop
git pull origin develop
git merge feature/新機能名
git push origin develop

# 4. 機能ブランチを削除
git branch -d feature/新機能名
```

### 2. リリース準備（Release）

```bash
# 1. developからリリースブランチを作成
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0

# 2. バージョン更新・最終調整
# package.json, manifest.jsonのバージョン更新
# 最終テスト実行

# 3. mainにマージしてタグ付け
git checkout main
git merge release/v1.1.0
git tag -a v1.1.0 -m "Release version 1.1.0"
git push origin main --tags

# 4. developにもマージ
git checkout develop
git merge release/v1.1.0
git push origin develop

# 5. リリースブランチを削除
git branch -d release/v1.1.0
```

### 3. 緊急修正（Hotfix）

```bash
# 1. mainからホットフィックスブランチを作成
git checkout main
git pull origin main
git checkout -b hotfix/緊急修正内容

# 2. 修正・テスト
# ... 修正作業 ...
git commit -m "fix: 緊急バグ修正"

# 3. mainとdevelopの両方にマージ
git checkout main
git merge hotfix/緊急修正内容
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin main --tags

git checkout develop
git merge hotfix/緊急修正内容
git push origin develop

# 4. ホットフィックスブランチを削除
git branch -d hotfix/緊急修正内容
```

## 📝 コミットメッセージ規約

Conventional Commitsに従ってください：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードスタイル（機能に影響しない）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `chore`: その他（ビルド、依存関係など）

### 例

```bash
feat(gesture): 新しいジェスチャーパターンを追加
fix(options): 設定画面の保存エラーを修正
docs(readme): インストール手順を更新
test(integration): 統合テストのカバレッジを向上
```

## 🔄 プルリクエストフロー

1. **機能ブランチ作成**
   ```bash
   git checkout -b feature/機能名
   ```

2. **開発・コミット**
   ```bash
   git add .
   git commit -m "feat: 機能の実装"
   git push origin feature/機能名
   ```

3. **プルリクエスト作成**
   - GitHub上でPRを作成
   - レビュー依頼
   - CI/CDチェック通過確認

4. **マージ後クリーンアップ**
   ```bash
   git checkout develop
   git pull origin develop
   git branch -d feature/機能名
   ```

## 🛡️ 保護ルール

### mainブランチ
- 直接プッシュ禁止
- プルリクエスト必須
- レビュー必須
- CI/CDチェック通過必須

### developブランチ
- 直接プッシュ可能（小さな修正）
- 大きな機能はプルリクエスト推奨

## 📊 現在の状態

- **main**: v1.0.0 - 初期リリース完了
- **develop**: 次期機能開発中

## 🎯 次回リリース予定

現在TODO.mdのPhase 3項目を develop ブランチで開発中：
- カスタムジェスチャー機能
- 追加設定オプション
- パフォーマンス最適化