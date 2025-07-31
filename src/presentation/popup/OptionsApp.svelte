<script lang="ts">
import { onMount } from "svelte";
import { DebugSettingsEntity } from "../../domain/entities/DebugSettingsEntity";
import type { GestureAction } from "../../domain/valueObjects/GestureAction";
import { GesturePattern } from "../../domain/valueObjects/GesturePattern";
import {
  DebugLogger,
  type LogLevel,
} from "../../infrastructure/adapters/DebugLogger";

// UI用の型定義
interface UIGesture {
  id: string;
  name: string;
  pattern: string;
  action: GestureAction;
  description: string;
  enabled: boolean;
  type?: "default" | "custom";
}

interface UICustomGesture extends UIGesture {
  type: "custom";
}

// コンポーネントのインポート
import OptionsBasicSettings from "./components/OptionsBasicSettings.svelte";
import OptionsCustomGestures from "./components/OptionsCustomGestures.svelte";
import OptionsDebugSettings from "./components/OptionsDebugSettings.svelte";
import OptionsExcludeList from "./components/OptionsExcludeList.svelte";
import OptionsGestureList from "./components/OptionsGestureList.svelte";
import OptionsTrackSettings from "./components/OptionsTrackSettings.svelte";

// 状態管理
let isLoading = $state(true);
let saveStatus = $state("");
let saveStatusType = $state<"success" | "error">("success");
let saveStatusVisible = $state(false);

// 基本設定
let enabled = $state(true);

// 軌跡設定
let strokeColor = $state("#2196F3");
let strokeWidth = $state(3);
let gestureThreshold = $state(15);

// 除外サイト
let excludeList = $state<string[]>([]);
let newExcludeUrl = $state("");

// デバッグ設定
let debugEnabled = $state(false);
let debugLogLevel = $state("2"); // 文字列型に変更
let debugShowStatus = $state(false);
let debugStatusPosition = $state("top-right");

// ジェスチャー関連
let gestures = $state<UIGesture[]>([]);
let customGestures = $state<UICustomGesture[]>([]);
let gestureSearch = $state("");
let gestureFilter = $state("all");

// カスタムジェスチャー追加フォーム
let gestureName = $state("");
let gesturePatternDisplay = $state("");
let gestureAction = $state("back");
let currentPattern = $state<string[]>([]);
let customGestureError = $state("");

// 確認ダイアログ
let confirmDialog = $state(false);
let confirmMessage = $state("");
let confirmCallback = $state<(() => void) | null>(null);

// デバッグロガー
let logger: DebugLogger | null = null;

onMount(async () => {
  await initializeSettings();
});

async function initializeSettings() {
  try {
    // servicesが初期化されるまで待機（最大10秒）
    let attempts = 0;
    const maxAttempts = 100; // 10秒

    while (attempts < maxAttempts) {
      const services = (window as any).services;
      if (services) {
        const settingsManagementUseCase = services.settingsManagementUseCase;
        const settings = await settingsManagementUseCase.getCurrentSettings();

        // 設定値を読み込み
        enabled = settings.enabled !== false;
        strokeColor = settings.strokeColor || "#2196F3";
        strokeWidth = settings.strokeWidth || 3;
        gestureThreshold = settings.gestureThreshold || 15;
        excludeList = settings.excludeList || [];

        // Clean Architecture準拠のデバッグ設定読み込み
        const debugEntity = DebugSettingsEntity.fromPlainObject(
          settings.debugSettings || {},
        );
        debugEnabled = debugEntity.enabled;
        debugLogLevel = debugEntity.logLevel.toString();
        debugShowStatus = debugEntity.showStatus;
        debugStatusPosition = debugEntity.statusPosition;

        logger?.debug(
          "🔍 Debug settings loaded via entity:",
          debugEntity.toString(),
        );

        // DebugLoggerを初期化（debugEntityから直接設定）
        const initialDebugSettings = {
          logLevel: debugEntity.logLevel as LogLevel,
          shouldLog: (level: LogLevel) =>
            debugEntity.enabled && level <= debugEntity.logLevel,
        };
        logger = new DebugLogger(initialDebugSettings);

        logger?.info("🔄 Settings initialization started");
        logger?.info("✅ Services found, loading settings...");
        logger?.info("Raw settings loaded from storage:", settings);
        logger?.debug("Debug settings properties in raw data:", {
          hasDebugEnabled: "debugEnabled" in settings,
          hasDebugLogLevel: "debugLogLevel" in settings,
          hasDebugShowStatus: "debugShowStatus" in settings,
          hasDebugStatusPosition: "debugStatusPosition" in settings,
          allKeys: Object.keys(settings),
        });

        logger?.info("Applied track settings:", {
          strokeColor,
          strokeWidth,
          gestureThreshold,
        });
        logger?.info("Applied debug settings:", {
          debugEnabled,
          debugLogLevel,
          debugShowStatus,
          debugStatusPosition,
          rawDebugEnabled: settings.debugEnabled,
          rawDebugLogLevel: settings.debugLogLevel,
          rawDebugShowStatus: settings.debugShowStatus,
          rawDebugStatusPosition: settings.debugStatusPosition,
          debugSettingsObject: debugEntity.toPlainObject(),
          hasDebugSettings: "debugSettings" in settings,
        });

        // ジェスチャー一覧を読み込み
        await loadGestures();
        await loadCustomGestures();

        logger?.info("✅ Settings loaded successfully");
        isLoading = false;
        return;
      }

      // 100ms待機して再試行
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      // 初期化段階のログは必要最小限にする
    }

    // タイムアウト
    throw new Error("Services initialization timeout");
  } catch (error) {
    logger?.error("❌ Settings initialization failed:", error);
    showSaveStatus("設定の読み込みに失敗しました", "error");
    isLoading = false;
  }
}

