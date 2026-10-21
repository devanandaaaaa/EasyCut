
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const stages = [
  {
    number: "01",
    icon: "✳",
    title: "Understand",
    subtitle: "Interpreting your story",
  },
  {
    number: "02",
    icon: "▧",
    title: "Match",
    subtitle: "Finding the right scenes",
  },
  {
    number: "03",
    icon: "⌘",
    title: "Assemble",
    subtitle: "Building your timeline",
  },
  {
    number: "04",
    icon: "▶",
    title: "Create",
    subtitle: "Preparing your video",
  },
];

function getVideoUrl(outputPath) {
  const filename = String(outputPath || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop();

  if (!filename) {
    throw new Error("The backend returned an invalid video path.");
  }

  const baseURL = (api.defaults.baseURL || "http://127.0.0.1:8000")
    .replace(/\/+$/, "");

  return `${baseURL}/generated/${encodeURIComponent(filename)}`;
}

function getProjectId(project) {
  const id = project?.projectId ?? project?.id ?? project?.project_id;
  return id != null && id !== "" ? Number(id) : null;
}

function getEditorSettings(project) {
  try {
    const value = project?.editorSettings;
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length) return value;
    if (typeof value === "string") {
      const parsed = JSON.parse(value);
      if (parsed && Object.keys(parsed).length) return parsed;
    }
    const id = getProjectId(project);
    const key = id ? `easycut-editor-settings-${id}` : "easycut-editor-settings";
    return JSON.parse(sessionStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}

export default function Generation() {
  const navigate = useNavigate();
  const location = useLocation();
  const started = useRef(false);
  const leftGenerationRef = useRef(false);
  const [pendingProject] = useState(() => {
    try {
      const saved = sessionStorage.getItem("easycut-pending-project");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const projectForNavigation = location.state || pendingProject;

  const [status, setStatus] = useState("starting");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Preparing your project...");
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const project = projectForNavigation;

    async function generate() {
      try {
        if (!project) {
          throw new Error(
            "Project details are missing. Return to Create Project and start again."
          );
        }

        // Preserve the original database project ID throughout generation.
        const projectId = getProjectId(project);

        setStatus("running");
        setActiveStage(0);
        setMessage("Validating your project...");

        let response;

        if (project.inputType === "script") {
          if (!project.script?.trim()) {
            throw new Error("Your script is missing.");
          }

          const sourceVideos = Array.isArray(project.sourceVideos)
            ? project.sourceVideos.filter(Boolean)
            : [];

          if (sourceVideos.length === 0) {
            throw new Error(
              "Upload at least one video before generating."
            );
          }

          setActiveStage(1);
          setMessage(
            "Sending your script and footage to the AI video engine..."
          );

          response = await api.post("/processing/script", {
            script: project.script.trim(),
            project_id: projectId,
            source_videos: sourceVideos,
          });
        } else if (
          project.inputType === "audio" ||
          project.inputType === "record"
        ) {
          let audioFile =
            project.inputType === "audio"
              ? project.audioFile
              : project.recordedAudio;

          const savedVoiceover = project.projectData?.voiceoverFile || project.voiceoverFile;
          if (!audioFile && savedVoiceover?.id && getProjectId(project)) {
            const mediaResponse = await api.get(
              `/auth/projects/${getProjectId(project)}/files/${savedVoiceover.id}/media`,
              { responseType: "blob" }
            );
            audioFile = new File(
              [mediaResponse.data],
              savedVoiceover.name || "saved-voiceover.webm",
              { type: savedVoiceover.type || mediaResponse.data.type || "audio/webm" }
            );
          }

          if (!audioFile) {
            throw new Error(
              "Your audio file is missing. Return to Create Project and select or record it again."
            );
          }

          setActiveStage(1);
          setMessage(
            "Uploading your voiceover and generating your video..."
          );

          const formData = new FormData();
          formData.append("voiceover", audioFile);
          formData.append("project_id", String(projectId));
          const sourceVideos = Array.isArray(project.sourceVideos)
            ? project.sourceVideos.filter(Boolean)
            : [];
          if (sourceVideos.length === 0) {
            throw new Error(
              "Upload and select at least one source video before generating from a voiceover."
            );
          }
          formData.append("source_videos", JSON.stringify(sourceVideos));

          response = await api.post("/processing/voiceover", formData);
        } else {
          throw new Error("Choose a supported generation method.");
        }

        setActiveStage(2);
        setMessage("Checking the generated video...");

        const result = response.data?.result;
        const outputPath = result?.final_video;

        if (
          response.data?.status !== "success" ||
          !outputPath
        ) {
          throw new Error(
            "The backend did not return a successfully generated video."
          );
        }

        const videoUrl = getVideoUrl(outputPath);
        const editorSettings = getEditorSettings(project);
        const projectData = project.projectData || {
          projectName: project.projectName || project.name || "My Video",
          selectedTemplate: project.selectedTemplate || "",
          language: project.language || "English",
          inputType: project.inputType || "script",
          script: project.script || "",
          sourceVideos: project.sourceVideos || [],
          voiceoverFile: project.voiceoverFile || null,
        };
        const templateFilters = {
          "Cinematic Story": "cinematic",
          "Travel Journal": "travel",
          "Daily Vlog": "warm",
          "Short Social": "vivid",
          "Visual Documentary": "monochrome",
          "Product Showcase": "vivid",
        };
        const previewClips = Array.isArray(result.rendered_clips)
          ? result.rendered_clips.map((path, index) => ({
              url: `/generated/${String(path).split(/[\\/]/).pop()}`,
              label: `Scene ${result.selected_clips?.[index]?.scene_number || index + 1}`,
            }))
          : [];
        const timelineClips = project.inputType === "script" ? previewClips : [];
        const savedEditorSettings = {
          ...editorSettings,
          filter: editorSettings.filter ?? templateFilters[project.selectedTemplate] ?? "none",
          projectData,
          timelineClips,
          previewClips,
          timelineEnabled: timelineClips.length > 0,
        };

        const generatedProject = {
          ...project,
          projectId,
          projectName:
            project.projectName || project.name || "My Video",
          selectedTemplate: project.selectedTemplate || "",
          language: project.language || "English",
          result,
          outputPath,
          videoUrl,
          editorSettings: savedEditorSettings,
          projectData,
          finalVideoUrl: "",
          finalExportKey: "",
        };

        // Store the generated result for recovery if navigation state is lost.
        try {
          sessionStorage.setItem(
            "easycut-generated-result",
            JSON.stringify(generatedProject)
          );
        } catch (storageError) {
          console.warn(
            "Could not store generated result in session storage:",
            storageError
          );
        }

        // Keep generated media and settings on the owned draft. Only Final
        // Output's explicit Save action publishes it to the Projects list.
        let saveWarning = "";

        if (projectId) {
          try {
            await api.put(`/auth/projects/${projectId}/draft`, {
              video_url: videoUrl,
              editor_settings: savedEditorSettings,
            });
          } catch (saveError) {
            console.error(
              "Generated video could not be saved to the project:",
              saveError
            );

            saveWarning =
              saveError.response?.data?.detail ||
              "The video was generated, but its draft could not be updated. The local session copy is still available.";
          }
        } else {
          saveWarning =
            "No database project ID was found. The video was generated, but it may not appear in your saved projects until the project is linked.";
        }

        // Only clear the backup after successful generation.
        sessionStorage.removeItem("easycut-pending-project");

        setActiveStage(3);
        setMessage(
          saveWarning
            ? "Video generated. Project saving needs attention."
            : "Video generated successfully."
        );
        setStatus("success");

        if (leftGenerationRef.current) return;

        navigate("/result", {
          replace: true,
          state: {
            ...generatedProject,
            saveWarning,
          },
        });
      } catch (err) {
        if (leftGenerationRef.current) return;
        const detail = err.response?.data?.detail;

        setError(
          typeof detail === "string"
            ? detail
            : err.message || "Video generation failed. Please try again."
        );

        setStatus("error");
        setMessage("Generation could not be completed.");
      }
    }

    generate();
  }, [location.state, navigate, projectForNavigation]);

  function leaveGeneration(path, state) {
    leftGenerationRef.current = true;
    navigate(path, state ? { state } : undefined);
  }

  const isRunning = status === "starting" || status === "running";

  return (
    <main className="generation-page">
      <div className="generation-shell">
        <header className="generation-nav">
          <div className="generation-brand">
            <span className="generation-brand-mark">✳</span>
            <span>
              Easy<span className="generation-brand-accent">Cut</span>
            </span>
          </div>

          <div className="generation-nav-right">
            <span className="generation-pill">
              <span className="generation-dot" />
              CREATIVE STUDIO
            </span>

            <button
              className="generation-back"
              onClick={() => leaveGeneration("/dashboard")}
            >
              ← Dashboard
            </button>
          </div>
        </header>

        <section className="generation-heading">
          <div>
            <div className="generation-eyebrow">
              ✦ YOUR NEXT STORY STARTS HERE
            </div>

            <h1>
              From raw clips
              <br />
              to <span>something cinematic.</span>
            </h1>

            <p>
              EasyCut is processing your project. Keep this page open while
              the backend generates your video.
            </p>
          </div>

          <span className="generation-pill">
            <span className="generation-dot" />
            {status === "success"
              ? "GENERATION COMPLETE"
              : status === "error"
                ? "GENERATION FAILED"
                : isRunning
                  ? "GENERATION IN PROGRESS"
                  : "PREPARING"}
          </span>
        </section>

        <section className="generation-layout">
          <article className="generation-panel">
            <div className="generation-panel-head">
              <div>
                <h2>Your video canvas</h2>
                <p>Generated output will appear on the Result page</p>
              </div>
              <span className="generation-tag">16:9 · LANDSCAPE</span>
            </div>

            <div className="generation-preview">
              <div className="generation-orbit" />
              <div className="generation-orbit-inner" />

              <div className="generation-play">
                {status === "error"
                  ? "!"
                  : status === "success"
                    ? "✓"
                    : "✳"}
              </div>

              <span className="generation-preview-label">
                {status === "error"
                  ? "Generation needs attention"
                  : status === "success"
                    ? "Your video is ready"
                    : "Creating your story"}
              </span>

              <span className="generation-preview-time">
                {isRunning ? "PROCESSING" : status.toUpperCase()}
              </span>
            </div>

            <div className="generation-preview-footer">
              <span>
                <strong>AI Video Engine</strong> · {message}
              </span>
              <span>✦ EasyCut Studio</span>
            </div>
          </article>

          <aside className="generation-panel generation-side">
            <div className="generation-panel-head">
              <div>
                <h2>The creative process</h2>
                <p>Generation status</p>
              </div>
              <span className="generation-tag">01 — 04</span>
            </div>

            <div className="generation-status">
              <div className="generation-status-row">
                <span className="generation-muted">Request status</span>
                <span className="generation-waiting">
                  {status === "error"
                    ? "Failed"
                    : status === "success"
                      ? "Complete"
                      : isRunning
                        ? "Working..."
                        : "Preparing"}
                </span>
              </div>

              <div className="generation-progress">
                <span
                  style={{
                    width:
                      status === "success" || status === "error"
                        ? "100%"
                        : isRunning
                          ? "35%"
                          : "0%",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <p>{message}</p>
            </div>

            <div className="generation-stages">
              {stages.map((stage, index) => {
                const complete =
                  status === "success" ||
                  (status === "running" && index < activeStage);

                const current = isRunning && index === activeStage;

                return (
                  <div
                    className="generation-stage"
                    key={stage.number}
                  >
                    <div className="generation-stage-icon">
                      {complete ? "✓" : current ? "…" : stage.icon}
                    </div>

                    <div className="generation-stage-copy">
                      <h3>{stage.title}</h3>
                      <p>{stage.subtitle}</p>
                    </div>

                    <span className="generation-stage-number">
                      {complete
                        ? "DONE"
                        : current
                          ? "RUNNING"
                          : stage.number}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="generation-summary">
              <div className="generation-summary-label">
                WORKSPACE STATUS
              </div>

              <div className="generation-summary-title">
                {status === "error"
                  ? "Generation needs attention"
                  : status === "success"
                    ? "Your canvas is ready"
                    : "Working on your video"}
              </div>

              <p>
                {status === "error"
                  ? error
                  : status === "success"
                    ? "Your generated video is ready to preview and edit."
                    : "The backend request is running. The current API does not report individual AI-stage progress."}
              </p>
            </div>

            {status === "error" && (
              <button
                className="generation-button generation-button-primary"
                onClick={() => leaveGeneration("/create-project", projectForNavigation)}
              >
                ← Return to project
              </button>
            )}
          </aside>
        </section>

        <footer className="generation-footer">
          <p>
            <span className="generation-footer-accent">✦ </span>
            Your workflow, your story, your final cut.
            <br />
            <span className="generation-muted">
              {status === "error"
                ? "Read the error above, correct the issue, and try again."
                : status === "success"
                  ? "Opening your generated video..."
                  : "Generation stays here until the backend responds."}
            </span>
          </p>

          <div className="generation-actions">
            <button
              className="generation-button"
              onClick={() => leaveGeneration("/create-project", projectForNavigation)}
            >
              ← Back to project
            </button>

            <button
              className="generation-button generation-button-primary"
              onClick={() => leaveGeneration("/dashboard")}
            >
              Dashboard ↗
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
