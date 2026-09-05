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

/* ============================================================
   СИСТЕМА СЛОЖНОСТИ УРОВНЕЙ.
   Каждая сложность — набор числовых ограничений, по которым
   генерируется карта. Ограничения подобраны из физики куба
   (tile=40, gravity=2000, jumpSpeed=700, speed базовая=280):
     • макс высота прыжка ~3.06 клетки;
     • препятствие высотой 1 клетку можно перепрыгнуть шириной
       до ~4.0 клеток (пока куб выше 40px);
     • препятствие высотой 2 клетки — шириной до ~2.9 клеток.
   Для НОВЫХ уровней карта строится функцией generateLevel()
   строго в рамках ограничений соответствующей сложности.
   ============================================================ */

/**
 * Таблица сложностей. Поля:
 *  key           — идентификатор;
 *  name          — отображаемое имя;
 *  speedMul      — множитель скорости (1.0 = базовая);
 *  rows          — число рядов карты (0 = нижний);
 *  minGap        — минимальный зазор между препятствиями (в клетках);
 *  maxHeight     — максимальная высота блока (в клетках);
 *  maxWidth      — максимальная ширина блока для высоты 1;
 *  allowDoubleSpike — разрешает двойной шип (2 клетки);
 *  spikeOnBlock  — разрешает шип на вершине блока (сложно).
 * Высоту 2 всегда ограничиваем шириной <=2 (по физике).
 */
Game.DIFFICULTIES = {
  easy: {
    key: 'easy', name: 'Лёгкий',
    speedMul: 1.00, rows: 2, minGap: 5,
    maxHeight: 1, maxWidth: 2,
    allowDoubleSpike: false, spikeOnBlock: false
  },
  normal: {
    key: 'normal', name: 'Средний',
    speedMul: 1.12, rows: 2, minGap: 6,
    maxHeight: 1, maxWidth: 3,
    allowDoubleSpike: true, spikeOnBlock: false
  },
  hard: {
    key: 'hard', name: 'Сложный',
    speedMul: 1.24, rows: 3, minGap: 7,
    maxHeight: 2, maxWidth: 3,
    allowDoubleSpike: true, spikeOnBlock: false
  },
  // Безумный — самый сложный. Гибридный: первая часть — куб со ступеньками,
  // затем портал переключает на самолёт (ship) до конца уровня.
  // Сложность набирается скоростью, ступеньками и полётом, а не «нечестными»
  // паттернами: двойные шипы отключены, стенки одиночные и проходимые.
  insane: {
    key: 'insane', name: 'Безумный',
    speedMul: 1.32, rows: 3, minGap: 8,
    // Обычные препятствия высоты 1 (сложность — скорость/ступеньки/самолёт);
    // высоту 2 дают только ступеньки (специальный проходимый паттерн).
    maxHeight: 1, maxWidth: 3,
    allowDoubleSpike: false, spikeOnBlock: false,
    stairs: true, hybrid: true
  }
};

/**
 * Простой детерминированный ГПСЧ (Linear Congruential + mulberry32).
 * Один и тот же seed всегда даёт одну и ту же карту.
 * @param {number} a - зерно.
 * @returns {function():number} функция, возвращающая число в [0,1).
 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Генерация карты уровня по заданной сложности.
 * Гарантирует: разбег в начале, зазоры >= minGap, у препятствий
 * высотой 2 ширина <= 2 (иначе непреодолимо по физике).
 * @param {string} difficultyKey - ключ из Game.DIFFICULTIES.
 * @param {object} [opts] - настройки.
 * @param {number} [opts.width]    - ширина карты в клетках.
 * @param {number} [opts.seed]     - зерно (детерминированность).
 * @param {number} [opts.runway]   - разбег до первого препятствия (клетки).
 * @returns {number[][]} карта (ряды сверху-вниз? НЕТ: индекс 0 = нижний ряд).
 */
