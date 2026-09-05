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

  // --- Список уровней для экрана выбора. ---
  levels: [
    { id: 1, name: 'Уровень 1', unlocked: true },
    { id: 2, name: 'Уровень 2', unlocked: false },
    { id: 3, name: 'Уровень 3', unlocked: false }
  ],

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
    const xs = [140, 375, 610];
    return this.levels.map(function (lv, i) {
      return { id: lv.id, name: lv.name, unlocked: lv.unlocked, x: xs[i], y: 200, w: w, h: h };
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
        if (this._hit(this._backRect(), x, y)) { this.showMainMenu(); return null; }
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

    // Декоративный кубик слева от заголовка.
    this._drawCubeIcon(ctx, 150, 86, 48, '#4dd0ff');

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
    // Уровень — цифра.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillText(card.unlocked ? 'Нажми, чтобы играть' : 'Скоро', card.x + card.w / 2, card.y + 146);

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

    // Плашка-заглушка.
    const pw = 460, ph = 220;
    const px = cx - pw / 2, py = 190;
    ctx.fillStyle = 'rgba(40, 40, 60, 0.7)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(120, 120, 140, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

    // Бейдж «скоро».
    ctx.fillStyle = '#8e6bd5';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ЗАГЛУШКА · В РАЗРАБОТКЕ', cx, py + 48);

    // Текст.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '22px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Скоро здесь будут скины', cx, py + 110);
    ctx.fillText('и цвета для куба', cx, py + 142);

    // Несколько неактивных «свотчей» цвета (декорация).
    const swatches = ['#4dd0ff', '#ff4d4d', '#4caf50', '#ffd54f', '#8e6bd5'];
    for (let i = 0; i < swatches.length; i++) {
      const sx = cx - 100 + i * 50;
      ctx.fillStyle = swatches[i];
      ctx.fillRect(sx, py + 165, 36, 36);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, py + 165.5, 35, 35);
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
   * Отрисовка ХУД: счётчик попыток (в левом верхнем углу, под FPS).
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  renderHUD: function (ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(12, 48, 176, 30);
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('Попытка: ' + this.attempts, 26, 63);
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
