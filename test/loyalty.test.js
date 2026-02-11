import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCelebrationPose, nextScore } from '../src/loyalty.js';

const makeLandmark = (x, y) => ({ x, y });

test('returns true for celebration pose (both hands up + jump)', () => {
  const pose = {
    leftShoulder: makeLandmark(0.3, 0.55),
    rightShoulder: makeLandmark(0.7, 0.55),
    leftWrist: makeLandmark(0.3, 0.2),
    rightWrist: makeLandmark(0.7, 0.2),
    hipCenterY: 0.58,
    baselineHipY: 0.68
  };

  assert.equal(detectCelebrationPose(pose), true);
});

test('returns false when hands are down', () => {
  const pose = {
    leftShoulder: makeLandmark(0.3, 0.55),
    rightShoulder: makeLandmark(0.7, 0.55),
    leftWrist: makeLandmark(0.3, 0.75),
    rightWrist: makeLandmark(0.7, 0.75),
    hipCenterY: 0.58,
    baselineHipY: 0.68
  };

  assert.equal(detectCelebrationPose(pose), false);
});

test('sets score to 100 for celebration, decreases when not celebrating', () => {
  assert.equal(nextScore(70, true), 100);
  assert.equal(nextScore(70, false), 67);
  assert.equal(nextScore(1, false), 0);
});