/**
 * Вспомогательная: расставить одно кубическое препятствие (стена/шип/двойной шип).
 * Возвращает новую колонку после препятствия.
 */
function placeOneObstacle(map, rng, col, endCol, d) {
  const rows = map.length;
  const roll = rng();

  if (roll < 0.45) {
    // --- Блок-стена. ---
    let h = 1;
    if (d.maxHeight >= 2 && rng() < 0.30) h = 2;
    let w;
    if (h === 2) {
      w = 1 + Math.floor(rng() * 2);   // у высоты 2 ширина <= 2 (по физике)
    } else {
      w = 1 + Math.floor(rng() * d.maxWidth);
    }
    w = Math.max(1, Math.min(w, endCol - col));

    for (let c = col; c < col + w; c++) {
      for (let r = 0; r < h; r++) map[r][c] = 1;
    }
    // Шип на вершине блока (для сложных уровней).
    if (d.spikeOnBlock && h < rows && rng() < 0.5) {
      map[h][col + w - 1] = 2;
    }
    return col + w + d.minGap + Math.floor(rng() * 3);
  } else if (roll < 0.72) {
    // --- Одиночный шип. ---
    map[0][col] = 2;
    return col + 1 + d.minGap + Math.floor(rng() * 3);
  } else {
    // --- Двойной шип (если разрешён), иначе одиночный. ---
    if (d.allowDoubleSpike && col + 1 < endCol) {
      map[0][col] = 2;
      map[0][col + 1] = 2;
      return col + 2 + d.minGap + Math.floor(rng() * 3);
    }
    map[0][col] = 2;
    return col + 1 + d.minGap + Math.floor(rng() * 3);
  }
}

/**
 * Ступеньки: возрастающая лесенка из блоков (высота 1→2) с зазором
 * между ступенями, по которой куб запрыгивает вверх. Возвращает новую колонку.
 */
function placeStairs(map, rng, col, endCol, d) {
  // Ступеньки — специальный проходимый паттерн: высота до 2 (ряд сверху пустует),
  // куб забирается «по шагам», приземляясь на каждую ступень.
  const maxStepH = Math.min(2, Math.max(1, map.length - 1)); // 2 при 3+ рядах
  const stepGap = 2;                              // пустых клеток между ступенями
  const steps = Math.max(1, Math.min(2, maxStepH)); // 1 или 2 ступени вверх
  let c = col;
  for (let i = 0; i < steps && c < endCol; i++) {
    const h = i + 1;
    if (h > maxStepH) break;
    for (let r = 0; r < h; r++) map[r][c] = 1;
    c += 1 + stepGap;
  }
  // Каждая ступень — одиночная колонка; никаких широких «плато» высоты 2,
  // чтобы каждую ступень можно было перепрыгнуть/запрыгнуть за один прыжок.
  return c + d.minGap;
}

/**
 * Ship-секция: полёт на самолёте между «стенами» (блоки разной высоты)
 * и шипами. Большие зазоры, чтобы успеть набрать/сбросить высоту.
 */
function runShipPattern(map, rng, col, endCol, d) {
  let c = col;
  while (c < endCol - 1) {
    // Мягкая секция полёта: стенки высоты 1 (ширина 1..2) и одиночные шипы.
    // Большие зазоры — чтобы самолёт успевал набрать/сбросить высоту.
    const roll = rng();
    if (roll < 0.6) {
      // Стена из блоков высоты 1.
      let w = 1 + Math.floor(rng() * 2); // 1..2
      w = Math.max(1, Math.min(w, endCol - c));
      for (let c2 = c; c2 < c + w; c2++) map[0][c2] = 1;
      c += w + d.minGap + Math.floor(rng() * 2);
    } else {
      // Одиночный шип.
      map[0][c] = 2;
      c += 1 + d.minGap + Math.floor(rng() * 2);
    }
  }
}

