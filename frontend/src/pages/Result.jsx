
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Film,
  AlertCircle,
} from "lucide-react";

const STORAGE_KEY = "easycut-generated-result";

function readSavedProject() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function Result() {
  const location = useLocation();
  return <ResultPage key={location.key} routeProject={location.state || {}} />;
}

function ResultPage({ routeProject }) {
  const navigate = useNavigate();

  const [project] = useState(() => {
    const savedProject = readSavedProject();

    return {
      ...savedProject,
      ...routeProject,
      videoUrl: routeProject.videoUrl || savedProject.videoUrl || "",
    };
  });

  const videoUrl = project.videoUrl || "";
  const projectName = project.projectName || "My EasyCut project";

  useEffect(() => {
    if (routeProject.videoUrl) {
      const updatedProject = {
        ...readSavedProject(),
        ...routeProject,
      };

      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedProject)
        );
      } catch (error) {
        console.error("Could not save generated project:", error);
      }
    }
  }, [routeProject]);

  function downloadVideo() {
    if (!videoUrl) {
      alert("No generated video is available to download.");
      return;
    }

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = "easycut-video.mp4";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function openEditor() {
    if (!videoUrl) {
      alert("Generate a video before opening the editor.");
      return;
    }

    const id = project.projectId ?? project.id ?? project.project_id;
    navigate(id ? `/editor/${id}` : "/editor", {
      state: project,
    });
  }

  return (
    <main className="result-page">
      <div className="result-shell">
        <header className="result-nav">
          <button
            type="button"
            className="result-back"
            onClick={() => navigate("/create-project", { state: { startNew: true } })}
          >
            <ArrowLeft size={16} /> New project
          </button>

          <div className="result-brand">
            ✳ Easy<span>Cut</span>
          </div>

          <span className="result-status">
            {videoUrl ? "Video ready" : "Video unavailable"}
          </span>
        </header>

        <section className="result-heading">
          <div className="result-eyebrow">✦ YOUR STORY, CREATED</div>

          <h1>
            Your video is
            <br />
            <span>ready to watch.</span>
          </h1>

          <p>
            Preview your generated video and continue to the editing
            workspace when you're ready.
          </p>
        </section>

        <section className="result-layout">
          <article className="result-panel">
            <div className="result-panel-heading">
              <div>
                <div className="result-eyebrow">VIDEO PREVIEW</div>
                <h2>Your finished video</h2>
              </div>

              <span className="result-status">
                {videoUrl ? "Generated" : "Awaiting video"}
              </span>
            </div>

            <div className="result-video-frame">
              {videoUrl ? (
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "520px",
                    objectFit: "contain",
                    background: "#17151d",
                    borderRadius: "12px",
                  }}
                  onError={() => {
                    console.error(
                      "Could not load generated video:",
                      videoUrl
                    );
                  }}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="result-video-placeholder">
                  <div className="result-play">▶</div>
                  <h3>No generated video was passed to Result</h3>
                  <p>
                    Return to Create Project and generate a video again.
                    The generated video URL must be passed from Generation.
                  </p>
                </div>
              )}
            </div>

            <div className="result-video-footer">
              <div>
                <div className="result-eyebrow">PROJECT</div>
                <strong>{projectName}</strong>
              </div>

              <span>MP4 · Video</span>
            </div>
          </article>

          <aside className="result-panel result-summary">
            <div className="result-eyebrow">PROJECT SUMMARY</div>

            <h2>
              {videoUrl
                ? "Made for your story."
                : "Video not available yet."}
            </h2>

            <p>
              {videoUrl
                ? "Your generated video is available to preview. Download it or continue to the editor."
                : "The page did not receive a generated video URL. Check the Generation page and its navigation state."}
            </p>

            <div className="result-summary-row">
              <span>Output format</span>
              <strong>MP4</strong>
            </div>

            <div className="result-summary-row">
              <span>Editing</span>
              <strong>
                {videoUrl ? "Available next" : "Waiting for video"}
              </strong>
            </div>

            <div className="result-summary-row">
              <span>Video status</span>
              <strong>
                {videoUrl ? "Connected" : "Not connected"}
              </strong>
            </div>

            {!videoUrl && (
              <div role="alert" style={{ marginTop: 16 }}>
                <AlertCircle size={18} />
                {" "}No video URL was received. Check Generation's result.final_video handling.
              </div>
            )}

            <button
              type="button"
              className="result-primary-button"
              onClick={downloadVideo}
              disabled={!videoUrl}
              style={{ opacity: videoUrl ? 1 : 0.55 }}
            >
              <Download size={16} /> Download Video
            </button>

            <button
              type="button"
              className="result-secondary-button"
              onClick={openEditor}
              disabled={!videoUrl}
              style={{ opacity: videoUrl ? 1 : 0.55 }}
            >
              <Film size={16} /> Edit Your Video{" "}
              <ArrowRight size={16} />
            </button>
          </aside>
        </section>

        <footer className="result-footer">
          <button
            type="button"
            className="result-back"
            onClick={() =>
              navigate("/generation", {
                state: project,
              })
            }
          >
            <ArrowLeft size={16} /> Back to Generation
          </button>

          <span>Created with EasyCut</span>
        </footer>
      </div>
    </main>
  );
}
