import { detectCelebrationPose, nextScore } from './loyalty.js';

const videoEl = document.querySelector('#video');
const canvasEl = document.querySelector('#overlay');
const ctx = canvasEl.getContext('2d');
const scoreValueEl = document.querySelector('#scoreValue');
const scoreBarEl = document.querySelector('#scoreBar');
const statusTextEl = document.querySelector('#statusText');
const startButtonEl = document.querySelector('#startButton');
const moodImageEl = document.querySelector('#moodImage');
const moodLabelEl = document.querySelector('#moodLabel');

const MUSIC_URL = './bgm.mp3';
const bgmAudio = new Audio(MUSIC_URL);
bgmAudio.loop = true;
bgmAudio.preload = 'auto';

const MOOD_IMAGE_MAP = {
  smile: './img/开心.png',
  angry: './img/生气.png'
};
const ANGRY_THRESHOLD = 80;

let score = 0;
let baselineHipY = null;
let frameCount = 0;
let currentMood = 'none';
let hasStarted = false;
let latestCelebrating = false;
let scoreLoopId = null;

function updateScoreUI() {
  scoreValueEl.textContent = String(score);
  scoreBarEl.style.width = `${score}%`;
}

function setStatus(text, isWarning = false) {
  statusTextEl.textContent = text;
  statusTextEl.style.color = isWarning ? '#fecaca' : '#cbd5e1';
}

function setMood(mood) {
  if (mood === currentMood) return;
  currentMood = mood;

  if (mood === 'smile') {
    moodImageEl.src = MOOD_IMAGE_MAP.smile;
    moodImageEl.classList.add('show');
    moodLabelEl.textContent = '当前情绪：将军开心';
    return;
  }

  if (mood === 'angry') {
    moodImageEl.src = MOOD_IMAGE_MAP.angry;
    moodImageEl.classList.add('show');
    moodLabelEl.textContent = '当前情绪：将军生气';
    return;
  }

  moodImageEl.classList.remove('show');
  moodImageEl.removeAttribute('src');
  moodLabelEl.textContent = '当前情绪：暂无';
}

function updateMoodByScore() {
  if (score >= 100) {
    setMood('smile');
    return;
  }

  if (score <= ANGRY_THRESHOLD) {
    setMood('angry');
    return;
  }

  setMood('none');
}

function runScoreLoop() {
  if (!hasStarted) return;

  score = nextScore(score, latestCelebrating);
  updateScoreUI();
  updateMoodByScore();

  scoreLoopId = window.requestAnimationFrame(runScoreLoop);
}

async function tryPlayMusic() {
  try {
    await bgmAudio.play();
  } catch (error) {
    console.error(error);
    setStatus('音乐播放失败，请确认存在 ./bgm.mp3', true);
  }
}

function toPoseShape(landmarks) {
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (!leftHip || !rightHip) return null;

  const hipCenterY = (leftHip.y + rightHip.y) / 2;

  frameCount += 1;
  if (baselineHipY === null) {
    baselineHipY = hipCenterY;
  } else {
    const warmup = frameCount < 45;
    const alpha = warmup ? 0.08 : 0.02;
    baselineHipY = baselineHipY * (1 - alpha) + hipCenterY * alpha;
  }

  return {
    leftShoulder,
    rightShoulder,
    leftWrist,
    rightWrist,
    hipCenterY,
    baselineHipY
  };
}

function drawPose(results) {
  const { width, height } = canvasEl;
  ctx.clearRect(0, 0, width, height);

  if (!results.poseLandmarks) return;

  window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
    color: '#34d399',
    lineWidth: 3
  });
  window.drawLandmarks(ctx, results.poseLandmarks, {
    color: '#f8fafc',
    radius: 3
  });
}

async function start() {
  hasStarted = true;
  startButtonEl.disabled = true;
  startButtonEl.textContent = '检测中...';
  setStatus('正在启动摄像头...');
  await tryPlayMusic();

  try {
    const pose = new window.Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results) => {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      drawPose(results);

      if (!results.poseLandmarks) {
        latestCelebrating = false;
        setStatus('未检测到人体，请站到画面中央', true);
        return;
      }

      const poseShape = toPoseShape(results.poseLandmarks);
      const celebrating = detectCelebrationPose(poseShape);
      latestCelebrating = celebrating;

      if (celebrating) {
        setStatus('动作达标！忠诚度回满 100');
      } else {
        setStatus('继续保持：双手举过肩并上下跳动');
      }
    });

    const camera = new window.Camera(videoEl, {
      onFrame: async () => {
        await pose.send({ image: videoEl });
      },
      width: 960,
      height: 540
    });

    await camera.start();
    if (scoreLoopId === null) {
      scoreLoopId = window.requestAnimationFrame(runScoreLoop);
    }
    setStatus('检测中');
  } catch (error) {
    setStatus('摄像头启动失败，请检查权限或浏览器设置', true);
    startButtonEl.disabled = false;
    startButtonEl.textContent = '开始检测';
    hasStarted = false;
    latestCelebrating = false;
    if (scoreLoopId !== null) {
      window.cancelAnimationFrame(scoreLoopId);
      scoreLoopId = null;
    }
    console.error(error);
  }
}

startButtonEl.addEventListener('click', () => {
  if (hasStarted) return;
  start().catch((error) => {
    console.error(error);
    setStatus('启动过程中发生错误', true);
    startButtonEl.disabled = false;
    startButtonEl.textContent = '开始检测';
    hasStarted = false;
    latestCelebrating = false;
    if (scoreLoopId !== null) {
      window.cancelAnimationFrame(scoreLoopId);
      scoreLoopId = null;
    }
  });
});

moodImageEl.addEventListener('error', () => {
  setStatus('情绪图片加载失败，请确认 ./img/开心.png 和 ./img/生气.png 存在', true);
});

updateScoreUI();
