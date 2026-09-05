/* ============================================================
   player.js — класс Player (куб-игрок / самолёт).
   Отвечает за физику и транспорт игрока:
     • 'cube' — гравитация + прыжок (классика);
     • 'ship' — самолёт: удержание = тяга вверх, отпустил = падение,
                есть потолок и пол (гибридный режим уровня).
   Координаты (x, y) задают ЛЕВЫЙ ВЕРХНИЙ угол спрайта.
   Ось Y направлена вниз: вверх = отрицательные значения.
   ============================================================ */

// Общее пространство имён игры (создаём, если ещё не существует).
window.Game = window.Game || {};

// ============================================================
//  КАСТОМИЗАЦИЯ: цвета и модели игрока.
//  Эти настройки выбираются в меню (ui.js) и читаются здесь
//  при отрисовке — и в игре, и в превью меню (через общие функции
//  Game.drawCubeModel / Game.drawShipModel).
// ============================================================

// Текущий выбор игрока (куб и самолёт).
Game.customize = {
  cubeColor: '#4dd0ff',
  cubeModel: 'default',   // 'default' | 'face' | 'tech'
  shipColor: '#ffaa33',
  shipModel: 'default',   // 'default' | 'jet' | 'dart'

  // --- Сохранение/загрузка в localStorage (выбор запоминается). ---
  STORAGE_KEY: 'gd.customize',

  /** Сохранить текущие настройки в localStorage. */
  save: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        cubeColor: this.cubeColor, cubeModel: this.cubeModel,
        shipColor: this.shipColor, shipModel: this.shipModel
      }));
    } catch (e) {
      // localStorage недоступен (приватный режим и т.п.) — тихо игнорируем.
    }
  },

  /** Загрузить настройки из localStorage (с валидацией). */
  load: function () {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d) {
        if (typeof d.cubeColor === 'string') this.cubeColor = d.cubeColor;
        if (this._validModel('cube', d.cubeModel)) this.cubeModel = d.cubeModel;
        if (typeof d.shipColor === 'string') this.shipColor = d.shipColor;
        if (this._validModel('ship', d.shipModel)) this.shipModel = d.shipModel;
      }
    } catch (e) {
      // Повреждённые данные — оставляем значения по умолчанию.
    }
  },

  /** Проверить, что модель существует в списке. */
  _validModel: function (kind, id) {
    const list = (kind === 'cube') ? (Game.CUBE_MODELS || []) : (Game.SHIP_MODELS || []);
    return list.some(function (m) { return m.id === id; });
  },

  /** Сбросить кастомизацию к значениям по умолчанию и сохранить. */
  resetAll: function () {
    this.cubeColor = '#4dd0ff'; this.cubeModel = 'default';
    this.shipColor = '#ffaa33'; this.shipModel = 'default';
    this.save();
  }
};

// Загружаем сохранённый выбор сразу при старте (до первой отрисовки).
Game.customize.load();

// Палитра доступных цветов (общая для куба и самолёта).
Game.PALETTE = ['#4dd0ff', '#ff4d4d', '#4caf50', '#ffd54f',
                '#8e6bd5', '#ff7a2f', '#f45b9c', '#eeeeee'];

// Список моделей куба (для меню кастомизации).
Game.CUBE_MODELS = [
  { id: 'default', name: 'Классика' },
  { id: 'face', name: 'Мордашка' },
  { id: 'tech', name: 'Техно' }
];

// Список моделей самолёта (для меню кастомизации).
Game.SHIP_MODELS = [
  { id: 'default', name: 'Винтокрыл' },
  { id: 'jet', name: 'Реактив' },
  { id: 'dart', name: 'Дротик' }
];

/**
 * Затемнить/осветлить hex-цвет (#rrggbb) на коэффициент f.
 * f>0 — светлее, f<0 — темнее.
 * @param {string} hex - цвет.
 * @param {number} f - коэффициент от -1 до 1.
 * @returns {string}
 */
