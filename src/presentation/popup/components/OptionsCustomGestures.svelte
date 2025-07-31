<!-- OptionsCustomGestures.svelte - カスタムジェスチャー管理コンポーネント -->
<script lang="ts">
import { GesturePattern } from "../../../domain/valueObjects/GesturePattern.js";

// Props定義（Svelte 5）
interface Props {
  customGestures: any[];
  gestureName: string;
  gesturePatternDisplay: string;
  gestureAction: string;
  currentPattern: string[];
  customGestureError: string;
  isLoading: boolean;
  onAddCustomGesture: () => Promise<void>;
  onDeleteCustomGesture: (
    gestureId: string,
    gestureName: string,
  ) => Promise<void>;
  onToggleGesture: (gestureId: string, enabled: boolean) => Promise<void>;
  onAddDirection: (direction: string) => void;
  onClearPattern: () => void;
  onClearCustomGestureError: () => void;
}

let {
  customGestures = $bindable(),
  gestureName = $bindable(),
  gesturePatternDisplay = $bindable(),
  gestureAction = $bindable(),
  currentPattern = $bindable(),
  customGestureError = $bindable(),
  isLoading,
  onAddCustomGesture,
  onDeleteCustomGesture,
  onToggleGesture,
  onAddDirection,
  onClearPattern,
  onClearCustomGestureError,
}: Props = $props();

// Clean Architectureに準拠したパターン表示関数
function formatGesturePattern(pattern: any): string {
  try {
    // すでにGesturePatternインスタンスの場合
    if (pattern && typeof pattern.toString === "function") {
      return pattern.toString();
    }

    // 文字列の場合はGesturePatternに変換して表示
    if (typeof pattern === "string") {
      return GesturePattern.fromString(pattern).toString();
    }

    // 配列の場合はGesturePatternに変換して表示
    if (Array.isArray(pattern)) {
      return GesturePattern.fromArray(pattern).toString();
    }

    // その他の場合は空文字
    return "";
  } catch (error) {
    console.error("Pattern formatting error:", error, pattern);
    return "";
  }
}

// 方向を追加（親のコールバック関数を使用）
function handleAddDirection(direction: string) {
  onAddDirection(direction);
}

// パターンをクリア（親のコールバック関数を使用）
function handleClearPattern() {
  onClearPattern();
}

// エラーをクリア（親のコールバック関数を使用）
function handleClearCustomGestureError() {
  onClearCustomGestureError();
}
</script>

<!-- カスタムジェスチャー -->
<div class="section">
  <h2>カスタムジェスチャー</h2>
  <div class="setting-item">
    <div style="width: 100%">
      <div class="setting-label">独自のジェスチャーを作成・管理</div>
      <div class="setting-description">
        デフォルトジェスチャーをカスタマイズしたり、新しいパターンを追加できます
      </div>

      <!-- カスタムジェスチャー一覧 -->
      <div class="custom-gesture-list">
        <div
          class="all-gestures-container"
          style="border: 1px solid #e8eaed; border-radius: 8px; background: white; max-height: 300px; overflow-y: auto"
        >
          {#each customGestures as gesture (gesture.id)}
            <div class="all-gesture-item" class:disabled={!gesture.enabled}>
              <div class="gesture-visual">
                <div class="gesture-pattern-large">
                  {formatGesturePattern(gesture.pattern)}
                </div>
              </div>
              <div class="gesture-details">
                <div class="gesture-title">{gesture.name}</div>
                <div class="gesture-description">{gesture.description}</div>
              </div>
              <div class="gesture-actions">
                <button
                  class="gesture-status-toggle"
                  class:enabled={gesture.enabled}
                  aria-label={gesture.enabled
                  ? "カスタムジェスチャーを無効にする"
                  : "カスタムジェスチャーを有効にする"}
                  onclick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 現在のカスタムジェスチャー状態を最新のリストから取得
                    const currentCustomGesture = customGestures
                      .find(g => g.id === gesture.id);
                    const currentEnabled =
                      currentCustomGesture?.enabled ?? false;
                    const newEnabled = !currentEnabled;

                    console.log(
                      "🔘 Custom gesture toggle:",
                      gesture.id,
                      "current enabled:",
                      currentEnabled,
                      "new enabled:",
                      newEnabled,
                    );
                    // gestureIdが文字列であることを確認
                    const gestureId = String(gesture.id);
                    await onToggleGesture(gestureId, newEnabled);
                  }}
                >
                </button>
                <button
                  class="gesture-delete-btn"
                  aria-label="カスタムジェスチャーを削除"
                  onclick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // gestureIdが文字列であることを確認
                    const gestureId = String(gesture.id);
                    await onDeleteCustomGesture(
                      gestureId,
                      gesture.name,
                    );
                  }}
                >
                  削除
                </button>
              </div>
            </div>
          {/each}
          {#if customGestures.length === 0}
            <div class="empty-state">
              <p>カスタムジェスチャーが登録されていません</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- 新規ジェスチャー追加フォーム -->
      <div class="add-gesture-form" style="margin-top: 16px">
        <h3 style="font-size: 14px; margin: 0 0 12px 0; color: #202124">
          新しいジェスチャーを追加
        </h3>
        <div class="form-group">
          <label for="gestureName">ジェスチャー名:</label>
          <input
            type="text"
            bind:value={gestureName}
            class="form-input"
            placeholder="例: カスタム戻る"
            oninput={handleClearCustomGestureError}
          >
        </div>
        <div class="form-group">
          <label for="gesturePattern">パターン:</label>
          <div class="pattern-input-container">
            <input
              type="text"
              bind:value={gesturePatternDisplay}
              class="form-input"
              placeholder="下のボタンでパターンを入力"
              readonly
            >
            <button class="clear-btn" onclick={handleClearPattern}>
              クリア
            </button>
          </div>
          <div class="pattern-buttons">
            <button
              class="direction-btn"
              onclick={() => handleAddDirection("↑")}
            >
              ↑
            </button>
            <button
              class="direction-btn"
              onclick={() => handleAddDirection("↓")}
            >
              ↓
            </button>
            <button
              class="direction-btn"
              onclick={() => handleAddDirection("←")}
            >
              ←
            </button>
            <button
              class="direction-btn"
              onclick={() => handleAddDirection("→")}
            >
              →
            </button>
          </div>
        </div>
        <div class="form-group">
          <label for="gestureAction">アクション:</label>
          <select bind:value={gestureAction} class="form-select">
            <option value="back">戻る</option>
            <option value="forward">進む</option>
            <option value="scroll_up">上スクロール</option>
            <option value="scroll_down">下スクロール</option>
            <option value="close_tab">タブを閉じる</option>
            <option value="new_tab">新しいタブ</option>
            <option value="refresh">更新</option>
            <option value="duplicate_tab">タブを複製</option>
            <option value="super_refresh">スーパーリロード (NEW)</option>
            <option value="prev_tab">前のタブ (NEW)</option>
            <option value="next_tab">次のタブ (NEW)</option>
          </select>
        </div>

        <!-- カスタムジェスチャー追加エラー表示 -->
        {#if customGestureError}
          <div class="custom-gesture-error">
            {customGestureError}
          </div>
        {/if}

        <button class="add-btn" onclick={onAddCustomGesture}>
          カスタムジェスチャーを追加
        </button>
      </div>
    </div>
  </div>
</div>

<style>
/* セクション共通スタイル */
.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3);
}

