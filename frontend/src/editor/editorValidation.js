export function validateTrimRange(startValue, endValue, durationValue) {
  const duration = Number(durationValue);
  if (!Number.isFinite(duration) || duration <= 0) {
    return "Wait for the selected video's duration to load before continuing.";
  }

  if (startValue === "" || startValue == null || !Number.isFinite(Number(startValue))) {
    return "Trim start must be a valid number of seconds.";
  }
  const start = Number(startValue);
  if (start < 0) return "Trim start cannot be negative.";

  if (endValue === "" || endValue == null || !Number.isFinite(Number(endValue))) {
    return "Trim end must be a valid number of seconds.";
  }
  const end = Number(endValue);
  if (end <= start) return "Trim end must be greater than trim start.";
  if (end > duration) {
    return `Trim end (${end.toFixed(2)}s) exceeds the selected video's duration (${duration.toFixed(2)}s).`;
  }
  return "";
}

export function validateTextOverlayTiming(text, startValue, endValue, durationValue) {
  if (!String(text || "").trim()) return "";
  const duration = Number(durationValue);
  if (!Number.isFinite(duration) || duration <= 0) {
    return "Wait for the selected video's duration to load before setting text timing.";
  }

  if (startValue === "" || !Number.isFinite(Number(startValue)) || Number(startValue) < 0) {
    return "Text start time must be a non-negative number.";
  }
  if (endValue === "" || !Number.isFinite(Number(endValue)) || Number(endValue) < 0) {
    return "Text end time must be a non-negative number.";
  }
  if (Number(startValue) >= Number(endValue)) {
    return "Text start time must be less than its end time.";
  }
  if (Number(endValue) > duration) {
    return `Text end time (${Number(endValue).toFixed(2)}s) exceeds the selected video's duration (${duration.toFixed(2)}s).`;
  }
  return "";
}

export function initializeTextEndTime(endValue, durationValue) {
  const duration = Number(durationValue);
  if (!Number.isFinite(duration) || duration <= 0) return endValue;
  return Number(endValue) > 0 ? Number(endValue) : duration;
}

export function mergeClipDuration(durations, url, length) {
  const duration = Number(length);
  if (!url || !Number.isFinite(duration) || duration <= 0) return durations;
  return { ...durations, [url]: duration };
}

export function summarizeTimelineDuration(clips, durations, resolveUrl = (url) => url) {
  if (!Array.isArray(clips) || clips.length === 0) return { duration: 0, ready: false };
  let duration = 0;
  let ready = true;
  for (const clip of clips) {
    const length = Number(durations[resolveUrl(clip.url)]) || 0;
    if (length <= 0) ready = false;
    duration += length;
  }
  return { duration, ready };
}

export function normalizeSingleTextSettings(settings = {}) {
  const legacy = Array.isArray(settings.textOverlays)
    ? settings.textOverlays.find((item) => typeof item?.text === "string")
    : null;
  const position = legacy?.position ?? settings.textPosition;
  const color = legacy?.color ?? settings.textColor;
  return {
    overlayText: String(legacy?.text ?? settings.overlayText ?? "").slice(0, 300),
    textPosition: ["top", "center", "bottom"].includes(position) ? position : "bottom",
    textColor: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#ffffff",
    textSize: Math.min(96, Math.max(16, Number(legacy?.size ?? settings.textSize) || 36)),
    textStart: Math.max(0, Number(legacy?.start ?? settings.textStart) || 0),
    textEnd: Math.max(0, Number(legacy?.end ?? settings.textEnd) || 0),
  };
}
