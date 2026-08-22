const SPEED_STEP = 0.01;
const PRESET_STEP = 0.05;
const MIN_SPEED = 0.75;
const MAX_SPEED = 1.0;
const STORAGE_KEY = 'speed';

const speedValue = document.getElementById('speed-value');
const speedSlider = document.getElementById('speed-slider');
const btnDecrease = document.getElementById('btn-decrease');
const btnIncrease = document.getElementById('btn-increase');
const presetBtns = document.querySelectorAll('.preset-btn');

let currentSpeed = 1.0;

function round(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateUI(speed) {
  speed = round(clamp(speed, MIN_SPEED, MAX_SPEED));
  currentSpeed = speed;

  speedValue.textContent = speed.toFixed(2);
  speedSlider.value = Math.round(speed * 100);

  // Fully highlight an exact preset; dim the nearest one when fine-tuned off-grid
  const nearestPreset = Math.round(speed / PRESET_STEP) * PRESET_STEP;
  const onGrid = Math.abs(speed - nearestPreset) < 0.001;
  presetBtns.forEach(btn => {
    const isNearest = Math.abs(parseFloat(btn.dataset.speed) - nearestPreset) < 0.001;
    btn.classList.toggle('active', isNearest && onGrid);
    btn.classList.toggle('nearest', isNearest && !onGrid);
  });
}

// Storage is the source of truth: content scripts pick the change up and apply it
function saveSpeed(speed) {
  speed = round(clamp(speed, MIN_SPEED, MAX_SPEED));
  updateUI(speed);
  browser.storage.local.set({ [STORAGE_KEY]: speed }).catch(() => {});
}

// Show the saved speed on open
browser.storage.local.get(STORAGE_KEY)
  .then(stored => {
    if (typeof stored[STORAGE_KEY] === 'number') {
      updateUI(stored[STORAGE_KEY]);
    }
  })
  .catch(() => {});

// Listen for speed updates made elsewhere (keyboard shortcuts)
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  const speed = changes[STORAGE_KEY].newValue;
  if (typeof speed === 'number') {
    updateUI(speed);
  }
});

btnDecrease.addEventListener('click', () => saveSpeed(currentSpeed - SPEED_STEP));
btnIncrease.addEventListener('click', () => saveSpeed(currentSpeed + SPEED_STEP));

speedSlider.addEventListener('input', () => {
  const speed = speedSlider.value / 100;
  saveSpeed(speed);
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => saveSpeed(parseFloat(btn.dataset.speed)));
});

