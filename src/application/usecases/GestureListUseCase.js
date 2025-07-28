/**
 * ジェスチャー一覧管理ユースケース
 * Application層 - ビジネスロジックの調整
 */

const { GestureEntity } = require('../../domain/entities/GestureEntity')

class GestureListUseCase {
  constructor(gestureRepository, settingsRepository) {
    this.gestureRepository = gestureRepository
    this.settingsRepository = settingsRepository
  }

  /**
   * 全ジェスチャー（デフォルト + カスタム）を取得
   */
  async getAllGestures() {
    try {
      
      // デフォルトジェスチャーを取得
      const defaultGestures = await this.getDefaultGestures()
      
      // カスタムジェスチャーを取得
      const customGestures = await this.gestureRepository.getCustomGestures()
      
      // エンティティに変換
      const allGestures = [
        ...defaultGestures.map(g => GestureEntity.fromPlainObject(g)),
        ...customGestures.map(g => GestureEntity.fromPlainObject({...g, type: 'custom'}))
      ]
      
      return allGestures
      
    } catch (error) {
      console.error('🚨 GestureListUseCase: Failed to load gestures:', error)
      throw new Error(`Failed to load gesture list: ${error.message}`)
    }
  }

  /**
   * デフォルトジェスチャーを状態込みで取得
   */
  async getDefaultGestures() {
    const settings = await this.settingsRepository.getSettings()
    const gestureStates = settings.defaultGestureStates || {}
    
    return [
      // 基本ジェスチャー
      {
        id: 'left',
        name: 'ブラウザの戻る',
        pattern: '←',
        action: 'back',
        type: 'default',
        category: 'basic',
        description: '前のページに戻ります',
        enabled: gestureStates.left !== false
      },
      {
        id: 'right',
        name: 'ブラウザの進む',
        pattern: '→',
        action: 'forward',
        type: 'default',
        category: 'basic',
        description: '次のページに進みます',
        enabled: gestureStates.right !== false
      },
      {
        id: 'up',
        name: 'ページトップへスクロール',
        pattern: '↑',
        action: 'scroll_up',
        type: 'default',
        category: 'basic',
        description: 'ページの最上部にスクロールします',
        enabled: gestureStates.up !== false
      },
      {
        id: 'down',
        name: 'ページボトムへスクロール',
        pattern: '↓',
        action: 'scroll_down',
        type: 'default',
        category: 'basic',
        description: 'ページの最下部にスクロールします',
        enabled: gestureStates.down !== false
      },
      // 複合ジェスチャー
      {
        id: 'downright',
        name: 'タブを閉じる',
        pattern: '↓→',
        action: 'close_tab',
        type: 'default',
        category: 'advanced',
        description: '現在のタブを閉じます',
        enabled: gestureStates.downright !== false
      },
      {
        id: 'upright',
        name: '新しいタブ',
        pattern: '↑→',
        action: 'new_tab',
        type: 'default',
        category: 'advanced',
        description: '新しいタブを開きます',
        enabled: gestureStates.upright !== false
      },
      {
        id: 'rightdown',
        name: 'タブを複製',
        pattern: '→↓',
        action: 'duplicate_tab',
        type: 'default',
        category: 'advanced',
        description: '現在のタブを複製します',
        enabled: gestureStates.rightdown !== false
      },
      {
        id: 'updown',
        name: 'ページ更新',
        pattern: '↑↓',
        action: 'refresh',
        type: 'default',
        category: 'advanced',
        description: 'ページをリロードします',
        enabled: gestureStates.updown !== false
      },
      // Phase 10新機能
      {
        id: 'super_refresh',
        name: 'スーパーリロード',
        pattern: '↑↓↑',
        action: 'super_refresh',
        type: 'default',
        category: 'advanced',
        description: 'キャッシュクリア付きリロード',
        enabled: gestureStates.super_refresh !== false,
        isNew: true
      },
      {
        id: 'prev_tab',
        name: '前のタブ',
        pattern: '←→',
        action: 'prev_tab',
        type: 'default',
        category: 'advanced',
        description: '前のタブに切り替え',
        enabled: gestureStates.prev_tab !== false,
        isNew: true
      },
      {
        id: 'next_tab',
        name: '次のタブ',
        pattern: '→←',
        action: 'next_tab',
        type: 'default',
        category: 'advanced',
        description: '次のタブに切り替え',
        enabled: gestureStates.next_tab !== false,
        isNew: true
      }
    ]
  }

  /**
   * ジェスチャーの状態を切り替え
   */
  async toggleGestureStatus(gestureId) {
    
    try {
      const allGestures = await this.getAllGestures()
      const gesture = allGestures.find(g => g.id === gestureId)
      
      if (!gesture) {
        throw new Error(`Gesture not found: ${gestureId}`)
      }

      // 状態を切り替え
      const newStatus = gesture.toggle()
      
      // 永続化
      if (gesture.type === 'custom') {
        await this.gestureRepository.updateCustomGesture(gestureId, {enabled: newStatus})
      } else {
        await this.saveDefaultGestureState(gestureId, newStatus)
      }
      
      return newStatus
      
    } catch (error) {
      console.error('🚨 GestureListUseCase: Failed to toggle gesture:', error)
      throw new Error(`Failed to toggle gesture: ${error.message}`)
    }
  }

  /**
   * デフォルトジェスチャーの状態を保存
   */
  async saveDefaultGestureState(gestureId, enabled) {
    const settings = await this.settingsRepository.getSettings()
    
    if (!settings.defaultGestureStates) {
      settings.defaultGestureStates = {}
    }
    
    settings.defaultGestureStates[gestureId] = enabled
    await this.settingsRepository.saveSettings(settings)
  }

  /**
   * ジェスチャーをフィルタリング
   */
  filterGestures(gestures, { searchQuery = '', filter = 'all' } = {}) {
    return gestures.filter(gesture => {
      // 検索クエリでフィルタリング
      const matchesSearch = !searchQuery || 
        gesture.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gesture.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gesture.getDisplayPattern().includes(searchQuery)

      // カテゴリでフィルタリング
      const matchesFilter = filter === 'all' ||
        (filter === 'default' && gesture.type === 'default') ||
        (filter === 'custom' && gesture.type === 'custom') ||
        (filter === 'enabled' && gesture.enabled) ||
        (filter === 'disabled' && !gesture.enabled)

      return matchesSearch && matchesFilter
    })
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureListUseCase }
}