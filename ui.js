/* ============================================================
   ui.js — интерфейс (ХУД и меню).
   Отвечает за: главное меню, экран выбора уровня, заглушку
   кастомизации, а также игровой ХУД (счётчик попыток,
   прогресс-бар) и экраны смерти / победы.
   Состояние игры (menu / playing / dead / complete) хранит core.js.
   ============================================================ */

// Общее пространство имён игры.
window.Game = window.Game || {};

// API модуля интерфейса.
Game.ui = {
  attempts: 0,   // счётчик попыток (увеличивается на каждую смерть)

  // --- Состояние меню. ---
  // view: 'main' (главное меню) | 'levels' (выбор уровня) | 'customize' (кастомизация)
  menu: { view: 'main' },
  selectedLevel: 1,

  // --- Список уровней для экрана выбора (сложность из Game.DIFFICULTIES). ---
  levels: [
    { id: 1, name: 'Уровень 1', unlocked: true, difficulty: Game.DIFFICULTIES.easy.name },
    { id: 2, name: 'Уровень 2', unlocked: true, difficulty: Game.DIFFICULTIES.normal.name },
    { id: 3, name: 'Уровень 3', unlocked: true, difficulty: Game.DIFFICULTIES.hard.name },
    { id: 4, name: 'Уровень 4', unlocked: true, difficulty: Game.DIFFICULTIES.insane.name }
  ],

  /** Запомнить выбранный уровень (вызывается из core.js при старте). */
  setSelectedLevel: function (id) {
    this.selectedLevel = id;
  },

  /**
   * Инициализация интерфейса.
   */
  init: function () {
    // Ничего дополнительно пока не требуется — меню рисуется на канвасе.
  },

  // ============================================================
  //  МЕНЮ: навигационные переходы между видами
  // ============================================================

  /** Вернуть меню к главному экрану. */
  resetMenu: function () { this.menu.view = 'main'; },
  showMainMenu: function () { this.menu.view = 'main'; },
  showLevelSelect: function () { this.menu.view = 'levels'; },
  showCustomize: function () { this.menu.view = 'customize'; },

  // ============================================================
  //  ПОМОЩНИКИ ДЛЯ КНОПОК И ХИТ-ТЕСТОВ
  // ============================================================

  /** Проверка попадания точки в прямоугольник. */
  _hit: function (r, x, y) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  },

  /** Отрисовка кнопки с текстом и возврат её прямоугольника. */
  _drawButton: function (ctx, r, label, opts) {
    opts = opts || {};
    ctx.save();

    // Фон кнопки + рамка.
    ctx.fillStyle = opts.bg || '#3a3a66';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)'; // блик сверху
    ctx.fillRect(r.x, r.y, r.w, r.h * 0.35);
    ctx.strokeStyle = opts.border || 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);

    // Текст.
    ctx.fillStyle = opts.color || '#ffffff';
    ctx.font = 'bold ' + (opts.fontSize || 26) + 'px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);

    ctx.restore();
    return r;
  },

  /** Мелкий декоративный кубик (иконка уровня / логотип). */
  _drawCubeIcon: function (ctx, x, y, size, color) {
    size = size || 40;
    color = color || '#4dd0ff';
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'; // блик
    ctx.fillRect(x + 1, y + 1, size - 2, size * 0.3);
    ctx.restore();
  },

  // ============================================================
  //  ГЛАВНОЕ МЕНЮ — кнопки их прямоугольники
  // ============================================================

  _menuMainButtons: function () {
    const cx = Game.CONFIG.LOGICAL_WIDTH / 2;
    const w = 260, h = 64;
    return [
      { id: 'play', label: '▶  Играть', x: cx - w / 2, y: 210, w: w, h: h, bg: '#4f6df0' },
      { id: 'levels', label: 'Выбор уровня', x: cx - w / 2, y: 294, w: w, h: h, bg: '#6a5acd' },
      { id: 'customize', label: 'Кастомизация', x: cx - w / 2, y: 378, w: w, h: h, bg: '#8e6bd5' }
    ];
  },

  /** Прямоугольник кнопки «Назад» (общая для уровней и кастомизации). */
  _backRect: function () {
    return { x: 26, y: 22, w: 110, h: 44 };
  },

  // ============================================================
  //  ВЫБОР УРОВНЯ — карточки уровней
  // ============================================================

  _menuLevelCards: function () {
    const w = 210, h = 170;
    // Центрируем карточки: 4 уровня шириной 210 с зазором 20.
    const n = this.levels.length;
    const gap = 20;
    const total = n * w + (n - 1) * gap;
    const start = (Game.CONFIG.LOGICAL_WIDTH - total) / 2;
    return this.levels.map(function (lv, i) {
      return { id: lv.id, name: lv.name, unlocked: lv.unlocked, x: start + i * (w + gap), y: 200, w: w, h: h };
    });
  },

  // ============================================================
  //  ОБРАБОТКА КЛИКОВ В МЕНЮ
  //  Возвращает: {action:'start', levelId} — запустить игру,
  //  либо null — только внутренняя навигация (или пустой клик).
  // ============================================================

  handleMenuClick: function (x, y) {
    switch (this.menu.view) {
      case 'main': {
        for (const b of this._menuMainButtons()) {
          if (this._hit(b, x, y)) {
            if (b.id === 'play') return { action: 'start', levelId: this.selectedLevel };
            if (b.id === 'levels') this.showLevelSelect();
            if (b.id === 'customize') this.showCustomize();
            return null;
          }
        }
        return null;
      }

      case 'levels': {
        // Кнопка «назад».
        if (this._hit(this._backRect(), x, y)) { this.showMainMenu(); return null; }
        // Карточки уровней.
        for (const card of this._menuLevelCards()) {
          if (this._hit(card, x, y)) {
            if (card.unlocked) return { action: 'start', levelId: card.id };
            return null; // уровень заблокирован
          }
        }
        return null;
      }

      case 'customize': {
        // Кнопка «назад».
        if (this._hit(this._backRect(), x, y)) { this.showMainMenu(); return null; }
        // Свотчи цвета и кнопки моделей.
        for (const hb of this._customizeHitboxes()) {
          if (this._hit(hb, x, y)) {
            if (hb.kind === 'color') {
              if (hb.target === 'cube') Game.customize.cubeColor = hb.value;
              else Game.customize.shipColor = hb.value;
              return null;
            }
            if (hb.kind === 'model') {
              if (hb.target === 'cube') Game.customize.cubeModel = hb.value;
              else Game.customize.shipModel = hb.value;
              return null;
            }
          }
        }
        return null;
      }
    }
    return null;
  },

  // ============================================================
  //  ОТРИСОВКА МЕНЮ
  // ============================================================

  /**
   * Отрисовка главного меню.
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   * @param {number} time - игровое время (сек) для анимации фона.
   */
  renderMenu: function (ctx, time) {
    const W = Game.CONFIG.LOGICAL_WIDTH;
    const H = Game.CONFIG.LOGICAL_HEIGHT;
    const cx = W / 2;
    time = time || 0;

    // Фон меню: вертикальный градиент космоса.
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0e0e1f');
    bg.addColorStop(1, '#17173a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Парящие декоративные квадраты (анимация).
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const fx = 60 + i * 160 + Math.sin(time * 0.8 + i) * 14;
      const fy = 320 + Math.cos(time * 1.1 + i) * 12;
      ctx.fillStyle = 'rgba(77, 208, 255, ' + (0.12 + 0.05 * Math.sin(time + i)) + ')';
      ctx.fillRect(fx, fy, 18, 18);
    }
    ctx.restore();

    // Заголовок.
    ctx.fillStyle = '#4dd0ff';
    ctx.font = 'bold 60px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('GEOMETRY DASH', cx, 110);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('клон на HTML5 Canvas', cx, 158);

    // Декоративный кубик слева от заголовка (текущий цвет кастомизации).
    this._drawCubeIcon(ctx, 150, 86, 48, (Game.customize && Game.customize.cubeColor) || '#4dd0ff');

    // Переключение по виду меню.
    switch (this.menu.view) {
      case 'main': this._renderMenuMain(ctx); break;
      case 'levels': this._renderMenuLevels(ctx); break;
      case 'customize': this._renderMenuCustomize(ctx); break;
    }

    // Подсказка по управлению.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Space / клик / тап — прыжок · Esc — меню', cx, H - 22);
  },

  _renderMenuMain: function (ctx) {
    for (const b of this._menuMainButtons()) {
      this._drawButton(ctx, b, b.label, { bg: b.bg, color: '#ffffff', fontSize: 26 });
    }
  },

  _renderMenuLevels: function (ctx) {
    const cx = Game.CONFIG.LOGICAL_WIDTH / 2;

    // Кнопка «назад».
    this._drawButton(ctx, this._backRect(), '← Назад', { bg: '#3a3a66', fontSize: 18 });

    // Заголовок.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Выбор уровня', cx, 90);

    // Карточки.
    for (const card of this._menuLevelCards()) {
      this._renderLevelCard(ctx, card);
    }
  },

  _renderLevelCard: function (ctx, card) {
    ctx.save();

    // Фон карточки.
    ctx.fillStyle = card.unlocked ? 'rgba(60, 70, 120, 0.9)' : 'rgba(40, 40, 60, 0.55)';
    ctx.fillRect(card.x, card.y, card.w, card.h);
    ctx.strokeStyle = card.unlocked ? '#4f6df0' : 'rgba(120, 120, 140, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(card.x + 1, card.y + 1, card.w - 2, card.h - 2);

    // Иконка уровня (кубик) / замок.
    const iconX = card.x + card.w / 2 - 20;
    const iconY = card.y + 24;
    if (card.unlocked) {
      this._drawCubeIcon(ctx, iconX, iconY, 40, '#4dd0ff');
    } else {
      // Замок для заблокированного уровня.
      ctx.fillStyle = 'rgba(180, 180, 200, 0.8)';
      ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('🔒', card.x + card.w / 2, iconY + 22);
    }

    // Название.
    ctx.fillStyle = card.unlocked ? '#ffffff' : 'rgba(200, 200, 210, 0.7)';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.name, card.x + card.w / 2, card.y + 116);

    // Уровень — цифра / подпись.
    if (card.unlocked) {
      // Сложность уровня.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.fillText('Сложность: ' + (card.difficulty || '—'), card.x + card.w / 2, card.y + 140);
      ctx.fillStyle = 'rgba(77, 208, 255, 0.9)';
      ctx.fillText('Нажми, чтобы играть', card.x + card.w / 2, card.y + 160);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '16px "Segoe UI", Arial, sans-serif';
      ctx.fillText('Сложность: ' + (card.difficulty || '—'), card.x + card.w / 2, card.y + 140);
      ctx.fillText('Скоро', card.x + card.w / 2, card.y + 160);
    }

    ctx.restore();
  },

  // ============================================================
  //  КАСТОМИЗАЦИЯ: цвета и модели куба / самолёта
  // ============================================================

  /**
   * Хитбоксы элементов кастомизации (свотчи цвета + кнопки моделей).
   * Возвращает массив объектов вида {kind:'color'|'model', target, value, ...rect}.
   */
  _customizeHitboxes: function () {
    const out = [];
    const palette = Game.PALETTE || [];
    const cubeModels = Game.CUBE_MODELS || [];
    const shipModels = Game.SHIP_MODELS || [];
    const panelW = 420, gap = 30;
    const leftX = 40, rightX = leftX + panelW + gap;
    const py = 150, panelH = 330;

    // --- ЛЕВАЯ панель: КУБ. ---
    // Свотчи цвета куба.
    const swSize = 34, swGap = 12, swY = py + 204;
    palette.forEach(function (c, i) {
      out.push({
        kind: 'color', target: 'cube', value: c,
        x: leftX + 24 + i * (swSize + swGap), y: swY, w: swSize, h: swSize
      });
    });
    // Кнопки моделей куба.
    const mbY = py + 272, mbW = 116, mbH = 44, mbGap = 14;
    cubeModels.forEach(function (m, i) {
      out.push({
        kind: 'model', target: 'cube', value: m.id, label: m.name,
        x: leftX + 24 + i * (mbW + mbGap), y: mbY, w: mbW, h: mbH
      });
    });

    // --- ПРАВАЯ панель: САМОЛЁТ. ---
    palette.forEach(function (c, i) {
      out.push({
        kind: 'color', target: 'ship', value: c,
        x: rightX + 24 + i * (swSize + swGap), y: swY, w: swSize, h: swSize
      });
    });
    shipModels.forEach(function (m, i) {
      out.push({
        kind: 'model', target: 'ship', value: m.id, label: m.name,
        x: rightX + 24 + i * (mbW + mbGap), y: mbY, w: mbW, h: mbH
      });
    });

    this._customizeRects = { panelW: panelW, panelH: panelH, leftX: leftX, rightX: rightX, py: py };
    return out;
  },

  /** Отрисовка схематичного самолёта (для превью/подписи), цвет из customize. */
  _drawShipIcon: function (ctx, x, y, size) {
    const c = (Game.customize && Game.customize.shipColor) || '#ffaa33';
    const m = (Game.customize && Game.customize.shipModel) || 'default';
    Game.drawShipModel(ctx, x, y, size, c, m);
  },

  /** Рисует панель кастомизации для одного транспорта (куб или самолёт). */
  _renderCustomizePanel: function (ctx, x, y, w, h, target) {
    const isCube = (target === 'cube');
    const title = isCube ? 'Куб' : 'Самолёт';
    const color = isCube ? Game.customize.cubeColor : Game.customize.shipColor;
    const model = isCube ? Game.customize.cubeModel : Game.customize.shipModel;
    const modelDef = (isCube ? Game.CUBE_MODELS : Game.SHIP_MODELS).find(function (m) { return m.id === model; });
    const modelName = (modelDef && modelDef.name) || '—';

    // --- Панель. ---
    ctx.save();
    ctx.fillStyle = 'rgba(40, 40, 60, 0.75)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(140, 120, 210, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // Заголовок панели.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 24, y + 34);

    // Превью (большой спрайт слева от надписи).
    const pvSize = 84;
    const pvX = x + w / 2 - pvSize / 2, pvY = y + 66;
    if (isCube) {
      Game.drawCubeModel(ctx, pvX, pvY, pvSize, color, model);
    } else {
      this._drawShipIcon(ctx, pvX, pvY, pvSize);
    }

    // Подпись текущей модели под превью.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(modelName, x + w / 2, y + 156);

    // Метка «Цвет».
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Цвет', x + 24, y + 184);

    // Метка «Модель».
    ctx.fillText('Модель', x + 24, y + 258);

    ctx.restore();
  },

  _renderMenuCustomize: function (ctx) {
    const cx = Game.CONFIG.LOGICAL_WIDTH / 2;

    // Кнопка «назад».
    this._drawButton(ctx, this._backRect(), '← Назад', { bg: '#3a3a66', fontSize: 18 });

    // Заголовок.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Кастомизация', cx, 90);

    const hb = this._customizeHitboxes();
    const rects = this._customizeRects;
    const panelW = rects.panelW, panelH = rects.panelH;

    // Панели (куб слева, самолёт справа).
    this._renderCustomizePanel(ctx, rects.leftX, rects.py, panelW, panelH, 'cube');
    this._renderCustomizePanel(ctx, rects.rightX, rects.py, panelW, panelH, 'ship');

    // --- Рисуем свотчи цвета. ---
    const swSize = 34;
    for (const h of hb) {
      if (h.kind === 'color') {
        // Рамка-индикатор выбранного цвета.
        const selected = (h.target === 'cube' ? (Game.customize.cubeColor === h.value)
                                              : (Game.customize.shipColor === h.value));
        // Свотч.
        ctx.fillStyle = h.value;
        ctx.fillRect(h.x, h.y, h.w, h.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(h.x + 0.5, h.y + 0.5, h.w - 1, h.h - 1);
        // Выделение выбранного.
        if (selected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeRect(h.x - 2, h.y - 2, h.w + 4, h.h + 4);
          // Галочка.
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('✓', h.x + h.w / 2, h.y + h.h / 2);
        }
      } else if (h.kind === 'model') {
        // Кнопка модели.
        const selected = (h.target === 'cube' ? (Game.customize.cubeModel === h.value)
                                              : (Game.customize.shipModel === h.value));
        this._drawButton(ctx, h, h.label, {
          bg: selected ? '#5a4fb0' : '#3a3a66',
          border: selected ? '#ffffff' : 'rgba(0,0,0,0.5)',
          color: '#ffffff', fontSize: 18
        });
      }
    }
  },

  // ============================================================
  //  ИГРОВОЙ ХУД
  // ============================================================

  /**
   * Увеличить счётчик попыток.
   * Вызывается из core.js в момент перехода в состояние «dead».
   */
  onDeath: function () {
    this.attempts += 1;
  },

  /**
   * Отрисовка ХУД: название уровня и счётчик попыток
   * (в левом верхнем углу, под FPS).
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  renderHUD: function (ctx) {
    const lv = this.levels.find(function (l) { return l.id === this.selectedLevel; }.bind(this));

    ctx.save();
    // Название уровня + сложность.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(12, 48, 220, 30);
    ctx.fillStyle = '#4dd0ff';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText((lv ? lv.name : 'Уровень ' + this.selectedLevel) +
                 (lv && lv.difficulty ? ' · ' + lv.difficulty : ''), 26, 63);

    // Счётчик попыток.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(12, 84, 176, 30);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('Попытка: ' + this.attempts, 26, 99);

    // Текущий транспорт (куб / самолёт).
    const transport = (Game.transport === 'ship') ? 'Самолёт' : 'Куб';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(12, 120, 176, 30);
    ctx.fillStyle = '#8effa1';
    ctx.fillText('Транспорт: ' + transport, 26, 135);
    ctx.restore();
  },

  /**
   * Отрисовка прогресс-бара прохождения уровня.
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   * @param {number} progress - прогресс в диапазоне 0..1 (доля уровня).
   */
  renderProgress: function (ctx, progress) {
    const p = Math.max(0, Math.min(1, progress));
    const barW = 420, barH = 14;
    const barX = (Game.CONFIG.LOGICAL_WIDTH - barW) / 2;
    const barY = 16;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(barX, barY, barW * p, barH);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(p * 100) + '%', 6, barY + barH / 2);
    ctx.restore();
  },

  // ============================================================
  //  СЕРВИСНЫЕ ЭКРАНЫ (смерть / победа)
  // ============================================================

  /**
   * Отрисовка экрана смерти.
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  renderDeathScreen: function (ctx) {
    const W = Game.CONFIG.LOGICAL_WIDTH;
    const H = Game.CONFIG.LOGICAL_HEIGHT;
    const cx = W / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Игра окончена', cx, H / 2 - 60);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Попытка: ' + this.attempts, cx, H / 2 + 6);
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Зажми или тапни, чтобы сыграть ещё раз', cx, H / 2 + 62);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Esc — в меню', cx, H / 2 + 102);
    ctx.restore();
  },

  /**
   * Отрисовка экрана победы (финиш).
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  renderCompleteScreen: function (ctx) {
    const W = Game.CONFIG.LOGICAL_WIDTH;
    const H = Game.CONFIG.LOGICAL_HEIGHT;
    const cx = W / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Уровень пройден!', cx, H / 2 - 60);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Попыток: ' + this.attempts, cx, H / 2 + 6);
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Зажми или тапни, чтобы сыграть ещё раз', cx, H / 2 + 62);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Esc — в меню', cx, H / 2 + 102);
    ctx.restore();
  }
};
