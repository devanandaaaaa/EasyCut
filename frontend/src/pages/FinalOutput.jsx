
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Film,
  FolderOpen,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";
import api from "../services/api";
import { normalizeSingleTextSettings } from "../editor/editorValidation.js";

const STORAGE_KEY = "easycut-generated-result";
const EDITS_KEY = "easycut-editor-settings";
const API_BASE = "http://127.0.0.1:8000";
const EXPORT_TIMEOUT_MS = 120000;

function getProjectId(project = {}) {
  return project.projectId ?? project.id ?? project.project_id ?? null;
}

function projectStorageKey(project) {
  const id = getProjectId(project);
  return id ? `${STORAGE_KEY}-${id}` : STORAGE_KEY;
}

function settingsStorageKey(project) {
  const id = getProjectId(project);
  return id ? `${EDITS_KEY}-${id}` : EDITS_KEY;
}

function readSessionJSON(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function saveProject(project) {
  try {
    sessionStorage.setItem(projectStorageKey(project), JSON.stringify(project));
    if (!getProjectId(project)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    }
  } catch (error) {
    console.error("Could not save project:", error);
  }
}

function normalizeSettings(settings = {}) {
  const textSettings = normalizeSingleTextSettings(settings);
  return {
    trimStart: Math.max(0, Number(settings.trimStart) || 0),
    trimEnd: Math.max(0, Number(settings.trimEnd) || 0),
    overlayText: textSettings.overlayText,
    textPosition: ["top", "center", "bottom"].includes(
      textSettings.textPosition
    )
      ? textSettings.textPosition
      : "bottom",
    textColor: /^#[0-9a-f]{6}$/i.test(textSettings.textColor || "")
      ? textSettings.textColor
      : "#ffffff",
    textSize: textSettings.textSize,
    textStart: textSettings.textStart,
    textEnd: textSettings.textEnd,
    filterStart: Math.max(0, Number(settings.filterStart) || 0),
    filterEnd: Math.max(0, Number(settings.filterEnd) || 0),
    stickerData: typeof settings.stickerData === "string" ? settings.stickerData : "",
    stickerX: Math.min(95, Math.max(0, Number(settings.stickerX) || 0)),
    stickerY: Math.min(95, Math.max(0, Number(settings.stickerY) || 0)),
    stickerWidth: Math.min(60, Math.max(5, Number(settings.stickerWidth) || 20)),
    stickerStart: Math.max(0, Number(settings.stickerStart) || 0),
    stickerEnd: Math.max(0, Number(settings.stickerEnd) || 0),
    stickerOverlays: Array.isArray(settings.stickerOverlays)
      ? settings.stickerOverlays.filter((item) => typeof item?.data === "string" && item.data.startsWith("data:image/png;base64,")).slice(0, 12).map((item, index) => ({
          id: item.id || `sticker-${index}`,
          data: item.data,
          name: String(item.name || "Sticker").slice(0, 80),
          x: Math.min(95, Math.max(0, Number(item.x) || 0)),
          y: Math.min(95, Math.max(0, Number(item.y) || 0)),
          width: Math.min(60, Math.max(5, Number(item.width) || 20)),
          start: Math.max(0, Number(item.start) || 0),
          end: Math.max(0, Number(item.end) || 0),
        }))
      : settings.stickerData
        ? [{ id: "legacy-sticker-overlay", data: settings.stickerData, name: settings.stickerName || "Sticker", x: Number(settings.stickerX) || 0, y: Number(settings.stickerY) || 0, width: Number(settings.stickerWidth) || 20, start: Number(settings.stickerStart) || 0, end: Number(settings.stickerEnd) || 0 }]
        : [],
    timelineClips: Array.isArray(settings.timelineClips) ? settings.timelineClips.filter((clip) => typeof clip?.url === "string") : [],
    previewClips: Array.isArray(settings.previewClips) ? settings.previewClips.filter((clip) => typeof clip?.url === "string") : [],
    timelineEnabled: Boolean(settings.timelineEnabled),
    playbackSpeed: Number(settings.playbackSpeed) || 1,
    volume: Math.min(
      100,
      Math.max(0, Number(settings.volume ?? 100))
    ),
    muted: Boolean(settings.muted),
    filter: ["none", "cinematic", "travel", "warm", "monochrome", "vivid"].includes(settings.filter)
      ? settings.filter
      : "none",
  };
}

function makeExportKey(sourceUrl, settings) {
  return JSON.stringify({
    sourceUrl,
    ...normalizeSettings(settings),
  });
}

function resolveVideoUrl(url) {
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getApiVideoReference(url) {
  return url;
}

export default function FinalOutput() {
  const location = useLocation();
  return <FinalOutputPage key={location.key} routeProject={location.state || {}} />;
}

function FinalOutputPage({ routeProject }) {
  const navigate = useNavigate();

  const [project, setProject] = useState(() => {
    const route = routeProject;
    const saved = readSessionJSON(projectStorageKey(route));
    const savedEditorSettings = {
      ...readSessionJSON(settingsStorageKey(route)),
      ...(saved.editorSettings || {}),
      ...(route.editorSettings || {}),
    };

    return {
      ...saved,
      ...route,
      videoUrl: route.videoUrl || saved.videoUrl || "",
      editorSettings: savedEditorSettings,
    };
  });

  const [exportStatus, setExportStatus] = useState("idle");
  const [exportError, setExportError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [saveLimitReached, setSaveLimitReached] = useState(false);

  const inFlightKeyRef = useRef(null);

  const projectName = project.projectName || project.name || "My EasyCut project";
  const sourceVideoUrl = project.videoUrl || "";

  const editorSettings = useMemo(() => normalizeSettings({
      ...readSessionJSON(settingsStorageKey(project)),
      ...(project.editorSettings || {}),
    }), [project]);

  const settingsKey = JSON.stringify(editorSettings);

  const exportKey = sourceVideoUrl
    ? makeExportKey(sourceVideoUrl, editorSettings)
    : "";
  const invalidTimeline = editorSettings.timelineEnabled && editorSettings.timelineClips.length === 0;
  const effectiveExportStatus = invalidTimeline
    ? "error"
    : project.finalVideoUrl && project.finalExportKey === exportKey
    ? "success"
    : exportStatus;
  const effectiveExportError = invalidTimeline
    ? "This project has no scene clips left to export. Return to the Editor or regenerate the video."
    : exportError;

  const videoUrl = resolveVideoUrl(
    project.finalVideoUrl || project.videoUrl || ""
  );

  const isExporting = effectiveExportStatus === "exporting";

  // Export the edited video.
  useEffect(() => {
    if (!sourceVideoUrl || invalidTimeline) return;

    if (
      project.finalVideoUrl &&
      project.finalExportKey === exportKey
    ) {
      return;
    }

    if (inFlightKeyRef.current === exportKey) {
      return;
    }

    let disposed = false;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, EXPORT_TIMEOUT_MS);

    async function exportEditedVideo() {
      inFlightKeyRef.current = exportKey;
      setExportStatus("exporting");
      setExportError("");

      try {
        const projectId = getProjectId(project);
        if (!projectId) {
          throw new Error("This output is not linked to an owned project.");
        }
        const response = await api.post(
          "/processing/edit-video",
          {
              project_id: projectId,
              video_url: getApiVideoReference(sourceVideoUrl),
              trim_start: editorSettings.trimStart,
              trim_end: editorSettings.trimEnd,
              overlay_text: editorSettings.overlayText,
              text_position: editorSettings.textPosition,
              text_color: editorSettings.textColor,
              text_size: editorSettings.textSize,
              text_start: editorSettings.textStart,
              text_end: editorSettings.textEnd,
              filter_start: editorSettings.filterStart,
              filter_end: editorSettings.filterEnd,
              sticker_data: editorSettings.stickerData,
              sticker_x: editorSettings.stickerX,
              sticker_y: editorSettings.stickerY,
              sticker_width: editorSettings.stickerWidth,
              sticker_start: editorSettings.stickerStart,
              sticker_end: editorSettings.stickerEnd,
              sticker_overlays: editorSettings.stickerOverlays,
              timeline_clips: editorSettings.timelineClips.map((clip) => clip.url.split("/").pop()),
              timeline_enabled: editorSettings.timelineEnabled,
              playback_speed: editorSettings.playbackSpeed,
              volume: editorSettings.volume,
              muted: editorSettings.muted,
              preset_filter: editorSettings.filter,
          },
          { signal: controller.signal, timeout: EXPORT_TIMEOUT_MS },
        );
        const data = response.data;

        if (!data.video_url) {
          throw new Error(
            "The backend finished without returning a video URL."
          );
        }

        if (disposed) return;

        const finalVideoUrl = resolveVideoUrl(data.video_url);

        const updatedProject = {
          ...readSessionJSON(projectStorageKey(project)),
          ...project,
          videoUrl: sourceVideoUrl,
          finalVideoUrl,
          finalExportKey: exportKey,
          editorSettings,
        };

        saveProject(updatedProject);
        setProject(updatedProject);
        setExportStatus("success");
        setExportError("");
      } catch (error) {
        if (disposed) return;

        console.error("Final video export failed:", error);

        if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
          setExportError(
            "Export took longer than 2 minutes or the request timed out. Check the backend terminal before retrying."
          );
        } else {
          setExportError(
            error.response?.data?.detail || error.message ||
              "Could not export the edited video. Check the backend terminal."
          );
        }

        setExportStatus("error");
      } finally {
        window.clearTimeout(timeoutId);

        if (inFlightKeyRef.current === exportKey) {
          inFlightKeyRef.current = null;
        }
      }
    }

    exportEditedVideo();

    return () => {
      disposed = true;
      controller.abort();
      window.clearTimeout(timeoutId);

      if (inFlightKeyRef.current === exportKey) {
        inFlightKeyRef.current = null;
      }
    };
  }, [
    sourceVideoUrl,
    invalidTimeline,
    settingsKey,
    exportKey,
    project,
    editorSettings,
    retryCount,
  ]);

  // Save the project to the authenticated user's database.
  async function saveProjectToDatabase() {
    const projectId =
      project.projectId ?? project.id ?? project.project_id;

    if (!projectId) {
      setSaveStatus("error");
      setSaveError(
        "This project has no project ID. Start from Create Project so EasyCut can associate the video with a saved project."
      );
      return;
    }

    if (!sourceVideoUrl) {
      setSaveStatus("error");
      setSaveError("There is no generated source video to save.");
      return;
    }

    setSaveStatus("saving");
    setSaveError("");
    setSaveLimitReached(false);

    try {
      const persistedSettings = {
        ...editorSettings,
        ...(project.projectData ? { projectData: project.projectData } : {}),
      };
      const response = await api.put(
        `/auth/projects/${projectId}/save`,
        {
          video_url: sourceVideoUrl,
          final_video_url: project.finalVideoUrl || null,
          editor_settings: persistedSettings,
        }
      );

      const updatedProject = {
        ...project,
        projectId: Number(projectId),
        videoUrl: sourceVideoUrl,
        finalVideoUrl: project.finalVideoUrl || "",
        editorSettings: persistedSettings,
        savedToDatabase: true,
      };

      saveProject(updatedProject);
      setProject(updatedProject);
      setSaveStatus("success");

      console.log("Project saved:", response.data);
    } catch (error) {
      console.error("Could not save project:", error);

      const detail =
        error.response?.data?.detail ||
        error.message ||
        "Could not save the project. Check that you are logged in and the backend is running.";

      setSaveError(String(detail));
      setSaveLimitReached(error.response?.status === 403);
      setSaveStatus("error");
    }
  }

  function downloadVideo() {
    if (!videoUrl || isExporting || effectiveExportStatus === "error") {
      return;
    }

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "easycut-final-video.mp4";
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function retryExport() {
    if (!sourceVideoUrl) {
      setExportError("No source video was found. Return to Result first.");
      setExportStatus("error");
      return;
    }

    const updatedProject = {
      ...project,
      finalVideoUrl: "",
      finalExportKey: "",
    };

    saveProject(updatedProject);
    setProject(updatedProject);
    setExportError("");
    setExportStatus("idle");
    setRetryCount((count) => count + 1);
  }

  function returnToEditor() {
    const id = project.projectId ?? project.id ?? project.project_id;
    navigate(id ? `/editor/${id}` : "/editor", {
      state: {
        ...project,
        projectId: id,
        videoUrl: sourceVideoUrl || project.finalVideoUrl || "",
        finalVideoUrl: project.finalVideoUrl || "",
        editorSettings,
      },
    });
  }

  const statusText = isExporting
    ? "Exporting edits…"
    : effectiveExportStatus === "error"
      ? "Export failed"
      : effectiveExportStatus === "success"
        ? "Edited video ready"
        : videoUrl
          ? "Video ready"
          : "Video unavailable";

  return (
    <main className="final-output-page">
      <div className="final-output-shell">
        <header className="final-output-nav">
          <button
            type="button"
            className="final-output-brand"
            onClick={() => navigate("/dashboard")}
          >
            <span className="final-output-brand-icon">E</span>
            EasyCut
          </button>

          <button
            type="button"
            className="final-output-secondary"
            onClick={() => navigate("/dashboard")}
          >
            <FolderOpen size={15} />
            Back to Dashboard
          </button>
        </header>

        <section className="final-output-heading">
          <span className="final-output-eyebrow">FINAL DELIVERY</span>

          <h1>
            {isExporting ? (
              <>
                Creating your
                <br />
                <span>final video.</span>
              </>
            ) : effectiveExportStatus === "error" ? (
              <>
                Export needs
                <br />
                <span>attention.</span>
              </>
            ) : videoUrl ? (
              <>
                Your video is
                <br />
                <span>ready to go.</span>
              </>
            ) : (
              "Your final creation."
            )}
          </h1>

          <p>
            {isExporting
              ? "EasyCut is applying your trim, text, speed, and audio settings."
              : effectiveExportStatus === "error"
                ? "The edited video could not be exported. Review the error below."
                : videoUrl
                  ? "Preview and download your final exported video."
                  : "No generated video was found. Return to Result to load your video."}
          </p>
        </section>

        <section className="final-output-layout">
          <article className="final-output-preview-panel">
            <div className="final-output-panel-heading">
              <div>
                <span className="final-output-label">FINAL VIDEO</span>
                <h2>{projectName}</h2>
              </div>

              <span className="final-output-status">
                {isExporting ? (
                  <>
                    <LoaderCircle size={14} />
                    Exporting
                  </>
                ) : effectiveExportStatus === "error" ? (
                  <>
                    <AlertCircle size={14} />
                    Export failed
                  </>
                ) : videoUrl ? (
                  <>
                    <CheckCircle2 size={14} />
                    {statusText}
                  </>
                ) : (
                  "Video unavailable"
                )}
              </span>
            </div>

            <div className="final-output-video">
              {isExporting ? (
                <div className="final-output-placeholder">
                  <span className="final-output-play">
                    <LoaderCircle size={25} />
                  </span>
                  <h3>Rendering your edits</h3>
                  <p>
                    Your video is being processed. If it takes longer than
                    two minutes, the page will report a timeout.
                  </p>
                </div>
              ) : effectiveExportStatus === "error" ? (
                <div className="final-output-placeholder">
                  <span className="final-output-play">
                    <AlertCircle size={25} />
                  </span>
                  <h3>Couldn't export your video</h3>
                  <p>{effectiveExportError}</p>

                  {!invalidTimeline && <button
                    type="button"
                    className="final-output-primary"
                    onClick={retryExport}
                  >
                    Try Export Again <ArrowRight size={15} />
                  </button>}
                </div>
              ) : videoUrl ? (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="final-output-player"
                  onError={() => {
                    console.error("Could not load final video:", videoUrl);
                  }}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="final-output-placeholder">
                  <span className="final-output-play">
                    <Film size={25} />
                  </span>
                  <h3>Your video isn't available here yet</h3>
                  <p>
                    Open your generated result to restore the video and
                    continue.
                  </p>

                  <button
                    type="button"
                    className="final-output-primary"
                    onClick={() => navigate("/result", { state: project })}
                  >
                    Return to Result <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="final-output-file-info">
              <div>
                <span className="final-output-label">PROJECT</span>
                <strong>{projectName}</strong>
              </div>
              <div>
                <span className="final-output-label">FORMAT</span>
                <strong>MP4</strong>
              </div>
            </div>
          </article>

          <aside className="final-output-details">
            <span className="final-output-label">EXPORT SUMMARY</span>
            <h2>Your video, your way.</h2>

            <p className="final-output-description">
              {effectiveExportStatus === "success"
                ? "Your editor settings have been applied to the exported MP4."
                : "Preview your generated video or export your editor settings."}
            </p>

            <div className="final-output-detail-row">
              <span>Video status</span>
              <strong>{statusText}</strong>
            </div>

            <div className="final-output-detail-row">
              <span>File format</span>
              <strong>MP4 video</strong>
            </div>

            <div className="final-output-detail-row">
              <span>Project</span>
              <strong>{projectName}</strong>
            </div>

            <div className="final-output-actions">
              <button
                type="button"
                className="final-output-primary"
                onClick={downloadVideo}
                disabled={
                  !videoUrl ||
                  isExporting ||
                  effectiveExportStatus === "error"
                }
              >
                <Download size={16} />
                Download Final Video
              </button>

              <button
                type="button"
                className="final-output-primary"
                onClick={saveProjectToDatabase}
                disabled={
                  isExporting ||
                  saveStatus === "saving" ||
                  !sourceVideoUrl
                }
              >
                {saveStatus === "saving"
                  ? "Saving Project…"
                  : saveStatus === "success"
                    ? "Project Saved"
                    : "Save Project"}
              </button>

              <button
                type="button"
                className="final-output-secondary final-output-edit"
                onClick={returnToEditor}
              >
                <ArrowLeft size={15} />
                Return to Editor
              </button>
            </div>

            {saveStatus === "success" && (
              <p className="final-output-note">
                Project saved successfully. You can reopen it from Projects.
              </p>
            )}

            {saveStatus === "error" && (
              <div className="final-output-note" role="alert">
                <p>{saveError}</p>
                {saveLimitReached && (
                  <button type="button" className="final-output-secondary" onClick={() => navigate("/subscription")}>
                    View Premium plans <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            <p className="final-output-note">
              {effectiveExportStatus === "success"
                ? "This is the rendered MP4 with your saved editor settings."
                : effectiveExportStatus === "error"
                  ? "Check the error message and backend terminal before retrying."
                  : isExporting
                    ? "Export is in progress. The page will show an error if the request times out."
                    : "Your original generated video remains unchanged."}
            </p>
          </aside>
        </section>

        <footer className="final-output-footer">
          <button
            type="button"
            className="final-output-secondary"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </button>
          <span>Made with EasyCut</span>
        </footer>
      </div>
    </main>
  );
}
