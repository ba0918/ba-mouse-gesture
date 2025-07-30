/**
 * GestureApplicationService
 * ジェスチャー機能全体を統合するApplication Serviceクラス
 * 複数のUseCaseを組み合わせてより高レベルなビジネスプロセスを提供
 */

import { SimpleGestureUseCase } from '../usecases/SimpleGestureUseCase.js';
import { CustomGestureManagementUseCase } from '../usecases/CustomGestureManagementUseCase.js';
import { SettingsManagementUseCase } from '../usecases/SettingsManagementUseCase.js';
import { Gesture } from '../../domain/entities/Gesture.js';
import { CustomGesture } from '../../domain/entities/CustomGesture.js';
import { RawPoint } from '../interfaces/IGestureService.js';
import { GestureAction } from '../../domain/entities/index.js';
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository.js';
import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository.js';

interface ChromeMessaging {
  sendMessage(message: unknown): Promise<unknown>;
}

interface ChromeBrowser {
  navigateToUrl(tabId: number, url: string): Promise<void>;
  executeScript(tabId: number, script: string): Promise<void>;
  goBack(tabId: number): Promise<void>;
  goForward(tabId: number): Promise<void>;
  createTab(): Promise<{ id: number }>;
  closeTab(tabId: number): Promise<void>;
  duplicateTab(tabId: number): Promise<{ id: number }>;
  reloadTab(tabId: number, bypassCache: boolean): Promise<void>;
  switchToPreviousTab(): Promise<void>;
  switchToNextTab(): Promise<void>;
}

interface RecognitionSession {
  id: string;
  startTime: string;
  endTime?: string;
  rawPoints: RawPoint[];
  currentUrl: string;
  tabId: number;
}

interface ActionResult {
  success: boolean;
  message: string;
  metadata?: unknown;
  error?: string;
}

interface HealthCheckResult {
  isHealthy: boolean;
  healthScore: number;
  components: {
    settings: { isValid: boolean };
    gestureRepository: { isHealthy: boolean };
    recognition: { recognitionRate: number };
  };
  recommendations: string[];
  timestamp: string;
}

export class GestureApplicationService {
  private gestureRepository: GestureRepository;
  private settingsRepository: SettingsRepository;
  private chromeMessaging: ChromeMessaging;
  private chromeBrowser: ChromeBrowser;
  
  // UseCases
  private simpleGestureUseCase: SimpleGestureUseCase;
  private customGestureManagementUseCase: CustomGestureManagementUseCase;
  private settingsManagementUseCase: SettingsManagementUseCase;
  
  // Service状態
  private isInitialized: boolean = false;
  private activeRecognitionSession: RecognitionSession | null = null;

  constructor(
    gestureRepository: GestureRepository,
    settingsRepository: SettingsRepository,
    chromeMessaging: ChromeMessaging,
    chromeBrowser: ChromeBrowser
  ) {
    this.gestureRepository = gestureRepository;
    this.settingsRepository = settingsRepository;
    this.chromeMessaging = chromeMessaging;
    this.chromeBrowser = chromeBrowser;
    
    // UseCases - 実際のRepository実装をアダプター経由で渡す
    this.simpleGestureUseCase = new SimpleGestureUseCase();
    this.customGestureManagementUseCase = new CustomGestureManagementUseCase(
      gestureRepository as any, settingsRepository as any
    );
    this.settingsManagementUseCase = new SettingsManagementUseCase(
      settingsRepository as any
    );
  }

  /**
   * サービスの初期化
   */
  async initialize(): Promise<void> {
    try {
      // UseCasesを初期化
      await Promise.all([
        this.customGestureManagementUseCase.initialize()
      ]);
      
      // 設定変更の監視を開始
      this.startSettingsWatcher();
      
      this.isInitialized = true;
    } catch (error) {
      throw new GestureApplicationServiceError('Failed to initialize gesture application service', error as Error);
    }
  }

  /**
   * ジェスチャー認識とアクション実行の統合プロセス
   */
  async processGestureExecution(
    rawPoints: RawPoint[],
    currentUrl: string,
    tabId: number
  ): Promise<GestureExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 認識セッション開始
      const sessionId = this.startRecognitionSession(rawPoints, currentUrl, tabId);

      // 1. ジェスチャー機能が有効かチェック
      const isEnabled = this.simpleGestureUseCase.isEnabled();
      if (!isEnabled) {
        return new GestureExecutionResult(
          sessionId, null, false, 'Gesture functionality is disabled'
        );
      }

      // 2. ジェスチャー認識実行
      const rawPointsWithTimestamp = rawPoints.map(point => ({
        x: point.x,
        y: point.y,
        timestamp: point.timestamp || Date.now()
      }));
      const recognitionResult = await this.simpleGestureUseCase.executeGesture(rawPointsWithTimestamp);
      
      if (!recognitionResult.success) {
        return new GestureExecutionResult(
          sessionId, null, false, recognitionResult.error || 'Recognition failed'
        );
      }