Game.shade = function (hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(Math.min(255, Math.max(0, r + 255 * f)));
  g = Math.round(Math.min(255, Math.max(0, g + 255 * f)));
  b = Math.round(Math.min(255, Math.max(0, b + 255 * f)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

/**
 * Отрисовка куба по модели. Используется и игроком, и превью в меню.
 * @param {CanvasRenderingContext2D} ctx - контекст.
 * @param {number} x   - левый верхний угол.
 * @param {number} y   - левый верхний угол.
 * @param {number} size - размер.
 * @param {string} color - основной цвет.
 * @param {string} model - 'default' | 'face' | 'tech'.
 */
Game.drawCubeModel = function (ctx, x, y, size, color, model) {
  ctx.save();
  // Основа.
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
  // Рамка.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

  if (model === 'face') {
    // --- Мордашка: глаза и рот. ---
    const eyeR = size * 0.11;
    const eyeY = y + size * 0.38;
    // Глаза.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + size * 0.32, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(x + size * 0.68, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(x + size * 0.34, eyeY, eyeR * 0.45, 0, Math.PI * 2);
    ctx.arc(x + size * 0.70, eyeY, eyeR * 0.45, 0, Math.PI * 2);
    ctx.fill();
    // Улыбка.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.beginPath();
    ctx.arc(x + size * 0.5, y + size * 0.52, size * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (model === 'tech') {
    // --- Техно: панель с полосой и точками. ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x + size * 0.12, y + size * 0.42, size * 0.76, size * 0.18);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(x + size * 0.30, y + size * 0.24, size * 0.07, 0, Math.PI * 2);
    ctx.arc(x + size * 0.44, y + size * 0.24, size * 0.07, 0, Math.PI * 2);
    ctx.arc(x + size * 0.30, y + size * 0.68, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // --- Классика: блик сверху. ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x + 1, y + 1, size - 2, size * 0.3);
  }

  ctx.restore();
};

/**
 * Отрисовка самолёта по модели.
 * @param {CanvasRenderingContext2D} ctx - контекст.
 * @param {number} x   - левый верхний угол.
 * @param {number} y   - левый верхний угол.
 * @param {number} size - размер.
 * @param {string} color - основной цвет корпуса.
 * @param {string} model - 'default' | 'jet' | 'dart'.
 */
Game.drawShipModel = function (ctx, x, y, size, color, model) {
  const s = size;
  const dark = Game.shade(color, -0.18); // темнее для крыльев/хвоста
  ctx.save();

  if (model === 'jet') {
    // --- Реактивный: обтекаемый корпус + верхнее крыло + хвост. ---
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.06, y + s * 0.45);
    ctx.lineTo(x + s * 0.95, y + s * 0.40); // нос
    ctx.lineTo(x + s * 0.95, y + s * 0.62);
    ctx.lineTo(x + s * 0.14, y + s * 0.65);
    ctx.closePath();
    ctx.fill();
    // Кабина.
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    ctx.arc(x + s * 0.32, y + s * 0.44, s * 0.10, 0, Math.PI * 2);
    ctx.fill();
    // Верхнее крыло.
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.28, y + s * 0.46);
    ctx.lineTo(x + s * 0.46, y + s * 0.04);
    ctx.lineTo(x + s * 0.58, y + s * 0.04);
    ctx.lineTo(x + s * 0.46, y + s * 0.48);
    ctx.closePath();
    ctx.fill();
    // Хвостовой стабилизатор.
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.08, y + s * 0.45);
    ctx.lineTo(x + s * 0.00, y + s * 0.16);
    ctx.lineTo(x + s * 0.14, y + s * 0.36);
    ctx.closePath();
    ctx.fill();
    // Реактивное сопло.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x + s * 0.02, y + s * 0.50, s * 0.08, s * 0.14);
  } else if (model === 'dart') {
    // --- Дротик: узкий треугольный со стреловидным крылом. ---
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.06, y + s * 0.60);
    ctx.lineTo(x + s * 0.95, y + s * 0.50); // остриё
    ctx.lineTo(x + s * 0.10, y + s * 0.30);
    ctx.closePath();
    ctx.fill();
    // Грань-тень.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x + s * 0.10, y + s * 0.30);
    ctx.lineTo(x + s * 0.95, y + s * 0.50);
    ctx.lineTo(x + s * 0.55, y + s * 0.52);
    ctx.closePath();
    ctx.fill();
    // Стреловидное крыло.
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.16, y + s * 0.44);
    ctx.lineTo(x + s * 0.30, y + s * 0.02);
    ctx.lineTo(x + s * 0.44, y + s * 0.30);
    ctx.closePath();
    ctx.fill();
    // Кабина.
    ctx.fillStyle = '#e8f6ff';
    ctx.beginPath();
    ctx.arc(x + s * 0.24, y + s * 0.45, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // --- Винтокрыл: классический корпус с верхним/нижним крылом и хвостом. ---
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.10, y + s * 0.42);
    ctx.lineTo(x + s * 0.92, y + s * 0.38);
    ctx.lineTo(x + s * 0.92, y + s * 0.62);
    ctx.lineTo(x + s * 0.18, y + s * 0.66);
    ctx.closePath();
    ctx.fill();
    // Кабина.
    ctx.fillStyle = '#fff08a';
    ctx.beginPath();
    ctx.arc(x + s * 0.30, y + s * 0.44, s * 0.11, 0, Math.PI * 2);
    ctx.fill();
    // Верхнее крыло.
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.30, y + s * 0.44);
    ctx.lineTo(x + s * 0.48, y + s * 0.02);
    ctx.lineTo(x + s * 0.62, y + s * 0.02);
    ctx.lineTo(x + s * 0.48, y + s * 0.46);
    ctx.closePath();
    ctx.fill();
    // Нижнее крыло.
    ctx.fillStyle = Game.shade(color, -0.32);
    ctx.beginPath();
    ctx.moveTo(x + s * 0.34, y + s * 0.62);
    ctx.lineTo(x + s * 0.52, y + s * 0.98);
    ctx.lineTo(x + s * 0.66, y + s * 0.98);
    ctx.lineTo(x + s * 0.52, y + s * 0.62);
    ctx.closePath();
    ctx.fill();
    // Хвост.
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.10, y + s * 0.42);
    ctx.lineTo(x + s * 0.02, y + s * 0.18);
    ctx.lineTo(x + s * 0.16, y + s * 0.36);
    ctx.closePath();
    ctx.fill();
  }

  // Общий контур.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
};

