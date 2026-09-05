/* ============================================================
   input.js — управление.
   Перехватывает ввод: Space, стрелка вверх, клик мыши, тач.
   Реализует hold-to-jump: пока кнопка зажата, куб прыгает сразу
   при приземлении (проверка состояния зажатости ведётся в цикле core.js).
   ============================================================ */

// Общее пространство имён игры.
window.Game = window.Game || {};

// API модуля ввода.
Game.input = {
  // Флаг: кнопка прыжка сейчас зажата (для hold-to-jump).
  _held: false,

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

    // --- Клавиатура: Space и стрелка вверх. ---
    function isJumpKey(e) {
      return e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp';
    }

    window.addEventListener('keydown', function (e) {
      if (isJumpKey(e)) {
        // Не даём браузеру прокручивать страницу по пробелу/стрелке.
        e.preventDefault();
        self._held = true;
      }
    });

    window.addEventListener('keyup', function (e) {
      if (isJumpKey(e)) {
        self._held = false;
      }
    });

    // --- Указатель: мышь + тач через Pointer Events (современный единый API). ---
    if (window.PointerEvent) {
      // Нажатие на канвас — зажимаем.
      canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        self._held = true;
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
      });
      window.addEventListener('mouseup', function () {
        self._held = false;
      });

      // --- Fallback: тач. ---
      canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        self._held = true;
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
  }
};
