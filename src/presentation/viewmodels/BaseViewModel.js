/**
 * BaseViewModel
 * すべてのViewModelの基底クラス
 * 表示用データの管理・変換・監視機能を提供
 */

class BaseViewModel {
  constructor() {
    this.data = {}
    this.changeListeners = []
    this.computedProperties = new Map()
    this.isUpdating = false
  }

  /**
   * データを取得
   * @param {string} key - データキー
   * @returns {*}
   */
  get(key) {
    // 計算済みプロパティの場合
    if (this.computedProperties.has(key)) {
      const computedFn = this.computedProperties.get(key)
      return computedFn()
    }

    return this.data[key]
  }

  /**
   * データを設定
   * @param {string} key - データキー
   * @param {*} value - 設定する値
   * @param {boolean} [silent] - 変更通知を抑制するか
   */
  set(key, value, silent = false) {
    const oldValue = this.data[key]
    
    // 値に変更がない場合は何もしない
    if (oldValue === value) {
      return
    }

    this.data[key] = value

    if (!silent && !this.isUpdating) {
      this.notifyChange(key, value, oldValue)
    }
  }

  /**
   * 複数のデータを一括設定
   * @param {Object} updates - 更新するデータ
   * @param {boolean} [silent] - 変更通知を抑制するか
   */
  setMultiple(updates, silent = false) {
    if (!updates || typeof updates !== 'object') {
      return
    }

    this.isUpdating = true
    const changes = []

    try {
      Object.keys(updates).forEach(key => {
        const oldValue = this.data[key]
        const newValue = updates[key]
        
        if (oldValue !== newValue) {
          this.data[key] = newValue
          changes.push({ key, newValue, oldValue })
        }
      })
    } finally {
      this.isUpdating = false
    }

    // 変更があった場合のみ通知
    if (!silent && changes.length > 0) {
      this.notifyBatchChange(changes)
    }
  }

  /**
   * データを削除
   * @param {string} key - データキー
   * @param {boolean} [silent] - 変更通知を抑制するか
   */
  remove(key, silent = false) {
    if (!(key in this.data)) {
      return
    }

    const oldValue = this.data[key]
    delete this.data[key]

    if (!silent) {
      this.notifyChange(key, undefined, oldValue)
    }
  }

  /**
   * データの存在確認
   * @param {string} key - データキー
   * @returns {boolean}
   */
  has(key) {
    return key in this.data || this.computedProperties.has(key)
  }

  /**
   * すべてのデータを取得
   * @returns {Object}
   */
  getAll() {
    const result = { ...this.data }
    
    // 計算済みプロパティも含める
    this.computedProperties.forEach((computedFn, key) => {
      result[key] = computedFn()
    })
    
    return result
  }

  /**
   * すべてのデータをクリア
   * @param {boolean} [silent] - 変更通知を抑制するか
   */
  clear(silent = false) {
    const oldData = { ...this.data }
    this.data = {}

    if (!silent && Object.keys(oldData).length > 0) {
      this.notifyChange('*', {}, oldData)
    }
  }

  /**
   * 計算済みプロパティを定義
   * @param {string} key - プロパティ名
   * @param {Function} computeFn - 計算関数
   */
  defineComputed(key, computeFn) {
    if (typeof computeFn !== 'function') {
      throw new Error('Computed property function is required')
    }

    this.computedProperties.set(key, computeFn)
  }

  /**
   * 計算済みプロパティを削除
   * @param {string} key - プロパティ名
   */
  removeComputed(key) {
    this.computedProperties.delete(key)
  }

  /**
   * データ変更リスナーを追加
   * @param {Function} listener - リスナー関数 (key, newValue, oldValue) => void
   */
  onChange(listener) {
    if (typeof listener === 'function') {
      this.changeListeners.push(listener)
    }
  }

