/* ============================================================
   level.js — класс Level (уровень).
   Карта уровня — 2D-массив (строки = ряды, индекс 0 = нижний ряд,
   стоящий прямо на земле). Значения ячеек:
     0 — пусто, 1 — блок, 2 — шип (треугольник).
   Уровень непрерывно движется влево с фиксированной скоростью.
   ============================================================ */

// Общее пространство имён игры.
window.Game = window.Game || {};

/**
 * Карта уровня по умолчанию. Чтобы мир был бесконечным, карта
 * зацикливается по горизонтали (паттерн повторяется).
 * Значения: 0 — пусто, 1 — блок, 2 — шип.
 *
 * ПЕРВЫЙ УРОВЕНЬ — ПРОСТОЙ И ПРОХОДИМЫЙ.
 * Здесь только препятствия высотой в одну клетку (блок 1 на земле)
 * и одиночные шипы (2) — всё легко перепрыгивается одним прыжком.
 * Между препятствиями зазор минимум 5 клеток (200px), в начале —
 * разбег 16 клеток (640px), чтобы игрок успел отреагировать.
 * Верхние ряды (index 1, 2) оставлены пустыми — никаких «стен» в 2 клетки.
 */
const DEFAULT_MAP = [
  // Нижний ряд (index 0): блоки и шипы на земле.
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0,
    0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2,
    0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0
  ],
  // Второй ряд (index 1): пусто (стен высотой 2 клетки нет).
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ],
  // Верхний ряд (index 2): пусто.
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
  ]
];

/**
 * Класс уровня.
 */
class Level {
  /**
   * @param {object} config - параметры создания.
   * @param {number} config.tileSize - размер клетки в пикселях (квадрат).
   * @param {number} config.speed    - скорость движения уровня влево (px/с).
   * @param {number} config.groundY  - Y-координата линии земли.
   * @param {number[][]} [config.map] - карта уровня (по умолчанию DEFAULT_MAP).
   */
  constructor(config) {
    this.tileSize = config.tileSize;
    this.speed = config.speed;      // px/с, движение влево
    this.groundY = config.groundY;  // Y линии пола

    // Смещение мира (px). Растёт со временем → карта «уезжает» влево.
    this.offsetX = 0;

    // Карта уровня.
    this.map = config.map || DEFAULT_MAP;

    // Нормализуем ширину: приводим все ряды к максимальной длине
    // (недостающие ячейки справа заполняем нулями = пусто).
    this.mapWidth = 0;
    for (let r = 0; r < this.map.length; r++) {
      this.mapWidth = Math.max(this.mapWidth, this.map[r].length);
    }
    for (let r = 0; r < this.map.length; r++) {
      while (this.map[r].length < this.mapWidth) {
        this.map[r].push(0);
      }
    }
  }

  /**
   * Обновление уровня: двигаем мир влево с фиксированной скоростью.
   * @param {number} dt - delta time в секундах.
   */
  update(dt) {
    this.offsetX += this.speed * dt;
  }

  /**
   * Получить значение ячейки с учётом горизонтальной зацикленности карты.
   * @returns {number} 0 — пусто, 1 — блок, 2 — шип.
   */
  tileAt(col, row) {
    const wrappedCol = ((col % this.mapWidth) + this.mapWidth) % this.mapWidth;
    return this.map[row][wrappedCol] || 0;
  }

  /**
   * Отрисовка уровня: проходим по видимым колонкам и рисуем блоки/шипы.
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  render(ctx) {
    const ts = this.tileSize;

    // Первая колонка, попадающая в левый край экрана.
    const startCol = Math.floor(this.offsetX / ts);
    // Количество колонок, чтобы покрыть экран плюс запас.
    const numCols = Math.ceil(Game.CONFIG.LOGICAL_WIDTH / ts) + 2;

    for (let i = 0; i < numCols; i++) {
      const col = startCol + i;                       // мировая колонка
      const screenX = Math.round(col * ts - this.offsetX); // экранная X-координата

      for (let row = 0; row < this.map.length; row++) {
        const value = this.tileAt(col, row);
        if (value === 0) continue;

        // Экранная Y-координата верхнего левого угла клетки.
        // Ряд 0 — нижний: его верх = groundY - (0+1)*ts.
        const screenY = this.groundY - (row + 1) * ts;

        if (value === 1) {
          this.drawBlock(ctx, screenX, screenY, ts);
        } else if (value === 2) {
          this.drawSpike(ctx, screenX, screenY, ts);
        }
      }
    }
  }

  /**
   * Отрисовка блока (квадрат).
   */
  drawBlock(ctx, x, y, size) {
    ctx.fillStyle = '#4f6df0';
    ctx.fillRect(x, y, size, size);

    // Контур блока.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

    // Лёгкий блик сверху: создаёт объём.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x + 1, y + 1, size - 2, size * 0.25);
  }