async function loadGestures() {
  try {
    const services = (window as any).services;
    if (!services) {
      logger?.warn("Services not available for loadGestures");
      return;
    }

    const gestureListUseCase = services.gestureListUseCase;
    const loadedGestures = await gestureListUseCase.getAllGestures();

    // Svelte 5の$stateで配列の変更を確実に検出させるため、新しい配列を作成
    gestures = [...(loadedGestures || [])];
    logger?.info("✅ Gestures loaded:", gestures.length);
  } catch (error) {
    logger?.error("❌ ジェスチャー読み込みエラー:", error);
    gestures = [];
  }
}

async function loadCustomGestures() {
  try {
    const services = (window as any).services;
    if (!services) {
      logger?.warn("Services not available for loadCustomGestures");
      return;
    }

    // CustomGestureManagementUseCaseから統一されたデータを取得
    const gestureListUseCase = services.gestureListUseCase;
    const allGestures = await gestureListUseCase.getAllGestures();

    // カスタムジェスチャーのみをフィルタリング
    const customGestureData = allGestures.filter((g: UIGesture) =>
      g.type === "custom"
    ).map((g: UIGesture) => ({
      id: g.id,
      name: g.name,
      pattern: g.pattern, // 既に矢印形式に変換済み
      action: g.action,
      description: g.description, // 既に日本語表記に変換済み
      enabled: g.enabled,
    }));

    // Svelte 5の$stateで配列の変更を確実に検出させるため、新しい配列を作成
    customGestures = [...customGestureData];
    logger?.info("✅ Custom gestures loaded:", customGestures.length);
    logger?.debug(
      "📊 Custom gesture data structure:",
      customGestures.slice(0, 2),
    );
    logger?.debug(
      "🔍 Custom gesture full data:",
      customGestures.map(g => ({
        id: g.id,
        name: g.name,
        action: g.action,
        description: g.description,
        pattern: g.pattern,
        enabled: g.enabled,
      })),
    );
  } catch (error) {
    logger?.error("❌ カスタムジェスチャー読み込みエラー:", error);
    customGestures = [];
  }
}

function showSaveStatus(
  message: string,
  type: "success" | "error" = "success",
) {
  saveStatus = message;
  saveStatusType = type;
  saveStatusVisible = true;
  setTimeout(() => {
    saveStatusVisible = false;
  }, 3000);
}

async function handleEnabledChange() {
  try {
    const services = (window as any).services;
    const settingsManagementUseCase = services.settingsManagementUseCase;
    await settingsManagementUseCase.toggleExtension(enabled);
    showSaveStatus(
      `マウスジェスチャーを${enabled ? "有効" : "無効"}にしました`,
    );
  } catch (error) {
    logger?.error("設定保存エラー:", error);
    showSaveStatus("設定の保存に失敗しました", "error");
  }
}

