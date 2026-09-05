/* ============================================================
   core.js — главный файл игры.
   Отвечает за:
     • настройку Canvas под соотношение 16:9;
     • адаптивность к экрану (масштабирование с учётом devicePixelRatio);
     • игровой цикл через requestAnimationFrame с подсчётом delta time;
     • вывод простого счётчика FPS (для проверки работы цикла).
   ============================================================ */

// Общее пространство имён игры (создаём, если модуль не был объявлен раньше).
window.Game = window.Game || {};

// -------------------- Конфигурация игры --------------------
Game.CONFIG = {
  LOGICAL_WIDTH: 960,   // логическая ширина игрового поля (пропорция 16:9)
  LOGICAL_HEIGHT: 540,  // логическая высота игрового поля
  MAX_DELTA: 1 / 20,    // максимальный delta time (сек) — защита от «скачков» при фризах
  BACKGROUND: '#0e0e1f', // цвет фона игрового поля

  // --- Условный уровень земли (пол), на котором стоит куб. ---
  GROUND_Y: 460,

  // --- Параметры игрока (куба). ---
  PLAYER: {
    X: 100,        // стартовая позиция по X (левая часть экрана)
    SIZE: 40,      // размер куба (40x40 px)
    GRAVITY: 2000, // гравитация (px/с^2), вниз
    JUMP_SPEED: 700 // модуль скорости прыжка (px/с), вверх
  },

  // --- Параметры уровня. ---
  LEVEL: {
    TILE_SIZE: 40,       // размер клетки карты в пикселях
    SPEED: 280,          // скорость движения уровня влево (px/с)
    // Длина прохождения уровня по умолчанию (пересчитывается при старте
    // в зависимости от ширины карты выбранного уровня).
    RUN_LENGTH: 2880
  },

  // --- Список уровней (для экрана выбора в меню). ---
  // difficulty — ключ из Game.DIFFICULTIES (система сложности).
  // Для уровня 1 сохраняем прежнюю карту. Остальные генерируются
  // через Game.generateLevel по своей сложности (см. startGame).
  LEVELS: [
    // Уровень 1 использует сохранённую карту (прежний лёгкий уровень).
    { id: 1, name: 'Уровень 1', difficulty: 'easy',   unlocked: true, map: Game.DEFAULT_MAP },
    { id: 2, name: 'Уровень 2', difficulty: 'normal', unlocked: true, width: 88, seed: 2026 },
    { id: 3, name: 'Уровень 3', difficulty: 'hard',   unlocked: false, width: 96, seed: 99 }
  ]
};