/**
 * Класс игрока (куб или самолёт).
 */
class Player {
  /**
   * @param {object} config - параметры создания.
   * @param {number} config.x        - стартовая X-координата (левая часть экрана).
   * @param {number} config.groundY  - Y-координата уровня земли (пола).
   * @param {number} config.size     - размер спрайта в пикселях.
   * @param {number} config.gravity  - гравитация куба (px/с^2), вниз.
   * @param {number} config.jumpSpeed - модуль скорости прыжка куба (px/с).
   * @param {number} [config.hitboxScale] - доля размера спрайта под хитбокс (0..1).
   * @param {object} [config.ship]   - параметры самолёта (см. Game.CONFIG.SHIP).
   */
  constructor(config) {
    // --- Начальные координаты (левая часть экрана) ---
    this.x = config.x;

    // --- Условный уровень земли (пол). Касание = низ спрайта на этом Y. ---
    this.groundY = config.groundY;

    // --- Размер спрайта ---
    this.size = config.size;

    // Стартовое положение — игрок стоит на земле.
    this.y = this.groundY - this.size;

    // --- Хитбокс чуть меньше спрайта (точные коллизии AABB). ---
    this.hitboxScale = config.hitboxScale || 0.9;

    // Позиция в прошлом кадре (для детекта приземления на блок).
    this.prevY = this.y;

    // --- Скорость падения/подъёма по вертикали (px/с). Отрицательное = вверх. ---
    this.velocityY = 0;

    // --- Физика куба ---
    this.gravity = config.gravity;       // ускорение вниз (px/с^2)
    this.jumpSpeed = config.jumpSpeed;   // модуль скорости прыжка (px/с)

    // --- Физика самолёта (ship) ---
    const ship = config.ship || {};
    this.shipGravity = ship.gravity || 2400;   // падение, когда не зажато
    this.shipThrust = ship.thrust || -5200;    // тяга, когда зажато (вверх)
    this.shipMaxUp = ship.maxUp || 620;        // предел скорости вверх
    this.shipMaxDown = ship.maxDown || 620;    // предел скорости вниз
    this.ceilingY = ship.ceilingY || 90;       // потолок полёта (верхняя граница)

    // --- Транспорт ---
    this.mode = 'cube'; // 'cube' | 'ship'

    // Флаг: игрок стоит на твёрдой опоре (пол или блок).
    this.onGround = true;
  }