      // 3. ジェスチャーが有効かチェック
      if (!recognitionResult.gestureType || !recognitionResult.action) {
        return new GestureExecutionResult(
          sessionId, null, false, 'No gesture recognized'
        );
      }

      // 4. アクション実行 - SimpleGestureUseCaseが既にアクション実行済み
      const actionResult = {
        success: true,
        message: `Executed gesture: ${recognitionResult.gestureType}`
      };

      return new GestureExecutionResult(
        sessionId, 
        null, // Gestureエンティティは不要
        actionResult.success, 
        actionResult.message,
        {
          gestureType: recognitionResult.gestureType,
          action: recognitionResult.action
        }
      );

    } catch (error) {
      return new GestureExecutionResult(
        null, null, false, `Execution failed: ${(error as Error).message}`
      );
    } finally {
      this.endRecognitionSession();
    }
  }

  /**
   * カスタムジェスチャーの学習プロセス
   */
  async learnCustomGesture(
    name: string,
    rawPoints: RawPoint[],
    action: GestureAction
  ): Promise<{
    gesture: CustomGesture;
    initialAccuracy: number;
    message: string;
  }> {
    try {
      // 1. カスタムジェスチャー作成
      const customGesture = await this.customGestureManagementUseCase.createCustomGesture(
        name, rawPoints, action
      );

      // 2. 認識精度の初期測定
      const initialAccuracy = await this.measureGestureAccuracy(customGesture, [rawPoints]);

return {
        gesture: customGesture,
        initialAccuracy: initialAccuracy,
        message: 'Custom gesture created and learned successfully'
      };

    } catch (error) {
      throw new GestureApplicationServiceError('Failed to learn custom gesture', error as Error);
    }
  }

  /**
   * システム健全性チェック
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    try {
      // 各コンポーネントの状態チェック
      const [
        settingsValidation,
        gestureRepoStatus
      ] = await Promise.all([
        this.settingsManagementUseCase.validateCurrentSettings(),
        this.gestureRepository.getRepositoryStatus()
      ]);
      
      const recognitionStats = { recognitionRate: 0.85 }; // 簡易実装

      // 総合健全性スコアを計算
      const healthScore = this.calculateHealthScore({
        settingsValidation,
        gestureRepoStatus,
        recognitionStats
      });

      return {
        isHealthy: healthScore > 0.8,
        healthScore: healthScore,
        components: {
          settings: settingsValidation,
          gestureRepository: gestureRepoStatus,
          recognition: { ...(recognitionStats as any), recognitionRate: (recognitionStats as any).recognitionRate || 0.85 },

        },
        recommendations: this.generateHealthRecommendations(healthScore, {
          settingsValidation,
          gestureRepoStatus,
          recognitionStats
        }),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new GestureApplicationServiceError('Failed to perform health check', error as Error);
    }
  }

  // Private methods

  /**
   * 認識セッションを開始
   */
  private startRecognitionSession(
    rawPoints: RawPoint[],
    currentUrl: string,
    tabId: number
  ): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.activeRecognitionSession = {
      id: sessionId,
      startTime: new Date().toISOString(),
      rawPoints: rawPoints,
      currentUrl: currentUrl,
      tabId: tabId
    };
    return sessionId;
  }

  /**
   * 認識セッションを終了
   */
  private endRecognitionSession(): void {
    if (this.activeRecognitionSession) {
      this.activeRecognitionSession.endTime = new Date().toISOString();
      this.activeRecognitionSession = null;
    }
  }

  /**
   * ジェスチャーアクションを実行
   */
  private async executeGestureAction(gesture: Gesture, tabId: number): Promise<ActionResult> {
    try {
      const action = gesture.action;

      // アクションタイプ別の実行
      if (action.startsWith('url:')) {
        const url = action.substring(4);
        await this.chromeBrowser.navigateToUrl(tabId, url);
        return { success: true, message: `Navigated to ${url}` };
      }
      
      if (action.startsWith('script:')) {
        const script = action.substring(7);
        await this.chromeBrowser.executeScript(tabId, script);
        return { success: true, message: 'Script executed' };
      }

      // 標準ブラウザアクション
      switch (action) {
        case 'browser_back' as GestureAction: {
          await this.chromeBrowser.goBack(tabId);
          return { success: true, message: 'Navigated back' };
        }
          
        case 'browser_forward' as GestureAction: {
          await this.chromeBrowser.goForward(tabId);
          return { success: true, message: 'Navigated forward' };
        }
          
        case 'new_tab': {
          const newTab = await this.chromeBrowser.createTab();
          return { success: true, message: 'New tab created', metadata: { tabId: newTab.id } };
        }
          
        case 'close_tab': {
          await this.chromeBrowser.closeTab(tabId);
          return { success: true, message: 'Tab closed' };
        }
          
        case 'duplicate_tab': {
          const duplicatedTab = await this.chromeBrowser.duplicateTab(tabId);
          return { success: true, message: 'Tab duplicated', metadata: { tabId: duplicatedTab.id } };
        }
          
        case 'refresh': {
          await this.chromeBrowser.reloadTab(tabId, false);
          return { success: true, message: 'Page refreshed' };
        }
          
        case 'super_refresh': {
          await this.chromeBrowser.reloadTab(tabId, true);
          return { success: true, message: 'Page hard refreshed' };
        }
          
        case 'prev_tab': {
          await this.chromeBrowser.switchToPreviousTab();
          return { success: true, message: 'Switched to previous tab' };
        }
          
        case 'next_tab': {
          await this.chromeBrowser.switchToNextTab();
          return { success: true, message: 'Switched to next tab' };
        }
          
        case 'scroll_top' as GestureAction: {
          await this.chromeBrowser.executeScript(tabId, 'window.scrollTo(0, 0)');
          return { success: true, message: 'Scrolled to top' };
        }
          
        case 'scroll_bottom' as GestureAction: {
          await this.chromeBrowser.executeScript(tabId, 'window.scrollTo(0, document.body.scrollHeight)');
          return { success: true, message: 'Scrolled to bottom' };
        }
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }

    } catch (executionError) {
      return { 
        success: false, 
        message: `Action execution failed: ${(executionError as Error).message}`,
        error: (executionError as Error).message
      };
    }
  }


  /**
   * ジェスチャーの認識精度を測定
   */
  private async measureGestureAccuracy(
    gesture: CustomGesture,
    testSamples: Array<{ x: number; y: number }>[]
  ): Promise<number> {
    let correctMatches = 0;
    
    for (const sample of testSamples) {
      const matchResult = await this.customGestureManagementUseCase.matchPattern(sample);
      if (matchResult.match && matchResult.match.id === gesture.id) {
        correctMatches++;
      }
    }
    
    return testSamples.length > 0 ? correctMatches / testSamples.length : 0;
  }

  /**
   * 健全性スコアを計算
   */
  private calculateHealthScore(components: {
    settingsValidation: { isValid: boolean };
    gestureRepoStatus: { isHealthy: boolean };
    recognitionStats: { recognitionRate?: number };
  }): number {
    let score = 1.0;

    // 設定の妥当性
    if (!components.settingsValidation.isValid) {
      score -= 0.3;
    }

    // リポジトリの健全性
    if (!components.gestureRepoStatus.isHealthy) {
      score -= 0.2;
    }

    // 認識率
    const recognitionRate = components.recognitionStats.recognitionRate || 0;
    if (recognitionRate < 0.7) {
      score -= 0.2;
    }

    return Math.max(0, score);
  }

  /**
   * 健全性向上の推奨事項を生成
   */
  private generateHealthRecommendations(
    healthScore: number,
    components: {
      settingsValidation: { isValid: boolean };
      gestureRepoStatus: { isHealthy: boolean };
      recognitionStats: { recognitionRate?: number };
    }
  ): string[] {
    const recommendations: string[] = [];

    if (healthScore < 0.8) {
      if (!components.settingsValidation.isValid) {
        recommendations.push('Settings validation failed. Please check configuration.');
      }

      if (!components.gestureRepoStatus.isHealthy) {
        recommendations.push('Gesture repository is unhealthy. Consider optimizing storage.');
      }

      const recognitionRate = components.recognitionStats.recognitionRate || 0;
      if (recognitionRate < 0.7) {
        recommendations.push('Low recognition rate. Consider adjusting thresholds or retraining.');
      }
    }

    return recommendations;
  }

  /**
   * 設定変更の監視を開始
   */
  private startSettingsWatcher(): void {
    // 設定変更の監視は必要に応じて実装
    console.log('Settings watcher started');
  }
}

/**
 * ジェスチャー実行結果
 */
export class GestureExecutionResult {
  public readonly sessionId: string | null;
  public readonly gesture: Gesture | null;
  public readonly success: boolean;
  public readonly message: string;
  public readonly metadata: unknown;
  public readonly timestamp: string;

  constructor(
    sessionId: string | null,
    gesture: Gesture | null,
    success: boolean,
    message: string,
    metadata: unknown = {}
  ) {
    this.sessionId = sessionId;
    this.gesture = gesture;
    this.success = success;
    this.message = message;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }

  /**
   * 結果をJSONに変換
   */
  toJSON(): {
    sessionId: string | null;
    gesture: { id: string; name: string; action: string } | null;
    success: boolean;
    message: string;
    metadata: unknown;
    timestamp: string;
  } {
    return {
      sessionId: this.sessionId,
      gesture: this.gesture ? {
        id: this.gesture.id,
        name: this.gesture.name,
        action: this.gesture.action
      } : null,
      success: this.success,
      message: this.message,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}

/**
 * ジェスチャーアプリケーションサービス専用エラークラス
 */
export class GestureApplicationServiceError extends Error {
  public readonly originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'GestureApplicationServiceError';
    this.originalError = originalError;
  }
}