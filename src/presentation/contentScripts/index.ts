/**
 * Clean Architecture - Content Scripts エントリーポイント
 * UseCaseパターンとクリーンアーキテクチャに基づく実装
 */

// Clean Architecture - Infrastructure層のアダプターをインポート
 
import { ChromeStorageAdapter } from '../../infrastructure/adapters/ChromeStorageAdapter';

// Clean Architecture - 必要なクラスをインポート（ビルドに含めるため）
import { SettingsManagementUseCase } from '../../application/usecases/SettingsManagementUseCase';
import { CustomGestureManagementUseCase } from '../../application/usecases/CustomGestureManagementUseCase';
import { DebugSettingsUseCase } from '../../application/usecases/DebugSettingsUseCase';
import { SimpleGestureRecognizer } from '../../domain/services/SimpleGestureRecognizer';
import { CanvasRendererAdapter } from '../../infrastructure/adapters/CanvasRendererAdapter';
import { SimpleMessagingAdapter } from '../../infrastructure/adapters/SimpleMessagingAdapter';
import { GestureManager } from '../../presentation/controllers/GestureManager';
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository';
import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository';
import { DebugStorageAdapter } from '../../infrastructure/adapters/DebugStorageAdapter';
import { DebugLogger } from '../../infrastructure/adapters/DebugLogger';
import { DebugSettingsEntity } from '../../domain/entities/DebugSettingsEntity';

// 型定義
interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  isRecording: boolean;
  trail: Point[];
  startPosition: Point | null;
  preventContextMenu: boolean;
}

interface AppSettings {
  enabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  gestureThreshold: number;
  excludeList: string[];
  defaultGestureStates?: Record<string, boolean>;
  debugSettings?: {
    enabled: boolean;
    logLevel: number;
    showStatus: boolean;
    statusPosition: string;
  };
}

interface GestureMessage {
  type: 'simpleGesture' | 'complexGesture' | 'customGesture';
  direction?: string;
  gestureType?: string;
  action?: string;
  name?: string;
  distance?: number;
  confidence?: number;
}

interface MessageResponse {
  success: boolean;
  action?: string;
  error?: string;
}

interface ScrollMessage {
  type: 'scroll';
  direction: 'top' | 'bottom';
}

interface DebugSettings {
  enabled: boolean;
  logLevel: number;
  showStatus: boolean;
  statusPosition: string;
  shouldShowStatus(): boolean;
}

interface SimpleDebugUseCase {
  isDebugEnabled(): Promise<boolean>;
  getDebugSettings(): Promise<DebugSettings>;
}

interface GestureRecognitionResult {
  type: 'simple' | 'complex' | 'custom';
  action?: string;
  name?: string;
  confidence?: number;
}

interface CustomGestureResult {
  matched: boolean;
  action?: string;
  gestureName?: string;
  confidence?: number;
}

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
  // window.SettingsUseCaseとwindow.SettingsManagementUseCaseの両方をサポート
  (window as any).SettingsUseCase = SettingsManagementUseCase;
  (window as any).SettingsManagementUseCase = SettingsManagementUseCase;
  
  // window.CustomGestureUseCaseとwindow.CustomGestureManagementUseCaseの両方をサポート
  (window as any).CustomGestureUseCase = CustomGestureManagementUseCase;
  (window as any).CustomGestureManagementUseCase = CustomGestureManagementUseCase;
  
  (window as any).DebugSettingsUseCase = DebugSettingsUseCase;
  (window as any).SimpleGestureRecognizer = SimpleGestureRecognizer;
  (window as any).CanvasRendererAdapter = CanvasRendererAdapter;
  (window as any).SimpleMessagingAdapter = SimpleMessagingAdapter;
  (window as any).GestureManager = GestureManager;
  
  // Repository層も公開
  (window as any).SettingsRepository = SettingsRepository;
  (window as any).GestureRepository = GestureRepository;
  
  // DebugLogger公開
  (window as any).DebugLogger = DebugLogger;
  
  // Debug関連のAdapterも公開
  (window as any).DebugStorageAdapter = DebugStorageAdapter;
  (window as any).DebugSettingsEntity = DebugSettingsEntity;
  
  // 🔧 ストレージ管理ヘルパー関数
  (window as any).clearExtensionStorage = async () => {
    console.log('🗑️ Clearing extension storage...');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'clearStorage' });
      if (response.success) {
        console.log('✅ Storage cleared successfully');
        location.reload(); // ページリロードして初期状態に戻す
      } else {
        console.error('❌ Failed to clear storage:', response.error);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };
  
  (window as any).getStorageInfo = async () => {
    console.log('🔍 Getting storage info...');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getStorageInfo' });
      if (response.success) {
        console.log('📦 Storage info:', response.data);
        return response.data;
      } else {
        console.error('❌ Failed to get storage info:', response.error);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };
}

/**
 * Clean Architecture 対応ジェスチャーマネージャー
 */
class CleanGestureManager {
  // Clean Architecture - UseCase instances (初期化は遅延ロード)
  private settingsUseCase: SettingsManagementUseCase | null = null;
  private customGestureUseCase: CustomGestureManagementUseCase | null = null;
  private learningUseCase: any = null;
  private debugUseCase: SimpleDebugUseCase;
  private logger: DebugLogger | null = null; // DebugLogger (デバッグ設定読み込み後に初期化)
  
  // Clean Architecture - Domain Services
  private gestureRecognizer: SimpleGestureRecognizer | null = null;
  