async function handleTrackSettingsChange() {
  try {
    logger?.debug("🔄 Track settings change triggered:", {
      strokeColor,
      strokeWidth,
      gestureThreshold,
    });

    const services = (window as any).services;
    if (!services) {
      logger?.warn("Services not available for track settings");
      return;
    }

    const settingsManagementUseCase = services.settingsManagementUseCase;

    logger?.debug("💾 Saving track settings individually...");

    // 既存のメソッドを使用して個別に保存
    await settingsManagementUseCase.updateStrokeSettings(
      strokeColor,
      strokeWidth,
    );
    logger?.debug("✅ Stroke settings saved:", { strokeColor, strokeWidth });

    await settingsManagementUseCase.updateGestureThreshold(gestureThreshold);
    logger?.debug("✅ Gesture threshold saved:", gestureThreshold);

    logger?.info("✅ All track settings saved successfully");
    showSaveStatus("軌跡設定を保存しました");
  } catch (error) {
    logger?.error("❌ 軌跡設定保存エラー:", error);
    showSaveStatus("軌跡設定の保存に失敗しました", "error");
  }
}

async function addExcludeUrl() {
  if (!newExcludeUrl.trim()) return;

  try {
    const services = (window as any).services;
    const settingsManagementUseCase = services.settingsManagementUseCase;
    await settingsManagementUseCase.addExcludeSite(newExcludeUrl.trim());
    excludeList = [...excludeList, newExcludeUrl.trim()];
    newExcludeUrl = "";
    showSaveStatus("除外サイトを追加しました");
  } catch (error) {
    logger?.error("除外サイト追加エラー:", error);
    showSaveStatus("除外サイトの追加に失敗しました", "error");
  }
}

async function removeExcludeUrl(url: string) {
  try {
    const services = (window as any).services;
    const settingsManagementUseCase = services.settingsManagementUseCase;
    await settingsManagementUseCase.removeExcludeSite(url);
    excludeList = excludeList.filter(item => item !== url);
    showSaveStatus("除外サイトを削除しました");
  } catch (error) {
    logger?.error("除外サイト削除エラー:", error);
    showSaveStatus("除外サイトの削除に失敗しました", "error");
  }
}

async function handleDebugSettingsChange() {
  try {
    const debugConfig = {
      enabled: debugEnabled,
      logLevel: parseInt(debugLogLevel, 10), // 文字列を数値に変換
      showStatus: debugShowStatus,
      statusPosition: debugStatusPosition,
    };
    logger?.debug("Saving debug settings:", debugConfig);

    const services = (window as any).services;
    const settingsManagementUseCase = services.settingsManagementUseCase;
    await settingsManagementUseCase.updateDebugSettings(debugConfig);

    // DebugLoggerの設定も更新
    const logLevel = typeof debugLogLevel === "string"
      ? parseInt(debugLogLevel)
      : debugLogLevel;
    const updatedDebugSettings = {
      logLevel: logLevel as LogLevel,
      shouldLog: (level: LogLevel) => debugEnabled && level <= logLevel,
    };
    logger?.updateDebugSettings(updatedDebugSettings);

    logger?.info("Debug settings saved successfully");
    showSaveStatus("デバッグ設定を保存しました");
  } catch (error) {
    logger?.error("Debug settings save error:", error);
    showSaveStatus("デバッグ設定の保存に失敗しました", "error");
  }
}

// カスタムジェスチャー用ハンドラー関数
function handleAddDirection(direction: string) {
  currentPattern.push(direction);
  // 既に矢印記法統一済みなので直接結合
  gesturePatternDisplay = currentPattern.join("");
  // エラーをクリア
  clearCustomGestureError();
}

function handleClearPattern() {
  currentPattern = [];
  gesturePatternDisplay = "";
}

function handleClearCustomGestureError() {
  customGestureError = "";
}

function clearCustomGestureError() {
  customGestureError = "";
}

