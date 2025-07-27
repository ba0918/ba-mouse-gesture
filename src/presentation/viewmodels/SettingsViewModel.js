/**
 * SettingsViewModel
 * 設定画面の表示用データを管理するViewModel
 */

// 依存関係のインポート
let BaseViewModel
if (typeof require !== 'undefined') {
  ({ BaseViewModel } = require('./BaseViewModel'))
}

class SettingsViewModel extends BaseViewModel {
  constructor() {
    super()
    
    // デフォルト設定値
    this.setMultiple({
      // 基本設定
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      
      // ジェスチャー有効状態
      gestureStates: {
        left: true,
        right: true,
        up: true,
        down: true,
        downright: true,
        upright: true,
        rightdown: true,
        updown: true,
        super_refresh: true,
        prev_tab: true,
        next_tab: true
      },
      
      // デバッグ設定
      debugSettings: {
        enabled: true,
        logLevel: 2,
        showStatus: true,
        statusPosition: 'top-right'
      },
      
      // UI状態
      saveStatus: {
        message: '',
        type: 'info',
        visible: false
      },
      
      // メタデータ
      lastModified: null,
      version: '1.0.0'
    }, true)
    
    // 計算済みプロパティを定義
    this.defineComputedProperties()
    
    // バリデーションルールを設定
    this.validationRules = this.createValidationRules()
  }

  /**
   * 計算済みプロパティを定義
   * @private
   */
  defineComputedProperties() {
    // 有効なジェスチャー数
    this.defineComputed('enabledGesturesCount', () => {
      const states = this.get('gestureStates') || {}
      return Object.values(states).filter(Boolean).length
    })
    
    // 総ジェスチャー数
    this.defineComputed('totalGesturesCount', () => {
      const states = this.get('gestureStates') || {}
      return Object.keys(states).length
    })
    
    // 除外サイト数
    this.defineComputed('excludeListCount', () => {
      const excludeList = this.get('excludeList') || []
      return excludeList.length
    })
    
    // ジェスチャー有効率
    this.defineComputed('gestureEnabledRatio', () => {
      const enabled = this.get('enabledGesturesCount')
      const total = this.get('totalGesturesCount')
      return total > 0 ? (enabled / total) : 0
    })
    
    // 設定の有効性チェック
    this.defineComputed('isValid', () => {
      const validation = this.validate(this.validationRules)
      return validation.isValid
    })
    
    // プレビュー用のスタイル設定
    this.defineComputed('previewStyle', () => {
      return {
        color: this.get('strokeColor'),
        width: this.get('strokeWidth'),
        preview: `${this.get('strokeWidth')}px solid ${this.get('strokeColor')}`
      }
    })
    
    // デバッグレベルの文字列表現
    this.defineComputed('debugLevelText', () => {
      const level = this.get('debugSettings')?.logLevel || 0
      const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG']
      return levels[level] || 'UNKNOWN'
    })
  }

  /**
   * バリデーションルールを作成
   * @private
   * @returns {Object}
   */
  createValidationRules() {
    return {
      enabled: {
        type: 'boolean',
        required: true
      },
      
      strokeColor: {
        type: 'string',
        required: true,
        pattern: /^#[0-9A-F]{6}$/i
      },
      
      strokeWidth: {
        type: 'number',
        required: true,
        min: 1,
        max: 10
      },
      
      gestureThreshold: {
        type: 'number',
        required: true,
        min: 5,
        max: 100
      },
      
      excludeList: {
        type: 'object', // Array
        required: true
      },
      
      gestureStates: {
        type: 'object',
        required: true
      },
      
      debugSettings: (value) => {
        if (!value || typeof value !== 'object') {
          return 'Debug settings must be an object'
        }
        
        if (typeof value.enabled !== 'boolean') {
          return 'Debug enabled must be boolean'
        }
        
        if (typeof value.logLevel !== 'number' || value.logLevel < 0 || value.logLevel > 3) {
          return 'Debug log level must be 0-3'
        }
        
        return true
      }
    }
  }

