const JUMP_DELTA = 0.05;
const DECAY_PER_TICK = 3;

export function detectCelebrationPose(pose) {
  if (!pose) return false;

  const { leftShoulder, rightShoulder, leftWrist, rightWrist, hipCenterY, baselineHipY } = pose;

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) return false;

  const handsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
  const jumping = typeof hipCenterY === 'number' && typeof baselineHipY === 'number' && hipCenterY < baselineHipY - JUMP_DELTA;

  return handsUp && jumping;
}

export function nextScore(currentScore, celebrating) {
  if (celebrating) return 100;
  return Math.max(0, currentScore - DECAY_PER_TICK);
}