  /**
   * Отрисовка шипа (треугольник, остриём вверх).
   */
  drawSpike(ctx, x, y, size) {
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.moveTo(x, y + size);            // левый нижний угол
    ctx.lineTo(x + size / 2, y);        // остриё (верх по центру)
    ctx.lineTo(x + size, y + size);     // правый нижний угол
    ctx.closePath();
    ctx.fill();

    // Контур шипа.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Обработка коллизий куба с уровнем (AABB).
   * Правила:
   *  • шип — мгновенная смерть;
   *  • попадание в торец (боковую грань) блока — мгновенная смерть;
   *  • приземление на верхнюю грань блока — куб скользит по нему;
   *  • касание базового пола обрабатывается в Player.update().
   * Мутирует положение игрока (y, velocityY, onGround) для приземления.
   * @param {Game.Player} player - куб.
   * @returns {{died: boolean}} результат: погиб ли игрок.
   */
  resolvePlayer(player) {
    const ts = this.tileSize;
    const rows = this.map.length;

    const hb = player.getHitbox();      // хитбокс (меньше спрайта) — точные коллизии
    const inset = (player.size * (1 - player.hitboxScale)) / 2;
    const EPS = 2;                       // допуск (px) для «плавного» приземления
    const LAND_MARGIN = 3;               // запас (px) вниз для детекта опоры под ногами

    // Колонки, которые перекрывает игрок по горизонтали (в мировых координатах).
    const worldLeft = player.x + inset + this.offsetX;
    const worldRight = player.x + player.size - inset + this.offsetX;
    const minCol = Math.floor(worldLeft / ts);
    const maxCol = Math.floor((worldRight - 1) / ts);

    let died = false;
    let supportY = null;   // Y верхней грани блока, на который можно приземлиться

    for (let col = minCol; col <= maxCol && !died; col++) {
      for (let row = 0; row < rows && !died; row++) {
        const value = this.tileAt(col, row);
        if (value === 0) continue;

        const screenX = col * ts - this.offsetX;   // экранная X клетки
        const top = this.groundY - (row + 1) * ts; // верхний Y клетки
        const bottom = top + ts;                    // нижний Y клетки

        if (value === 2) {
          // --- Шип: пересечение с хитбоксом = смерть. ---
          if (hb.x < screenX + ts && hb.x + hb.w > screenX &&
              hb.y < bottom && hb.y + hb.h > top) {
            died = true;
          }
          continue;
        }

        // --- Блок (value === 1) ---
        // Тело куба по вертикали с запасом вниз для детекта опоры.
        const bodyTop = player.y + inset;
        const bodyBottom = player.y + player.size - inset + LAND_MARGIN;
        const bodyOverlap = bodyTop < bottom && bodyBottom > top;
        if (!bodyOverlap) continue; // блок не пересекается с телом куба — пропускаем

        const feet = player.y + player.size;          // низ спрайта
        const prevFeet = player.prevY + player.size;  // низ в прошлом кадре
        const aboveTop = feet <= top + EPS;           // куб над верхней гранью
        const descendingOnto = prevFeet <= top + EPS && feet >= top - EPS &&
                               player.velocityY >= 0; // куб опускается сверху на грань

        if (aboveTop || descendingOnto) {
          // Можно приземлиться на эту грань — скользим по ней.
          supportY = (supportY === null) ? top : Math.max(supportY, top);
        } else {
          // Низ куба ниже верхней грани — удар о торец блока.
          died = true;
        }
      }
    }

    // Приземление на опору (верх блока).
    if (!died && supportY !== null) {
      const targetY = supportY - player.size;
      // Опускаемся/стоим: прижимаем куб к грани и гасим вертикальную скорость.
      if (player.y + player.size >= supportY - EPS && player.velocityY >= 0) {
        player.y = targetY;
        player.velocityY = 0;
        player.onGround = true;
      }
    }

    return { died: died };
  }
}

// Экспортируем класс (и карту по умолчанию) в пространство имён игры.
Game.Level = Level;
Game.DEFAULT_MAP = DEFAULT_MAP;