/**
 * Генерация карты уровня по заданной сложности.
 * Гарантирует: разбег в начале, зазоры >= minGap, у препятствий
 * высотой 2 ширина <= 2 (иначе непреодолимо по физике).
 * Если сложность `hybrid` — строит гибрид: куб-секция (со ступеньками),
 * затем портал (тайл 3) и ship-секция (самолёт) до конца.
 * @param {string} difficultyKey - ключ из Game.DIFFICULTIES.
 * @param {object} [opts] - настройки.
 * @param {number} [opts.width]    - ширина карты в клетках.
 * @param {number} [opts.seed]     - зерно (детерминированность).
 * @param {number} [opts.runway]   - разбег до первого препятствия (клетки).
 * @param {number} [opts.portalAt] - доля ширины, где стоит портал (гибрид).
 * @returns {number[][]} карта (индекс 0 = нижний ряд). Тайлы: 0 пусто, 1 блок, 2 шип, 3 портал.
 */
Game.generateLevel = function (difficultyKey, opts) {
  opts = opts || {};
  const d = Game.DIFFICULTIES[difficultyKey] || Game.DIFFICULTIES.easy;
  const width = opts.width || 72;
  const seed = (opts.seed !== undefined) ? opts.seed : 1234;
  const rng = mulberry32(seed);
  const rows = d.rows;

  // Карта: rows рядов по width клеток, заполнена нулями (пусто).
  const map = [];
  for (let r = 0; r < rows; r++) map.push(new Array(width).fill(0));

  const isHybrid = d.hybrid && opts.hybrid !== false;

  if (isHybrid) {
    const portalCol = Math.floor(width * (opts.portalAt || 0.45));
    // Куб-секция [0, portalCol): препятствия + ступеньки.
    let col = (opts.runway !== undefined) ? opts.runway : Math.floor(portalCol * 0.3);
    while (col < portalCol - 1) {
      if (d.stairs && rng() < 0.25) {
        col = placeStairs(map, rng, col, portalCol, d);
      } else {
        col = placeOneObstacle(map, rng, col, portalCol, d);
      }
    }
    // Портал (тайл 3) чуть выше земли, чтобы был виден.
    const portalRow = Math.min(1, rows - 1);
    map[portalRow][portalCol] = 3;
    // Небольшой «кик» — 1 клетка свободно перед порталом уже очищена.
    // Ship-секция после портала до конца.
    runShipPattern(map, rng, portalCol + 2, width, d);
  } else {
    // Обычная (куб) карта.
    const runway = (opts.runway !== undefined) ? opts.runway : Math.floor(width * 0.18);
    let col = runway;
    while (col < width - 1) {
      if (d.stairs && rng() < 0.25) {
        col = placeStairs(map, rng, col, width, d);
      } else {
        col = placeOneObstacle(map, rng, col, width, d);
      }
    }
  }

  return map;
};

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

    // Ищем порталы (тайл 3) — позиции переключения транспорта.
    this.portalCols = [];
    for (let r = 0; r < this.map.length; r++) {
      for (let c = 0; c < this.mapWidth; c++) {
        if (this.map[r][c] === 3) this.portalCols.push(c);
      }
    }
  }

  /** Есть ли в уровне порталы (переключение на самолёт). */
  hasPortals() { return this.portalCols.length > 0; }

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
        } else if (value === 3) {
          this.drawPortal(ctx, screenX, screenY, ts);
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
   * Отрисовка портала переключения транспорта (мерцающее кольцо).
   */
  drawPortal(ctx, x, y, size) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.42;
    const pulse = 0.5 + 0.5 * Math.sin(Game.gameTime !== undefined ? Game.gameTime : 0);

    ctx.save();
    // Внешнее свечение.
    ctx.fillStyle = 'rgba(255, 77, 255, 0.10)';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fill();
    // Кольцо.
    ctx.strokeStyle = '#ff4dff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    // Внутренний блик (мигает).
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.25 + 0.35 * pulse) + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
        if (value === 0 || value === 3) continue;   // пусто и портал — не препятствие

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
