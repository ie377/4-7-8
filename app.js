const TECHNIQUES = {
  "478": {
    name: "4-7-8",
    phases: [
      { key: "inhale", label: "Вдох", duration: 4, from: 0.55, to: 1, sound: "inhale" },
      { key: "hold", label: "Задержка", duration: 7, from: 1, to: 1, sound: "hold" },
      { key: "exhale", label: "Выдох", duration: 8, from: 1, to: 0.55, sound: "exhale" }
    ]
  },
  box: {
    name: "Box",
    phases: [
      { key: "inhale", label: "Вдох", duration: 4, from: 0.55, to: 1, sound: "inhale" },
      { key: "hold", label: "Задержка", duration: 4, from: 1, to: 1, sound: "hold" },
      { key: "exhale", label: "Выдох", duration: 4, from: 1, to: 0.55, sound: "exhale" },
      { key: "hold", label: "Задержка", duration: 4, from: 0.55, to: 0.55, sound: "holdLow" }
    ]
  },
  calm: {
    name: "Расслабление",
    phases: [
      { key: "inhale", label: "Вдох", duration: 4, from: 0.55, to: 1, sound: "inhale" },
      { key: "hold", label: "Задержка", duration: 4, from: 1, to: 1, sound: "hold" },
      { key: "exhale", label: "Выдох", duration: 6, from: 1, to: 0.55, sound: "exhale" }
    ]
  }
};

const MIN_CYCLES = 1;
const MAX_CYCLES = 20;

const START_CUES = {
  inhale: [{ from: 440, to: 660, duration: 0.6, level: 1 }],
  hold: [
    { from: 784, to: 784, duration: 0.12, level: 0.75 },
    { from: 784, to: 784, duration: 0.12, level: 0.75, at: 0.16 }
  ],
  holdLow: [{ from: 330, to: 330, duration: 0.26, level: 0.8 }],
  exhale: [{ from: 520, to: 300, duration: 0.9, level: 0.9 }]
};

const END_CUES = {
  inhale: [{ from: 988, to: 988, duration: 0.12, level: 0.6 }],
  hold: [{ from: 659, to: 659, duration: 0.12, level: 0.55 }],
  holdLow: [{ from: 440, to: 440, duration: 0.12, level: 0.55 }],
  exhale: [{ from: 220, to: 220, duration: 0.16, level: 0.5 }]
};

const STATS_KEY = "breath-stats-v1";
const VISIT_KEY = "breath-visit-seen";

const ACHIEVEMENTS = [
  { id: "first", title: "Первый вдох", description: "Завершите первую сессию", test: (s) => s.sessions >= 1 },
  { id: "cycles10", title: "10 циклов", description: "Пройдите 10 дыхательных циклов", test: (s) => s.cycles >= 10 },
  { id: "time5", title: "5 минут с собой", description: "Проведите 5 минут на сайте", test: (s) => s.totalMs >= 300000 },
  { id: "streak7", title: "Неделя подряд", description: "Заходите 7 дней подряд", test: (s) => s.streak >= 7 },
  { id: "time15", title: "15 минут", description: "Проведите 15 минут на сайте", test: (s) => s.totalMs >= 900000 },
  { id: "cycles100", title: "100 циклов", description: "Пройдите 100 циклов", test: (s) => s.cycles >= 100 }
];

const el = {
  orb: document.getElementById("orb"),
  phaseLabel: document.getElementById("phaseLabel"),
  phaseCount: document.getElementById("phaseCount"),
  phaseHint: document.getElementById("phaseHint"),
  phaseList: document.getElementById("phaseList"),
  progressFill: document.getElementById("progressFill"),
  cycleLabel: document.getElementById("cycleLabel"),
  timeLabel: document.getElementById("timeLabel"),
  startBtn: document.getElementById("startBtn"),
  startLabel: document.getElementById("startLabel"),
  resetBtn: document.getElementById("resetBtn"),
  themeToggle: document.getElementById("themeToggle"),
  techniques: document.getElementById("techniques"),
  cycleMinus: document.getElementById("cycleMinus"),
  cyclePlus: document.getElementById("cyclePlus"),
  cycleValue: document.getElementById("cycleValue"),
  infiniteToggle: document.getElementById("infiniteToggle"),
  soundToggle: document.getElementById("soundToggle"),
  volumeRange: document.getElementById("volumeRange"),
  statVisits: document.getElementById("statVisits"),
  statTime: document.getElementById("statTime"),
  statSessions: document.getElementById("statSessions"),
  statCycles: document.getElementById("statCycles"),
  streakLabel: document.getElementById("streakLabel"),
  badges: document.getElementById("badges"),
  announcer: document.getElementById("announcer")
};

