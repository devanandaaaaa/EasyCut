
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import {
  initializeTextEndTime,
  mergeClipDuration,
  normalizeSingleTextSettings,
  summarizeTimelineDuration,
  validateTextOverlayTiming,
  validateTrimRange,
} from "../editor/editorValidation.js";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Trash2,
  Film,
  Gauge,
  ImagePlus,
  Music2,
  Pause,
  Play,
  Scissors,
  Settings2,
  SlidersHorizontal,
  Type,
  Volume2,
  VolumeX,
} from "lucide-react";

const PROJECT_KEY = "easycut-generated-result";
const EDITS_KEY = "easycut-editor-settings";

const tools = [
  { id: "trim", name: "Trim", description: "Adjust preview range", icon: Scissors },
  { id: "text", name: "Text", description: "Configure text overlay", icon: Type },
  { id: "audio", name: "Audio", description: "Preview audio settings", icon: Music2 },
  { id: "speed", name: "Speed", description: "Change playback speed", icon: Gauge },
  { id: "filter", name: "Filter", description: "Apply a visual look", icon: SlidersHorizontal },
  { id: "sticker", name: "Sticker", description: "Add a sticker overlay", icon: ImagePlus },
];

const STICKER_LIBRARY = [
  { id: "smile", category: "Emojis", label: "Smile", symbol: "😊", background: "#ffca45" },
  { id: "heart-eyes", category: "Emojis", label: "Love", symbol: "😍", background: "#ff7096" },
  { id: "cool", category: "Emojis", label: "Cool", symbol: "😎", background: "#55c6e8" },
  { id: "party", category: "Emojis", label: "Party", symbol: "🥳", background: "#a47bf5" },
  { id: "arrow-right", category: "Arrows", label: "Right arrow", symbol: "➜", background: "#39c6a2" },
  { id: "arrow-up", category: "Arrows", label: "Up arrow", symbol: "⬆", background: "#43a5ff" },
  { id: "arrow-swirl", category: "Arrows", label: "Curved arrow", symbol: "➰", background: "#9c7bff" },
  { id: "arrow-double", category: "Arrows", label: "Double arrow", symbol: "⇢", background: "#ff9d48" },
  { id: "star", category: "Shapes", label: "Star", symbol: "★", background: "#ffb72e" },
  { id: "heart", category: "Shapes", label: "Heart", symbol: "♥", background: "#ff5c7c" },
  { id: "diamond", category: "Shapes", label: "Diamond", symbol: "◆", background: "#49b9d4" },
  { id: "sparkle", category: "Shapes", label: "Sparkle", symbol: "✦", background: "#8d74f5" },
  { id: "like", category: "Reactions", label: "Like", symbol: "👍", background: "#4c9aff" },
  { id: "fire", category: "Reactions", label: "Fire", symbol: "🔥", background: "#ff7653" },
  { id: "clap", category: "Reactions", label: "Clap", symbol: "👏", background: "#ed9a5b" },
  { id: "check", category: "Reactions", label: "Approved", symbol: "✓", background: "#42c78a" },
  { id: "confetti", category: "Decorative", label: "Confetti", symbol: "🎉", background: "#f06cb7" },
  { id: "flower", category: "Decorative", label: "Flower", symbol: "🌼", background: "#f5a84a" },
  { id: "rainbow", category: "Decorative", label: "Rainbow", symbol: "🌈", background: "#7d80eb" },
  { id: "crown", category: "Decorative", label: "Crown", symbol: "👑", background: "#daa82a" },
];

const STICKER_CATEGORIES = ["All", ...new Set(STICKER_LIBRARY.map((item) => item.category))];

function createStickerPng(sticker) {
  const canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(25, 25, 335, 335);
  gradient.addColorStop(0, sticker.background);
  gradient.addColorStop(1, "#ffffff");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(180, 180, 158, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,.95)";
  context.lineWidth = 12;
  context.stroke();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "190px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
  context.fillText(sticker.symbol, 180, 188, 245);
  return canvas.toDataURL("image/png");
}

const defaultEdits = {
  trimStart: 0,
  trimEnd: 0,
  overlayText: "",
  textPosition: "bottom",
  textColor: "#ffffff",
  textSize: 36,
  textStart: 0,
  textEnd: 0,
  playbackSpeed: 1,
  volume: 100,
  muted: false,
  filter: "none",
  filterStart: 0,
  filterEnd: 0,
  stickerData: "",
  stickerName: "",
  stickerX: 5,
  stickerY: 5,
  stickerWidth: 20,
  stickerStart: 0,
  stickerEnd: 0,
  stickerOverlays: [],
  timelineClips: [],
};

function readStorage(key, fallback = {}) {
  try {
    return JSON.parse(
      sessionStorage.getItem(key) || JSON.stringify(fallback)
    );
  } catch {
    return fallback;
  }
}

function getProjectId(project) {
  return project?.projectId ?? project?.id ?? project?.project_id ?? null;
}

