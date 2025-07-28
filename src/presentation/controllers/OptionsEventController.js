/**
 * OptionsEventController
 * 設定画面のUIイベント処理専用クラス
 * Clean Architecture - Presentation層
 */

class OptionsEventController {
  /**
   * @param {Object} dependencies - 依存関係
   * @param {Object} dependencies.settingsUseCase - 設定UseCase
   * @param {Object} dependencies.customGestureUseCase - カスタムジェスチャーUseCase
   * @param {Function} dependencies.showStatus - ステータス表示関数
   * @param {Function} dependencies.updateElement - 要素更新関数
   * @param {Function} dependencies.updatePreview - プレビュー更新関数
   * @param {Function} dependencies.renderExcludeList - 除外リスト描画関数
   */
  constructor(dependencies) {
    this.settingsUseCase = dependencies.settingsUseCase
    this.customGestureUseCase = dependencies.customGestureUseCase
    this.showStatus = dependencies.showStatus
    this.updateElement = dependencies.updateElement
    this.updatePreview = dependencies.updatePreview
    this.renderExcludeList = dependencies.renderExcludeList
    
    // カスタムジェスチャー作成用の状態
    this.currentPattern = []
    
    // フォーム状態の一時保存用
    this.formStateBackup = {
      name: '',
      action: '',
      pattern: []
    }
  }

  /**
   * 基本設定のイベントを設定
   */
  setupBasicSettingsEvents() {
    // 機能有効/無効
    this.bindEvent('enabled', 'change', async (e) => {
      await this.settingsUseCase.toggleExtension(e.target.checked)
      this.showStatus('設定を保存しました', 'success')
    })

    // 軌跡色
    this.bindEvent('strokeColor', 'change', async (e) => {
      const width = document.getElementById('strokeWidth')?.value || 3
      await this.settingsUseCase.updateStrokeSettings(e.target.value, parseInt(width))
      this.updatePreview()
      this.showStatus('軌跡色を変更しました', 'success')
    })

    // 軌跡幅
    this.bindEvent('strokeWidth', 'input', async (e) => {
      const width = parseInt(e.target.value)
      const color = document.getElementById('strokeColor')?.value || '#2196F3'
      
      await this.settingsUseCase.updateStrokeSettings(color, width)
      this.updateElement('strokeWidthValue', `${width}px`)
      this.updatePreview()
      this.showStatus('軌跡幅を変更しました', 'success', 1500)
    })

    // ジェスチャー閾値
    this.bindEvent('gestureThreshold', 'input', async (e) => {
      const threshold = parseInt(e.target.value)
      await this.settingsUseCase.updateGestureThreshold(threshold)
      this.updateElement('gestureThresholdValue', `${threshold}px`)
      this.showStatus('ジェスチャー感度を変更しました', 'success', 1500)
    })
  }

  /**
   * ジェスチャー一覧のイベントを設定
   */
  setupGestureListEvents() {
    // 検索
    this.bindEvent('gestureSearch', 'input', (e) => {
      this.filterGestures(e.target.value)
    })

    // フィルター
    this.bindEvent('gestureFilter', 'change', (e) => {
      this.filterGesturesByType(e.target.value)
    })

    // ジェスチャー一覧のトグルイベント（イベントデリゲーション使用）
    this.setupGestureListToggleEvents()
  }

  /**
   * ジェスチャー一覧のトグルイベントを設定（イベントデリゲーション）
   */
  setupGestureListToggleEvents() {
    document.addEventListener('change', async (e) => {
      // ジェスチャー一覧内のチェックボックスかチェック
      if (e.target.type === 'checkbox' && 
          e.target.dataset.gestureId && 
          e.target.closest('#allGesturesList')) {
        
        const gestureId = e.target.dataset.gestureId
        const isCustom = gestureId.startsWith('custom_')
        
        try {
          if (isCustom) {
            // カスタムジェスチャーのトグル
            await this.customGestureUseCase.toggleCustomGesture(gestureId, e.target.checked)
            // カスタムジェスチャーリストを更新
            if (this.onGestureAdded) {
              await this.onGestureAdded()
            }
          } else {
            // デフォルトジェスチャーのトグル
            await this.settingsUseCase.toggleGesture(gestureId, e.target.checked)
          }
          
          this.showStatus(`ジェスチャー「${gestureId}」を${e.target.checked ? '有効' : '無効'}にしました`, 'success')
        } catch (error) {
          console.error('ジェスチャートグルエラー:', error)
          this.showStatus('ジェスチャー設定の変更に失敗しました', 'error')
          // エラー時はチェックボックスを元に戻す
          e.target.checked = !e.target.checked
        }
      }
    })
  }

