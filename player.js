/* ============================================================
   player.js — класс Player (куб-игрок).
   Отвечает за физику куба: гравитацию, прыжок, скорость падения.
   Координаты (x, y) задают ЛЕВЫЙ ВЕРХНИЙ угол спрайта куба.
   Ось Y направлена вниз: вверх = отрицательные значения.
   ============================================================ */

// Общее пространство имён игры (создаём, если ещё не существует).
window.Game = window.Game || {};

/**
 * Класс куба-игрока.
 */
class Player {
  /**
   * @param {object} config - параметры создания.
   * @param {number} config.x        - стартовая X-координата (левая часть экрана).
   * @param {number} config.groundY  - Y-координата уровня земли (пола).
   * @param {number} config.size     - размер куба в пикселях (квадрат).
   * @param {number} config.gravity  - гравитация (px/с^2), положительное число вниз.
   * @param {number} config.jumpSpeed - модуль скорости прыжка (px/с), вверх.
   * @param {number} [config.hitboxScale] - доля размера спрайта под хитбокс (0..1).
   */
  constructor(config) {
    // --- Начальные координаты (левая часть экрана) ---
    this.x = config.x;

    // --- Условный уровень земли (пол). Касание куба = низ спрайта на этом Y. ---
    this.groundY = config.groundY;

    // --- Размер куба (например, 40x40) ---
    this.size = config.size;

    // Стартовое положение — куб стоит на земле.
    // Верхний левый угол = groundY - size (низ спрайта касается пола).
    this.y = this.groundY - this.size;

    // --- Хитбокс чуть меньше спрайта (точные коллизии AABB). ---
    // 1.0 = хитбокс совпадает со спрайтом; 0.9 = на 10% меньше.
    this.hitboxScale = config.hitboxScale || 0.9;

    // Позиция в прошлом кадре (нужна для надёжного определения приземления на блок).
    this.prevY = this.y;

    // --- Скорость падения по вертикали (px/с). Отрицательное = вверх. ---
    this.velocityY = 0;

    // --- Физика ---
    this.gravity = config.gravity;       // ускорение вниз (px/с^2)
    this.jumpSpeed = config.jumpSpeed;   // модуль скорости прыжка (px/с)

    // Флаг: куб сейчас на земле (нужен для проверки возможности прыжка).
    this.onGround = true;
  }

  /**
   * Хитбокс куба — прямоугольник чуть меньше спрайта.
   * Используется для точных AABB-коллизий (шипы, торцы блоков).
   * @returns {{x: number, y: number, w: number, h: number}}
   */
  getHitbox() {
    // Отступ от края спрайта, чтобы хитбокс был меньше.
    const inset = (this.size * (1 - this.hitboxScale)) / 2;
    return {
      x: this.x + inset,
      y: this.y + inset,
      w: this.size - inset * 2,
      h: this.size - inset * 2
    };
  }

  /**
   * Прыжок вверх: задаём отрицательную вертикальную скорость.
   * Если куб уже в воздухе, прыжок не срабатывает (одиночный прыжок).
   */
  jump() {
    if (!this.onGround) return;

    // Вверх = отрицательная скорость по оси Y (ось Y направлена вниз).
    this.velocityY = -this.jumpSpeed;
    this.onGround = false;
  }

  /**
   * Обновление физики на один кадр.
   * Применяем гравитацию и не даём кубу провалиться ниже земли.
   * @param {number} dt - delta time в секундах.
   */
  update(dt) {
    // Запоминаем позицию до движения (для детекта приземления на блок).
    this.prevY = this.y;

    // 1. Гравитация увеличивает скорость падения.
    this.velocityY += this.gravity * dt;

    // 2. Применяем скорость: перемещаем куб по вертикали.
    this.y += this.velocityY * dt;

    // 3. Не даём кубу провалиться ниже условного уровня земли.
    const groundTop = this.groundY - this.size; // минимально допустимый Y (низ на полу)
    if (this.y >= groundTop) {
      this.y = groundTop;         // ставим ровно на землю
      this.velocityY = 0;         // обнуляем скорость падения
      this.onGround = true;       // куб на земле
    } else {
      // Куб в воздухе.
      this.onGround = false;
    }
  }

  /**
   * Отрисовка куба. Пока — простой цветной квадрат.
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  draw(ctx) {
    // Основная заливка куба.
    ctx.fillStyle = '#4dd0ff';
    ctx.fillRect(this.x, this.y, this.size, this.size);

    // Скруглённый контур, чтобы куб визуально выделялся.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, this.size - 2, this.size - 2);
  }
}

// Экспортируем класс в пространство имён игры, чтобы core.js мог создавать экземпляр.
Game.Player = Player;