function resolveEditorVideoUrl(url) {
  if (!url || /^https?:\/\//i.test(url)) return url || "";
  const base = (api.defaults.baseURL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getProjectEditsKey(projectId) {
  return projectId
    ? `easycut-editor-settings-${projectId}`
    : EDITS_KEY;
}

function readEdits(project = {}) {
  let saved = project.editorSettings;

  if (typeof saved === "string") {
    try {
      saved = JSON.parse(saved);
    } catch {
      saved = null;
    }
  }

  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const local = readStorage(getProjectEditsKey(getProjectId(project)), {});
  const savedHasEdits = Object.keys(saved).length > 0;
  const savedSettings = savedHasEdits ? saved : local;
  const result = { ...defaultEdits, ...local, ...savedSettings };
  const hasSavedTextArray = Array.isArray(savedSettings.textOverlays) && savedSettings.textOverlays.length > 0;
  const localText = Array.isArray(local.textOverlays)
    ? local.textOverlays.some((item) => typeof item?.text === "string")
    : false;
  const textSettings = hasSavedTextArray || Object.hasOwn(savedSettings, "overlayText")
    ? savedSettings
    : localText ? local : savedSettings;
  Object.assign(result, normalizeSingleTextSettings(textSettings));
  delete result.textOverlays;
  const stickerSource = savedSettings.stickerOverlays || local.stickerOverlays;
  if (Array.isArray(stickerSource)) {
    result.stickerOverlays = stickerSource;
  } else {
    const legacySticker = savedSettings.stickerData ? savedSettings : local;
    result.stickerOverlays = legacySticker.stickerData ? [{
      id: "legacy-sticker-overlay",
      data: legacySticker.stickerData,
      name: legacySticker.stickerName || "Sticker",
      x: Number(legacySticker.stickerX) || 5,
      y: Number(legacySticker.stickerY) || 5,
      width: Number(legacySticker.stickerWidth) || 20,
      start: Number(legacySticker.stickerStart) || 0,
      end: Number(legacySticker.stickerEnd) || 0,
    }] : [];
  }
  return result;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "00:00";
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(
    value % 60
  ).padStart(2, "0")}`;
}

function makeProject(route, saved = {}) {
  const routeId = getProjectId(route);
  const savedId = getProjectId(saved);
  const sameProject =
    routeId != null &&
    savedId != null &&
    String(routeId) === String(savedId);

  const base = sameProject ? saved : {};

  return {
    ...base,
    ...route,
    projectId: routeId ?? (sameProject ? savedId : null),
    videoUrl: route.videoUrl || (sameProject ? saved.videoUrl : "") || "",
    projectName:
      route.projectName ||
      route.name ||
      (sameProject ? saved.projectName || saved.name : "") ||
      "My EasyCut project",
  };
}

export default function Editor() {
  const location = useLocation();
  const { projectId } = useParams();
  return <EditorPage key={`${location.key}:${projectId || "new"}`} location={location} routeProjectId={projectId} />;
}

function EditorPage({ location, routeProjectId }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const pendingSeekRef = useRef(null);
  const continueSequenceRef = useRef(false);
  const clipDurationsRef = useRef({});

  const [project, setProject] = useState(() => {
    const saved = routeProjectId ? {} : readStorage(PROJECT_KEY, {});
    return makeProject(location.state || {}, saved);
  });

  const [edits, setEdits] = useState(() =>
    readEdits(makeProject(location.state || {}, routeProjectId ? {} : readStorage(PROJECT_KEY, {})))
  );
  const [activeTool, setActiveTool] = useState("trim");
  const [duration, setDuration] = useState(0);
  const [durationReady, setDurationReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [clipDurations, setClipDurations] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [stickerCategory, setStickerCategory] = useState("All");
  const [stickerAspectRatios, setStickerAspectRatios] = useState({});

  const videoUrl = project.videoUrl || "";
  const projectName =
    project.projectName || project.name || "My EasyCut project";
  const projectId = getProjectId(project);
  const timelineClips = Array.isArray(edits.timelineClips) ? edits.timelineClips : [];
  const stickerOverlays = Array.isArray(edits.stickerOverlays) ? edits.stickerOverlays : [];
  const selectedSticker = stickerOverlays.find((item) => item.id === selectedStickerId) || stickerOverlays[0];
  const displayClips = timelineClips.length
    ? timelineClips
    : (Array.isArray(edits.previewClips) ? edits.previewClips : []);
  const invalidTimeline = Boolean(edits.timelineEnabled && timelineClips.length === 0);
  const sequencePreviewUrl = timelineClips.length
    ? resolveEditorVideoUrl(timelineClips[Math.min(timelineIndex, timelineClips.length - 1)]?.url)
    : videoUrl;

  // Load the correct project and its settings when navigating here.
  useEffect(() => {
    const route = location.state || {};

    if (routeProjectId && String(getProjectId(route) || "") !== String(routeProjectId)) {
      const controller = new AbortController();
      api.get(`/auth/projects/${routeProjectId}`, { signal: controller.signal })
        .then(({ data: savedProject }) => {
          const settings = typeof savedProject.editor_settings === "string"
            ? JSON.parse(savedProject.editor_settings || "{}")
            : savedProject.editor_settings || {};
          const sourceUrl = resolveEditorVideoUrl(savedProject.video_url || "");
          const finalUrl = resolveEditorVideoUrl(savedProject.final_video_url || "");
          const restored = {
            projectId: savedProject.id,
            id: savedProject.id,
            projectName: savedProject.name || "My EasyCut project",
            name: savedProject.name || "My EasyCut project",
            videoUrl: sourceUrl || finalUrl,
            originalVideoUrl: sourceUrl,
            finalVideoUrl: finalUrl,
            editorSettings: settings,
            projectData: settings.projectData || {},
            savedToDatabase: Boolean(savedProject.is_saved),
          };
          setProject(restored);
          setEdits(readEdits(restored));
          setDuration(0);
          setDurationReady(false);
          setCurrentTime(0);
          setTimelineIndex(0);
          setClipDurations({});
          clipDurationsRef.current = {};
          setNotice("");
          try {
            sessionStorage.setItem(PROJECT_KEY, JSON.stringify(restored));
          } catch (error) {
            console.error("Could not cache the opened project:", error);
          }
        })
        .catch((error) => {
          if (error.name !== "CanceledError" && error.name !== "AbortError") {
            setNotice(error.response?.data?.detail || "Could not load this saved project.");
          }
        });
      return () => controller.abort();
    }

    const saved = readStorage(PROJECT_KEY, {});
    const updated = makeProject(route, saved);

    try {
      sessionStorage.setItem(PROJECT_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Could not save project:", error);
    }
  }, [location.key, location.state, routeProjectId]);

  // Save settings under this project's own key.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        getProjectEditsKey(projectId),
        JSON.stringify(edits)
      );

      if (!projectId) {
        sessionStorage.setItem(EDITS_KEY, JSON.stringify(edits));
      }
    } catch (error) {
      console.error("Could not save editing settings:", error);
    }
  }, [edits, projectId]);

  // Persist the active project without replacing it with another project.
  useEffect(() => {
    try {
      sessionStorage.setItem(PROJECT_KEY, JSON.stringify(project));
    } catch (error) {
      console.error("Could not save project:", error);
    }
  }, [project]);

  // Apply preview playback settings to the video element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = Number(edits.playbackSpeed) || 1;
    video.volume = Math.min(100, Math.max(0, Number(edits.volume) || 0)) / 100;
    video.muted = Boolean(edits.muted);
  }, [edits.playbackSpeed, edits.volume, edits.muted, sequencePreviewUrl]);

  function updateEdit(key, value) {
    setEdits((previous) => ({ ...previous, [key]: value }));
  }

  function updateStickerOverlay(id, key, value) {
    setEdits((previous) => ({
      ...previous,
      stickerOverlays: previous.stickerOverlays.map((item) => item.id === id ? { ...item, [key]: value } : item),
    }));
  }

  function addSticker(data, name) {
    const item = { id: crypto.randomUUID(), data, name, x: 40, y: 35, width: 20, start: 0, end: 0 };
    setEdits((previous) => ({ ...previous, stickerOverlays: [...previous.stickerOverlays, item] }));
    setSelectedStickerId(item.id);
    setNotice(`${name} added. It will be included in the exported video.`);
  }

  async function addBuiltInSticker(sticker) {
    try {
      addSticker(createStickerPng(sticker), sticker.label);
    } catch (error) {
      console.error("Could not create sticker image:", error);
      setNotice("This sticker could not be created in the browser.");
    }
  }

  function importSticker(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "image/png" || file.size > 350_000) {
      setNotice("Choose a PNG image no larger than 350 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth > 2048 || image.naturalHeight > 2048) {
          setNotice("Sticker dimensions must be at most 2048 by 2048 pixels.");
          return;
        }
        addSticker(data, file.name);
      };
      image.onerror = () => setNotice("This PNG image could not be opened.");
      image.src = data;
    };
    reader.onerror = () => setNotice("The selected image could not be read.");
    reader.readAsDataURL(file);
  }

  function moveSticker(event, stickerId) {
    const box = event.currentTarget.parentElement.getBoundingClientRect();
    const stickerBox = event.currentTarget.getBoundingClientRect();
    const maxLeft = Math.max(1, box.width - stickerBox.width);
    const maxTop = Math.max(1, box.height - stickerBox.height);
    updateStickerOverlay(stickerId, "x", Math.round(Math.min(95, Math.max(0, (event.clientX - box.left - stickerBox.width / 2) / maxLeft * 100))));
    updateStickerOverlay(stickerId, "y", Math.round(Math.min(95, Math.max(0, (event.clientY - box.top - stickerBox.height / 2) / maxTop * 100))));
  }

  function updateTimeline(index, direction) {
    setTimelineIndex(0);
    setCurrentTime(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
    setEdits((previous) => {
      const clips = Array.isArray(previous.timelineClips) ? [...previous.timelineClips] : [];
      const destination = index + direction;
      if (destination < 0 || destination >= clips.length) return previous;
      [clips[index], clips[destination]] = [clips[destination], clips[index]];
      return { ...previous, timelineClips: clips };
    });
  }

  function removeTimelineClip(index) {
    const remainingClips = timelineClips.filter((_, clipIndex) => clipIndex !== index);
    const remainingDuration = remainingClips.reduce(
      (total, clip) => total + (clipDurations[resolveEditorVideoUrl(clip.url)] || 0),
      0,
    );
    setTimelineIndex(0);
    setCurrentTime(0);
    setDuration(remainingDuration);
    setDurationReady(remainingDuration > 0);
    if (videoRef.current) videoRef.current.currentTime = 0;
    setEdits((previous) => {
      const clips = Array.isArray(previous.timelineClips) ? previous.timelineClips : [];
      if (clips.length <= 1) return previous;
      return {
        ...previous,
        timelineClips: clips.filter((_, clipIndex) => clipIndex !== index),
      };
    });
  }

  function goToResult() {
    navigate("/result", { state: project });
  }

  async function continueToFinalOutput() {
    if (invalidTimeline) {
      setNotice("This script project has no scene clips to export. Return to the sequence or regenerate the video.");
      return;
    }
    if (!videoUrl) {
      alert("Generate a video before continuing to Final Output.");
      return;
    }

    const validationIssue = validateTrimRange(edits.trimStart, edits.trimEnd, durationReady ? duration : 0)
      || validateTextOverlayTiming(edits.overlayText, edits.textStart, edits.textEnd, durationReady ? duration : 0);
    if (validationIssue) {
      setNotice(validationIssue);
      return;
    }

    const updatedProject = {
      ...project,
      projectId,
      videoUrl,
      editorSettings: edits,
    };

    try {
      sessionStorage.setItem(
        getProjectEditsKey(projectId),
        JSON.stringify(edits)
      );
      sessionStorage.setItem(
        PROJECT_KEY,
        JSON.stringify(updatedProject)
      );
      if (projectId) {
        await api.put(`/auth/projects/${projectId}/draft`, {
          video_url: project.originalVideoUrl || videoUrl,
          editor_settings: edits,
        });
      }
    } catch (error) {
      console.error("Could not save project settings:", error);
      setNotice(error.response?.data?.detail || "Could not save the project settings. Please try again.");
      return;
    }

    setProject(updatedProject);
    navigate("/final-output", { state: updatedProject });
  }

  function selectTimelineClip(index) {
    const offset = timelineClips.slice(0, index).reduce(
      (total, clip) => total + (clipDurations[resolveEditorVideoUrl(clip.url)] || 0),
      0,
    );
    setCurrentTime(offset);

    if (index === timelineIndex && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => setNotice("Could not play this scene preview."));
      return;
    }

    pendingSeekRef.current = 0;
    continueSequenceRef.current = true;
    setTimelineIndex(index);
  }

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch (error) {
        console.error("Playback failed:", error);
        setNotice("Unable to play the video. Check its URL.");
      }
    } else {
      video.pause();
    }
  }

  function handleMetadata(video) {
    if (!video || video !== videoRef.current) return;
    const length = Number(video.duration);
    if (!Number.isFinite(length) || length <= 0) return;
    if (timelineClips.length) {
      recordClipDuration(sequencePreviewUrl, length);
      return;
    }
    setDuration(length);
    setDurationReady(length > 0);

    setEdits((previous) => ({
      ...previous,
      trimEnd: Number(previous.trimEnd) > 0 ? Number(previous.trimEnd) : length,
      textEnd: initializeTextEndTime(previous.textEnd, length),
    }));
  }

  function seekTo(seconds) {
    if (!videoRef.current) return;

    const safeTime = Math.max(
      0,
      Math.min(Number(seconds) || 0, duration || Number(seconds) || 0)
    );

    if (timelineClips.length) {
      let remaining = safeTime;
      let selectedIndex = timelineClips.length - 1;
      for (let index = 0; index < timelineClips.length; index += 1) {
        const clipDuration = clipDurations[resolveEditorVideoUrl(timelineClips[index].url)] || 0;
        if (remaining < clipDuration || index === timelineClips.length - 1) {
          selectedIndex = index;
          break;
        }
        remaining -= clipDuration;
      }
      pendingSeekRef.current = remaining;
      setTimelineIndex(selectedIndex);
      setCurrentTime(safeTime);
      if (selectedIndex === timelineIndex) {
        videoRef.current.currentTime = remaining;
        pendingSeekRef.current = null;
      }
      return;
    }

    videoRef.current.currentTime = safeTime;
    setCurrentTime(safeTime);
  }

  function recordClipDuration(url, length) {
    const nextDurations = mergeClipDuration(clipDurationsRef.current, url, length);
    if (nextDurations === clipDurationsRef.current) return;
    clipDurationsRef.current = nextDurations;
    setClipDurations(nextDurations);
    const { duration: totalDuration, ready } = summarizeTimelineDuration(
      timelineClips,
      nextDurations,
      resolveEditorVideoUrl,
    );
    setDuration(totalDuration);
    setDurationReady(ready);
    if (ready) {
      setEdits((previous) => ({
        ...previous,
        trimEnd: Number(previous.trimEnd) > 0 ? Number(previous.trimEnd) : totalDuration,
        textEnd: initializeTextEndTime(previous.textEnd, totalDuration),
      }));
    }
  }

  function previewTimelineTime(localTime) {
    const offset = timelineClips.slice(0, timelineIndex).reduce(
      (total, clip) => total + (clipDurations[resolveEditorVideoUrl(clip.url)] || 0),
      0,
    );
    setCurrentTime(offset + localTime);
  }

  function finishSequenceClip() {
    if (timelineIndex < timelineClips.length - 1) {
      const nextIndex = timelineIndex + 1;
      const offset = timelineClips.slice(0, nextIndex).reduce(
        (total, clip) => total + (clipDurations[resolveEditorVideoUrl(clip.url)] || 0),
        0,
      );
      continueSequenceRef.current = true;
      setTimelineIndex(nextIndex);
      setCurrentTime(offset);
    } else {
      continueSequenceRef.current = false;
      setIsPlaying(false);
    }
  }

  async function savePreviewSettings() {
    const validationIssue = validateTrimRange(edits.trimStart, edits.trimEnd, durationReady ? duration : 0)
      || validateTextOverlayTiming(edits.overlayText, edits.textStart, edits.textEnd, durationReady ? duration : 0);
    if (validationIssue) {
      setNotice(validationIssue);
      return;
    }

    const updatedProject = { ...project, projectId, videoUrl, editorSettings: edits };
    try {
      sessionStorage.setItem(getProjectEditsKey(projectId), JSON.stringify(edits));
      sessionStorage.setItem(PROJECT_KEY, JSON.stringify(updatedProject));
      if (projectId) {
        await api.put(`/auth/projects/${projectId}/draft`, {
          video_url: project.originalVideoUrl || videoUrl,
          editor_settings: edits,
        });
      }
      setProject(updatedProject);
      seekTo(edits.trimStart);
      setNotice(projectId
        ? "Settings saved to this project."
        : "Settings saved for this browser session. Reopen a saved project to persist them across devices.");
    } catch (error) {
      console.error("Could not save project settings:", error);
      setNotice(error.response?.data?.detail || "Could not save settings to the project. Please try again.");
    }
  }

  function renderToolPanel() {
    if (activeTool === "trim") {
      return (
        <>
          <h3>Trim video</h3>
          <p className="editor-tool-help">
            Choose the start and end points for your intended cut.
          </p>

          <label className="editor-field">
            Start time (seconds)
            <input
              type="number"
              min="0"
              max={durationReady ? duration : undefined}
              step="0.1"
              value={edits.trimStart}
              onChange={(event) =>
                updateEdit("trimStart", Number(event.target.value))
              }
            />
          </label>

          <label className="editor-field">
            End time (seconds)
            <input
              type="number"
              min="0"
              max={durationReady ? duration : undefined}
              step="0.1"
              value={edits.trimEnd}
              onChange={(event) =>
                updateEdit("trimEnd", Number(event.target.value))
              }
            />
          </label>

          <button
            type="button"
            className="editor-tool-action"
            onClick={() => seekTo(edits.trimStart)}
            disabled={!videoUrl}
          >
            <Play size={15} /> Preview start
          </button>
        </>
      );
    }

    if (activeTool === "text") {
      return (
        <>
          <h3>Text overlay</h3>
          <p className="editor-tool-help">
            Add one text item to your video. It will be included in the exported MP4.
          </p>
          <label className="editor-field">Text content<input type="text" maxLength={300} value={edits.overlayText} onChange={(event) => updateEdit("overlayText", event.target.value)} /></label>
          <label className="editor-field">Position<select value={edits.textPosition} onChange={(event) => updateEdit("textPosition", event.target.value)}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label>
          <label className="editor-field">Text colour<input type="color" value={edits.textColor || "#ffffff"} onChange={(event) => updateEdit("textColor", event.target.value)} /></label>
          <label className="editor-field">Font size: {edits.textSize || 36}px<input type="range" min="16" max="96" value={edits.textSize || 36} onChange={(event) => updateEdit("textSize", Number(event.target.value))} /></label>
          <label className="editor-field">Show from (seconds)<input type="number" min="0" max={durationReady ? duration : undefined} step="0.1" value={edits.textStart ?? 0} onChange={(event) => updateEdit("textStart", event.target.value === "" ? "" : Number(event.target.value))} /></label>
          <label className="editor-field">Show until (seconds)<input type="number" min="0" max={durationReady ? duration : undefined} step="0.1" value={edits.textEnd ?? 0} onChange={(event) => updateEdit("textEnd", event.target.value === "" ? "" : Number(event.target.value))} /></label>
        </>
      );
    }

    if (activeTool === "audio") {
      return (
        <>
          <h3>Audio settings</h3>
          <p className="editor-tool-help">
            These controls affect preview playback. Export audio changes depend on backend support.
          </p>

          <label className="editor-field">
            Preview volume: {edits.volume}%
            <input
              type="range"
              min="0"
              max="100"
              value={edits.volume}
              onChange={(event) =>
                updateEdit("volume", Number(event.target.value))
              }
            />
          </label>

          <button
            type="button"
            className="editor-tool-action"
            onClick={() => updateEdit("muted", !edits.muted)}
          >
            {edits.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {edits.muted ? "Unmute preview" : "Mute preview"}
          </button>
        </>
      );
    }

    if (activeTool === "filter") {
      return (
        <>
          <h3>Visual filter</h3>
          <p className="editor-tool-help">The selected look is applied in preview and rendered into the export.</p>
          <label className="editor-field">
            Filter
            <select value={edits.filter || "none"} onChange={(event) => updateEdit("filter", event.target.value)}>
              <option value="none">Original</option>
              <option value="cinematic">Cinematic</option>
              <option value="travel">Travel</option>
              <option value="warm">Warm</option>
              <option value="monochrome">Monochrome</option>
              <option value="vivid">Vivid</option>
            </select>
          </label>
          <label className="editor-field">Apply from (seconds; 0 = full video)<input type="number" min="0" step="0.1" value={edits.filterStart || 0} onChange={(event) => updateEdit("filterStart", Number(event.target.value))} /></label>
          <label className="editor-field">Apply until (seconds; 0 = full video)<input type="number" min="0" step="0.1" value={edits.filterEnd || 0} onChange={(event) => updateEdit("filterEnd", Number(event.target.value))} /></label>
        </>
      );
    }

    if (activeTool === "sticker") {
      const filteredStickers = stickerCategory === "All"
        ? STICKER_LIBRARY
        : STICKER_LIBRARY.filter((item) => item.category === stickerCategory);
      return (
        <>
          <h3>Sticker library</h3>
          <p className="editor-tool-help">Choose a built-in sticker or import a PNG. Drag stickers in the preview, resize them here, and each one is included in the export.</p>
          <div className="editor-sticker-categories">
            {STICKER_CATEGORIES.map((category) => <button type="button" key={category} className={stickerCategory === category ? "is-selected" : ""} onClick={() => setStickerCategory(category)}>{category}</button>)}
          </div>
          <div className="editor-sticker-library">
            {filteredStickers.map((sticker) => <button type="button" key={sticker.id} title={`Add ${sticker.label}`} onClick={() => addBuiltInSticker(sticker)}><span>{sticker.symbol}</span><small>{sticker.label}</small></button>)}
          </div>
          <label className="editor-field">Import PNG (up to 350 KB)<input type="file" accept="image/png,.png" onChange={importSticker} /></label>
          {stickerOverlays.length > 0 && <div className="editor-overlay-list">
            {stickerOverlays.map((item, index) => <div className={`editor-overlay-row ${selectedSticker?.id === item.id ? "is-selected" : ""}`} key={item.id}>
              <button type="button" onClick={() => setSelectedStickerId(item.id)}>{item.name || `Sticker ${index + 1}`}</button>
              <button type="button" aria-label={`Remove sticker ${index + 1}`} onClick={() => { const remaining = stickerOverlays.filter((sticker) => sticker.id !== item.id); updateEdit("stickerOverlays", remaining); if (selectedStickerId === item.id) setSelectedStickerId(remaining[0]?.id || null); }}><Trash2 size={14} /></button>
            </div>)}
          </div>}
          {selectedSticker && <>
            <p className="editor-tool-help">Selected: {selectedSticker.name}</p>
            <label className="editor-field">Width: {selectedSticker.width}%<input type="range" min="5" max="60" value={selectedSticker.width || 20} onChange={(event) => updateStickerOverlay(selectedSticker.id, "width", Number(event.target.value))} /></label>
            <label className="editor-field">Horizontal position: {selectedSticker.x}%<input type="range" min="0" max="95" value={selectedSticker.x ?? 5} onChange={(event) => updateStickerOverlay(selectedSticker.id, "x", Number(event.target.value))} /></label>
            <label className="editor-field">Vertical position: {selectedSticker.y}%<input type="range" min="0" max="95" value={selectedSticker.y ?? 5} onChange={(event) => updateStickerOverlay(selectedSticker.id, "y", Number(event.target.value))} /></label>
            <label className="editor-field">Show from (seconds; 0 = full video)<input type="number" min="0" step="0.1" value={selectedSticker.start || 0} onChange={(event) => updateStickerOverlay(selectedSticker.id, "start", Number(event.target.value))} /></label>
            <label className="editor-field">Show until (seconds; 0 = full video)<input type="number" min="0" step="0.1" value={selectedSticker.end || 0} onChange={(event) => updateStickerOverlay(selectedSticker.id, "end", Number(event.target.value))} /></label>
          </>}
        </>
      );
    }

    return (
      <>
        <h3>Playback speed</h3>
        <p className="editor-tool-help">
          Change the preview playback speed.
        </p>

        <label className="editor-field">
          Speed
          <select
            value={edits.playbackSpeed}
            onChange={(event) =>
              updateEdit("playbackSpeed", Number(event.target.value))
            }
          >
            <option value="0.25">0.25×</option>
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1× — Normal</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
        </label>
      </>
    );
  }

  return (
    <main className="editor-page">
      <div className="editor-shell">
        <header className="editor-nav">
          <button
            type="button"
            className="editor-brand"
            onClick={() => navigate("/dashboard")}
          >
            <span className="editor-brand-icon">E</span>
            EasyCut
          </button>

          <div className="editor-nav-actions">
            <span className="editor-save-status">
              <span className="editor-status-dot" />
              {videoUrl ? "Video loaded" : "Video unavailable"}
            </span>

            <button
              type="button"
              className="editor-back-button"
              onClick={goToResult}
            >
              <ArrowLeft size={14} /> Back to Result
            </button>
            <button type="button" className="editor-back-button" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
          </div>
        </header>

        <section className="editor-heading">
          <div>
            <span className="editor-eyebrow">CREATIVE WORKSPACE</span>
            <h1>Make it yours.</h1>
            <p>Preview your video and configure your editing settings.</p>
          </div>

            <button
            type="button"
            className="editor-export-button"
            onClick={continueToFinalOutput}
              disabled={!videoUrl || invalidTimeline}
          >
            Continue to Final Output <ArrowRight size={15} />
          </button>
        </section>

        <section className="editor-workspace">
          <aside className="editor-tools-panel">
            <span className="editor-section-label">EDITING TOOLS</span>

            {tools.map((tool) => {
              const Icon = tool.icon;

              return (
                <button
                  type="button"
                  key={tool.id}
                  className={`editor-tool ${
                    activeTool === tool.id ? "editor-tool-active" : ""
                  }`}
                  onClick={() => {
                    setActiveTool(tool.id);
                    setNotice("");
                  }}
                >
                  <span className="editor-tool-icon">
                    <Icon size={17} />
                  </span>
                  <span className="editor-tool-copy">
                    <strong>{tool.name}</strong>
                    <small>{tool.description}</small>
                  </span>
                  <ArrowRight className="editor-tool-arrow" size={15} />
                </button>
              );
            })}

            <div className="editor-tool-settings">
              <div className="editor-settings-heading">
                <Settings2 size={16} /> Tool settings
              </div>

              {renderToolPanel()}

              <button
                type="button"
                className="editor-tool-action editor-tool-save"
                onClick={savePreviewSettings}
                disabled={!videoUrl}
              >
                <Check size={15} /> Save preview settings
              </button>

              {notice && (
                <p className="editor-notice" role="status">
                  {notice}
                </p>
              )}
            </div>

            <div className="editor-tips">
              <span className="editor-tips-icon">✳</span>
              <strong>Your creative control</strong>
              <p>
                Save settings to this project or continue to export. Filters, timing, audio, and text settings are rendered by the backend.
              </p>
            </div>

            <details className="editor-help-panel">
              <summary>How to use the editor</summary>
              <ol>
                <li>Play or scrub the preview. Script projects play the listed clips in sequence order; voiceover previews retain the mixed narration.</li>
                <li>Use Text to add multiple independent items, then select each one to set its wording, colour, size, position, and start/end times. A zero end time means through the video.</li>
                <li>Use Filter to choose a look. Set a time range, or leave both times at zero for the whole video.</li>
                <li>Use Sticker to choose from the built-in library or import PNGs, drag each sticker on the preview, adjust its size or position, set its time range, or remove it.</li>
                <li>Script scene clips can be previewed, moved earlier/later, or removed. Voiceover scene order is read-only to protect narration. Clip-by-clip trimming is unavailable.</li>
                <li>Save preview settings to this project, then choose Continue to Final Output to render and download.</li>
              </ol>
              <p>Text and stickers use their time range (zero to zero means full video). Filters use their selected range. Trim and audio settings apply to the exported video.</p>
            </details>
          </aside>

          <div className="editor-main-panel">
            <div className="editor-preview-header">
              <div>
                <span className="editor-section-label">PREVIEW</span>
                <h2>{projectName}</h2>
              </div>
              <span className="editor-preview-badge">16:9 · Landscape</span>
            </div>

            <div className="editor-canvas">
              {videoUrl ? (
                <div className="editor-video-stage">
                  <video
                    ref={videoRef}
                    key={sequencePreviewUrl}
                    src={sequencePreviewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ filter: (currentTime >= (Number(edits.filterStart) || 0) && (!(Number(edits.filterEnd) > 0) || currentTime <= Number(edits.filterEnd))) ? ({
                      none: "none",
                      cinematic: "contrast(1.08) saturate(.86) brightness(.985)",
                      travel: "contrast(1.06) saturate(1.22) brightness(1.01)",
                      warm: "sepia(.16) saturate(1.05)",
                      monochrome: "grayscale(1)",
                      vivid: "contrast(1.04) saturate(1.3) brightness(1.01)",
                    }[edits.filter || "none"] || "none") : "none" }}
                    onLoadedMetadata={(event) => {
                      handleMetadata(event.currentTarget);
                      if (pendingSeekRef.current != null && videoRef.current) {
                        videoRef.current.currentTime = pendingSeekRef.current;
                        pendingSeekRef.current = null;
                      }
                      if (continueSequenceRef.current && videoRef.current) {
                        continueSequenceRef.current = false;
                        videoRef.current.play().catch(() => setIsPlaying(false));
                      }
                    }}
                    onDurationChange={(event) => handleMetadata(event.currentTarget)}
                    onTimeUpdate={() => previewTimelineTime(videoRef.current?.currentTime || 0)}
                    onEnded={() => timelineClips.length ? finishSequenceClip() : setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => { if (!continueSequenceRef.current) setIsPlaying(false); }}
                    onError={() =>
                      setNotice("Could not load the generated video.")
                    }
                  >
                    Your browser does not support video playback.
                  </video>

                  {edits.overlayText?.trim() && currentTime >= (Number(edits.textStart) || 0) &&
                    (!(Number(edits.textEnd) > 0) || currentTime <= Number(edits.textEnd)) && (() => {
                      const position = edits.textPosition || "bottom";
                      const style = { color: edits.textColor || "#ffffff", fontSize: `${edits.textSize || 36}px` };
                      if (position === "top") style.top = "8%";
                      else if (position === "center") {
                        style.top = "50%";
                        style.transform = "translateY(-50%)";
                      } else style.bottom = "10%";
                      return <div className={`editor-text-overlay editor-text-${position}`} style={style}>{edits.overlayText}</div>;
                    })()}
                  {timelineClips.length > 0 && timelineClips.map((clip) => {
                    const clipUrl = resolveEditorVideoUrl(clip.url);
                    return <video key={`duration-${clipUrl}`} src={clipUrl} preload="metadata" muted aria-hidden="true" tabIndex={-1}
                      style={{ display: "none" }}
                      onLoadedMetadata={(event) => recordClipDuration(clipUrl, event.currentTarget.duration)}
                      onDurationChange={(event) => recordClipDuration(clipUrl, event.currentTarget.duration)} />;
                  })}
                  {stickerOverlays.map((item) => currentTime >= (Number(item.start) || 0) &&
                    (!(Number(item.end) > 0) || currentTime <= Number(item.end)) && (
                    <img key={item.id} className="editor-image-sticker" src={item.data} alt={item.name || "Video sticker"} draggable="false"
                      onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth) setStickerAspectRatios((previous) => ({ ...previous, [item.id]: image.naturalHeight / image.naturalWidth })); }}
                      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setSelectedStickerId(item.id); moveSticker(event, item.id); }}
                      onPointerMove={(event) => { if (event.buttons === 1) moveSticker(event, item.id); }}
                      style={{ left: `${(item.x ?? 5) * (100 - (item.width || 20)) / 100}%`, top: `${(item.y ?? 5) * (100 - ((item.width || 20) * (16 / 9) * (stickerAspectRatios[item.id] || 1))) / 100}%`, width: `${item.width || 20}%` }} />
                  ))}
                </div>
              ) : (
                <div className="editor-canvas-decoration">
                  <div className="editor-canvas-content">
                    <Film size={32} />
                    <h3>No video available</h3>
                    <p>Generate a video from Create Project first.</p>
                    <button
                      type="button"
                      className="editor-back-button"
                      onClick={() =>
                        navigate("/create-project", {
                          state: {
                            projectId,
                            projectName,
                            description: project.description || "",
                            projectData: project.projectData || project.editorSettings?.projectData || {},
                            editorSettings: project.editorSettings || {},
                          },
                        })
                      }
                    >
                      Open Create Project
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="editor-transport">
              <button
                type="button"
                className="editor-transport-button"
                onClick={togglePlayback}
                disabled={!videoUrl}
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} />}
              </button>

              <span className="editor-time">{formatTime(currentTime)}</span>

              <input
                className="editor-seek"
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seekTo(Number(event.target.value))}
                disabled={!videoUrl || !duration}
                aria-label="Seek video"
              />

              <span className="editor-time">{formatTime(duration)}</span>

              <button
                type="button"
                className="editor-transport-button"
                onClick={() => updateEdit("muted", !edits.muted)}
                disabled={!videoUrl}
                aria-label={edits.muted ? "Unmute video" : "Mute video"}
              >
                {edits.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
            </div>

            <div className="editor-timeline">
              <div className="editor-timeline-heading">
                <div>
                  <span className="editor-section-label">TIMELINE</span>
                  <h2>Your sequence</h2>
                </div>
                <span className="editor-clip-count">
                  {displayClips.length ? `${displayClips.length} generated scene${displayClips.length === 1 ? "" : "s"}` : videoUrl ? "1 generated video" : "0 videos"}
                </span>
              </div>

              <div className="editor-track">
                <span className="editor-track-label">VIDEO</span>
                <div className="editor-track-content">
                  {videoUrl && invalidTimeline ? (
                    <div className="editor-track-empty" role="status">No scene clips remain. Regenerate this script video before exporting.</div>
                  ) : videoUrl && displayClips.length ? displayClips.map((clip, index) => (
                    <div className={`editor-timeline-clip${timelineClips.length && index === timelineIndex ? " editor-timeline-clip-active" : ""}`} key={`${clip.url}-${index}`} title={timelineClips.length ? "This scene is part of the editable script sequence." : "Scene from the voiceover render; narration remains mixed into the video."}>
                      <Film size={16} />
                      <span>{clip.label || `Clip ${index + 1}`}</span>
                      {timelineClips.length > 0 && <>
                        <button type="button" title="Preview this scene" onClick={() => selectTimelineClip(index)}>Preview scene</button>
                        <button type="button" aria-label={`Move ${clip.label || `clip ${index + 1}`} earlier`} title="Move earlier" disabled={index === 0} onClick={() => updateTimeline(index, -1)}>Move earlier ↑</button>
                        <button type="button" aria-label={`Move ${clip.label || `clip ${index + 1}`} later`} title="Move later" disabled={index === timelineClips.length - 1} onClick={() => updateTimeline(index, 1)}>Move later ↓</button>
                        <button type="button" aria-label={`Remove ${clip.label || `clip ${index + 1}`} from sequence`} title="Remove from sequence" disabled={timelineClips.length <= 1} onClick={() => removeTimelineClip(index)}>Remove ×</button>
                      </>}
                    </div>
                  )) : videoUrl ? (
                    <button
                      type="button"
                      className="editor-timeline-clip"
                      onClick={() => seekTo(0)}
                    >
                      <Film size={16} />
                      <span>{projectName}</span>
                      <small>{formatTime(duration)}</small>
                    </button>
                  ) : (
                    <div className="editor-track-empty">
                      Your video will appear here
                    </div>
                  )}
                </div>
              </div>

              <div className="editor-track">
                <span className="editor-track-label">AUDIO</span>
                <div className="editor-track-content editor-audio-track">
                  <Music2 size={15} />
                  <span>
                    Original audio · {edits.muted ? "Muted" : "Enabled"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="editor-footer">
          <button
            type="button"
            className="editor-back-button"
            onClick={goToResult}
          >
            <ArrowLeft size={14} /> Back to Result
          </button>

          <span>
            <Check size={13} /> Editing settings saved for this session
          </span>
        </footer>
      </div>
    </main>
  );
}