  /**
   * データ変更リスナーを削除
   * @param {Function} listener - 削除するリスナー関数
   */
  offChange(listener) {
    const index = this.changeListeners.indexOf(listener)
    if (index > -1) {
      this.changeListeners.splice(index, 1)
    }
  }

  /**
   * 特定のキーの変更を監視
   * @param {string} key - 監視するキー
   * @param {Function} listener - リスナー関数 (newValue, oldValue) => void
   */
  watch(key, listener) {
    if (typeof listener !== 'function') {
      return
    }

    const wrapperListener = (changedKey, newValue, oldValue) => {
      if (changedKey === key || changedKey === '*') {
        listener(newValue, oldValue)
      }
    }

    this.onChange(wrapperListener)
    
    // 削除用の関数を返す
    return () => this.offChange(wrapperListener)
  }

  /**
   * データを検証
   * @param {Object} [validationRules] - 検証ルール
   * @returns {Object} 検証結果 { isValid: boolean, errors: Array }
   */
  validate(validationRules = {}) {
    const errors = []

    Object.keys(validationRules).forEach(key => {
      const rule = validationRules[key]
      const value = this.get(key)

      if (typeof rule === 'function') {
        const result = rule(value, key, this.data)
        if (result !== true && typeof result === 'string') {
          errors.push({ key, message: result })
        }
      } else if (typeof rule === 'object') {
        // 複数のルールを処理
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push({ key, message: `${key} is required` })
        }

        if (rule.type && value !== undefined && typeof value !== rule.type) {
          errors.push({ key, message: `${key} must be of type ${rule.type}` })
        }

        if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
          errors.push({ key, message: `${key} must be at least ${rule.min}` })
        }

        if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
          errors.push({ key, message: `${key} must be at most ${rule.max}` })
        }

        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push({ key, message: `${key} format is invalid` })
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }

  /**
   * データを別の形式に変換
   * @param {Object} transformMap - 変換マップ { newKey: oldKey | function }
   * @returns {Object}
   */
  transform(transformMap) {
    const result = {}

    Object.keys(transformMap).forEach(newKey => {
      const transformer = transformMap[newKey]
      
      if (typeof transformer === 'string') {
        // 単純なキー変換
        result[newKey] = this.get(transformer)
      } else if (typeof transformer === 'function') {
        // 関数による変換
        result[newKey] = transformer(this.data, this)
      }
    })

    return result
  }

  /**
   * ViewModelの状態をスナップショット
   * @returns {Object}
   */
  snapshot() {
    return {
      data: { ...this.data },
      computedKeys: Array.from(this.computedProperties.keys()),
      listenersCount: this.changeListeners.length,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * スナップショットから状態を復元
   * @param {Object} snapshot - スナップショットデータ
   * @param {boolean} [silent] - 変更通知を抑制するか
   */
  restore(snapshot, silent = false) {
    if (!snapshot || !snapshot.data) {
      throw new Error('Invalid snapshot data')
    }

    this.clear(true) // 一旦クリア
    this.setMultiple(snapshot.data, silent)
  }

  // Private methods

  /**
   * 変更通知
   * @private
   * @param {string} key - 変更されたキー
   * @param {*} newValue - 新しい値
   * @param {*} oldValue - 古い値
   */
  notifyChange(key, newValue, oldValue) {
    this.changeListeners.forEach(listener => {
      try {
        listener(key, newValue, oldValue)
      } catch (error) {
        console.error('ViewModel change listener error:', error)
      }
    })
  }

  /**
   * 一括変更通知
   * @private
   * @param {Array} changes - 変更リスト
   */
  notifyBatchChange(changes) {
    changes.forEach(({ key, newValue, oldValue }) => {
      this.notifyChange(key, newValue, oldValue)
    })
  }

  /**
   * リソースのクリーンアップ
   */
  dispose() {
    this.changeListeners = []
    this.computedProperties.clear()
    this.data = {}
    this.isUpdating = false
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BaseViewModel }
}