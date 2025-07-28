/**
 * CustomGestureViewModel
 * カスタムジェスチャー管理画面の表示用データを管理するViewModel
 */

// 依存関係のインポート
let BaseViewModel
if (typeof require !== 'undefined') {
  ({ BaseViewModel } = require('./BaseViewModel'))
}

class CustomGestureViewModel extends BaseViewModel {
  constructor() {
    super()
    
    // 初期状態
    this.setMultiple({
      // カスタムジェスチャー一覧
      customGestures: [],
      
      // 作成中のジェスチャー
      currentGesture: {
        name: '',
        action: '',
        description: '',
        pattern: [],
        isRecording: false
      },
      
      // UI状態
      selectedGestureId: null,
      editingGestureId: null,
      
      // パターン作成状態
      patternCreation: {
        currentPattern: [],
        isRecording: false,
        recordedPoints: []
      },
      
      
      // フィルター・ソート
      filters: {
        showEnabled: true,
        showDisabled: true,
        searchQuery: ''
      },
      
      sortOrder: {
        field: 'name',
        direction: 'asc'
      },
      
      // 操作状態
      operationStatus: {
        message: '',
        type: 'info',
        visible: false
      }
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
    // フィルター済みのジェスチャー一覧
    this.defineComputed('filteredGestures', () => {
      const gestures = this.get('customGestures') || []
      const filters = this.get('filters') || {}
      const searchQuery = (filters.searchQuery || '').toLowerCase()
      
      return gestures.filter(gesture => {
        // 有効/無効フィルター
        if (!filters.showEnabled && gesture.enabled) return false
        if (!filters.showDisabled && !gesture.enabled) return false
        
        // 検索クエリフィルター
        if (searchQuery) {
          const name = (gesture.name || '').toLowerCase()
          const action = (gesture.action || '').toLowerCase()
          const description = (gesture.description || '').toLowerCase()
          
          if (!name.includes(searchQuery) && 
              !action.includes(searchQuery) && 
              !description.includes(searchQuery)) {
            return false
          }
        }
        
        return true
      })
    })
    
    // ソート済みのジェスチャー一覧
    this.defineComputed('sortedGestures', () => {
      const filtered = this.get('filteredGestures') || []
      const sortOrder = this.get('sortOrder') || {}
      
      return [...filtered].sort((a, b) => {
        const field = sortOrder.field || 'name'
        const direction = sortOrder.direction === 'desc' ? -1 : 1
        
        let aVal = a[field]
        let bVal = b[field]
        
        // 特殊なソート処理
        if (field === 'usage') {
          aVal = a.usage?.totalCount || 0
          bVal = b.usage?.totalCount || 0
        } else if (field === 'successRate') {
          aVal = this.calculateSuccessRate(a)
          bVal = this.calculateSuccessRate(b)
        } else if (field === 'lastUsed') {
          aVal = new Date(a.usage?.lastUsed || 0).getTime()
          bVal = new Date(b.usage?.lastUsed || 0).getTime()
        }
        
        // 文字列の場合は大文字小文字を無視
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = bVal.toLowerCase()
        }
        
        if (aVal < bVal) return -1 * Number(direction)
        if (aVal > bVal) return 1 * Number(direction)
        return 0
      })
    })
    
    // 選択されたジェスチャー
    this.defineComputed('selectedGesture', () => {
      const selectedId = this.get('selectedGestureId')
      if (!selectedId) return null
      
      const gestures = this.get('customGestures') || []
      return gestures.find(g => g.id === selectedId) || null
    })
    
    // 編集中のジェスチャー
    this.defineComputed('editingGesture', () => {
      const editingId = this.get('editingGestureId')
      if (!editingId) return null
      
      const gestures = this.get('customGestures') || []
      return gestures.find(g => g.id === editingId) || null
    })
    
    // 統計情報
    this.defineComputed('statistics', () => {
      const gestures = this.get('customGestures') || []
      
      const totalGestures = gestures.length
      const enabledGestures = gestures.filter(g => g.enabled).length
      const totalUsage = gestures.reduce((sum, g) => sum + (g.usage?.totalCount || 0), 0)
      
      let averageSuccessRate = 0
      if (gestures.length > 0) {
        const totalSuccessRate = gestures.reduce((sum, g) => sum + this.calculateSuccessRate(g), 0)
        averageSuccessRate = totalSuccessRate / gestures.length
      }
      
      return {
        totalGestures,
        enabledGestures,
        disabledGestures: totalGestures - enabledGestures,
        totalUsage,
        averageSuccessRate,
        enabledRatio: totalGestures > 0 ? enabledGestures / totalGestures : 0
      }
    })
    
    // パターンの有効性
    this.defineComputed('isPatternValid', () => {
      const pattern = this.get('patternCreation')?.currentPattern || []
      return pattern.length >= 1 // 最低1つの方向が必要
    })
    
    // 現在のジェスチャーの有効性
    this.defineComputed('isCurrentGestureValid', () => {
      const current = this.get('currentGesture') || {}
      return current.name && 
             current.action && 
             current.pattern && 
             current.pattern.length > 0
    })
  }

  /**
   * バリデーションルールを作成
   * @private
   * @returns {Object}
   */
  createValidationRules() {
    return {
      currentGesture: (value) => {
        if (!value || typeof value !== 'object') {
          return 'Current gesture must be an object'
        }
        
        if (!value.name || value.name.trim().length === 0) {
          return 'Gesture name is required'
        }
        
        if (value.name.length > 50) {
          return 'Gesture name must be 50 characters or less'
        }
        
        if (!value.action || value.action.trim().length === 0) {
          return 'Gesture action is required'
        }
        
        if (!Array.isArray(value.pattern) || value.pattern.length === 0) {
          return 'Gesture pattern is required'
        }
        
        return true
      }
    }
  }

  /**
   * Application層のCustomGestureDTOから一覧を読み込み
   * @param {Array} customGestureDTOs - CustomGestureDTO配列
   */
  loadCustomGestures(customGestureDTOs) {
    if (!Array.isArray(customGestureDTOs)) {
      this.set('customGestures', [])
      return
    }
    
    const gestures = customGestureDTOs.map(dto => ({
      id: dto.id,
      name: dto.name,
      action: dto.action,
      enabled: dto.enabled,
      description: dto.description || '',
      pattern: dto.pattern || [],
      usage: {
        totalCount: dto.usage?.totalCount || 0,
        successCount: dto.usage?.successCount || 0,
        lastUsed: dto.usage?.lastUsed || null
      },
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt
    }))
    
    this.set('customGestures', gestures)
  }


  /**
   * 新しいジェスチャーの作成を開始
   */
  startCreatingGesture() {
    this.set('currentGesture', {
      name: '',
      action: '',
      description: '',
      pattern: [],
      isRecording: false
    })
    
    this.set('editingGestureId', null)
    this.set('patternCreation', {
      currentPattern: [],
      isRecording: false,
      recordedPoints: []
    })
  }

  /**
   * 既存ジェスチャーの編集を開始
   * @param {string} gestureId - ジェスチャーID
   */
  startEditingGesture(gestureId) {
    const gesture = this.get('customGestures')?.find(g => g.id === gestureId)
    if (!gesture) return
    
    this.set('editingGestureId', gestureId)
    this.set('currentGesture', {
      name: gesture.name,
      action: gesture.action,
      description: gesture.description || '',
      pattern: [...gesture.pattern],
      isRecording: false
    })
    
    this.set('patternCreation', {
      currentPattern: [...gesture.pattern],
      isRecording: false,
      recordedPoints: []
    })
  }

  /**
   * ジェスチャー編集をキャンセル
   */
  cancelEditing() {
    this.set('editingGestureId', null)
    this.set('currentGesture', {
      name: '',
      action: '',
      description: '',
      pattern: [],
      isRecording: false
    })
    
    this.set('patternCreation', {
      currentPattern: [],
      isRecording: false,
      recordedPoints: []
    })
  }

  /**
   * パターン記録を開始
   */
  startPatternRecording() {
    this.set('patternCreation', {
      ...this.get('patternCreation'),
      isRecording: true,
      recordedPoints: [],
      currentPattern: []
    })
  }

  /**
   * パターン記録を停止
   */
  stopPatternRecording() {
    this.set('patternCreation', {
      ...this.get('patternCreation'),
      isRecording: false
    })
  }

  /**
   * 記録ポイントを追加
   * @param {Object} point - ポイント {x, y, timestamp}
   */
  addRecordedPoint(point) {
    const patternCreation = this.get('patternCreation')
    if (!patternCreation.isRecording) return
    
    const recordedPoints = [...patternCreation.recordedPoints, point]
    
    this.set('patternCreation', {
      ...patternCreation,
      recordedPoints: recordedPoints
    })
  }

  /**
   * 記録されたポイントからパターンを生成
   * @param {Array} directions - 方向配列
   */
  generatePatternFromDirections(directions) {
    if (!Array.isArray(directions)) return
    
    const patternCreation = this.get('patternCreation')
    const currentGesture = this.get('currentGesture')
    
    this.set('patternCreation', {
      ...patternCreation,
      currentPattern: directions
    })
    
    this.set('currentGesture', {
      ...currentGesture,
      pattern: directions
    })
  }

  /**
   * 手動でパターンに方向を追加
   * @param {string} direction - 方向 ('up', 'down', 'left', 'right')
   */
  addDirectionToPattern(direction) {
    const patternCreation = this.get('patternCreation')
    const currentGesture = this.get('currentGesture')
    const newPattern = [...patternCreation.currentPattern, direction]
    
    this.set('patternCreation', {
      ...patternCreation,
      currentPattern: newPattern
    })
    
    this.set('currentGesture', {
      ...currentGesture,
      pattern: newPattern
    })
  }

  /**
   * パターンの最後の方向を削除
   */
  removeLastDirection() {
    const patternCreation = this.get('patternCreation')
    const currentGesture = this.get('currentGesture')
    const newPattern = patternCreation.currentPattern.slice(0, -1)
    
    this.set('patternCreation', {
      ...patternCreation,
      currentPattern: newPattern
    })
    
    this.set('currentGesture', {
      ...currentGesture,
      pattern: newPattern
    })
  }

  /**
   * パターンをクリア
   */
  clearPattern() {
    const patternCreation = this.get('patternCreation')
    const currentGesture = this.get('currentGesture')
    
    this.set('patternCreation', {
      ...patternCreation,
      currentPattern: [],
      recordedPoints: []
    })
    
    this.set('currentGesture', {
      ...currentGesture,
      pattern: []
    })
  }

  /**
   * 現在のジェスチャー情報を更新
   * @param {Object} updates - 更新データ
   */
  updateCurrentGesture(updates) {
    const currentGesture = { ...this.get('currentGesture'), ...updates }
    this.set('currentGesture', currentGesture)
  }

  /**
   * ジェスチャーを選択
   * @param {string} gestureId - ジェスチャーID
   */
  selectGesture(gestureId) {
    this.set('selectedGestureId', gestureId)
  }

  /**
   * フィルターを更新
   * @param {Object} filterUpdates - フィルター更新データ
   */
  updateFilters(filterUpdates) {
    const filters = { ...this.get('filters'), ...filterUpdates }
    this.set('filters', filters)
  }

  /**
   * ソート順を更新
   * @param {string} field - ソートフィールド
   * @param {string} [direction] - ソート方向 ('asc' | 'desc')
   */
  updateSortOrder(field, direction) {
    const currentSort = this.get('sortOrder')
    
    // 同じフィールドの場合は方向を切り替え
    if (currentSort.field === field && !direction) {
      direction = currentSort.direction === 'asc' ? 'desc' : 'asc'
    }
    
    this.set('sortOrder', {
      field: field,
      direction: direction || 'asc'
    })
  }

  /**
   * 操作ステータスを表示
   * @param {string} message - メッセージ
   * @param {string} type - タイプ ('success', 'error', 'warning', 'info')
   * @param {number} [duration] - 表示時間（ミリ秒）
   */
  showOperationStatus(message, type = 'info', duration = 3000) {
    this.set('operationStatus', {
      message: message,
      type: type,
      visible: true,
      timestamp: new Date().toISOString()
    })
    
    if (duration > 0) {
      setTimeout(() => {
        this.hideOperationStatus()
      }, duration)
    }
  }

  /**
   * 操作ステータスを非表示
   */
  hideOperationStatus() {
    this.set('operationStatus', {
      ...this.get('operationStatus'),
      visible: false
    })
  }

  /**
   * 成功率を計算
   * @private
   * @param {Object} gesture - ジェスチャーオブジェクト
   * @returns {number}
   */
  calculateSuccessRate(gesture) {
    if (!gesture.usage || gesture.usage.totalCount === 0) {
      return 0
    }
    
    return (gesture.usage.successCount / gesture.usage.totalCount) * 100
  }

  /**
   * Application層用のDTOに変換
   * @returns {Object}
   */
  getCurrentGestureDTO() {
    const current = this.get('currentGesture')
    return {
      name: current.name?.trim() || '',
      action: current.action?.trim() || '',
      description: current.description?.trim() || '',
      pattern: current.pattern || []
    }
  }

  /**
   * 表示用のジェスチャー情報を取得
   * @param {string} gestureId - ジェスチャーID
   * @returns {Object|null}
   */
  getGestureDisplayInfo(gestureId) {
    const gesture = this.get('customGestures')?.find(g => g.id === gestureId)
    if (!gesture) return null
    
    return {
      id: gesture.id,
      name: gesture.name,
      action: gesture.action,
      description: gesture.description,
      enabled: gesture.enabled,
      pattern: gesture.pattern,
      patternDisplay: this.formatPatternForDisplay(gesture.pattern),
      usage: {
        totalCount: gesture.usage?.totalCount || 0,
        successRate: this.calculateSuccessRate(gesture),
        lastUsed: gesture.usage?.lastUsed ? new Date(gesture.usage.lastUsed).toLocaleString() : '未使用'
      },
      createdAt: gesture.createdAt ? new Date(gesture.createdAt).toLocaleString() : '',
      updatedAt: gesture.updatedAt ? new Date(gesture.updatedAt).toLocaleString() : ''
    }
  }

  /**
   * パターンを表示用にフォーマット
   * @private
   * @param {Array} pattern - パターン配列
   * @returns {string}
   */
  formatPatternForDisplay(pattern) {
    if (!Array.isArray(pattern)) return ''
    
    const arrows = {
      'up': '↑',
      'down': '↓',
      'left': '←',
      'right': '→'
    }
    
    return pattern.map(direction => arrows[direction] || direction).join('')
  }

  /**
   * エクスポート用データを取得
   * @returns {Object}
   */
  getExportData() {
    return {
      customGestures: this.get('customGestures'),
      statistics: this.get('statistics'),
      exportDate: new Date().toISOString()
    }
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CustomGestureViewModel }
}