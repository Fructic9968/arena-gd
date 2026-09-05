/* ============================================================
   records.js — сохранение прогресса и рекордов в localStorage.
   По аналогии с кастомизацией (player.js) выбор игрока теперь
   запоминается между перезагрузками:
     • лучший процент прохождения каждого уровня (best);
     • флаг «уровень пройден» (done);
     • счётчик запусков уровня (runs).
   Позволяет записать/обновить рекорд, узнать, сколько уровней
   пройдено, и сбросить все рекорды к нулю.
   ============================================================ */

// Общее пространство имён игры.
window.Game = window.Game || {};

// API модуля рекордов.
Game.records = {
  // Ключ в localStorage.
  STORAGE_KEY: 'gd.records',

  // Хранимые данные: best — id уровня → лучший %; done — id → флаг
  // прохождения; runs — id → число запусков.
  data: { best: {}, done: {}, runs: {} },

  /**
   * Сохранить текущие рекорды в localStorage.
   */
  save: function () {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      // localStorage недоступен (приватный режим и т.п.) — тихо игнорируем.
    }
  },

  /**
   * Загрузить рекорды из localStorage с валидацией.
   * Повреждённые/некорректные значения не ломают игру и
   * заменяются значениями по умолчанию.
   */
  load: function () {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      // Валидируем каждую секцию.
      for (const key of ['best', 'done', 'runs']) {
        if (d[key] && typeof d[key] === 'object') this.data[key] = d[key];
      }
      this._sanitize();
    } catch (e) {
      // Повреждённые данные — оставляем значения по умолчанию.
    }
  },

  /**
   * Привести значения к корректному виду (числа 0..100 для best,
   * булевы флаги для done, неотрицательные числа для runs).
   */
  _sanitize: function () {
    const best = this.data.best || (this.data.best = {});
    const done = this.data.done || (this.data.done = {});
    const runs = this.data.runs || (this.data.runs = {});
    for (const k in best) {
      const v = Number(best[k]);
      best[k] = (isFinite(v) && v > 0) ? Math.min(100, Math.round(v)) : 0;
    }
    for (const k in done) done[k] = !!done[k];
    for (const k in runs) {
      const v = Number(runs[k]);
      runs[k] = (isFinite(v) && v > 0) ? Math.floor(v) : 0;
    }
  },

  /** Лучший процент прохождения уровня (0..100). */
  bestFor: function (id) {
    const v = this.data.best[id];
    return (typeof v === 'number' && isFinite(v)) ? v : 0;
  },

  /** Пройден ли уровень хотя бы раз. */
  isDone: function (id) {
    return !!this.data.done[id];
  },

  /** Сколько раз запускался уровень. */
  runsFor: function (id) {
    const v = this.data.runs[id];
    return (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  },

  /**
   * Записать достигнутый прогресс уровня (0..1).
   * Обновляет лучший процент, помечает уровень пройденным при 100%.
   * @returns {boolean} true, если рекорд был улучшен.
   */
  recordProgress: function (id, progress) {
    const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
    const prev = this.bestFor(id);
    const improved = pct > prev;
    if (improved) this.data.best[id] = pct;
    if (pct >= 100) this.data.done[id] = true;
    this.save();
    return improved;
  },

  /** Учесть ещё один запуск уровня. */
  addRun: function (id) {
    this.data.runs[id] = this.runsFor(id) + 1;
    this.save();
  },

  /** Число полностью пройденных уровней. */
  completedCount: function () {
    let n = 0;
    for (const k in this.data.done) if (this.data.done[k]) n += 1;
    return n;
  },

  /** Сбросить все рекорды. */
  reset: function () {
    this.data = { best: {}, done: {}, runs: {} };
    this.save();
  }
};

// Загружаем сохранённые рекорды сразу при старте (до первой отрисовки).
Game.records.load();