  // Clean Architecture - Infrastructure Adapters
  private canvasRenderer: CanvasRendererAdapter | null = null;
  private messagingAdapter: SimpleMessagingAdapter | null = null;
  
  // Clean Architecture - Controllers
  private gestureController: GestureManager | null = null;
  
  private isInitialized: boolean = false;
  private gestureState: GestureState;
  private settings: AppSettings;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private debugStatusTimeout?: NodeJS.Timeout;

  constructor() {
    this.gestureState = {
      isRecording: false,
      trail: [],
      startPosition: null,
      preventContextMenu: false
    };
    this.settings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      defaultGestureStates: {}
    };
    this.debugUseCase = this.createSimpleDebugUseCase();
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    try {
      console.log('🏗️ Clean Architecture Gestures: Initializing...');
      
      // Clean Architecture コンポーネントの初期化
      this.initializeCleanArchitecture();
      
      // 設定を読み込み
      await this.loadSettings();
      
      // 除外サイトチェック
      if (this.isExcludedSite()) {
        console.log('Site excluded, disabling Clean Architecture gestures');
        return;
      }
      
      // Canvas初期化
      this.initializeCanvas();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      // メッセージリスナー設定
      this.setupMessageListener();
      
      // 設定変更監視
      this.watchSettingsChanges();
      
      this.isInitialized = true;
      console.log('✅ Clean Architecture Gestures: Initialization complete');
      
    } catch (error) {
      console.error('❌ Clean Architecture Gestures: Initialization failed:', error);
    }
  }
  
  /**
   * Clean Architecture コンポーネントの初期化
   */
  private initializeCleanArchitecture(): void {
    try {
      // 簡易実装でデバッグ機能を確保
      this.debugUseCase = this.createSimpleDebugUseCase();
      
      // インポートされたクラスを直接使用
      const storageAdapter = new ChromeStorageAdapter();
      
      if (storageAdapter) {
        // Repository層の初期化
        const settingsRepository = new SettingsRepository(storageAdapter);
        const gestureRepository = new GestureRepository(storageAdapter);
        
        // Application層の初期化（依存関係注入）
        if (settingsRepository) {
          this.settingsUseCase = new SettingsManagementUseCase(settingsRepository);
        }
        
        if (gestureRepository && settingsRepository) {
          this.customGestureUseCase = new CustomGestureManagementUseCase(gestureRepository, settingsRepository);
        }
        
        // Debug設定の初期化
        try {
          this.debugUseCase = new DebugSettingsUseCase();
        } catch (error) {
          console.warn('Failed to initialize DebugSettingsUseCase, using fallback:', error);
        }
      }
      
      // Domain Services と Adapters の初期化
      this.gestureRecognizer = new SimpleGestureRecognizer();
      this.canvasRenderer = new CanvasRendererAdapter();
      this.messagingAdapter = new SimpleMessagingAdapter();
      
      // Controller の初期化
      if (this.settingsUseCase && this.customGestureUseCase) {
        this.gestureController = new GestureManager({
          settingsUseCase: this.settingsUseCase,
          customGestureUseCase: this.customGestureUseCase,
          learningUseCase: this.learningUseCase
        });
      }
      
      console.log('✅ Clean Architecture components initialized:', {
        hasSettingsUseCase: Boolean(this.settingsUseCase),
        hasCustomGestureUseCase: Boolean(this.customGestureUseCase),
        hasGestureRecognizer: Boolean(this.gestureRecognizer),
        hasCanvasRenderer: Boolean(this.canvasRenderer),
        hasMessagingAdapter: Boolean(this.messagingAdapter),
        hasGestureController: Boolean(this.gestureController)
      });
      
    } catch (error) {
      console.error('Clean Architecture initialization failed:', error);
      console.warn('Using fallback implementation');
    }
  }

  /**
   * シンプルなデバッグUseCase実装（フォールバック用）
   * Infrastructure層のChromeStorageAdapterを使用（Clean Architecture準拠）
   */
  private createSimpleDebugUseCase(): SimpleDebugUseCase {
    return {
      async isDebugEnabled(): Promise<boolean> {
        try {
          // Infrastructure層のChromeStorageAdapterを使用
          if ((window as any).ChromeStorageAdapter) {
            const storageAdapter = new (window as any).ChromeStorageAdapter();
            const data = await storageAdapter.get(['appSettings']);
            const debugEnabled = data.appSettings?.debugSettings?.enabled || false;
            return debugEnabled;
          }
          
          // フォールバック: Chrome Storage APIを直接使用
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve) => {
              chrome.storage.sync.get(['appSettings'], (result) => {
                const debugEnabled = result.appSettings?.debugSettings?.enabled || false;
                resolve(debugEnabled);
              });
            });
          }
          
          return false;
        } catch (error) {
          console.error('Debug enabled check failed:', error);
          return false;
        }
      },

      async getDebugSettings(): Promise<DebugSettings> {
        try {
          // Infrastructure層のChromeStorageAdapterを使用
          if ((window as any).ChromeStorageAdapter) {
            const storageAdapter = new (window as any).ChromeStorageAdapter();
            const data = await storageAdapter.get(['appSettings']);
            
            const debugSettings = data.appSettings?.debugSettings || {
              enabled: false,
              logLevel: 2,
              showStatus: false,
              statusPosition: 'top-right'
            };
            
            // shouldShowStatus メソッドを追加
            debugSettings.shouldShowStatus = function () {
              const result = this.enabled && this.showStatus;
              return result;
            };
            
            return debugSettings;
          }
          
          // フォールバック実装: Chrome Storage APIを直接使用
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            return new Promise((resolve) => {
              chrome.storage.sync.get(['appSettings'], (result) => {
                const debugSettings = result.appSettings?.debugSettings || {
                  enabled: false,
                  logLevel: 2,
                  showStatus: false,
                  statusPosition: 'top-right'
                };
                
                // shouldShowStatus メソッドを追加
                debugSettings.shouldShowStatus = function () {
                  return this.enabled && this.showStatus;
                };
                
                resolve(debugSettings);
              });
            });
          }
          
          // 最終フォールバック
          return {
            enabled: false,
            logLevel: 2,
            showStatus: false,
            statusPosition: 'top-right',
            shouldShowStatus: () => false
          };
        } catch (error) {
          console.error('Get debug settings failed:', error);
          return {
            enabled: false,
            logLevel: 2,
            showStatus: false,
            statusPosition: 'top-right',
            shouldShowStatus: () => false
          };
        }
      }
    };
  }

  /**
   * 設定の読み込み - Clean Architecture対応
   */
  async loadSettings(): Promise<void> {
    // Clean Architecture UseCase が利用可能な場合のみ使用
    if (this.settingsUseCase && this.customGestureUseCase) {
      try {
        // UseCase経由で設定を読み込み
        const loadedSettings = await this.settingsUseCase.getSettings();
        this.settings = {
          enabled: (loadedSettings.enabled as boolean) ?? true,
          strokeColor: (loadedSettings.strokeColor as string) || '#2196F3',
          strokeWidth: (loadedSettings.strokeWidth as number) || 3,
          gestureThreshold: (loadedSettings.gestureThreshold as number) || 15,
          excludeList: (loadedSettings.excludeList as string[]) || [],
          defaultGestureStates: (loadedSettings.defaultGestureStates as Record<string, boolean>) || {}
        };
        
        // カスタムジェスチャーも読み込み
        await this.customGestureUseCase.getAllCustomGestures();
        
        // DebugLoggerを初期化
        const debugSettings = await this.debugUseCase.getDebugSettings();
        this.logger = new (window as any).DebugLogger(debugSettings);
        
        // デバッグ情報の表示
        if (await this.debugUseCase.isDebugEnabled() && this.logger) {
          this.logger.debug('Debug mode enabled');
          this.logger.info('Settings loaded via UseCase:', this.settings);
          this.showDebugStatus('設定を読み込みました');
        }
        
        return;
        
      } catch (error) {
        console.warn('Failed to load settings via UseCase, using fallback:', error);
      }
    }
    
    // Clean Architecture 初期化未完了の場合は直接フォールバック使用
    await this.loadSettingsFallback();
  }
  
  /**
   * 設定読み込みのフォールバック
   */
  private async loadSettingsFallback(): Promise<void> {
    try {
      // Clean Architecture 対応: appSettings キーを使用
      const result = await chrome.storage.sync.get(['appSettings', 'settings']);
      let settingsData: any = null;
      
      // 新しい構成 (Clean Architecture) を優先
      if (result.appSettings) {
        settingsData = result.appSettings;
      } else if (result.settings) {
        // 後方互換性のために古い構成もサポート
        settingsData = result.settings;
      }
      
      if (settingsData) {
        this.settings = {
          enabled: settingsData.enabled ?? true,
          strokeColor: settingsData.strokeColor || '#2196F3',
          strokeWidth: settingsData.strokeWidth || 3,
          gestureThreshold: settingsData.gestureThreshold || 15,
          excludeList: settingsData.excludeList || [],
          defaultGestureStates: settingsData.defaultGestureStates || {}
        };
      }
    } catch (error) {
      console.error('Fallback settings load failed:', error);
    }
  }

  /**
   * 除外サイトチェック
   */
  private isExcludedSite(): boolean {
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;
    
    return this.settings.excludeList.some(pattern => {
      // 完全URL マッチ
      if (pattern.includes('://')) {
        return currentUrl.includes(pattern) || currentUrl.match(pattern.replace(/\*/g, '.*'));
      }
      // ホスト名マッチ
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(currentHost);
      }
      // 部分マッチ
      return currentHost.includes(pattern);
    });
  }

  /**
   * Canvas初期化 - Clean Architecture対応
   */
  private initializeCanvas(): void {
    // Clean Architecture Adapter が利用可能な場合のみ使用
    if (this.canvasRenderer) {
      try {
        // Clean Architecture - Adapter経由でCanvas初期化
        this.canvasRenderer.initializeCanvas({
          zIndex: '999999'
        });
        
        // 下位互換性のため、直接アクセス用のcanvasも保持
        this.canvas = this.canvasRenderer.getCanvas();
        this.ctx = this.canvasRenderer.getContext();
        
        return;
        
      } catch (error) {
        console.warn('Canvas adapter initialization failed, using fallback:', error);
      }
    }
    
    // Clean Architecture 初期化未完了の場合は直接フォールバック使用
    this.initializeCanvasFallback();
  }
  
  /**
   * Canvas初期化のフォールバック
   */
  private initializeCanvasFallback(): void {
    // 既存のcanvasがあれば削除
    const existingCanvas = document.getElementById('mouse-gesture-trail');
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // 新しいcanvasを作成
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'mouse-gesture-trail';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999999;
      background: transparent;
    `;
    
    // Canvas サイズをウィンドウサイズに設定
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // コンテキストを取得
    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
    
    // DOMに追加
    document.body.appendChild(this.canvas);
  }

  /**
   * イベントリスナー設定
   */
  private setupEventListeners(): void {
    // マウスイベント
    document.addEventListener('mousedown', this.onMouseDown.bind(this), true);
    document.addEventListener('mousemove', this.onMouseMove.bind(this), true);
    document.addEventListener('mouseup', this.onMouseUp.bind(this), true);
    document.addEventListener('contextmenu', this.onContextMenu.bind(this), true);
    
    // ウィンドウリサイズ
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  /**
   * マウスダウンイベント
   */
  private onMouseDown(e: MouseEvent): void {
    if (!this.settings.enabled || e.button !== 2) return; // 右クリック以外は無視
    
    this.gestureState.isRecording = true;
    this.gestureState.startPosition = { x: e.clientX, y: e.clientY, timestamp: Date.now() };
    this.gestureState.trail = [{ x: e.clientX, y: e.clientY, timestamp: Date.now() }];
    this.gestureState.preventContextMenu = false;
    
    // Canvas準備
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.strokeStyle = this.settings.strokeColor;
      this.ctx.lineWidth = this.settings.strokeWidth;
    }
  }

  /**
   * マウスムーブイベント
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.gestureState.isRecording) return;
    
    const newPoint: Point = { x: e.clientX, y: e.clientY, timestamp: Date.now() };
    this.gestureState.trail.push(newPoint);
    
    // 軌跡描画
    this.drawTrail();
    
    // 十分な移動距離があるかチェック
    if (this.calculateTrailDistance() >= this.settings.gestureThreshold) {
      this.gestureState.preventContextMenu = true;
    }
  }

  /**
   * マウスアップイベント
   */
  private async onMouseUp(e: MouseEvent): Promise<void> {
    if (!this.gestureState.isRecording || e.button !== 2) return;
    
    this.gestureState.isRecording = false;
    const trail = [...this.gestureState.trail];
    
    // Canvas クリア
    if (this.canvas && this.ctx) {
      setTimeout(() => {
        if (this.ctx && this.canvas) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      }, 200); // 少し遅延してから消去
    }
    
    // ジェスチャー認識実行
    if (trail.length >= 2 && this.calculateTrailDistance() >= this.settings.gestureThreshold) {
      await this.executeGesture(trail);
    }
    
    // 状態リセット
    this.resetGestureState();
  }

  /**
   * コンテキストメニューイベント
   */
  private onContextMenu(e: MouseEvent): boolean | void {
    if (this.gestureState.preventContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }

  /**
   * ウィンドウリサイズイベント
   */
  private onWindowResize(): void {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  /**
   * 軌跡描画
   */
  private drawTrail(): void {
    if (!this.ctx || this.gestureState.trail.length < 2 || !this.canvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    
    const trail = this.gestureState.trail;
    this.ctx.moveTo(trail[0].x, trail[0].y);
    
    for (let i = 1; i < trail.length; i++) {
      this.ctx.lineTo(trail[i].x, trail[i].y);
    }
    
    this.ctx.stroke();
  }

  /**
   * 軌跡の総移動距離を計算
   */
  private calculateTrailDistance(): number {
    const trail = this.gestureState.trail;
    if (trail.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const current = trail[i];
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    return totalDistance;
  }

  /**
   * ジェスチャー実行
   */
  private async executeGesture(trail: Point[]): Promise<void> {
    console.log('🎯 executeGesture called with trail length:', trail.length);
    
    try {
      // ジェスチャー認識
      const gestureResult = await this.recognizeGesture(trail);
      console.log('🔍 Recognition result:', gestureResult);
      
      if (!gestureResult) {
        console.log('❌ Gesture not recognized');
        if (this.logger) {
          this.logger.debug('Gesture not recognized');
        }
        return;
      }
      
      if (this.logger) {
        this.logger.debug('Recognized gesture:', gestureResult);
      }
      
      // ジェスチャーの種類に応じて処理
      const distance = this.calculateTrailDistance();
      console.log('📏 Trail distance:', distance);
      
      if (typeof gestureResult === 'object' && gestureResult.type === 'custom') {
        console.log('🎯 Processing custom gesture');
        await this.handleCustomGesture(gestureResult, distance);
      } else if (typeof gestureResult === 'object') {
        console.log('🔧 Processing object-based gesture');
        await this.handleDefaultGesture(gestureResult, distance);
      } else {
        console.log('🔧 Processing string-based gesture');
        await this.handleDefaultGesture(gestureResult, distance);
      }
      
    } catch (error) {
      console.error('Gesture execution failed:', error);
    }
  }
  
  /**
   * カスタムジェスチャーの処理
   */
  private async handleCustomGesture(gestureResult: GestureRecognitionResult, distance: number): Promise<void> {
    try {
      if (this.logger) {
        this.logger.debug(`Custom gesture: ${gestureResult.name} (${distance.toFixed(0)}px)`);
      }
      
      const response = await this.sendGestureMessage({
        type: 'customGesture',
        action: gestureResult.action,
        name: gestureResult.name,
        distance: distance,
        confidence: gestureResult.confidence
      });
      
      if (response.success) {
        if (this.logger) {
          this.logger.debug('Custom gesture executed successfully:', response.action);
        }
        // カスタムジェスチャーのデバッグ表示
        await this.showDebugStatus(`🎯 Custom: ${response.action}`);
      } else {
        console.error('Custom gesture execution failed:', response.error);
        // カスタムジェスチャーエラー時のデバッグ表示
        await this.showDebugStatus('❌ Custom: Failed');
      }
    } catch (error) {
      console.error('Custom gesture handling failed:', error);
    }
  }
  
  /**
   * デフォルトジェスチャーの処理
   */
  private async handleDefaultGesture(gestureResult: GestureRecognitionResult | string, distance: number): Promise<void> {
    try {
      // ジェスチャー状態をチェック
      const gestureType = typeof gestureResult === 'string' ? gestureResult : gestureResult.action || gestureResult.type;
      
      if (!this.isGestureEnabled(gestureType)) {
        if (this.logger) {
          this.logger.debug(`Gesture ${gestureType} is disabled`);
        }
        return;
      }
      
      if (this.logger) {
        this.logger.debug(`Default gesture: ${gestureType} (${distance.toFixed(0)}px)`);
      }
      
      const response = await this.sendGestureMessage(gestureType);
      
      if (response.success) {
        if (this.logger) {
          this.logger.debug('Default gesture executed successfully:', response.action);
        }
        // デバッグ表示を追加
        await this.showDebugStatus(`✅ ${gestureType}: ${response.action}`);
      } else {
        console.error('Default gesture execution failed:', response.error);
        // エラー時もデバッグ表示
        await this.showDebugStatus(`❌ ${gestureType}: Failed`);
      }
    } catch (error) {
      console.error('Default gesture handling failed:', error);
    }
  }

  /**
   * ジェスチャー認識 - Clean Architecture対応
   */
  private async recognizeGesture(trail: Point[]): Promise<GestureRecognitionResult | string | null> {
    if (trail.length < 2) return null;
    
    // 軌跡の総移動距離チェック
    const totalDistance = this.calculateTrailDistance();
    if (totalDistance < this.settings.gestureThreshold) return null;
    
    try {
      // Clean Architecture - Domain Service経由でジェスチャー認識
      if (this.gestureRecognizer) {
        const recognitionResult = this.gestureRecognizer.recognizeGesture(trail);
        
        if (recognitionResult) {
          if (this.logger) {
            this.logger.debug('Gesture recognized via Domain Service:', recognitionResult);
          }
          return recognitionResult;
        }
      }
      
      // カスタムジェスチャーのチェック
      const customResult = await this.checkCustomGesture(trail);
      if (customResult) {
        return customResult;
      }
      
    } catch (error) {
      console.warn('Domain Service recognition failed, using fallback:', error);
    }
    
    // フォールバック: 従来のロジック
    return this.recognizeGestureFallback(trail);
  }
  
  /**
   * カスタムジェスチャーのチェック
   */
  private async checkCustomGesture(trail: Point[]): Promise<GestureRecognitionResult | null> {
    try {
      if (!this.customGestureUseCase) return null;
      
      const rawPoints = trail.map(point => ({ x: point.x, y: point.y }));
      const customResult = await this.customGestureUseCase.matchPattern(rawPoints);
      
      if (customResult.match !== null) {
        // パターンマッチ成功
        return {
          type: 'custom',
          action: customResult.match.action,
          name: customResult.match.name,
          confidence: customResult.confidence
        };
      }
    } catch (error) {
      console.error('Custom gesture check failed:', error);
    }
    
    return null;
  }
  
  /**
   * ジェスチャー認識のフォールバック
   */
  private recognizeGestureFallback(trail: Point[]): string | null {
    // 最初に単純ジェスチャーかチェック
    if (this.isSimpleGesturePath(trail)) {
      return this.analyzeSimpleGesture(trail);
    }
    
    // 複合ジェスチャーの分析
    return this.analyzeComplexGesture(trail);
  }

  /**
   * 単純ジェスチャー判定（1方向のみかチェック）
   */
  private isSimpleGesturePath(trail: Point[]): boolean {
    if (trail.length < 3) return true;
    
    const directions: string[] = [];
    
    // 隣接する点を比較して方向を検出
    for (let i = 0; i < trail.length - 1; i++) {
      const start = trail[i];
      const end = trail[i + 1];
      
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 5) {
        let direction = '';
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'RIGHT' : 'LEFT';
        } else {
          direction = deltaY > 0 ? 'DOWN' : 'UP';
        }
        directions.push(direction);
      }
    }
    
    // 連続する同じ方向を統合
    const cleanDirections = this.cleanDirections(directions);
    const uniqueDirections = [...new Set(cleanDirections)];
    
    if (this.logger) {
      this.logger.debug('Simple gesture check - unique directions:', uniqueDirections);
    }
    
    // 単一方向のみの場合は単純ジェスチャー
    return uniqueDirections.length <= 1;
  }

  /**
   * 単純ジェスチャーの分析
   */
  private analyzeSimpleGesture(trail: Point[]): string {
    const start = trail[0];
    const end = trail[trail.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx > absDy) {
      return dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      return dy > 0 ? 'DOWN' : 'UP';
    }
  }

  /**
   * 複合ジェスチャーの分析
   */
  private analyzeComplexGesture(trail: Point[]): string | null {
    if (trail.length < 6) return null;
    
    const directions: string[] = [];
    const segmentLength = Math.max(3, Math.floor(trail.length / 6));
    
    // 軌跡をセグメントに分割して方向を分析
    for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
      const start = trail[i];
      const end = trail[Math.min(i + segmentLength, trail.length - 1)];
      
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 10) {
        let direction = '';
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'RIGHT' : 'LEFT';
        } else {
          direction = deltaY > 0 ? 'DOWN' : 'UP';
        }
        directions.push(direction);
      }
    }
    
    // 連続する同じ方向を統合
    const cleanDirections = this.cleanDirections(directions);
    
    if (this.logger) {
      this.logger.debug('Complex gesture - directions:', cleanDirections);
    }
    
    if (cleanDirections.length >= 2) {
      const pattern = cleanDirections.join('');
      if (this.logger) {
        this.logger.debug('Checking pattern:', pattern);
      }
      
      // 複合ジェスチャーのパターンマッチング
      const complexPatterns: Record<string, string> = {
        'DOWNRIGHT': 'downright',     // ↓→: タブを閉じる
        'UPRIGHT': 'upright',         // ↑→: 新しいタブ
        'RIGHTDOWN': 'rightdown',     // →↓: タブ複製
        'UPDOWN': 'updown',           // ↑↓: ページ更新
        'UPDOWNUP': 'super_refresh',  // ↑↓↑: スーパーリロード
        'LEFTRIGHT': 'prev_tab',      // ←→: 前のタブ
        'RIGHTLEFT': 'next_tab'       // →←: 次のタブ
      };
      
      return complexPatterns[pattern] || null;
    }
    
    return null;
  }

  /**
   * 方向配列をクリーンアップ（連続する同じ方向を統合）
   */
  private cleanDirections(directions: string[]): string[] {
    const cleanDirections: string[] = [];
    let lastDirection: string | null = null;
    
    for (const dir of directions) {
      if (dir !== lastDirection) {
        cleanDirections.push(dir);
        lastDirection = dir;
      }
    }
    
    return cleanDirections;
  }

  /**
   * backgroundスクリプトにジェスチャーメッセージを送信 - Clean Architecture対応
   */
  private async sendGestureMessage(gestureType: string | GestureMessage): Promise<MessageResponse> {
    console.log('🚀 sendGestureMessage called with:', gestureType);
    
    // Clean Architecture Adapter が利用可能な場合のみ使用
    if (this.messagingAdapter) {
      try {
        const message = typeof gestureType === 'string' ? 
          (this.isSimpleGesture(gestureType) 
            ? { type: 'simpleGesture' as const, direction: gestureType }
            : { type: 'complexGesture' as const, gestureType: gestureType }) :
          gestureType;
        
        console.log('📤 Sending message via messagingAdapter:', message);
        const response = await this.messagingAdapter.sendMessage(message);
        console.log('📥 Response received:', response);
        
        // デバッグ情報の表示
        if (await this.debugUseCase.isDebugEnabled()) {
          this.showDebugStatus(`✅ Action: ${response?.action || 'Success'}`);
        }
        
        return response;
        
      } catch (error) {
        console.warn('Messaging adapter failed, using fallback:', error);
        return this.sendGestureMessageFallback(gestureType);
      }
    } else {
      console.log('❌ messagingAdapter not available, using fallback');
      // Clean Architecture 初期化未完了の場合は直接フォールバック使用
      return this.sendGestureMessageFallback(gestureType);
    }
  }
  
  /**
   * メッセージ送信のフォールバック
   */
  private sendGestureMessageFallback(gestureType: string | GestureMessage): Promise<MessageResponse> {
    console.log('🔄 Using fallback message sending for:', gestureType);
    
    return new Promise((resolve) => {
      const message = typeof gestureType === 'string' ?
        (this.isSimpleGesture(gestureType) 
          ? { type: 'simpleGesture' as const, direction: gestureType }
          : { type: 'complexGesture' as const, gestureType: gestureType }) :
        gestureType;
      
      console.log('📤 Fallback sending message:', message);
      
      chrome.runtime.sendMessage(message, (response: MessageResponse) => {
        console.log('📥 Fallback response received:', response);
        
        if (chrome.runtime.lastError) {
          console.error('❌ Chrome runtime error:', chrome.runtime.lastError.message);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  /**
   * シンプルジェスチャーかどうかの判定
   */
  private isSimpleGesture(gestureType: string): boolean {
    return ['LEFT', 'RIGHT', 'UP', 'DOWN'].includes(gestureType);
  }

  /**
   * ジェスチャー状態をリセット
   */
  private resetGestureState(): void {
    this.gestureState.isRecording = false;
    this.gestureState.trail = [];
    this.gestureState.startPosition = null;
    this.gestureState.preventContextMenu = false;
  }

  /**
   * 設定変更の監視 - Clean Architecture対応
   */
  private watchSettingsChanges(): void {
    try {
      // chrome.storage.onChangedを監視
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener(async (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
          if (namespace === 'sync') {
            // Clean Architecture 対応: appSettings と settings 両方を監視
            if (changes.appSettings || changes.settings) {
              if (this.logger) {
                this.logger.info('Settings changed, reloading via UseCase...');
              }
              
              // UseCase経由で最新設定を取得
              await this.loadSettings();
              
              // 除外サイト/無効化チェック
              if (!this.settings.enabled || this.isExcludedSite()) {
                this.clearCanvas();
                if (await this.debugUseCase.isDebugEnabled()) {
                  this.showDebugStatus('マウスジェスチャーが無効になりました');
                }
              } else {
                if (await this.debugUseCase.isDebugEnabled()) {
                  this.showDebugStatus('マウスジェスチャーが有効になりました');
                }
              }
            }
            
            // デバッグ設定の変更を監視
            if (changes.debugSettings) {
              if (this.logger) {
                this.logger.info('Debug settings changed, updating debug state...');
              }
              const newDebugSettings = changes.debugSettings.newValue;
              
              if (newDebugSettings) {
                if (this.logger) {
                  this.logger.info('New debug settings:', newDebugSettings);
                }
                
                // デバッグが無効になった場合、デバッグメッセージを非表示
                if (!newDebugSettings.enabled) {
                  if (this.logger) {
                    this.logger.info('Debug mode disabled, hiding debug status');
                  }
                  this.hideDebugStatus();
                } else {
                  if (this.logger) {
                    this.logger.info('Debug mode enabled');
                  }
                  this.showDebugStatus('デバッグモードが有効になりました');
                }
              }
            }
            
            // 軌跡設定が変更された場合
            const settingsChange = changes.appSettings || changes.settings;
            if (settingsChange && settingsChange.newValue) {
              const newSettings = settingsChange.newValue;
              if (newSettings.strokeColor || newSettings.strokeWidth) {
                this.updateCanvasStyle();
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to setup settings watching:', error);
    }
  }

  /**
   * backgroundスクリプトからのメッセージを処理
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: ScrollMessage, sender: chrome.runtime.MessageSender, sendResponse: (response: { success: boolean }) => void) => {
      if (message.type === 'scroll') {
        this.handleScrollMessage(message.direction);
        sendResponse({ success: true });
      }
    });
  }

  /**
   * スクロール処理
   */
  private handleScrollMessage(direction: 'top' | 'bottom'): void {
    try {
      if (direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (direction === 'bottom') {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Scroll failed:', error);
    }
  }

  /**
   * 軌跡を方向配列に変換
   */
  private convertTrailToDirections(trail: Point[]): string[] {
    const directions: string[] = [];
    
    for (let i = 0; i < trail.length - 1; i++) {
      const start = trail[i];
      const end = trail[i + 1];
      
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 5) {
        let direction = '';
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'RIGHT' : 'LEFT';
        } else {
          direction = deltaY > 0 ? 'DOWN' : 'UP';
        }
        directions.push(direction);
      }
    }
    
    return this.cleanDirections(directions);
  }
  
  /**
   * ジェスチャーが有効かチェック
   */
  private isGestureEnabled(gestureId: string): boolean {
    if (!this.settings.defaultGestureStates) {
      return true; // デフォルトで有効
    }
    
    const enabled = this.settings.defaultGestureStates[gestureId];
    return enabled !== false;
  }
  
  /**
   * Canvas のスタイルを更新
   */
  private updateCanvasStyle(): void {
    try {
      if (this.canvasRenderer) {
        this.canvasRenderer.updateStyle({
          color: this.settings.strokeColor,
          width: this.settings.strokeWidth
        });
      } else {
        // フォールバック
        if (this.ctx) {
          this.ctx.strokeStyle = this.settings.strokeColor;
          this.ctx.lineWidth = this.settings.strokeWidth;
        }
      }
    } catch {
      // フォールバック
      if (this.ctx) {
        this.ctx.strokeStyle = this.settings.strokeColor;
        this.ctx.lineWidth = this.settings.strokeWidth;
      }
    }
  }
  
  /**
   * Canvas をクリア
   */
  private clearCanvas(): void {
    try {
      if (this.canvasRenderer) {
        this.canvasRenderer.clearCanvas();
      } else {
        if (this.canvas && this.ctx) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      }
    } catch {
      if (this.canvas && this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }
  
  /**
   * デバッグステータス表示
   */
  private async showDebugStatus(message: string): Promise<void> {
    try {
      if (this.debugUseCase) {
        const debugSettings = await this.debugUseCase.getDebugSettings();
        
        // デバッグが無効な場合は何も表示しない
        if (!debugSettings.enabled) {
          return;
        }
        
        // ログレベルに応じてデバッグ情報を出力
        if (this.logger) {
          this.logger.debug(message);
          this.logger.info('Debug Settings:', {
            enabled: debugSettings.enabled,
            showStatus: debugSettings.showStatus,
            shouldShowStatus: debugSettings.shouldShowStatus(),
            statusPosition: debugSettings.statusPosition
          });
        }
        
        // 画面上への表示
        if (debugSettings.shouldShowStatus()) {
          if (this.logger) {
            this.logger.info('Creating debug status element...');
          }
          this.createOrUpdateDebugStatusElement(message, debugSettings.statusPosition);
        } else {
          if (this.logger) {
            this.logger.info('Debug status display is disabled');
          }
        }
      } else {
        console.log(`[Debug Fallback] ${message}`);
      }
    } catch (error) {
      console.error('🚫 showDebugStatus error:', error);
      console.log(`[Debug Fallback] ${message}`);
    }
  }

  /**
   * デバッグステータス表示を隠す
   */
  private hideDebugStatus(): void {
    try {
      const existingElement = document.getElementById('debug-status-element');
      if (existingElement) {
        if (this.logger) {
          this.logger.info('Hiding debug status element');
        }
        existingElement.style.display = 'none';
        
        // 少し待ってから要素を削除
        setTimeout(() => {
          if (existingElement.parentNode) {
            existingElement.parentNode.removeChild(existingElement);
            if (this.logger) {
              this.logger.info('Debug status element removed');
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('🚫 hideDebugStatus error:', error);
    }
  }

  /**
   * デバッグステータス表示要素の作成/更新
   */
  private createOrUpdateDebugStatusElement(message: string, position: string = 'top-right'): void {
    if (this.logger) {
      this.logger.info('createOrUpdateDebugStatusElement called:', { message, position });
    }
    
    const statusId = 'mouse-gesture-debug-status';
    let statusElement = document.getElementById(statusId);
    
    // 要素が存在しない場合は作成
    if (!statusElement) {
      if (this.logger) {
        this.logger.info('Creating new debug status element');
      }
      statusElement = document.createElement('div');
      statusElement.id = statusId;
      statusElement.style.cssText = this.getDebugStatusStyles(position);
      
      if (document.body) {
        document.body.appendChild(statusElement);
        if (this.logger) {
          this.logger.info('Debug status element appended to body');
        }
      } else {
        console.error('🚫 document.body is not available');
        return;
      }
    } else {
      if (this.logger) {
        this.logger.info('Using existing debug status element');
      }
    }
    
    // メッセージを更新
    statusElement.textContent = message;
    statusElement.style.display = 'block';
    if (this.logger) {
      this.logger.info('Debug status element updated:', {
        textContent: statusElement.textContent,
        display: statusElement.style.display,
        position: position
      });
    }
    
    // 位置を更新（設定が変更された場合）
    this.updateDebugStatusPosition(statusElement, position);
    
    // 3秒後に自動的に非表示
    clearTimeout(this.debugStatusTimeout);
    this.debugStatusTimeout = setTimeout(() => {
      if (statusElement) {
        statusElement.style.display = 'none';
        if (this.logger) {
          this.logger.info('Debug status element hidden after 3 seconds');
        }
      }
    }, 3000);
  }

  /**
   * デバッグステータスのスタイルを取得
   */
  private getDebugStatusStyles(position: string): string {
    const baseStyles = `
      position: fixed;
      z-index: 9999999;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      pointer-events: none;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    
    const positionStyles: Record<string, string> = {
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;'
    };
    
    return baseStyles + (positionStyles[position] || positionStyles['top-right']);
  }

  /**
   * デバッグステータスの位置を更新
   */
  private updateDebugStatusPosition(element: HTMLElement, position: string): void {
    const positionStyles: Record<string, Record<string, string>> = {
      'top-right': { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
      'top-left': { top: '20px', left: '20px', bottom: 'auto', right: 'auto' },
      'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
      'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' }
    };
    
    const styles = positionStyles[position] || positionStyles['top-right'];
    Object.assign(element.style, styles);
  }
  
  /**
   * デバッグ情報取得 - Clean Architecture対応
   */
  async getDebugInfo(): Promise<any> {
    return {
      isInitialized: this.isInitialized,
      hasUseCases: {
        settings: Boolean(this.settingsUseCase),
        customGesture: Boolean(this.customGestureUseCase),
        learning: Boolean(this.learningUseCase),
        debug: Boolean(this.debugUseCase)
      },
      hasAdapters: {
        canvas: Boolean(this.canvasRenderer),
        messaging: Boolean(this.messagingAdapter)
      },
      hasDomainServices: {
        gestureRecognizer: Boolean(this.gestureRecognizer)
      },
      hasControllers: {
        gestureController: Boolean(this.gestureController)
      },
      gestureState: { ...this.gestureState },
      settings: { ...this.settings },
      canvasSize: this.canvas ? { width: this.canvas.width, height: this.canvas.height } : null,
      customGesturesCount: await this.getCustomGesturesCount(),
      isDebugEnabled: await this.debugUseCase.isDebugEnabled().catch(() => false)
    };
  }
  
  /**
   * カスタムジェスチャー数を取得
   */
  private async getCustomGesturesCount(): Promise<number> {
    try {
      if (this.customGestureUseCase) {
        const customGestures = await this.customGestureUseCase.getAllCustomGestures();
        return customGestures.length;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}

// ページ読み込み完了時に初期化 - Clean Architecture対応
document.addEventListener('DOMContentLoaded', initializeGestureManager);

// 初期化実行関数
async function initializeGestureManager() {
  try {
    console.log('🏗️ Clean Architecture Gesture Manager: Starting initialization...');
    console.log('📍 Current URL:', window.location.href);
    console.log('📦 Chrome available:', typeof chrome !== 'undefined');
    console.log('📄 Document state:', document.readyState);
    
    const manager = new CleanGestureManager();
    await manager.initialize();
    
    // グローバルアクセス用
    (window as any).cleanGestureManager = manager;
    
    console.log('✅ Clean Architecture Gesture Manager: Initialization complete');
    console.log('🔍 Manager debug info:', await manager.getDebugInfo());
    
  } catch (error) {
    console.error('❌ Clean Gesture Manager initialization failed:', error);
    console.error('Stack trace:', (error as Error).stack);
  }
}

// document.readyStateが'complete'の場合は即座に初期化
if (document.readyState === 'loading') {
  // DOMContentLoadedで初期化（上記のイベントリスナーで処理）
  console.log('⏳ Waiting for DOMContentLoaded...');
} else {
  // 既に読み込み完了している場合は即座に初期化
  console.log('🚀 Document already loaded, initializing immediately...');
  initializeGestureManager();
}

// CommonJS export（テスト用）- Clean Architecture対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    CleanGestureManager
  };
}