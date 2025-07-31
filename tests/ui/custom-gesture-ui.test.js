// カスタムジェスチャーUI機能のテスト

/**
 * @jest-environment jsdom
 */

describe('カスタムジェスチャーUI機能', () => {
  let optionsManager;
  let mockCustomGestureManager;

  beforeEach(() => {
    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="customGestureList"></div>
      <input type="text" id="gestureName">
      <input type="text" id="gesturePatternDisplay" readonly>
      <select id="gestureAction">
        <option value="back">戻る</option>
        <option value="forward">進む</option>
        <option value="close_tab">タブを閉じる</option>
      </select>
      <button id="addGestureBtn">追加</button>
      <button id="clearPatternBtn">クリア</button>
      <button class="direction-btn" data-direction="↑">↑</button>
      <button class="direction-btn" data-direction="↓">↓</button>
      <button class="direction-btn" data-direction="←">←</button>
      <button class="direction-btn" data-direction="→">→</button>
      <div id="saveStatus" style="display: none;"></div>
    `;

    // Chrome APIのモック
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(),
          onChanged: {
            addListener: jest.fn(),
          },
        },
      },
      runtime: {
        sendMessage: jest.fn(),
      },
    };

    // CustomGestureManagerのモック
    mockCustomGestureManager = {
      getCustomGestures: jest.fn(() => []),
      addCustomGesture: jest.fn(),
      updateCustomGesture: jest.fn(),
      deleteCustomGesture: jest.fn(),
      loadCustomGestures: jest.fn(),
    };

    global.CustomGestureManager = jest.fn().mockImplementation(() => {
      return mockCustomGestureManager;
    });

    // HTMLCanvasElementのgetContextメソッドをモック
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      fillStyle: '',
      font: '',
      fillText: jest.fn(),
    }));

    // 簡略化されたOptionsManagerクラスを定義
    global.OptionsManager = class OptionsManager {
      constructor() {
        this.defaultSettings = {
          enabled: true,
          strokeColor: '#2196F3',
          strokeWidth: 3,
          excludeList: [],
        };
        this.customGestureManager = null;
        this.currentPattern = [];
        this.isRecording = false;
        this.currentSettings = this.defaultSettings;
      }

      async init() {
        // 初期化処理はモック
      }

      initCustomGestureManager() {
        // モック化済み
      }

      async loadSettings() {
        // モック化済み
      }

      async saveSettings() {
        // モック化済み
      }

      setupEventListeners() {
        // モック化済み
      }

      setupCustomGestureListeners() {
        // モック化済み
      }

      updatePreview() {
        // モック化済み
      }

      addDirectionToPattern(direction) {
        this.currentPattern.push(direction);
        this.updatePatternDisplay();
      }

      clearPattern() {
        this.currentPattern = [];
        this.updatePatternDisplay();
      }

      updatePatternDisplay() {
        const display = document.getElementById('gesturePatternDisplay');
        if (this.currentPattern.length === 0) {
          display.value = '';
          display.placeholder = 'パターンをクリックして入力';
        } else {
          display.value = this.currentPattern.join(' → ');
        }
      }

      async addCustomGesture() {
        const name = document.getElementById('gestureName').value.trim();
        const action = document.getElementById('gestureAction').value;

        if (!name) {
          this.showSaveStatus('ジェスチャー名を入力してください', false);
          return;
        }

        if (this.currentPattern.length === 0) {
          this.showSaveStatus('パターンを入力してください', false);
          return;
        }

        if (!this.customGestureManager) {
          this.showSaveStatus('カスタムジェスチャー機能は利用できません', false);
          return;
        }

        try {
          const result = await this.customGestureManager.addCustomGesture({
            name: name,
            pattern: [...this.currentPattern],
            action: action,
          });

          if (result.success) {
            this.showSaveStatus('カスタムジェスチャーを追加しました', true);
            this.renderCustomGestureList();

            // フォームをクリア
            document.getElementById('gestureName').value = '';
            document.getElementById('gestureAction').selectedIndex = 0;
            this.clearPattern();
          } else {
            this.showSaveStatus(result.error || 'ジェスチャーの追加に失敗しました', false);
          }
        } catch (error) {
          console.error('Failed to add custom gesture:', error);
          this.showSaveStatus('ジェスチャーの追加に失敗しました', false);
        }
      }

      renderCustomGestureList() {
        const container = document.getElementById('customGestureList');
        if (!this.customGestureManager) {
          container.innerHTML = '<div class="empty-state">カスタムジェスチャー機能は利用できません</div>';
          return;
        }

        const gestures = this.customGestureManager.getCustomGestures();

        if (gestures.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🖱️</div>
              <div>カスタムジェスチャーがありません</div>
              <div style="font-size: 12px; margin-top: 8px;">下のフォームから新しいジェスチャーを追加できます</div>
            </div>
          `;
          return;
        }

        container.innerHTML = '';

        gestures.forEach((gesture) => {
          const item = document.createElement('div');
          item.className = `gesture-item ${gesture.enabled ? '' : 'disabled'}`;

          item.innerHTML = `
            <div class="gesture-info">
              <div class="gesture-name">${this.escapeHtml(gesture.name)}</div>
              <div>
                <span class="gesture-pattern">${gesture.pattern.join(' → ')}</span>
                <span class="gesture-action">${this.getActionDisplayName(gesture.action)}</span>
              </div>
            </div>
            <div class="gesture-controls">
              <button class="gesture-toggle ${gesture.enabled ? 'enabled' : 'disabled'}" data-id="${gesture.id}">
                ${gesture.enabled ? '有効' : '無効'}
              </button>
              <button class="edit-btn" data-id="${gesture.id}">編集</button>
              <button class="delete-btn" data-id="${gesture.id}">削除</button>
            </div>
          `;

          container.appendChild(item);
        });

        // イベントリスナーを追加
        this.setupGestureItemListeners();
      }

      setupGestureItemListeners() {
        // 有効/無効切り替え
        document.querySelectorAll('.gesture-toggle').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const gesture = this.customGestureManager.getCustomGestures().find((g) => g.id === id);
            if (gesture) {
              await this.customGestureManager.updateCustomGesture(id, { enabled: !gesture.enabled });
              this.renderCustomGestureList();
            }
          });
        });

        // 編集ボタン
        document.querySelectorAll('.edit-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            this.editCustomGesture(id);
          });
        });

        // 削除ボタン
        document.querySelectorAll('.delete-btn').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const gesture = this.customGestureManager.getCustomGestures().find((g) => g.id === id);
            if (gesture && this.showConfirm(`「${gesture.name}」を削除しますか？`)) {
              await this.customGestureManager.deleteCustomGesture(id);
              this.renderCustomGestureList();
              this.showSaveStatus('カスタムジェスチャーを削除しました', true);
            }
          });
        });
      }

      editCustomGesture(id) {
        const gesture = this.customGestureManager.getCustomGestures().find((g) => g.id === id);
        if (!gesture) return;

        // フォームに既存の値を設定
        document.getElementById('gestureName').value = gesture.name;
        document.getElementById('gestureAction').value = gesture.action;
        this.currentPattern = [...gesture.pattern];
        this.updatePatternDisplay();

        // 追加ボタンを編集モードに変更
        const addBtn = document.getElementById('addGestureBtn');
        addBtn.textContent = '変更を保存';
        addBtn.onclick = () => this.saveEditedGesture(id);

        this.showSaveStatus('編集モードになりました', true);
      }

      async saveEditedGesture(id) {
        const name = document.getElementById('gestureName').value.trim();
        const action = document.getElementById('gestureAction').value;

        if (!name || this.currentPattern.length === 0) {
          this.showSaveStatus('名前とパターンを入力してください', false);
          return;
        }

        try {
          const result = await this.customGestureManager.updateCustomGesture(id, {
            name: name,
            pattern: [...this.currentPattern],
            action: action,
          });

          if (result.success) {
            this.showSaveStatus('カスタムジェスチャーを更新しました', true);
            this.renderCustomGestureList();
            this.resetAddForm();
          } else {
            this.showSaveStatus(result.error || 'ジェスチャーの更新に失敗しました', false);
          }
        } catch (error) {
          console.error('Failed to update custom gesture:', error);
          this.showSaveStatus('ジェスチャーの更新に失敗しました', false);
        }
      }

      resetAddForm() {
        document.getElementById('gestureName').value = '';
        document.getElementById('gestureAction').selectedIndex = 0;
        this.clearPattern();

        const addBtn = document.getElementById('addGestureBtn');
        addBtn.textContent = 'カスタムジェスチャーを追加';
        addBtn.onclick = () => this.addCustomGesture();
      }

      getActionDisplayName(action) {
        const actionNames = {
          back: '戻る',
          forward: '進む',
          scroll_up: '上スクロール',
          scroll_down: '下スクロール',
          close_tab: 'タブを閉じる',
          new_tab: '新しいタブ',
          refresh: '更新',
          duplicate_tab: 'タブを複製',
        };
        return actionNames[action] || action;
      }

      escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      showSaveStatus(message, isSuccess) {
        const statusElement = document.getElementById('saveStatus');
        statusElement.textContent = message;
        statusElement.className = `save-status ${isSuccess ? 'success' : 'error'}`;
        statusElement.style.display = 'block';
      }

      showConfirm(message) {
        // ESLint警告回避のためconfirmを使用（ユーザー操作なので安全）
        // eslint-disable-next-line no-alert
        return confirm(message);
      }
    };

    // OptionsManagerをインスタンス化
    optionsManager = new OptionsManager();
    optionsManager.customGestureManager = mockCustomGestureManager;
    optionsManager.currentSettings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      excludeList: [],
    };
    optionsManager.currentPattern = [];
  });

  describe('パターン入力機能', () => {
    test('方向ボタンクリックでパターンが追加される', () => {
      optionsManager.addDirectionToPattern('↑');
      optionsManager.addDirectionToPattern('→');

      expect(optionsManager.currentPattern).toEqual(['↑', '→']);

      const display = document.getElementById('gesturePatternDisplay');
      expect(display.value).toBe('↑ → →');
    });

    test('パターンクリアボタンで入力がリセットされる', () => {
      optionsManager.currentPattern = ['↑', '↓'];
      optionsManager.updatePatternDisplay();

      optionsManager.clearPattern();

      expect(optionsManager.currentPattern).toEqual([]);

      const display = document.getElementById('gesturePatternDisplay');
      expect(display.value).toBe('');
    });

    test('空のパターンの場合プレースホルダーが表示される', () => {
      optionsManager.clearPattern();

      const display = document.getElementById('gesturePatternDisplay');
      expect(display.placeholder).toBe('パターンをクリックして入力');
    });
  });

  describe('カスタムジェスチャー追加機能', () => {
    test('有効な入力でジェスチャーが追加される', async () => {
      // フォームに値を設定
      document.getElementById('gestureName').value = 'テストジェスチャー';
      document.getElementById('gestureAction').value = 'back';
      optionsManager.currentPattern = ['↑', '↓'];

      // addCustomGestureのモック設定
      mockCustomGestureManager.addCustomGesture.mockResolvedValue({
        success: true,
        id: 'test-id',
      });

      await optionsManager.addCustomGesture();

      expect(mockCustomGestureManager.addCustomGesture).toHaveBeenCalledWith({
        name: 'テストジェスチャー',
        pattern: ['↑', '↓'],
        action: 'back',
      });

      // フォームがクリアされることを確認
      expect(document.getElementById('gestureName').value).toBe('');
      expect(optionsManager.currentPattern).toEqual([]);
    });

    test('名前が空の場合エラーメッセージが表示される', async () => {
      document.getElementById('gestureName').value = '';
      optionsManager.currentPattern = ['↑'];

      const showSaveStatusSpy = jest.spyOn(optionsManager, 'showSaveStatus');

      await optionsManager.addCustomGesture();

      expect(showSaveStatusSpy).toHaveBeenCalledWith('ジェスチャー名を入力してください', false);
      expect(mockCustomGestureManager.addCustomGesture).not.toHaveBeenCalled();
    });

    test('パターンが空の場合エラーメッセージが表示される', async () => {
      document.getElementById('gestureName').value = 'テスト';
      optionsManager.currentPattern = [];

      const showSaveStatusSpy = jest.spyOn(optionsManager, 'showSaveStatus');

      await optionsManager.addCustomGesture();

      expect(showSaveStatusSpy).toHaveBeenCalledWith('パターンを入力してください', false);
      expect(mockCustomGestureManager.addCustomGesture).not.toHaveBeenCalled();
    });

    test('追加に失敗した場合エラーメッセージが表示される', async () => {
      document.getElementById('gestureName').value = 'テスト';
      optionsManager.currentPattern = ['↑'];

      mockCustomGestureManager.addCustomGesture.mockResolvedValue({
        success: false,
        error: 'このジェスチャー名は既に存在します',
      });

      const showSaveStatusSpy = jest.spyOn(optionsManager, 'showSaveStatus');

      await optionsManager.addCustomGesture();

      expect(showSaveStatusSpy).toHaveBeenCalledWith('このジェスチャー名は既に存在します', false);
    });
  });

  describe('カスタムジェスチャー一覧表示', () => {
    test('ジェスチャーがない場合は空状態が表示される', () => {
      mockCustomGestureManager.getCustomGestures.mockReturnValue([]);

      optionsManager.renderCustomGestureList();

      const container = document.getElementById('customGestureList');
      expect(container.innerHTML).toContain('カスタムジェスチャーがありません');
      expect(container.innerHTML).toContain('🖱️');
    });

    test('ジェスチャーがある場合は一覧が表示される', () => {
      const mockGestures = [
        {
          id: 'test-1',
          name: 'テストジェスチャー1',
          pattern: ['↑', '↓'],
          action: 'back',
          enabled: true,
        },
        {
          id: 'test-2',
          name: 'テストジェスチャー2',
          pattern: ['←', '→'],
          action: 'forward',
          enabled: false,
        },
      ];

      mockCustomGestureManager.getCustomGestures.mockReturnValue(mockGestures);

      optionsManager.renderCustomGestureList();

      const container = document.getElementById('customGestureList');

      // 1つ目のジェスチャー
      expect(container.innerHTML).toContain('テストジェスチャー1');
      expect(container.innerHTML).toContain('↑ → ↓');
      expect(container.innerHTML).toContain('戻る');

      // 2つ目のジェスチャー
      expect(container.innerHTML).toContain('テストジェスチャー2');
      expect(container.innerHTML).toContain('← → →');
      expect(container.innerHTML).toContain('進む');

      // ボタンが存在することを確認
      expect(container.querySelectorAll('.gesture-toggle')).toHaveLength(2);
      expect(container.querySelectorAll('.edit-btn')).toHaveLength(2);
      expect(container.querySelectorAll('.delete-btn')).toHaveLength(2);
    });

    test('無効なジェスチャーは適切にスタイルが適用される', () => {
      const mockGestures = [
        {
          id: 'test-1',
          name: 'テストジェスチャー',
          pattern: ['↑'],
          action: 'back',
          enabled: false,
        },
      ];

      mockCustomGestureManager.getCustomGestures.mockReturnValue(mockGestures);

      optionsManager.renderCustomGestureList();

      const container = document.getElementById('customGestureList');
      const gestureItem = container.querySelector('.gesture-item');

      expect(gestureItem.classList.contains('disabled')).toBe(true);
      expect(container.innerHTML).toContain('無効');
    });
  });

  describe('削除機能', () => {
    test('削除ボタンクリックで確認ダイアログが表示される', () => {
      // テスト用ジェスチャーデータを設定
      const testGesture = {
        id: 'test1',
        name: 'テストジェスチャー',
        pattern: ['↑', '↓'],
        action: 'close_tab',
        enabled: true,
      };

      mockCustomGestureManager.getCustomGestures.mockReturnValue([testGesture]);

      // フォームの初期化とマネージャーの設定
      optionsManager.customGestureManager = mockCustomGestureManager;

      // confirmのモック
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

      optionsManager.renderCustomGestureList();

      // 削除ボタンが存在するかチェック
      const deleteBtn = document.querySelector('.delete-btn');
      expect(deleteBtn).toBeTruthy();

      // 削除ボタンをクリック
      deleteBtn.click();

      // 確認ダイアログが表示されたかチェック
      expect(mockConfirm).toHaveBeenCalledWith('「テストジェスチャー」を削除しますか？');

      mockConfirm.mockRestore();
    });

    test('削除確認でOKを選択すると削除処理が実行される', async () => {
      // テスト用ジェスチャーデータを設定
      const testGesture = {
        id: 'test1',
        name: 'テストジェスチャー',
        pattern: ['↑', '↓'],
        action: 'close_tab',
        enabled: true,
      };

      mockCustomGestureManager.getCustomGestures.mockReturnValue([testGesture]);
      mockCustomGestureManager.deleteCustomGesture.mockResolvedValue();

      // フォームの初期化とマネージャーの設定
      optionsManager.customGestureManager = mockCustomGestureManager;

      // confirmのモック（OK選択）
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

      optionsManager.renderCustomGestureList();

      // 削除ボタンをクリック
      const deleteBtn = document.querySelector('.delete-btn');

      // click()は同期的だが、イベントハンドラ内の処理は非同期なので、Promiseを作成
      const clickPromise = new Promise((resolve) => {
        // イベントハンドラが終了したらresolveするように設定
        setTimeout(resolve, 0);
      });

      deleteBtn.click();
      await clickPromise;

      // 削除メソッドが呼ばれたかチェック
      expect(mockCustomGestureManager.deleteCustomGesture).toHaveBeenCalledWith('test1');

      mockConfirm.mockRestore();
    });

    test('削除確認でキャンセルを選択すると削除処理が実行されない', () => {
      // テスト用ジェスチャーデータを設定
      const testGesture = {
        id: 'test1',
        name: 'テストジェスチャー',
        pattern: ['↑', '↓'],
        action: 'close_tab',
        enabled: true,
      };

      mockCustomGestureManager.getCustomGestures.mockReturnValue([testGesture]);

      // フォームの初期化とマネージャーの設定
      optionsManager.customGestureManager = mockCustomGestureManager;

      // confirmのモック（キャンセル選択）
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

      optionsManager.renderCustomGestureList();

      // 削除ボタンをクリック
      const deleteBtn = document.querySelector('.delete-btn');
      deleteBtn.click();

      // 削除メソッドが呼ばれていないかチェック
      expect(mockCustomGestureManager.deleteCustomGesture).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('編集機能', () => {
    test('編集ボタンクリックでフォームに値が設定される', () => {
      const mockGesture = {
        id: 'test-1',
        name: '編集テスト',
        pattern: ['→', '↓'],
        action: 'close_tab',
        enabled: true,
      };

      mockCustomGestureManager.getCustomGestures.mockReturnValue([mockGesture]);

      optionsManager.editCustomGesture('test-1');

      expect(document.getElementById('gestureName').value).toBe('編集テスト');
      expect(document.getElementById('gestureAction').value).toBe('close_tab');
      expect(optionsManager.currentPattern).toEqual(['→', '↓']);
      expect(document.getElementById('gesturePatternDisplay').value).toBe('→ → ↓');

      // ボタンが編集モードに変更されることを確認
      const addBtn = document.getElementById('addGestureBtn');
      expect(addBtn.textContent).toBe('変更を保存');
    });

    test('編集保存が正常に動作する', async () => {
      // 編集モードに設定
      document.getElementById('gestureName').value = '編集後の名前';
      document.getElementById('gestureAction').value = 'forward';
      optionsManager.currentPattern = ['←', '↑'];

      mockCustomGestureManager.updateCustomGesture.mockResolvedValue({
        success: true,
      });

      await optionsManager.saveEditedGesture('test-1');

      expect(mockCustomGestureManager.updateCustomGesture).toHaveBeenCalledWith('test-1', {
        name: '編集後の名前',
        pattern: ['←', '↑'],
        action: 'forward',
      });

      // フォームがリセットされることを確認
      expect(document.getElementById('addGestureBtn').textContent).toBe('カスタムジェスチャーを追加');
    });
  });

  describe('アクション名表示', () => {
    test('アクション名が正しく表示される', () => {
      expect(optionsManager.getActionDisplayName('back')).toBe('戻る');
      expect(optionsManager.getActionDisplayName('forward')).toBe('進む');
      expect(optionsManager.getActionDisplayName('scroll_up')).toBe('上スクロール');
      expect(optionsManager.getActionDisplayName('close_tab')).toBe('タブを閉じる');
      expect(optionsManager.getActionDisplayName('unknown_action')).toBe('unknown_action');
    });
  });

  describe('ステータス表示機能', () => {
    test('成功メッセージが正しく表示される', () => {
      optionsManager.showSaveStatus('テスト成功', true);

      const statusElement = document.getElementById('saveStatus');
      expect(statusElement.textContent).toBe('テスト成功');
      expect(statusElement.className).toContain('success');
      expect(statusElement.style.display).toBe('block');
    });

    test('エラーメッセージが正しく表示される', () => {
      optionsManager.showSaveStatus('テストエラー', false);

      const statusElement = document.getElementById('saveStatus');
      expect(statusElement.textContent).toBe('テストエラー');
      expect(statusElement.className).toContain('error');
      expect(statusElement.style.display).toBe('block');
    });
  });
});