async function addCustomGesture() {
  // 前回のエラーをクリア
  clearCustomGestureError();

  if (!gestureName.trim() || !gesturePatternDisplay) {
    customGestureError = "ジェスチャー名とパターンを入力してください";
    return;
  }

  try {
    logger?.debug("Adding custom gesture:", {
      name: gestureName,
      displayPattern: gesturePatternDisplay,
      currentPattern: currentPattern,
      action: gestureAction,
    });

    const services = (window as any).services;
    if (!services) {
      throw new Error("Services not available");
    }

    const customGestureUseCase = services.customGestureManagementUseCase;

    // 統一された矢印表記を直接使用
    const gesturePattern = GesturePattern.fromString(gesturePatternDisplay);
    const patternArray = gesturePattern.toArray();
    logger?.debug("Pattern creation:", {
      original: gesturePatternDisplay,
      currentPattern: currentPattern,
      directionArray: patternArray,
    });

    const gestureData = {
      name: gestureName.trim(),
      pattern: patternArray,
      action: gestureAction,
    };
    logger?.debug("Sending gesture data:", gestureData);

    await customGestureUseCase.addCustomGesture(gestureData);

    // フォームをリセット
    gestureName = "";
    gesturePatternDisplay = "";
    currentPattern = [];
    gestureAction = "back";
    clearCustomGestureError();

    // リスト更新（統一されたデータを取得）
    await Promise.all([
      loadCustomGestures(),
      loadGestures(),
    ]);

    logger?.info("Custom gesture added successfully");
    showSaveStatus("カスタムジェスチャーを追加しました");
  } catch (error) {
    logger?.error("Custom gesture add error:", error);

    // エラーの詳細情報を表示
    let errorMessage = "カスタムジェスチャーの追加に失敗しました";
    if (error instanceof Error) {
      logger?.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        originalError: (error as any).originalError,
      });

      // ユーザーフレンドリーなエラーメッセージ
      if (error.message.includes("already exists")) {
        errorMessage = "同じ名前のジェスチャーが既に存在します";
      } else if (error.message.includes("similar")) {
        errorMessage = "似たパターンのジェスチャーが既に存在します";
      } else if (error.message.includes("Invalid")) {
        errorMessage = "ジェスチャーパターンが無効です";
      }
    }

    customGestureError = errorMessage;
  }
}

// トグル処理中の重複防止（Promise管理）
let togglePromises = new Map<string, Promise<void>>();

async function toggleGesture(gestureId: string, enabled: boolean) {
  // 既に処理中の場合は既存のPromiseを返す
  if (togglePromises.has(gestureId)) {
    logger?.debug(
      "🚫 Already toggling gesture, returning existing promise:",
      gestureId,
    );
    return togglePromises.get(gestureId);
  }

  logger?.debug("🔄 Starting toggle gesture:", gestureId, "enabled:", enabled);

  // 新しいPromiseを作成してマップに保存
  const togglePromise = performToggle(gestureId, enabled);
  togglePromises.set(gestureId, togglePromise);

  try {
    await togglePromise;
  } finally {
    // 処理完了後にPromiseを削除
    togglePromises.delete(gestureId);
    logger?.debug("🧹 Toggle promise completed for:", gestureId);
  }
}

async function performToggle(gestureId: string, enabled: boolean) {
  try {
    const services = (window as any).services;
    if (!services) {
      logger?.warn("Services not available");
      showSaveStatus("設定の更新に失敗しました", "error");
      return;
    }

    // 標準ジェスチャーかカスタムジェスチャーかを判定
    // カスタムジェスチャーは必ず custom_ で始まるIDを持つ
    const isCustomGesture = gestureId.startsWith("custom_");

    logger?.debug("✅ Toggle gesture:", gestureId, "enabled:", enabled);

    if (isCustomGesture) {
      const customGestureUseCase = services.customGestureManagementUseCase;
      await customGestureUseCase.toggleCustomGesture(gestureId, enabled);
      logger?.debug("✅ Custom gesture saved");
    } else {
      const settingsManagementUseCase = services.settingsManagementUseCase;
      await settingsManagementUseCase.toggleGesture(gestureId, enabled);
      logger?.debug("✅ Default gesture saved");
    }

    // 両方のリストを同期更新
    await Promise.all([
      loadCustomGestures(),
      loadGestures(),
    ]);

    showSaveStatus(
      `ジェスチャー「${gestureId}」を${enabled ? "有効" : "無効"}にしました`,
    );
  } catch (error) {
    logger?.error("❌ Toggle gesture error:", error);
    showSaveStatus("ジェスチャーの設定変更に失敗しました", "error");
  }
}

