/* ============================================================
   ui.js — интерфейс (ХУД).
   Отвечает за: счётчик попыток, прогресс-бар прохождения,
   экран смерти и экран победы (финиш).
   Состояние игры (playing / dead / complete) хранит core.js
   и передаёт его сюда через соответствующие методы отрисовки.
   ============================================================ */

// Общее пространство имён игры.
window.Game = window.Game || {};

// API модуля интерфейса.
Game.ui = {
  attempts: 0,   // счётчик попыток (увеличивается на каждую смерть)

  /**
   * Инициализация интерфейса.
   * TODO: создать DOM-слои главного меню, если оно понадобится.
   */
  init: function () {
    // TODO: реализовать главное меню.
  },

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

    // Полупрозрачная плашка под текстом.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(12, 48, 176, 30);

    // Текст счётчика попыток.
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
    // Прогресс обрезаем в 0..1 (на случай выхода за пределы).
    const p = Math.max(0, Math.min(1, progress));

    const barW = 420;                     // ширина полосы (px)
    const barH = 14;                      // высота полосы (px)
    const barX = (Game.CONFIG.LOGICAL_WIDTH - barW) / 2; // по центру сверху
    const barY = 16;

    ctx.save();

    // --- Подложка полосы. ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    // --- Трек (фон прогресса). ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barW, barH);

    // --- Заполнение прогресса. ---
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(barX, barY, barW * p, barH);

    // --- Рамка. ---
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

    // --- Бейдж с процентами слева от полосы. ---
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(p * 100) + '%', 6, barY + barH / 2);

    ctx.restore();
  },

  /**
   * Отрисовка экрана смерти (затемнение + текст поверх замершего мира).
   * @param {CanvasRenderingContext2D} ctx - контекст канваса.
   */
  renderDeathScreen: function (ctx) {
    const W = Game.CONFIG.LOGICAL_WIDTH;
    const H = Game.CONFIG.LOGICAL_HEIGHT;
    const cx = W / 2;

    ctx.save();

    // Затемнение всего экрана.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, W, H);

    // --- Заголовок. ---
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Игра окончена', cx, H / 2 - 60);

    // --- Подзаголовок: номер попытки. ---
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Попытка: ' + this.attempts, cx, H / 2 + 6);

    // --- Подсказка для рестарта. ---
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Зажми или тапни, чтобы сыграть ещё раз', cx, H / 2 + 62);

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

    // Затемнение всего экрана (чуть светлее, чем на смерти).
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, W, H);

    // --- Заголовок. ---
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Уровень пройден!', cx, H / 2 - 60);

    // --- Счётчик попыток. ---
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Попыток: ' + this.attempts, cx, H / 2 + 6);

    // --- Подсказка. ---
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('Зажми или тапни, чтобы сыграть ещё раз', cx, H / 2 + 62);

    ctx.restore();
  }
};
