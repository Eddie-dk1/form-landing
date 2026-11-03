import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlan,
  DURATIONS,
  formatTime,
  getActiveStage,
} from "../src/workout.ts";
import { SessionTimer } from "../src/timer.ts";

for (const duration of DURATIONS) {
  for (const place of ["home", "outside"] as const) {
    test(`${duration} minutes ${place}: stages add up to the selected duration`, () => {
      const plan = createPlan(duration, place);
      assert.equal(plan.stages.length, 6);
      assert.equal(
        plan.stages.reduce((sum, stage) => sum + stage.seconds, 0),
        duration * 60,
      );
      assert.ok(
        plan.stages.every(
          (stage) => stage.seconds > 0 && stage.hint.length > 0,
        ),
      );
      assert.equal(getActiveStage(plan, 0).index, 0);
      assert.equal(getActiveStage(plan, plan.stages[0].seconds).index, 1);
      assert.equal(getActiveStage(plan, duration * 60).remainingSeconds, 0);
    });
  }
}

test("place changes the exercise selection", () => {
  assert.notDeepEqual(
    createPlan(10, "home").stages.slice(1, 5),
    createPlan(10, "outside").stages.slice(1, 5),
  );
});

test("timer tracks actual elapsed time, including a long gap between updates", () => {
  const timer = new SessionTimer(600);
  timer.start(1000);
  assert.equal(timer.snapshot(1250).remainingSeconds, 599.75);
  assert.equal(timer.snapshot(121000).remainingSeconds, 480);
});

test("pause preserves fractional seconds and resume excludes paused time", () => {
  const timer = new SessionTimer(600);
  timer.start(1000);
  timer.pause(2550);
  assert.equal(timer.status, "paused");
  assert.equal(timer.snapshot(20000).remainingSeconds, 598.45);
  timer.start(20000);
  assert.equal(timer.snapshot(21000).remainingSeconds, 597.45);
});

test("completion stops at zero and can be restarted", () => {
  const timer = new SessionTimer(1);
  timer.start(1000);
  assert.equal(timer.snapshot(5000).remainingSeconds, 0);
  assert.equal(timer.status, "completed");
  assert.equal(timer.snapshot(6000).progress, 1);
  timer.start(7000);
  assert.equal(timer.snapshot(7000).remainingSeconds, 1);
  assert.equal(timer.status, "running");
});

test("changing duration resets running and paused timers", () => {
  const timer = new SessionTimer(600);
  timer.start(0);
  timer.reset(1200);
  assert.equal(timer.status, "idle");
  assert.equal(timer.snapshot(300000).remainingSeconds, 1200);
  timer.start(300000);
  timer.pause(310000);
  timer.reset(1800);
  assert.equal(timer.snapshot(500000).remainingSeconds, 1800);
  assert.equal(timer.snapshot(500000).progress, 0);
});

test("repeated start does not reset the elapsed clock", () => {
  const timer = new SessionTimer(600);
  timer.start(0);
  timer.start(1000);
  assert.equal(timer.snapshot(2000).remainingSeconds, 598);
});

test("time formatting never shows negative values and rounds up partial seconds", () => {
  assert.equal(formatTime(600), "10:00");
  assert.equal(formatTime(59.2), "01:00");
  assert.equal(formatTime(1.1), "00:02");
  assert.equal(formatTime(-1), "00:00");
});
