const SPEED_STEP = 0.01;
const MIN_SPEED = 0.75;
const MAX_SPEED = 1.0;
const STORAGE_KEY = 'speed';

let currentSpeed = 1.0;
let watchedVideo = null;

function getVideo() {
  return document.querySelector('video');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundSpeed(value) {
  return Math.round(value * 100) / 100;
}

// Apply a speed locally without writing it back to storage
function applySpeed(speed) {
  speed = roundSpeed(clamp(speed, MIN_SPEED, MAX_SPEED));
  const video = getVideo();
  if (video) {
    video.playbackRate = speed;
  }
  currentSpeed = speed;
}

function setSpeed(speed) {
  applySpeed(speed);
  browser.storage.local.set({ [STORAGE_KEY]: currentSpeed }).catch(() => {});
}

function rewind(seconds) {
  const video = getVideo();
  if (video) {
    video.currentTime = Math.max(0, video.currentTime - seconds);
  }
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
  if (message.type === 'rewind') {
    rewind(message.seconds);
  }
});

// Restore the saved speed on load, and follow changes made in the popup or other tabs
browser.storage.local.get(STORAGE_KEY)
  .then(stored => {
    if (typeof stored[STORAGE_KEY] === 'number') {
      applySpeed(stored[STORAGE_KEY]);
    }
  })
  .catch(() => {});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  const speed = changes[STORAGE_KEY].newValue;
  if (typeof speed === 'number') {
    applySpeed(speed);
  }
});

// Reapply speed if Crunchyroll resets it (e.g. on ad breaks or stream changes)
function watchVideo() {
  const video = getVideo();
  if (!video || video === watchedVideo) return;
  watchedVideo = video;

  video.addEventListener('ratechange', () => {
    if (Math.abs(video.playbackRate - currentSpeed) > 0.001) {
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
