const SPEED_STEP = 0.05;
const MIN_SPEED = 0.75;
const MAX_SPEED = 1.0;

let currentSpeed = 1.0;
let videoObserver = null;

function getVideo() {
  return document.querySelector('video');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value) {
  return Math.round(value / SPEED_STEP) * SPEED_STEP;
}

function setSpeed(speed) {
  speed = roundToStep(clamp(speed, MIN_SPEED, MAX_SPEED));
  const video = getVideo();
  if (video) {
    video.playbackRate = speed;
  }
  currentSpeed = speed;
  notifySpeedChange(speed);
}

function rewind(seconds) {
  const video = getVideo();
  if (video) {
    video.currentTime = Math.max(0, video.currentTime - seconds);
  }
}

function notifySpeedChange(speed) {
  try {
    browser.runtime.sendMessage({ type: 'speedChanged', speed });
  } catch (_) {}
}

function onKeyDown(e) {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

  switch (e.key) {
    case ',':
      e.preventDefault();
      setSpeed(currentSpeed - SPEED_STEP);
      break;
    case '.':
      e.preventDefault();
      setSpeed(currentSpeed + SPEED_STEP);
      break;
    default:
      if (e.key >= '1' && e.key <= '9') {
        rewind(parseInt(e.key, 10));
      }
      break;
  }
}

document.addEventListener('keydown', onKeyDown, true);

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'setSpeed') {
    setSpeed(message.speed);
  } else if (message.type === 'getSpeed') {
    return Promise.resolve({ speed: currentSpeed });
  } else if (message.type === 'rewind') {
    rewind(message.seconds);
  }
});

// Reapply speed if Crunchyroll resets it (e.g. on ad breaks or stream changes)
function watchVideo() {
  const video = getVideo();
  if (!video) return;

  video.addEventListener('ratechange', () => {
    if (Math.abs(video.playbackRate - currentSpeed) > 0.01) {
      video.playbackRate = currentSpeed;
    }
  });
}

const domObserver = new MutationObserver(() => {
  const video = getVideo();
  if (video && video.playbackRate !== currentSpeed) {
    video.playbackRate = currentSpeed;
  }
  watchVideo();
});

domObserver.observe(document.documentElement, { childList: true, subtree: true });
watchVideo();