const state = {
  technique: "478",
  cyclesTarget: 4,
  infinite: false,
  sound: true,
  volume: 0.6,
  phaseIndex: 0,
  completedCycles: 0,
  elapsed: 0,
  sessionMs: 0,
  running: false,
  finished: false,
  lastTs: 0,
  rafId: null
};

let audioCtx = null;
let stats = createDefaultStats();
let activeSince = null;

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function safeSessionGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function safeSessionSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch {}
}

function createDefaultStats() {
  return {
    visits: 0,
    totalMs: 0,
    sessions: 0,
    cycles: 0,
    streak: 0,
    bestStreak: 0,
    lastVisit: "",
    achievements: []
  };
}

function loadStats() {
  const raw = safeGet(STATS_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const fresh = createDefaultStats();
    Object.keys(fresh).forEach((key) => {
      if (key === "achievements") {
        if (Array.isArray(parsed[key])) fresh[key] = parsed[key].filter((id) => ACHIEVEMENTS.some((a) => a.id === id));
      } else if (key === "lastVisit") {
        if (typeof parsed[key] === "string") fresh[key] = parsed[key];
      } else if (Number.isFinite(parsed[key]) && parsed[key] >= 0) {
        fresh[key] = parsed[key];
      }
    });
    stats = fresh;
  } catch {}
}

function saveStats() {
  safeSet(STATS_KEY, JSON.stringify(stats));
}

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function trackVisit() {
  if (safeSessionGet(VISIT_KEY) === null) {
    stats.visits += 1;
    safeSessionSet(VISIT_KEY, "1");
  }
  const today = dayKey(new Date());
  if (stats.lastVisit !== today) {
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    stats.streak = stats.lastVisit === yesterday ? stats.streak + 1 : 1;
    stats.lastVisit = today;
    stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  }
  checkAchievements();
  saveStats();
  renderStats();
}

function formatTotalTime(ms) {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours ? `${hours}:${mmss}` : mmss;
}

function renderStats() {
  el.statVisits.textContent = String(stats.visits);
  el.statTime.textContent = formatTotalTime(stats.totalMs);
  el.statSessions.textContent = String(stats.sessions);
  el.statCycles.textContent = String(stats.cycles);
  el.streakLabel.textContent = `${stats.streak} ${pluralDays(stats.streak)} подряд`;
  el.badges.innerHTML = ACHIEVEMENTS.map((achievement) => {
    const unlocked = stats.achievements.includes(achievement.id);
    return `<span class="badge ${unlocked ? "is-unlocked" : "is-locked"}" data-id="${achievement.id}" title="${achievement.title}: ${achievement.description}" aria-label="${achievement.title}: ${achievement.description}"></span>`;
  }).join("");
}

function pluralDays(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

function checkAchievements() {
  const unlocked = [];
  ACHIEVEMENTS.forEach((achievement) => {
    if (!stats.achievements.includes(achievement.id) && achievement.test(stats)) {
      stats.achievements.push(achievement.id);
      unlocked.push(achievement);
    }
  });
  if (!unlocked.length) return false;
  renderStats();
  unlocked.forEach((achievement) => {
    const badge = el.badges.querySelector(`[data-id="${achievement.id}"]`);
    if (badge) badge.classList.add("is-new");
  });
  el.announcer.textContent = `Новое достижение: ${unlocked[0].title}`;
  return true;
}

function startActiveTimer() {
  if (activeSince === null && !document.hidden) activeSince = performance.now();
}

function stopActiveTimer() {
  if (activeSince === null) return;
  const now = performance.now();
  stats.totalMs += Math.max(0, now - activeSince);
  activeSince = now;
  checkAchievements();
  saveStats();
  renderStats();
  activeSince = null;
}

function flushActiveTime() {
  if (activeSince === null) return;
  const now = performance.now();
  stats.totalMs += Math.max(0, now - activeSince);
  activeSince = now;
}

function loadSettings() {
  const theme = safeGet("breath-theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
    updateThemeColor();
  }

  const technique = safeGet("breath-technique");
  if (technique && TECHNIQUES[technique]) state.technique = technique;

  const cycles = Number(safeGet("breath-cycles"));
  if (Number.isInteger(cycles) && cycles >= MIN_CYCLES && cycles <= MAX_CYCLES) state.cyclesTarget = cycles;

  state.infinite = safeGet("breath-infinite") === "1";
  state.sound = safeGet("breath-sound") !== "0";

  const volumeRaw = safeGet("breath-volume");
  const volume = Number(volumeRaw);
  if (volumeRaw !== null && Number.isFinite(volume) && volume >= 0 && volume <= 1) state.volume = volume;
}

function updateThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = document.documentElement.dataset.theme === "light" ? "#f2f5fc" : "#0b1020";
}

function currentPhases() {
  return TECHNIQUES[state.technique].phases;
}

