import test from "node:test";
import assert from "node:assert/strict";
import {
  initializeTextEndTime,
  mergeClipDuration,
  normalizeSingleTextSettings,
  summarizeTimelineDuration,
  validateTextOverlayTiming,
  validateTrimRange,
} from "./editorValidation.js";

test("full video trim is valid when the editor uses zero through actual duration", () => {
  assert.equal(validateTrimRange(0, 8.4, 8.4), "");
});

test("short trim is valid, while invalid trim ranges explain the problem", () => {
  assert.equal(validateTrimRange(1.2, 4.5, 8.4), "");
  assert.match(validateTrimRange(4, 4, 8.4), /greater than trim start/);
  assert.match(validateTrimRange(0, 8.5, 8.4), /exceeds/);
  assert.match(validateTrimRange(-0.1, 4, 8.4), /cannot be negative/);
  assert.match(validateTrimRange(0, 4, 0), /duration to load/);
});

test("single text timing accepts zero start and explains invalid ranges", () => {
  assert.equal(validateTextOverlayTiming("Title", 0, 8, 8), "");
  assert.equal(validateTextOverlayTiming("Title", 2, 2, 8), "Text start time must be less than its end time.");
  assert.match(validateTextOverlayTiming("Title", 0, 9, 8), /exceeds/);
  assert.equal(validateTextOverlayTiming("", "", "", 0), "");
});

test("zero text end initializes to the actual full duration", () => {
  assert.equal(initializeTextEndTime(0, 8), 8);
  assert.equal(initializeTextEndTime(3, 8), 3);
});

test("older multiple-text project settings migrate their first item to the single-text fields", () => {
  assert.deepEqual(
    normalizeSingleTextSettings({
      overlayText: "",
      textOverlays: [
        { text: "Keep this", position: "top", color: "#123456", size: 42, start: 1, end: 4 },
        { text: "Discard this", position: "bottom", start: 4, end: 8 },
      ],
    }),
    {
      overlayText: "Keep this",
      textPosition: "top",
      textColor: "#123456",
      textSize: 42,
      textStart: 1,
      textEnd: 4,
    },
  );
});

test("timeline clip metadata updates merge and produce the selected sequence duration", () => {
  const clips = [{ url: "/generated/scene-a.mp4" }, { url: "/generated/scene-b.mp4" }];
  const firstUpdate = mergeClipDuration({}, clips[0].url, 2.1);
  const secondUpdate = mergeClipDuration(firstUpdate, clips[1].url, 1.8);
  const summary = summarizeTimelineDuration(clips, secondUpdate);
  assert.ok(Math.abs(summary.duration - 3.9) < 1e-9);
  assert.equal(summary.ready, true);
  assert.equal(validateTrimRange(0, summary.duration, summary.duration), "");
});

test("timeline is not ready until every selected clip has a measured duration", () => {
  const clips = [{ url: "scene-a.mp4" }, { url: "scene-b.mp4" }];
  const summary = summarizeTimelineDuration(clips, { "scene-a.mp4": 2 });
  assert.deepEqual(summary, { duration: 2, ready: false });
  assert.match(validateTrimRange(0, summary.duration, summary.ready ? summary.duration : 0), /duration to load/);
});