function handleConfirmOk() {
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
  confirmDialog = false;
}

function handleConfirmCancel() {
  confirmCallback = null;
  confirmDialog = false;
}

async function deleteCustomGesture(gestureId: string, gestureName: string) {
  // 確認ダイアログを表示
  confirmMessage =
    `カスタムジェスチャー「${gestureName}」を削除しますか？\n\nこの操作は取り消せません。`;
  confirmCallback = async () => {
    try {
      logger?.debug("Deleting custom gesture:", gestureId, gestureName);

      const services = (window as any).services;
      if (!services) {
        throw new Error("Services not available");
      }

      const customGestureUseCase = services.customGestureManagementUseCase;
      await customGestureUseCase.deleteCustomGesture(gestureId);

      // リスト更新
      await Promise.all([
        loadCustomGestures(),
        loadGestures(),
      ]);

      logger?.info("Custom gesture deleted successfully");
      showSaveStatus(`カスタムジェスチャー「${gestureName}」を削除しました`);
    } catch (error) {
      logger?.error("Custom gesture delete error:", error);

      let errorMessage = "カスタムジェスチャーの削除に失敗しました";
      if (error instanceof Error) {
        logger?.error("Delete error details:", {
          name: error.name,
          message: error.message,
          originalError: (error as any).originalError,
        });

        if (error.message.includes("not found")) {
          errorMessage = "カスタムジェスチャーが見つかりませんでした";
        }
      }

      showSaveStatus(errorMessage, "error");
    }
  };

  confirmDialog = true;
}
</script>

<div class="container">
  <h1>🖱️ マウスジェスチャーツール - 設定</h1>

  <!-- ローディング状態 -->
  {#if isLoading}
    <div class="loading">設定を読み込み中</div>
  {:else}
    <!-- メインコンテンツ -->
    <div id="mainContent">
      <!-- 基本設定 -->
      <OptionsBasicSettings
        bind:enabled={enabled}
        isLoading={isLoading}
        onEnabledChange={handleEnabledChange}
      />

      <!-- 軌跡カスタマイズ -->
      <OptionsTrackSettings
        bind:strokeColor={strokeColor}
        bind:strokeWidth={strokeWidth}
        bind:gestureThreshold={gestureThreshold}
        isLoading={isLoading}
        onTrackSettingsChange={handleTrackSettingsChange}
      />

      <!-- ジェスチャー一覧 -->
      <OptionsGestureList
        bind:gestures={gestures}
        bind:gestureSearch={gestureSearch}
        bind:gestureFilter={gestureFilter}
        isLoading={isLoading}
        onToggleGesture={toggleGesture}
      />

      <!-- カスタムジェスチャー -->
      <OptionsCustomGestures
        bind:customGestures={customGestures}
        bind:gestureName={gestureName}
        bind:gesturePatternDisplay={gesturePatternDisplay}
        bind:gestureAction={gestureAction}
        bind:currentPattern={currentPattern}
        bind:customGestureError={customGestureError}
        isLoading={isLoading}
        onAddCustomGesture={addCustomGesture}
        onDeleteCustomGesture={deleteCustomGesture}
        onToggleGesture={toggleGesture}
        onAddDirection={handleAddDirection}
        onClearPattern={handleClearPattern}
        onClearCustomGestureError={handleClearCustomGestureError}
      />

      <!-- 除外サイト -->
      <OptionsExcludeList
        bind:excludeList={excludeList}
        bind:newExcludeUrl={newExcludeUrl}
        isLoading={isLoading}
        onAddExcludeUrl={addExcludeUrl}
        onRemoveExcludeUrl={removeExcludeUrl}
      />

      <!-- デバッグ設定 -->
      <OptionsDebugSettings
        bind:debugEnabled={debugEnabled}
        bind:debugLogLevel={debugLogLevel}
        bind:debugShowStatus={debugShowStatus}
        bind:debugStatusPosition={debugStatusPosition}
        isLoading={isLoading}
        onDebugSettingsChange={handleDebugSettingsChange}
      />

      <!-- 保存ステータス -->
      {#if saveStatusVisible}
        <div class="save-status {saveStatusType}">
          {saveStatus}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- カスタム確認ダイアログ -->
{#if confirmDialog}
  <div class="confirm-dialog">
    <div class="confirm-overlay"></div>
    <div class="confirm-content">
      <h3 class="confirm-title">確認</h3>
      <p class="confirm-message">{confirmMessage}</p>
      <div class="confirm-buttons">
        <button
          class="confirm-btn confirm-btn-cancel"
          onclick={handleConfirmCancel}
        >
          キャンセル
        </button>
        <button class="confirm-btn confirm-btn-ok" onclick={handleConfirmOk}>
          OK
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
:global(body) {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
}

.container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 24px;
  margin: 0 0 24px 0;
  color: #1a73e8;
  text-align: center;
  border-bottom: 2px solid #e8f0fe;
  padding-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 8px 0;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  font-weight: 500;
  color: #202124;
  flex: 1;
}

.setting-description {
  font-size: 12px;
  color: #5f6368;
  margin-top: 4px;
}

.color-input, .range-input {
  padding: 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  width: 80px;
}

.range-input {
  width: 120px;
}

.range-value {
  margin-left: 8px;
  font-weight: 500;
  color: #1a73e8;
  min-width: 30px;
}

.exclude-list {
  margin-top: 12px;
}

.exclude-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  margin-bottom: 8px;
}

.exclude-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: white;
  border: 1px solid #e8eaed;
  border-radius: 4px;
  margin-bottom: 4px;
}