  /**
   * Хитбокс — прямоугольник чуть меньше спрайта.
   * @returns {{x: number, y: number, w: number, h: number}}
   */
  getHitbox() {
    const inset = (this.size * (1 - this.hitboxScale)) / 2;
    return {
      x: this.x + inset,
      y: this.y + inset,
      w: this.size - inset * 2,
      h: this.size - inset * 2
    };
  }

  /** Текущий транспорт: 'cube' или 'ship'. */
  getMode() { return this.mode; }

  /**
   * Переключить транспорт (например, через портал).
   * Сбрасывает вертикальную скорость и флаг опоры.
   * @param {string} mode - 'cube' | 'ship'.
   */
  setMode(mode) {
    if (mode !== 'cube' && mode !== 'ship') return;
    this.mode = mode;
    this.velocityY = 0;
    this.onGround = false;
    this.prevY = this.y;
  }

  /**
   * Прыжок куба вверх (работает только в режиме 'cube' и на земле).
   */
  jump() {
    if (this.mode !== 'cube' || !this.onGround) return;
    // Вверх = отрицательная скорость по оси Y (ось Y направлена вниз).
    this.velocityY = -this.jumpSpeed;
    this.onGround = false;
  }

  /**
   * Обновление физики на один кадр.
   * @param {number} dt   - delta time в секундах.
   * @param {boolean} held - признак того, что кнопка зажата (важно для самолёта).
   */
  update(dt, held) {
    this.prevY = this.y;

    if (this.mode === 'ship') {
      this._updateShip(dt, held);
    } else {
      this._updateCube(dt);
    }
  }

  /**
   * Физика куба: гравитация + движение + земля.
   */
  _updateCube(dt) {
    // 1. Гравитация увеличивает скорость падения.
    this.velocityY += this.gravity * dt;
    // 2. Применяем скорость.
    this.y += this.velocityY * dt;
    // 3. Не даём провалиться ниже уровня земли.
    const groundTop = this.groundY - this.size;
    if (this.y >= groundTop) {
      this.y = groundTop;
      this.velocityY = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  /**
   * Физика самолёта: тяга при удержании, падение без удержания,
   * ограничение скорости и границы потолок/пол.
   */
  _updateShip(dt, held) {
    // Тяга (вверх) или гравитация (вниз).
    const accel = held ? (this.shipGravity + this.shipThrust) : this.shipGravity;
    this.velocityY += accel * dt;

    // Ограничение вертикальной скорости.
    this.velocityY = Math.max(-this.shipMaxUp, Math.min(this.shipMaxDown, this.velocityY));

    // Применяем скорость.
    this.y += this.velocityY * dt;

    // Пол (низ).
    const groundTop = this.groundY - this.size;
    if (this.y >= groundTop) {
      this.y = groundTop;
      this.velocityY = 0;
      this.onGround = true;
      return;
    }

    // Потолок (верх).
    if (this.y <= this.ceilingY) {
      this.y = this.ceilingY;
      this.velocityY = 0;
      this.onGround = true;
      return;
    }

    // В свободном полёте.
    this.onGround = false;
  }

  /**
   * Отрисовка игрока: куб или самолёт в зависимости от режима.
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  draw(ctx) {
    if (this.mode === 'ship') this._drawShip(ctx);
    else this._drawCube(ctx);
  }

  /** Отрисовка куба (цвет и модель из кастомизации). */
  _drawCube(ctx) {
    const c = (Game.customize && Game.customize.cubeColor) || '#4dd0ff';
    const m = (Game.customize && Game.customize.cubeModel) || 'default';
    Game.drawCubeModel(ctx, this.x, this.y, this.size, c, m);
  }

  /** Отрисовка самолёта (цвет и модель из кастомизации). */
  _drawShip(ctx) {
    const c = (Game.customize && Game.customize.shipColor) || '#ffaa33';
    const m = (Game.customize && Game.customize.shipModel) || 'default';
    Game.drawShipModel(ctx, this.x, this.y, this.size, c, m);
  }
}

// Экспортируем класс в пространство имён игры.
Game.Player = Player;