  /**
   * Application層のSettingsDTOから設定を読み込み
   * @param {Object} settingsDTO - SettingsDTO
   */
  loadFromDTO(settingsDTO) {
    if (!settingsDTO) {
      return
    }
    
    this.setMultiple({
      enabled: settingsDTO.enabled,
      strokeColor: settingsDTO.stroke?.color || this.get('strokeColor'),
      strokeWidth: settingsDTO.stroke?.width || this.get('strokeWidth'),
      gestureThreshold: settingsDTO.gestureThreshold,
      excludeList: settingsDTO.excludeList || [],
      gestureStates: settingsDTO.gestureStates || this.get('gestureStates'),
      debugSettings: settingsDTO.debugSettings || this.get('debugSettings'),
      lastModified: settingsDTO.lastModified,
      version: settingsDTO.version || this.get('version')
    })
  }

  /**
   * Application層用のDTOに変換
   * @returns {Object} SettingsDTO
   */
  toDTO() {
    return {
      enabled: this.get('enabled'),
      stroke: {
        color: this.get('strokeColor'),
        width: this.get('strokeWidth')
      },
      gestureThreshold: this.get('gestureThreshold'),
      excludeList: this.get('excludeList'),
      gestureStates: this.get('gestureStates'),
      debugSettings: this.get('debugSettings'),
      version: this.get('version'),
      lastModified: this.get('lastModified')
    }
  }

  /**
   * 特定のジェスチャーの有効/無効を切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   */
  toggleGesture(gestureId, enabled) {
    const gestureStates = { ...this.get('gestureStates') }
    gestureStates[gestureId] = enabled
    this.set('gestureStates', gestureStates)
  }

  /**
   * 除外サイトを追加
   * @param {string} pattern - URLパターン
   * @returns {boolean} 追加に成功したか
   */
  addExcludeSite(pattern) {
    if (!pattern || typeof pattern !== 'string') {
      return false
    }
    
    const excludeList = [...this.get('excludeList')]
    
    // 重複チェック
    if (excludeList.includes(pattern)) {
      return false
    }
    
    excludeList.push(pattern)
    this.set('excludeList', excludeList)
    return true
  }

  /**
   * 除外サイトを削除
   * @param {string} pattern - URLパターン
   * @returns {boolean} 削除に成功したか
   */
  removeExcludeSite(pattern) {
    const excludeList = [...this.get('excludeList')]
    const index = excludeList.indexOf(pattern)
    
    if (index === -1) {
      return false
    }
    
    excludeList.splice(index, 1)
    this.set('excludeList', excludeList)
    return true
  }

  /**
   * デバッグ設定を更新
   * @param {Object} updates - 更新するデバッグ設定
   */
  updateDebugSettings(updates) {
    if (!updates || typeof updates !== 'object') {
      return
    }
    
    const debugSettings = { ...this.get('debugSettings'), ...updates }
    this.set('debugSettings', debugSettings)
  }

  /**
   * 軌跡設定を更新
   * @param {string} color - 色
   * @param {number} width - 太さ
   */
  updateStrokeSettings(color, width) {
    if (color !== undefined) {
      this.set('strokeColor', color)
    }
    if (width !== undefined) {
      this.set('strokeWidth', width)
    }
  }

  /**
   * 保存ステータスを表示
   * @param {string} message - メッセージ
   * @param {string} type - タイプ ('success', 'error', 'warning', 'info')
   * @param {number} [duration] - 表示時間（ミリ秒）
   */
  showSaveStatus(message, type = 'info', duration = 3000) {
    this.set('saveStatus', {
      message: message,
      type: type,
      visible: true,
      timestamp: new Date().toISOString()
    })
    
    // 指定時間後に非表示
    if (duration > 0) {
      setTimeout(() => {
        this.hideSaveStatus()
      }, duration)
    }
  }

  /**
   * 保存ステータスを非表示
   */
  hideSaveStatus() {
    this.set('saveStatus', {
      ...this.get('saveStatus'),
      visible: false
    })
  }

