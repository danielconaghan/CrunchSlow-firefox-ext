const SPEED_STEP = 0.05;
const MIN_SPEED = 0.75;
const MAX_SPEED = 1.0;

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

function roundToStep(value) {
  return Math.round(value / SPEED_STEP) * SPEED_STEP;
}

function updateUI(speed) {
  speed = round(clamp(roundToStep(speed), MIN_SPEED, MAX_SPEED));
  currentSpeed = speed;

  speedValue.textContent = speed.toFixed(2);
  speedSlider.value = Math.round(speed * 100);

  presetBtns.forEach(btn => {
    const btnSpeed = parseFloat(btn.dataset.speed);
    btn.classList.toggle('active', Math.abs(btnSpeed - speed) < 0.001);
  });
}

function sendSpeed(speed) {
  speed = round(clamp(roundToStep(speed), MIN_SPEED, MAX_SPEED));
  updateUI(speed);
  sendToContent({ type: 'setSpeed', speed });
}

function sendToContent(message) {
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (tabs.length && tabs[0].id) {
      browser.tabs.sendMessage(tabs[0].id, message).catch(() => {});
    }
  });
}

// Fetch current speed from content script on open
browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
  if (tabs.length && tabs[0].id) {
    browser.tabs.sendMessage(tabs[0].id, { type: 'getSpeed' })
      .then(response => {
        if (response && typeof response.speed === 'number') {
          updateUI(response.speed);
        }
      })
      .catch(() => {});
  }
});

// Listen for speed updates from content script (keyboard shortcuts)
browser.runtime.onMessage.addListener(message => {
  if (message.type === 'speedChanged') {
    updateUI(message.speed);
  }
});

btnDecrease.addEventListener('click', () => sendSpeed(currentSpeed - SPEED_STEP));
btnIncrease.addEventListener('click', () => sendSpeed(currentSpeed + SPEED_STEP));

speedSlider.addEventListener('input', () => {
  const speed = speedSlider.value / 100;
  sendSpeed(speed);
});

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => sendSpeed(parseFloat(btn.dataset.speed)));
});

