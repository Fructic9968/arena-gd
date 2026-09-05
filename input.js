/* ============================================================
   input.js — управление.
   Перехватывает ввод: Space, стрелка вверх, клик мыши, тач.
   Реализует hold-to-jump: пока кнопка зажата, куб прыгает сразу
   при приземлении (проверка состояния зажатости ведётся в цикле core.js).
   Дополнительно собирает: координаты клика (для кнопок меню) и
   нажатие Esc (возврат из игры в меню).
   ============================================================ */

// Общее пространство имён игры.
window.Game = window.Game || {};

// API модуля ввода.
Game.input = {
  // Флаг: кнопка прыжка сейчас зажата (для hold-to-jump).
  _held: false,

  // Последний клик с координатами в логических единицах (960x540).
  _click: null,

  // Флаг: было ли нажатие Esc (возврат в меню).
  _menuPressed: false,

  // Ссылка на игрока (куб). Задаётся из core.js через setTarget().
  _target: null,

  /**
   * Инициализация обработчиков ввода.
   * Вешаем слушатели на клавиатуру, указатель (мышь + тач).
   */
  init: function () {
    const self = this;
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    // Преобразует координаты события мыши/тача в логические единицы.
    // Канвас CSS-масштабируется, поэтому пересчитываем через bounding rect
    // относительно логического разрешения 960x540.
    function logicalCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const sx = Game.CONFIG.LOGICAL_WIDTH / rect.width;
      const sy = Game.CONFIG.LOGICAL_HEIGHT / rect.height;
      return {
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top) * sy
      };
    }

    // --- Клавиатура: Space, стрелка вверх (прыжок) и Esc (меню). ---
    function isJumpKey(e) {
      return e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp';
    }

    window.addEventListener('keydown', function (e) {
      if (isJumpKey(e)) {
        // Не даём браузеру прокручивать страницу по пробелу/стрелке.
        e.preventDefault();
        self._held = true;
      } else if (e.key === 'Escape') {
        // Возврат в главное меню.
        self._menuPressed = true;
      }
    });

    window.addEventListener('keyup', function (e) {
      if (isJumpKey(e)) {
        self._held = false;
      }
    });

    // --- Указатель: мышь + тач через Pointer Events (современный единый API). ---
    if (window.PointerEvent) {
      // Нажатие на канвас — зажимаем и фиксируем координаты клика.
      canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        self._held = true;
        self._click = logicalCoords(e);
      });
      // Отпускание/отмена в любом месте окна — отпускаем.
      window.addEventListener('pointerup', function () {
        self._held = false;
      });
      window.addEventListener('pointercancel', function () {
        self._held = false;
      });
    } else {
      // --- Fallback: мышью. ---
      canvas.addEventListener('mousedown', function (e) {
        e.preventDefault();
        self._held = true;
        self._click = logicalCoords(e);
      });
      window.addEventListener('mouseup', function () {
        self._held = false;
      });

      // --- Fallback: тач. ---
      canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        self._held = true;
        if (e.touches && e.touches.length) self._click = logicalCoords(e.touches[0]);
      }, { passive: false });
      window.addEventListener('touchend', function (e) {
        e.preventDefault();
        self._held = false;
      }, { passive: false });
      window.addEventListener('touchcancel', function () {
        self._held = false;
      });
    }
  },

  /**
   * Привязать управление к конкретному игроку (кубу).
   * @param {Game.Player} player - экземпляр Player.
   */
  setTarget: function (player) {
    this._target = player;
  },

  /**
   * Признак того, что кнопка прыжка сейчас удерживается.
   * Используется в core.js для hold-to-jump: каждый кадр,
   * пока isHeld() === true и куб на земле, вызывается jump().
   * @returns {boolean}
   */
  isHeld: function () {
    return this._held;
  },

  /**
   * Забрать (и обнулить) координаты последнего клика в логических единицах.
   * Используется меню для определения нажатой кнопки.
   * @returns {{x: number, y: number}|null}
   */
  consumeClick: function () {
    const c = this._click;
    this._click = null;
    return c;
  },

  /**
   * Забрать (и обнулить) флаг нажатия Esc (возврат в меню).
   * @returns {boolean}
   */
  consumeMenuPressed: function () {
    const m = this._menuPressed;
    this._menuPressed = false;
    return m;
  }
};