  /**
   * 設定をデフォルトにリセット
   */
  resetToDefaults() {
    // デフォルト値で新しいViewModelを作成し、そのデータをコピー
    const defaultViewModel = new SettingsViewModel()
    const defaultData = defaultViewModel.getAll()
    
    // メタデータは保持
    defaultData.lastModified = new Date().toISOString()
    defaultData.version = this.get('version')
    
    this.setMultiple(defaultData)
    defaultViewModel.dispose()
  }

  /**
   * 設定の変更チェック
   * @param {Object} originalSettings - 元の設定
   * @returns {boolean} 変更があるか
   */
  hasChanges(originalSettings) {
    if (!originalSettings) {
      return true
    }
    
    const current = this.toDTO()
    
    // 深い比較（簡易版）
    return JSON.stringify(current) !== JSON.stringify(originalSettings)
  }

  /**
   * 設定データのサイズを取得（バイト数概算）
   * @returns {number}
   */
  getDataSize() {
    const jsonString = JSON.stringify(this.getAll())
    return new window.Blob([jsonString]).size
  }

  /**
   * 設定の統計情報を取得
   * @returns {Object}
   */
  getStatistics() {
    return {
      enabledGesturesCount: this.get('enabledGesturesCount'),
      totalGesturesCount: this.get('totalGesturesCount'),
      excludeListCount: this.get('excludeListCount'),
      gestureEnabledRatio: this.get('gestureEnabledRatio'),
      dataSize: this.getDataSize(),
      isValid: this.get('isValid'),
      lastModified: this.get('lastModified')
    }
  }

  /**
   * UI表示用の設定項目リストを取得
   * @returns {Array}
   */
  getDisplayItems() {
    const gestureStates = this.get('gestureStates') || {}
    
    return [
      {
        category: 'basic',
        label: '基本設定',
        items: [
          { key: 'enabled', label: '機能有効', type: 'boolean', value: this.get('enabled') },
          { key: 'strokeColor', label: '軌跡色', type: 'color', value: this.get('strokeColor') },
          { key: 'strokeWidth', label: '軌跡太さ', type: 'range', value: this.get('strokeWidth'), min: 1, max: 10 },
          { key: 'gestureThreshold', label: '感度', type: 'range', value: this.get('gestureThreshold'), min: 5, max: 100 }
        ]
      },
      {
        category: 'gestures',
        label: 'ジェスチャー設定',
        items: Object.keys(gestureStates).map(gestureId => ({
          key: `gesture_${gestureId}`,
          label: this.getGestureDisplayName(gestureId),
          type: 'boolean',
          value: gestureStates[gestureId]
        }))
      },
      {
        category: 'exclusion',
        label: '除外設定',
        items: [
          { key: 'excludeList', label: '除外サイト', type: 'list', value: this.get('excludeList') }
        ]
      },
      {
        category: 'debug',
        label: 'デバッグ設定',
        items: [
          { key: 'debugEnabled', label: 'デバッグ有効', type: 'boolean', value: this.get('debugSettings')?.enabled },
          { key: 'debugLogLevel', label: 'ログレベル', type: 'select', value: this.get('debugSettings')?.logLevel, options: [
            { value: 0, label: 'ERROR' },
            { value: 1, label: 'WARN' },
            { value: 2, label: 'INFO' },
            { value: 3, label: 'DEBUG' }
          ]}
        ]
      }
    ]
  }

  /**
   * ジェスチャーの表示名を取得
   * @private
   * @param {string} gestureId - ジェスチャーID
   * @returns {string}
   */
  getGestureDisplayName(gestureId) {
    const displayNames = {
      left: '戻る（←）',
      right: '進む（→）',
      up: '上スクロール（↑）',
      down: '下スクロール（↓）',
      downright: 'タブを閉じる（↓→）',
      upright: '新しいタブ（↑→）',
      rightdown: 'タブ複製（→↓）',
      updown: 'リロード（↑↓）',
      super_refresh: 'スーパーリロード（↑↓↑）',
      prev_tab: '前のタブ（←→）',
      next_tab: '次のタブ（→←）'
    }
    
    return displayNames[gestureId] || gestureId
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsViewModel }
}