// -------------------- Приватное состояние модуля --------------------
(function () {
  'use strict';

  const CONFIG = Game.CONFIG;

  // Задержка (сек) перед тем, как зажатая кнопка снова запустит уровень.
  // Даёт игроку увидеть экран смерти/победы и случайно не рестартить мгновенно.
  const RESTART_DELAY = 0.5;

  let canvas = null;   // элемент <canvas>
  let ctx = null;      // 2D-контекст

  let player = null;   // экземпляр класса Player (куб)
  let level = null;    // экземпляр класса Level

  // Выбранный уровень и длина прохождения (пересчитывается на старте).
  let currentLevelId = 1;
  let runLength = CONFIG.LEVEL.RUN_LENGTH;

  // --- Состояние игры (конечный автомат). ---
  // 'menu'     — главное меню / выбор уровня / кастомизация;
  // 'playing'  — обычный геймплей;
  // 'dead'     — игрок погиб, показан экран смерти;
  // 'complete' — уровень пройден, показан экран победы.
  let state = 'menu';

  // --- Таймер паузы перед рестартом (сек). ---
  // Позволяет игроку увидеть экран смерти/победы, а не
  // мгновенно рестартить «на удержанной» кнопке.
  let stateTimer = 0;

  // --- Время и цикл ---
  let lastTime = 0;    // отметка времени предыдущего кадра (мс)
  let gameTime = 0;    // общее игровое время с запуска (сек)

  // --- Счётчик FPS (сглаженный на интервале ~0.5 c) ---
  let fpsFrames = 0;       // число кадров за текущий интервал
  let fpsAccumulator = 0;  // накопленная длительность интервала (сек)
  let fpsValue = 0;        // текущее значение FPS, выводимое на экран

  /**
   * Инициализация игры: получаем канвас, настраиваем размер,
   * подключаем модули и запускаем игровой цикл.
   */
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Перерисовываем размеры при изменении окна и при повороте экрана.
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    resize();

    // Инициализация ввода и UI (в безопасном порядке).
    // Каждый модуль объявляет своё API в пространстве имён Game.
    if (Game.input && typeof Game.input.init === 'function') Game.input.init();
    if (Game.ui && typeof Game.ui.init === 'function') Game.ui.init();

    // Создаём игрока (куб) из конфигурации.
    // Уровень создаётся при старте (startGame), так как карта зависит от выбора.
    player = new Game.Player({
      x: CONFIG.PLAYER.X,
      groundY: CONFIG.GROUND_Y,
      size: CONFIG.PLAYER.SIZE,
      gravity: CONFIG.PLAYER.GRAVITY,
      jumpSpeed: CONFIG.PLAYER.JUMP_SPEED
    });

    // Привязываем управление к созданному игроку (hold-to-jump).
    if (Game.input && typeof Game.input.setTarget === 'function') {
      Game.input.setTarget(player);
    }

    // Стартуем в главном меню.
    state = 'menu';
    if (Game.ui && typeof Game.ui.resetMenu === 'function') Game.ui.resetMenu();

    // Фиксируем опорную точку времени и запускаем цикл.
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  /**
   * Адаптивность: подгоняем холст под 16:9 и текущий размер окна.
   * Внутреннее разрешение умножается на devicePixelRatio, чтобы
   * изображение оставалось чётким на Retina/масштабированных экранах,
   * а все координаты рисования остаются в логических единицах (960x540).
   */
  function resize() {
    const dpr = window.devicePixelRatio || 1;

    // Задаём физическое разрешение (backing store) с учётом DPR.
    canvas.width = CONFIG.LOGICAL_WIDTH * dpr;
    canvas.height = CONFIG.LOGICAL_HEIGHT * dpr;

    // Масштабируем координатную систему: теперь можно рисовать в 960x540.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Подбираем наибольший масштаб, при котором холст целиком помещается
    // в окно, сохраняя пропорцию 16:9.
    const scale = Math.min(
      window.innerWidth / CONFIG.LOGICAL_WIDTH,
      window.innerHeight / CONFIG.LOGICAL_HEIGHT
    );

    // CSS-размер холста (то, что реально видит игрок).
    canvas.style.width = Math.round(CONFIG.LOGICAL_WIDTH * scale) + 'px';
    canvas.style.height = Math.round(CONFIG.LOGICAL_HEIGHT * scale) + 'px';
  }

  /**
   * Игровой цикл. Вызывается браузером на каждый кадр.
   * @param {number} timestamp - отметка времени кадра (мс), выдаёт rAF.
   */
  function loop(timestamp) {
    // Вычисляем delta time в секундах и ограничиваем сверху,
    // чтобы после «зависания» вкладки игра не прыгала вперёд.
    const delta = Math.min((timestamp - lastTime) / 1000, CONFIG.MAX_DELTA);
    lastTime = timestamp;

    update(delta, timestamp);
    render();

    // Запрашиваем следующий кадр.
    requestAnimationFrame(loop);
  }

  /**
   * Текущий прогресс прохождения уровня (доля в диапазоне 0..1).
   * Считается как пройденное расстояние относительно runLength.
   * @returns {number}
   */
  function getProgress() {
    if (!level) return 0;
    return level.offsetX / runLength;
  }

  /**
   * Список уровней из конфигурации.
   * @returns {Array}
   */
  function getLevelList() {
    return CONFIG.LEVELS || [];
  }

  /**
   * Получить описание уровня по id.
   * @param {number} id - id уровня.
   * @returns {object}
   */
  function getLevelDef(id) {
    const found = getLevelList().find(function (lv) { return lv.id === id; });
    return found || getLevelList()[0];
  }

  /**
   * Запуск выбранного уровня.
   * Карта и скорость определяются системой сложности (Game.DIFFICULTIES):
   *  • уровень явно задаёт свою карту (map) — используем её;
   *  • иначе генерируем карту через Game.generateLevel(difficulty).
   * Скорость = базовая * множитель сложности.
   * @param {number} levelId - id уровня.
   */
  function startGame(levelId) {
    currentLevelId = levelId || 1;
    const lv = getLevelDef(currentLevelId);
    const diff = Game.DIFFICULTIES[lv.difficulty] || Game.DIFFICULTIES.easy;

    // Определяем карту уровня.
    let map = lv.map || null; // например, у уровня 1 сохранена прежняя карта
    if (!map && typeof Game.generateLevel === 'function') {
      map = Game.generateLevel(lv.difficulty, {
        width: lv.width || 72,
        seed: lv.seed || 7
      });
    }
    if (!map) map = Game.DEFAULT_MAP;

    // Скорость уровня зависит от сложности.
    const speed = CONFIG.LEVEL.SPEED * (diff.speedMul || 1);

    level = new Game.Level({
      tileSize: CONFIG.LEVEL.TILE_SIZE,
      speed: speed,
      groundY: CONFIG.GROUND_Y,
      map: map
    });

    // Длина прохождения = ширина карты * размер клетки.
    runLength = level.mapWidth * CONFIG.LEVEL.TILE_SIZE;

    // Выбранный уровень — в HUD/меню.
    if (Game.ui && typeof Game.ui.setSelectedLevel === 'function') {
      Game.ui.setSelectedLevel(currentLevelId);
    }

    resetLevel();
    if (Game.ui) Game.ui.attempts = 0; // свежий забег
    state = 'playing';
    stateTimer = 0;
  }

  /**
   * Возврат в главное меню.
   */
  function goToMenu() {
    state = 'menu';
    stateTimer = 0;
    if (Game.ui && typeof Game.ui.resetMenu === 'function') Game.ui.resetMenu();
  }

  /**
   * Обновление игровой логики: время, FPS, меню, движение уровня,
   * физика игрока, коллизии, hold-to-jump и конечный автомат
   * состояний (menu / playing / dead / complete).
   */
  function update(delta, timestamp) {
    gameTime += delta;

    // Признак того, что кнопка прыжка сейчас зажата.
    const held = Game.input && typeof Game.input.isHeld === 'function' &&
                 Game.input.isHeld();
    // Было ли нажатие Esc (возврат в меню).
    const menuPressed = Game.input && typeof Game.input.consumeMenuPressed === 'function' &&
                        Game.input.consumeMenuPressed();
    // Координаты последнего клика (важны только в меню; в игре сбрасываем).
    const click = Game.input && typeof Game.input.consumeClick === 'function'
      ? Game.input.consumeClick() : null;

    if (state === 'menu') {
      // --- Главное меню: обрабатываем клики по кнопкам. ---
      if (click) {
        const action = Game.ui && typeof Game.ui.handleMenuClick === 'function'
          ? Game.ui.handleMenuClick(click.x, click.y) : null;

        if (action && action.action === 'start') {
          startGame(action.levelId);
        }
      }
    } else if (state === 'playing' && player && level) {
      // --- Активный геймплей. ---
      if (menuPressed) {
        goToMenu();
      } else {
        level.update(delta);       // мир движется влево
        player.update(delta);      // физика куба

        // Обрабатываем коллизии куба с уровнем.
        const res = level.resolvePlayer(player);

        if (res && res.died) {
          // Шип или торец блока — переход на экран смерти.
          state = 'dead';
          stateTimer = RESTART_DELAY;
          if (Game.ui && typeof Game.ui.onDeath === 'function') Game.ui.onDeath();
        } else if (getProgress() >= 1) {
          // Достигнут финиш — переход на экран победы.
          state = 'complete';
          stateTimer = RESTART_DELAY;
        } else {
          // Механика hold-to-jump: пока кнопка зажата, куб прыгает
          // сразу после приземления (в т.ч. на верх блока).
          if (held && player.onGround) {
            player.jump();
          }
        }
      }
    } else {
      // --- Экран смерти / победы: ждём ввода. ---
      if (menuPressed) {
        goToMenu();
      } else if (stateTimer > 0) {
        stateTimer -= delta;
      } else if (held) {
        // Кнопка зажата (или нажата заново) — рестарт уровня.
        resetLevel();
        state = 'playing';
        stateTimer = 0;
      }
    }

    // Обновляем счётчик FPS.
    fpsFrames += 1;
    fpsAccumulator += delta;

    // Пересчитываем FPS примерно два раза в секунду.
    if (fpsAccumulator >= 0.5) {
      fpsValue = Math.round(fpsFrames / fpsAccumulator);
      fpsFrames = 0;
      fpsAccumulator = 0;
    }
  }

  /**
   * Мгновенный сброс уровня: куб возвращается на старт,
   * уровень — к началу (offsetX в ноль).
   */
  function resetLevel() {
    if (player) {
      player.x = CONFIG.PLAYER.X;
      player.y = CONFIG.GROUND_Y - player.size;
      player.velocityY = 0;
      player.onGround = true;
      player.prevY = player.y;
    }
    if (level) {
      level.offsetX = 0;
    }
  }

  /**
   * Отрисовка кадра: меню или геймплей (фон, земля, уровень, куб,
   * ХУД, экраны смерти/победы) и счётчик FPS.
   */
  function render() {
    // --- Главное меню: только меню + FPS. ---
    if (state === 'menu') {
      if (Game.ui && typeof Game.ui.renderMenu === 'function') {
        Game.ui.renderMenu(ctx, gameTime);
      }
      renderFPS();
      return;
    }

    // Очищаем холст (заливаем цветом фона уровня).
    ctx.fillStyle = CONFIG.BACKGROUND;
    ctx.fillRect(0, 0, CONFIG.LOGICAL_WIDTH, CONFIG.LOGICAL_HEIGHT);

    // Отрисовываем условный уровень земли.
    drawGround();

    // Отрисовываем уровень (блоки и шипы).
    if (level) level.render(ctx);

    // Отрисовываем куб-игрока.
    if (player) player.draw(ctx);

    // --- Интерфейс (ХУД). ---
    if (Game.ui) {
      // Прогресс-бар прохождения уровня.
      if (typeof Game.ui.renderProgress === 'function') {
        Game.ui.renderProgress(ctx, getProgress());
      }
      // Счётчик попыток.
      if (typeof Game.ui.renderHUD === 'function') {
        Game.ui.renderHUD(ctx);
      }
    }

    // --- Сервисные экраны поверх замершего мира. ---
    if (Game.ui) {
      if (state === 'dead' && typeof Game.ui.renderDeathScreen === 'function') {
        Game.ui.renderDeathScreen(ctx);
      } else if (state === 'complete' && typeof Game.ui.renderCompleteScreen === 'function') {
        Game.ui.renderCompleteScreen(ctx);
      }
    }

    // Отрисовка счётчика FPS (для проверки работы игрового цикла).
    renderFPS();
  }

  /**
   * Отрисовка полосы земли: линия пола и заливка ниже неё.
   * Визуально показывает условный уровень, до которого падает куб.
   */
  function drawGround() {
    // Заливка области ниже линии пола.
    ctx.fillStyle = '#1a1a33';
    ctx.fillRect(0, CONFIG.GROUND_Y, CONFIG.LOGICAL_WIDTH, CONFIG.LOGICAL_HEIGHT - CONFIG.GROUND_Y);

    // Линия пола.
    ctx.strokeStyle = '#3a3a66';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, CONFIG.GROUND_Y);
    ctx.lineTo(CONFIG.LOGICAL_WIDTH, CONFIG.GROUND_Y);
    ctx.stroke();
  }

  /**
   * Простой счётчик FPS в левом верхнем углу на полупрозрачной панели.
   */
  function renderFPS() {
    ctx.save();

    // Полупрозрачная плашка под текстом.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(12, 12, 116, 30);

    // Текст счётчика.
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('FPS: ' + fpsValue, 26, 27);

    ctx.restore();
  }

  // -------------------- Запуск --------------------
  // Скрипты подключаются в конце <body>, поэтому DOM уже готов.
  // На всякий случай проверяем состояние документа.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