.exclude-item:last-child {
  margin-bottom: 0;
}

.exclude-url {
  flex: 1;
  font-family: monospace;
  color: #5f6368;
}

.remove-btn {
  background: #ea4335;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn:hover {
  background: #d33b2c;
}

.add-btn {
  background: #34a853;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  width: 100%;
}

.add-btn:hover {
  background: #2d8f3f;
}

.save-status {
  text-align: center;
  padding: 12px;
  border-radius: 4px;
  margin-top: 16px;
  font-weight: 500;
}

.save-status.success {
  background: #e6f4ea;
  color: #137333;
}

.save-status.error {
  background: #fce8e6;
  color: #d33b2c;
}

.preview-canvas {
  border: 1px solid #dadce0;
  border-radius: 4px;
  margin-top: 8px;
  background: white;
}

/* カスタムジェスチャー用スタイル */
.gesture-list-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e8eaed;
  border-radius: 4px;
  background: white;
}

.gesture-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #f1f3f4;
}

.gesture-item:last-child {
  border-bottom: none;
}

.gesture-item.disabled {
  opacity: 0.6;
  background-color: #f8f9fa;
}

.gesture-info {
  flex: 1;
}

.gesture-name {
  font-weight: 500;
  color: #202124;
  margin-bottom: 4px;
}

.gesture-pattern {
  font-family: monospace;
  font-size: 14px;
  color: #5f6368;
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
  margin-right: 8px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.gesture-action {
  font-size: 12px;
  color: #1a73e8;
}

.gesture-controls {
  display: flex;
  gap: 8px;
}

.gesture-toggle {
  background: none;
  border: 1px solid #dadce0;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.gesture-toggle.enabled {
  background: #e8f5e8;
  border-color: #34a853;
  color: #137333;
}

.gesture-toggle.disabled {
  background: #fce8e6;
  border-color: #ea4335;
  color: #d33b2c;
}

/* カスタム確認ダイアログ */
.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.confirm-content {
  position: relative;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  animation: confirmAppear 0.2s ease-out;
}

@keyframes confirmAppear {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.confirm-title {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #202124;
}

.confirm-message {
  margin: 0 0 24px 0;
  color: #5f6368;
  line-height: 1.5;
}

.confirm-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn-cancel {
  background: #f8f9fa;
  color: #5f6368;
  border: 1px solid #dadce0;
}

.confirm-btn-cancel:hover {
  background: #e8eaed;
}

.confirm-btn-ok {
  background: #ea4335;
  color: white;
}

.confirm-btn-ok:hover {
  background: #d33b2c;
}

/* ローディング状態 */
.loading {
  text-align: center;
  padding: 20px;
  color: #5f6368;
}

.loading::after {
  content: "...";
  animation: loading 1.4s infinite ease-in-out;
}

@keyframes loading {
  0%, 80%, 100% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
}
</style>