  /**
   * カスタムジェスチャーのイベントを設定
   */
  setupCustomGestureEvents() {
    this.currentPattern = []

    // 方向ボタン
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.addDirectionToPattern(e.target.dataset.direction)
        // パターン変更時にバックアップ
        this.autoBackupFormState()
      })
    })

    // クリア・追加ボタン
    this.bindEvent('clearPatternBtn', 'click', () => this.clearPattern())
    this.bindEvent('addGestureBtn', 'click', () => this.handleAddGesture())

    // フォーム入力時の自動バックアップ
    this.bindEvent('gestureName', 'input', () => this.autoBackupFormState())
    this.bindEvent('gestureAction', 'change', () => this.autoBackupFormState())

    // カスタムジェスチャーリストのトグルイベント（イベントデリゲーション使用）
    this.setupCustomGestureListEvents()
  }

  /**
   * カスタムジェスチャーリストのイベントを設定（イベントデリゲーション）
   */
  setupCustomGestureListEvents() {
    // クリックイベント（編集・削除ボタン）
    document.addEventListener('click', async (e) => {
      // カスタムジェスチャーリスト内のボタンかチェック
      if (e.target.closest('#customGestureList')) {
        const gestureId = e.target.dataset.gestureId
        try {
          if (e.target.classList.contains('edit-btn')) {
            // 編集ボタン
            console.log('🔧 [Debug] Edit button clicked for gesture:', gestureId)
            
            // 内部状態として編集モードを開始
            this.enterEditMode(gestureId)
            
            // 外部コールバックも呼び出し（データロードなど）
            if (this.editCustomGesture) {
              await this.editCustomGesture(gestureId)
            }
          } else if (e.target.classList.contains('delete-btn')) {
            // 削除ボタン
            console.log('🔧 [Debug] Delete button clicked for gesture:', gestureId)
            
            const confirmed = await this.showConfirm('このカスタムジェスチャーを削除しますか？')
            console.log('🔧 [Debug] Delete confirmation result:', confirmed)
            
            if (confirmed) {
              // 削除対象が編集中のジェスチャーかチェック（内部状態を優先）
              const editingGestureId = this.editingGestureId || (this.getEditingGestureId && this.getEditingGestureId())
              console.log('🔧 [Debug] Checking edit mode before delete:', {
                internalEditingGestureId: this.editingGestureId,
                externalEditingGestureId: this.getEditingGestureId && this.getEditingGestureId(),
                finalEditingGestureId: editingGestureId,
                deleteTargetId: gestureId,
                isEditingTarget: editingGestureId === gestureId
              })
              
              if (editingGestureId === gestureId) {
                // 編集モードを終了（内部実装を優先）
                console.log('🔧 [Debug] Exiting edit mode before delete')
                this.exitEditModeInternal()
              }
              
              console.log('🔧 [Debug] Calling deleteCustomGesture for:', gestureId)
              await this.customGestureUseCase.deleteCustomGesture(gestureId)
              
              console.log('🔧 [Debug] Delete successful, updating UI')
              
              // UI更新（フォーム状態保持はコールバック内で処理）
              if (this.onGestureDeleted) {
                await this.onGestureDeleted()
              } else if (this.onGestureAdded) {
                await this.onGestureAdded()
              }
              
              this.showStatus('カスタムジェスチャーを削除しました', 'success')
            } else {
              console.log('🔧 [Debug] Delete cancelled')
            }
          }
        } catch (error) {
          console.error('カスタムジェスチャー操作エラー:', error)
          this.showStatus('操作に失敗しました', 'error')
        }
      }
    })

    // トグルイベント（チェックボックス）
    document.addEventListener('change', async (e) => {
      // カスタムジェスチャーリスト内のチェックボックスかチェック
      if (e.target.type === 'checkbox' && 
          e.target.dataset.gestureId && 
          e.target.closest('#customGestureList')) {
        
        const gestureId = e.target.dataset.gestureId
        try {
          await this.customGestureUseCase.toggleCustomGesture(gestureId, e.target.checked)
          // ジェスチャー一覧も更新
          if (this.onGestureAdded) {
            await this.onGestureAdded()
          }
          this.showStatus('ジェスチャー状態を変更しました', 'success')
        } catch (error) {
          console.error('カスタムジェスチャートグルエラー:', error)
          this.showStatus('ジェスチャー設定の変更に失敗しました', 'error')
          // エラー時はチェックボックスを元に戻す
          e.target.checked = !e.target.checked
        }
      }
    })
  }

  /**
   * 除外サイトのイベントを設定
   */
  setupExcludeSiteEvents() {
    const addSite = async () => {
      const input = document.getElementById('newExcludeUrl')
      const pattern = input?.value.trim()
      if (pattern) {
        await this.settingsUseCase.addExcludeSite(pattern)
        input.value = ''
        await this.renderExcludeList()
        this.showStatus('除外サイトを追加しました', 'success')
      }
    }

    this.bindEvent('addExcludeBtn', 'click', addSite)
    this.bindEvent('newExcludeUrl', 'keypress', (e) => {
      if (e.key === 'Enter') addSite()
    })

    // 除外サイトリストの削除イベント（イベントデリゲーション使用）
    this.setupExcludeListEvents()
  }

  /**
   * 除外サイトリストのイベントを設定（イベントデリゲーション）
   */
  setupExcludeListEvents() {
    document.addEventListener('click', async (e) => {
      // 除外サイトリスト内の削除ボタンかチェック
      if (e.target.classList.contains('remove-exclude-btn') && 
          e.target.closest('#excludeList')) {
        
        const pattern = e.target.dataset.pattern
        try {
          await this.settingsUseCase.removeExcludeSite(pattern)
          await this.renderExcludeList()
          this.showStatus('除外サイトを削除しました', 'success')
        } catch (error) {
          console.error('除外サイト削除エラー:', error)
          this.showStatus('除外サイトの削除に失敗しました', 'error')
        }
      }
    })
  }

  /**
   * デバッグ設定のイベントを設定
   */
  setupDebugEvents() {
    // デバッグ設定を取得する共通関数
    const getCurrentDebugConfig = () => {
      return {
        enabled: document.getElementById('debugEnabled')?.checked || false,
        logLevel: parseInt(document.getElementById('debugLogLevel')?.value || '2'),
        showStatus: document.getElementById('debugShowStatus')?.checked || false,
        statusPosition: document.getElementById('debugStatusPosition')?.value || 'top-right'
      }
    }

    // デバッグ有効/無効の切り替え
    this.bindEvent('debugEnabled', 'change', async (e) => {
      const enabled = e.target.checked
      const debugConfig = getCurrentDebugConfig()
      
      // デバッグオプションの表示/非表示制御
      const debugOptionsElement = document.getElementById('debugOptions')
      if (debugOptionsElement) {
        debugOptionsElement.style.display = enabled ? 'block' : 'none'
      }
      
      // デバッグ無効時は画面表示も自動的に無効化
      if (!enabled) {
        debugConfig.showStatus = false
        this.updateElement('debugShowStatus', false, 'checked')
      }
      
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus(`デバッグモードを${enabled ? '有効' : '無効'}にしました`, 'success')
    })

    // ステータス表示設定
    this.bindEvent('debugShowStatus', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('デバッグ設定を更新しました', 'success')
    })

    // ログレベル設定
    this.bindEvent('debugLogLevel', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('ログレベルを変更しました', 'success')
    })

    // ステータス位置設定
    this.bindEvent('debugStatusPosition', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('ステータス表示位置を変更しました', 'success')
    })
  }

  /**
   * イベントバインディングのヘルパーメソッド
   * @param {string} elementId - 要素ID
   * @param {string} eventType - イベントタイプ
   * @param {Function} handler - イベントハンドラー
   */
  bindEvent(elementId, eventType, handler) {
    const element = document.getElementById(elementId)
    if (element) {
      element.addEventListener(eventType, async (e) => {
        try {
          await handler(e)
        } catch (error) {
          console.error(`Event handler error for ${elementId}:`, error)
          this.showStatus('操作に失敗しました', 'error')
        }
      })
    } else {
      console.warn(`Element not found: ${elementId}`)
    }
  }

  /**
   * ジェスチャーの検索フィルター
   * @param {string} query - 検索クエリ
   */
  filterGestures(query) {
    const items = document.querySelectorAll('.all-gesture-item')
    const lowerQuery = query.toLowerCase()

    items.forEach(item => {
      const name = item.querySelector('.gesture-name')?.textContent.toLowerCase() || ''
      const description = item.querySelector('.gesture-description')?.textContent.toLowerCase() || ''
      
      if (name.includes(lowerQuery) || description.includes(lowerQuery)) {
        item.style.display = ''
      } else {
        item.style.display = 'none'
      }
    })

    // カテゴリーヘッダーの表示制御
    document.querySelectorAll('.gesture-category').forEach(category => {
      const visibleItems = category.querySelectorAll('.all-gesture-item:not([style*="display: none"])')
      category.style.display = visibleItems.length > 0 ? '' : 'none'
    })
  }

  /**
   * ジェスチャーのタイプフィルター
   * @param {string} type - フィルタータイプ
   */
  filterGesturesByType(type) {
    const items = document.querySelectorAll('.all-gesture-item')

    items.forEach(item => {
      const gestureId = item.querySelector('input[data-gesture-id]')?.dataset.gestureId || ''
      
      if (type === 'all') {
        item.style.display = ''
      } else if (type === 'enabled') {
        const isEnabled = !item.classList.contains('disabled')
        item.style.display = isEnabled ? '' : 'none'
      } else if (type === 'disabled') {
        const isDisabled = item.classList.contains('disabled')
        item.style.display = isDisabled ? '' : 'none'
      } else if (type === 'custom') {
        const isCustom = gestureId.startsWith('custom_')
        item.style.display = isCustom ? '' : 'none'
      } else if (type === 'default') {
        const isDefault = !gestureId.startsWith('custom_')
        item.style.display = isDefault ? '' : 'none'
      }
    })

    // カテゴリーヘッダーの表示制御
    document.querySelectorAll('.gesture-category').forEach(category => {
      const visibleItems = category.querySelectorAll('.all-gesture-item:not([style*="display: none"])')
      category.style.display = visibleItems.length > 0 ? '' : 'none'
    })
  }

  /**
   * カスタムジェスチャーパターンに方向を追加
   * @param {string} direction - 方向（UP, DOWN, LEFT, RIGHT）
   */
  addDirectionToPattern(direction) {
    if (this.currentPattern.length < 10) { // 最大10方向まで
      this.currentPattern.push(direction)
      this.updatePatternDisplay()
    } else {
      this.showStatus('パターンが長すぎます（最大10方向）', 'error')
    }
  }

  /**
   * カスタムジェスチャーパターンをクリア
   */
  clearPattern() {
    console.log('🔧 [Debug] clearPattern called, current pattern length:', this.currentPattern.length)
    this.currentPattern = []
    this.updatePatternDisplay()
    console.log('🔧 [Debug] Pattern cleared and display updated')
  }

  /**
   * パターン表示を更新
   */
  updatePatternDisplay() {
    const display = document.getElementById('gesturePatternDisplay')
    if (display) {
      const arrows = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' }
      display.value = this.currentPattern.map(dir => arrows[dir] || dir).join('')
    }
  }

  /**
   * フォーム状態をバックアップ
   */
  backupFormState() {
    const nameField = document.getElementById('gestureName')
    const actionField = document.getElementById('gestureAction')
    
    this.formStateBackup = {
      name: nameField?.value || '',
      action: actionField?.value || '',
      pattern: [...this.currentPattern]
    }
    
    console.log('🔧 [Debug] Form state backed up:', this.formStateBackup)
  }

  /**
   * フォーム状態を復元
   */
  restoreFormState() {
    const nameField = document.getElementById('gestureName')
    const actionField = document.getElementById('gestureAction')
    
    if (nameField) nameField.value = this.formStateBackup.name
    if (actionField) actionField.value = this.formStateBackup.action
    this.currentPattern = [...this.formStateBackup.pattern]
    
    this.updatePatternDisplay()
    
    console.log('🔧 [Debug] Form state restored:', {
      name: this.formStateBackup.name,
      action: this.formStateBackup.action,
      pattern: this.formStateBackup.pattern,
      actualNameFieldValue: nameField?.value,
      actualActionFieldValue: actionField?.value,
      actualPatternLength: this.currentPattern.length
    })
  }

  /**
   * フォーム状態を自動バックアップ
   */
  autoBackupFormState() {
    const nameField = document.getElementById('gestureName')
    const actionField = document.getElementById('gestureAction')
    
    // 値が入力されている場合のみバックアップ
    if ((nameField?.value || actionField?.value || this.currentPattern.length > 0)) {
      this.formStateBackup = {
        name: nameField?.value || '',
        action: actionField?.value || '',
        pattern: [...this.currentPattern]
      }
      
      console.log('🔧 [Debug] Form state auto-backed up:', {
        name: this.formStateBackup.name,
        action: this.formStateBackup.action,
        pattern: this.formStateBackup.pattern,
        nameFieldValue: nameField?.value,
        actionFieldValue: actionField?.value,
        currentPatternLength: this.currentPattern.length
      })
    }
  }

  /**
   * カスタムジェスチャー追加・更新処理
   */
  async handleAddGesture() {
    try {
      console.log('🔧 [Debug] handleAddGesture called')
      
      const name = document.getElementById('gestureName')?.value.trim()
      const action = document.getElementById('gestureAction')?.value
      
      console.log('🔧 [Debug] Form values:', {
        name: name,
        action: action,
        currentPatternLength: this.currentPattern.length,
        currentPattern: this.currentPattern
      })
      
      if (!name) {
        console.log('🔧 [Debug] Validation failed: name is empty')
        this.showStatus('ジェスチャー名を入力してください', 'error')
        return
      }
      
      if (this.currentPattern.length === 0) {
        console.log('🔧 [Debug] Validation failed: pattern is empty')
        this.showStatus('ジェスチャーパターンを設定してください', 'error')
        return
      }
      
      if (!action) {
        console.log('🔧 [Debug] Validation failed: action is empty')
        this.showStatus('アクションを選択してください', 'error')
        return
      }

      // パターンをPoint配列形式に変換（改良版）
      const rawPoints = []
      let currentX = 100 // 開始座標
      let currentY = 100
      
      // 開始点を追加
      rawPoints.push({
        x: currentX,
        y: currentY,
        timestamp: Date.now()
      })
      
      // 各方向について終点を計算
      this.currentPattern.forEach((direction, index) => {
        const distance = 50 // 移動距離
        
        switch (direction) {
        case 'UP':
          currentY -= distance
          break
        case 'DOWN':
          currentY += distance
          break
        case 'LEFT':
          currentX -= distance
          break
        case 'RIGHT':
          currentX += distance
          break
        }
        
        rawPoints.push({
          x: currentX,
          y: currentY,
          timestamp: Date.now() + (index + 1) * 100
        })
      })

      // 編集モードかどうかチェック（内部状態を優先、外部からのコールバックは補助）
      const isEditMode = this.editingGestureId || (this.getEditingGestureId && this.getEditingGestureId())
      
      console.log('🔧 [Debug] Edit mode check:', {
        internalEditingGestureId: this.editingGestureId,
        hasGetEditingGestureId: Boolean(this.getEditingGestureId),
        externalEditingGestureId: this.getEditingGestureId && this.getEditingGestureId(),
        finalIsEditMode: isEditMode
      })
      
      if (isEditMode) {
        // 更新処理
        console.log('🔧 [Debug] Entering update mode for gesture:', isEditMode)
        const updates = {
          name: name,
          pattern: rawPoints,
          action: action
        }
        await this.customGestureUseCase.updateCustomGesture(isEditMode, updates)
        
        // 編集モード終了（内部実装を優先）
        this.exitEditModeInternal()
        
        this.showStatus('カスタムジェスチャーを更新しました', 'success')
      } else {
        // 新規追加処理
        console.log('🔧 [Debug] Entering create mode')
        console.log('🔧 [Debug] Creating gesture with:', {
          name: name,
          rawPointsLength: rawPoints.length,
          action: action
        })
        
        await this.customGestureUseCase.createCustomGesture(name, rawPoints, action)
        
        console.log('🔧 [Debug] Gesture created successfully, resetting form')
        
        // フォームをリセット（名前とパターンのみ、アクションは保持）
        const nameField = document.getElementById('gestureName')
        
        if (nameField) nameField.value = ''
        this.clearPattern()
        
        console.log('🔧 [Debug] Form reset completed, action field preserved')
        
        this.showStatus('カスタムジェスチャーを追加しました', 'success')
      }
      
      // 描画更新（外部コントローラーに委譲）
      console.log('🔧 [Debug] Calling onGestureAdded callback')
      if (this.onGestureAdded) {
        await this.onGestureAdded()
      }
      
      console.log('🔧 [Debug] handleAddGesture completed successfully')
      
    } catch (error) {
      console.error('カスタムジェスチャー操作エラー:', error)
      
      // エラーメッセージをより具体的に表示
      let errorMessage = 'カスタムジェスチャーの操作に失敗しました'
      if (error.message) {
        if (error.message.includes('Gesture name')) {
          errorMessage = 'ジェスチャー名に問題があります: ' + error.message
        } else if (error.message.includes('Invalid action')) {
          errorMessage = 'アクションの設定に問題があります: ' + error.message
        } else if (error.message.includes('already exists')) {
          errorMessage = 'そのジェスチャー名は既に使用されています'
        } else if (error.message.includes('Invalid gesture pattern')) {
          errorMessage = 'ジェスチャーパターンが正しくありません'
        } else {
          errorMessage = error.message
        }
      }
      
      this.showStatus(errorMessage, 'error')
    }
  }

  /**
   * 外部コールバックの設定
   * @param {Function} gestureAddedCallback - ジェスチャー追加後のコールバック
   * @param {Function} editCustomGestureCallback - カスタムジェスチャー編集コールバック（オプション）
   * @param {Function} showConfirmCallback - 確認ダイアログ表示コールバック（オプション）
   * @param {Function} getEditingGestureIdCallback - 編集中ジェスチャーID取得コールバック（オプション）
   * @param {Function} exitEditModeCallback - 編集モード終了コールバック（オプション）
   * @param {Function} gestureDeletedCallback - ジェスチャー削除後のコールバック（オプション）
   */
  setCallbacks(gestureAddedCallback, editCustomGestureCallback = null, showConfirmCallback = null, getEditingGestureIdCallback = null, exitEditModeCallback = null, gestureDeletedCallback = null) {
    this.onGestureAdded = gestureAddedCallback
    this.onGestureDeleted = gestureDeletedCallback
    this.editCustomGesture = editCustomGestureCallback
    this.showConfirm = showConfirmCallback || ((message) => {
      // フォールバック: 標準confirm
      // eslint-disable-next-line no-alert
      return Promise.resolve(confirm(message))
    })
    this.getEditingGestureId = getEditingGestureIdCallback
    this.exitEditMode = exitEditModeCallback
    
    // 編集モード状態管理
    this.editingGestureId = null
  }

  /**
   * 編集モードに入る
   * @param {string} gestureId - 編集中のジェスチャーID
   */
  enterEditMode(gestureId) {
    // 編集状態を保存
    this.editingGestureId = gestureId
    
    // ボタンテキスト変更
    const addButton = document.getElementById('addGestureBtn')
    if (addButton) {
      addButton.textContent = '更新'
      addButton.classList.add('edit-mode')
    }
    
    // キャンセルボタンを表示
    let cancelButton = document.getElementById('cancelEditBtn')
    if (!cancelButton) {
      cancelButton = document.createElement('button')
      cancelButton.id = 'cancelEditBtn'
      cancelButton.type = 'button'
      cancelButton.textContent = '編集をキャンセル'
      cancelButton.className = 'cancel-btn'
      
      if (addButton && addButton.parentNode) {
        addButton.parentNode.insertBefore(cancelButton, addButton.nextSibling)
      }
    }
    cancelButton.style.display = 'inline-block'
    
    // キャンセルボタンのイベント設定
    cancelButton.onclick = () => this.exitEditModeInternal()
  }

  /**
   * 編集モードを終了（内部実装）
   */
  exitEditModeInternal() {
    // 編集状態をクリア
    this.editingGestureId = null
    
    // ボタンテキストを元に戻す
    const addButton = document.getElementById('addGestureBtn')
    if (addButton) {
      addButton.textContent = 'カスタムジェスチャーを追加'
      addButton.classList.remove('edit-mode')
    }
    
    // キャンセルボタンを非表示
    const cancelButton = document.getElementById('cancelEditBtn')
    if (cancelButton) {
      cancelButton.style.display = 'none'
    }
    
    // フォームをクリア
    const nameField = document.getElementById('gestureName')
    const actionField = document.getElementById('gestureAction')
    if (nameField) nameField.value = ''
    if (actionField) actionField.value = ''
    this.clearPattern()
    
    this.showStatus('編集をキャンセルしました', 'info')
  }

  /**
   * 編集中のジェスチャーIDを取得
   * @returns {string|null}
   */
  getEditingGestureIdInternal() {
    return this.editingGestureId
  }
}

// CommonJS用のエクスポート（テスト対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsEventController }
  // グローバル定義もテスト環境で必要（globalが存在する場合のみ）
  if (typeof global !== 'undefined') {
    global.OptionsEventController = OptionsEventController
  }
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.OptionsEventController = OptionsEventController
}