function currentPhase() {
  return currentPhases()[state.phaseIndex];
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function buildPhaseList() {
  el.phaseList.innerHTML = "";
  currentPhases().forEach((phase, index) => {
    const chip = document.createElement("div");
    chip.className = "phase-chip";
    chip.dataset.index = String(index);
    chip.innerHTML = `<b>${phase.label}</b><span>${phase.duration} сек</span>`;
    el.phaseList.appendChild(chip);
  });
}

function renderSettings() {
  document.querySelectorAll(".technique").forEach((button) => {
    const active = button.dataset.technique === state.technique;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  el.cycleValue.textContent = String(state.cyclesTarget);
  el.cycleMinus.disabled = state.cyclesTarget <= MIN_CYCLES;
  el.cyclePlus.disabled = state.cyclesTarget >= MAX_CYCLES;
  el.cycleValue.parentElement.style.opacity = state.infinite ? "0.45" : "1";
  el.cycleMinus.disabled = el.cycleMinus.disabled || state.infinite;
  el.cyclePlus.disabled = el.cyclePlus.disabled || state.infinite;
  el.infiniteToggle.checked = state.infinite;
  el.soundToggle.checked = state.sound;
  el.volumeRange.value = String(Math.round(state.volume * 100));
  el.volumeRange.disabled = !state.sound;
}

function renderDynamic() {
  const phases = currentPhases();
  const phase = phases[state.phaseIndex] || phases[0];
  const durationMs = phase.duration * 1000;
  const progress = state.finished ? 1 : Math.min(1, state.elapsed / durationMs);
  const scale = phase.from + (phase.to - phase.from) * progress;

  el.orb.style.setProperty("--scale", scale.toFixed(4));
  el.orb.style.setProperty("--progress", progress.toFixed(4));
  el.progressFill.style.width = `${(progress * 100).toFixed(1)}%`;

  el.phaseLabel.textContent = state.finished ? "Готово" : phase.label;
  el.phaseCount.textContent = state.finished ? "✓" : String(Math.max(1, Math.ceil((durationMs - state.elapsed) / 1000)));
  el.phaseHint.textContent = state.finished
    ? "отличная работа"
    : state.running
      ? (phase.key === "inhale" ? "вдохните" : phase.key === "exhale" ? "выдохните" : "задержите дыхание")
      : "пауза";

  if (state.finished) {
    el.cycleLabel.textContent = `Готово · ${state.cyclesTarget} циклов`;
  } else if (state.infinite) {
    el.cycleLabel.textContent = `Бесконечно · цикл ${state.completedCycles + 1}`;
  } else {
    el.cycleLabel.textContent = `Цикл ${Math.min(state.completedCycles + 1, state.cyclesTarget)} из ${state.cyclesTarget}`;
  }
  el.timeLabel.textContent = formatTime(state.sessionMs);

  el.phaseList.querySelectorAll(".phase-chip").forEach((chip, index) => {
    chip.classList.toggle("is-active", !state.finished && index === state.phaseIndex);
  });
}

function renderButton() {
  el.startLabel.textContent = state.running ? "Пауза" : state.finished ? "Ещё раз" : state.elapsed > 0 ? "Продолжить" : "Начать";
  el.startBtn.querySelector("svg").innerHTML = state.running
    ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z" />'
    : '<path d="M8 5.2v13.6L19 12 8 5.2Z" />';
}

function announcePhase(withStart) {
  const phase = currentPhase();
  const prefix = withStart ? "Начало сессии. " : "";
  el.announcer.textContent = `${prefix}${phase.label}, ${phase.duration} ${phase.duration === 1 ? "секунда" : phase.duration < 5 ? "секунды" : "секунд"}`;
}

function ensureAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(fromFreq, toFreq, duration, startAt, level) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(fromFreq, startAt);
  osc.frequency.exponentialRampToValueAtTime(toFreq, startAt + duration);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(level, startAt + Math.min(0.12, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function playCue(phase, event, delay = 0) {
  if (!state.sound || state.volume <= 0 || !phase) return;
  const cues = event === "end" ? END_CUES[phase.sound] : START_CUES[phase.sound];
  if (!cues) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const level = 0.16 * state.volume;
  (Array.isArray(cues) ? cues : [cues]).forEach((cue) => {
    playTone(cue.from, cue.to, cue.duration, t + (cue.at || 0), level * (cue.level ?? 1));
  });
}

function playFinish() {
  if (!state.sound || state.volume <= 0) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.35;
  const level = 0.12 * state.volume;
  playTone(523, 523, 0.5, t, level);
  playTone(784, 784, 0.8, t + 0.18, level);
}

function resetSession() {
  stopLoop();
  state.phaseIndex = 0;
  state.completedCycles = 0;
  state.elapsed = 0;
  state.sessionMs = 0;
  state.running = false;
  state.finished = false;
  renderDynamic();
  renderButton();
  el.phaseHint.textContent = "нажмите «Начать»";
  el.announcer.textContent = "Сессия сброшена";
}

function stopLoop() {
  if (state.rafId !== null) cancelAnimationFrame(state.rafId);
  state.rafId = null;
}

function finishSession() {
  state.running = false;
  state.finished = true;
  state.elapsed = 0;
  state.phaseIndex = 0;
  stopLoop();
  playFinish();
  stats.sessions += 1;
  saveStats();
  const gotAchievement = checkAchievements();
  renderStats();
  renderDynamic();
  renderButton();
  if (!gotAchievement) el.announcer.textContent = "Сессия завершена";
}

function advancePhase() {
  const phases = currentPhases();
  playCue(currentPhase(), "end");
  state.phaseIndex += 1;
  let gotAchievement = false;
  if (state.phaseIndex >= phases.length) {
    state.phaseIndex = 0;
    state.completedCycles += 1;
    stats.cycles += 1;
    saveStats();
    gotAchievement = checkAchievements();
    renderStats();
  }
  if (!state.infinite && state.completedCycles >= state.cyclesTarget) {
    finishSession();
    return;
  }
  playCue(currentPhase(), "start", 0.2);
  if (!gotAchievement) announcePhase(false);
}

function tick(timestamp) {
  if (!state.running) return;
  const delta = Math.min(250, Math.max(0, timestamp - state.lastTs));
  state.lastTs = timestamp;
  state.elapsed += delta;
  state.sessionMs += delta;

  let durationMs = currentPhase().duration * 1000;
  while (state.elapsed >= durationMs && state.running) {
    state.elapsed -= durationMs;
    advancePhase();
    if (state.running) durationMs = currentPhase().duration * 1000;
  }

  if (state.running) {
    renderDynamic();
    state.rafId = requestAnimationFrame(tick);
  }
}

function startSession() {
  if (state.finished) {
    resetSession();
  }
  ensureAudio();
  state.running = true;
  state.lastTs = performance.now();
  renderButton();
  if (state.elapsed === 0 && state.phaseIndex === 0 && state.completedCycles === 0) {
    playCue(currentPhase(), "start");
    announcePhase(true);
  }
  state.rafId = requestAnimationFrame(tick);
}

function pauseSession() {
  state.running = false;
  stopLoop();
  renderButton();
  renderDynamic();
  el.announcer.textContent = "Пауза";
}

function toggleSession() {
  if (state.running) pauseSession();
  else startSession();
}

el.startBtn.addEventListener("click", toggleSession);
el.resetBtn.addEventListener("click", resetSession);

el.themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  updateThemeColor();
  safeSet("breath-theme", next);
});

el.techniques.addEventListener("click", (event) => {
  const button = event.target.closest(".technique");
  if (!button || button.dataset.technique === state.technique) return;
  state.technique = button.dataset.technique;
  safeSet("breath-technique", state.technique);
  buildPhaseList();
  renderSettings();
  resetSession();
  el.phaseHint.textContent = "нажмите «Начать»";
});

el.cycleMinus.addEventListener("click", () => {
  state.cyclesTarget = Math.max(MIN_CYCLES, state.cyclesTarget - 1);
  safeSet("breath-cycles", String(state.cyclesTarget));
  renderSettings();
  renderDynamic();
});

el.cyclePlus.addEventListener("click", () => {
  state.cyclesTarget = Math.min(MAX_CYCLES, state.cyclesTarget + 1);
  safeSet("breath-cycles", String(state.cyclesTarget));
  renderSettings();
  renderDynamic();
});

el.infiniteToggle.addEventListener("change", () => {
  state.infinite = el.infiniteToggle.checked;
  safeSet("breath-infinite", state.infinite ? "1" : "0");
  renderSettings();
  renderDynamic();
});

el.soundToggle.addEventListener("change", () => {
  state.sound = el.soundToggle.checked;
  safeSet("breath-sound", state.sound ? "1" : "0");
  renderSettings();
});

el.volumeRange.addEventListener("input", () => {
  state.volume = Number(el.volumeRange.value) / 100;
  safeSet("breath-volume", String(state.volume));
});

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "BUTTON" || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  event.preventDefault();
  toggleSession();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopActiveTimer();
  else startActiveTimer();
});

window.addEventListener("pagehide", () => {
  stopActiveTimer();
  saveStats();
});

setInterval(() => {
  flushActiveTime();
  checkAchievements();
  saveStats();
  renderStats();
}, 15000);

loadSettings();
loadStats();
trackVisit();
startActiveTimer();
buildPhaseList();
renderSettings();
renderDynamic();
renderButton();