.section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #202124;
  margin: 0 0 16px 0;
  border-bottom: 2px solid #1a73e8;
  padding-bottom: 8px;
}

.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 0;
}

.setting-label {
  font-weight: 500;
  color: #202124;
  margin-bottom: 4px;
}

.setting-description {
  font-size: 13px;
  color: #5f6368;
  line-height: 1.4;
  margin-bottom: 16px;
}

/* カスタムジェスチャー用スタイル */
.custom-gesture-list {
  margin-bottom: 16px;
}

.all-gestures-container {
  max-height: 400px;
  overflow-y: auto;
}

.all-gesture-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f1f3f4;
  transition: background-color 0.2s;
}

.all-gesture-item:hover {
  background-color: #f8f9fa;
}

.all-gesture-item:last-child {
  border-bottom: none;
}

.all-gesture-item.disabled {
  opacity: 0.6;
  background-color: #fafbfc;
}

.gesture-visual {
  width: 80px;
  text-align: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.gesture-pattern-large {
  font-size: 20px;
  line-height: 1.2;
  margin-bottom: 4px;
  word-break: break-all;
  overflow-wrap: break-word;
  max-width: 100%;
}

.gesture-details {
  flex: 1;
  min-width: 0;
}

.gesture-title {
  font-weight: 600;
  color: #202124;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.gesture-description {
  color: #5f6368;
  font-size: 13px;
  line-height: 1.3;
}

.gesture-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.gesture-status-toggle {
  width: 40px;
  height: 20px;
  background: #dadce0;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.3s;
}

.gesture-status-toggle.enabled {
  background: #34a853;
}

.gesture-status-toggle::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.gesture-status-toggle.enabled::after {
  transform: translateX(20px);
}

.gesture-delete-btn {
  padding: 6px 12px;
  background: #ea4335;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  min-width: 50px;
}

.gesture-delete-btn:hover {
  background: #d33b2c;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #5f6368;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* フォームスタイル */
.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #202124;
  margin-bottom: 4px;
}

.form-input, .form-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 14px;
}

.pattern-input-container {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.pattern-input-container .form-input {
  flex: 1;
}

.clear-btn {
  background: #5f6368;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
}

.clear-btn:hover {
  background: #4a4a4a;
}

.pattern-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.direction-btn {
  background: #f8f9fa;
  border: 1px solid #dadce0;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  min-width: 40px;
}

.direction-btn:hover {
  background: #e8f0fe;
  border-color: #1a73e8;
}

.direction-btn:active {
  background: #1a73e8;
  color: white;
}

.add-btn {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  width: 100%;
}

.add-btn:hover {
  background: #1557b0;
}

/* カスタムジェスチャーエラー表示 */
.custom-gesture-error {
  background: #fce8e6;
  color: #d33b2c;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 8px 0;
  font-size: 13px;
  border-left: 3px solid #ea4335;
}
</style>
