import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FolderOpen,
  Video,
  Music,
  Play,
  Sparkles,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

import api from "../services/api";

function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [mediaUrls, setMediaUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [error, setError] = useState("");
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");

  useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        setError("");

        const [projectResponse, filesResponse] = await Promise.all([
          api.get(`/auth/projects/${projectId}`),
          api.get(`/auth/projects/${projectId}/files`),
        ]);

        setProject(projectResponse.data);
        setFiles(filesResponse.data);
      } catch (err) {
        console.error("Could not load project:", err);

        if (err.response?.status === 401) {
          localStorage.removeItem("easycut-token");
          navigate("/login");
          return;
        }

        setError(
          err.response?.data?.detail ||
            "Could not load this project."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, navigate]);

  useEffect(() => {
    const loadMedia = async () => {
      if (!files.length) {
        setMediaLoading(false);
        return;
      }

      try {
        setMediaLoading(true);

        const urls = {};

        for (const file of files) {
          try {
            const response = await api.get(
              `/auth/projects/${projectId}/files/${file.id}/media`,
              {
                responseType: "blob",
              }
            );

            urls[file.id] = URL.createObjectURL(response.data);
          } catch (err) {
            console.error(
              `Could not load media file ${file.id}:`,
              err
            );
          }
        }

        setMediaUrls(urls);
      } finally {
        setMediaLoading(false);
      }
    };

    loadMedia();

    return () => {
      Object.values(mediaUrls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [files, projectId]);

  const isAudioFile = (file) => {
    return (
      file.file_type?.startsWith("audio/") ||
      /\.(mp3|wav|m4a|webm)$/i.test(file.original_name || "")
    );
  };

  const isVideoFile = (file) => {
    return (
      file.file_type?.startsWith("video/") ||
      /\.(mp4|mov|avi|webm)$/i.test(file.original_name || "")
    );
  };

  const videoFiles = files.filter(isVideoFile);
  const audioFiles = files.filter(isAudioFile);

  const handleGenerateVideo = async () => {
    if (!videoFiles.length) {
      setGenerationMessage(
        "Please upload at least one video clip before generating."
      );
      return;
    }

    try {
      setGenerationLoading(true);
      setGenerationMessage("");

      const sourceVideo = videoFiles[0].stored_path;

      const response = await api.post("/processing/script", {
        script:
          project?.description ||
          "Create a video from the uploaded footage.",
        source_video: sourceVideo,
      });

      setGenerationMessage(
        response.data?.result
          ? "AI video generation completed successfully."
          : "AI video generation completed."
      );
    } catch (err) {
      console.error("Video generation failed:", err);

      const detail = err.response?.data?.detail;

      if (err.response?.status === 429) {
        setGenerationMessage(
          "Gemini API quota is currently exhausted. Please try again after the quota resets."
        );
      } else {
        setGenerationMessage(
          detail || "Video generation failed. Please try again."
        );
      }
    } finally {
      setGenerationLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="project-details-page">
        <div className="project-details-content">
          <div className="project-media-empty">
            <LoaderCircle size={28} className="spin" />

            <h3>Loading project...</h3>

            <p>
              EasyCut is loading your project and uploaded media.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="project-details-page">
        <div className="project-details-content">
          <Link
            to="/dashboard"
            className="back-button"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>

          <div className="project-media-empty">
            <AlertCircle size={28} />

            <h3>Could not load project</h3>

            <p>{error}</p>

            <Link
              to="/dashboard"
              className="primary-action"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="project-details-page">

      {/* Header */}
      <header className="create-project-header">
        <div>
          <Link
            to="/dashboard"
            className="back-button"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </Link>
        </div>

        <Link
          to="/dashboard"
          className="create-project-brand"
        >
          <span className="create-project-brand-icon">
            <Sparkles size={18} />
          </span>

          EasyCut
        </Link>

        <div className="create-project-step">
          Project #{project?.id}
        </div>
      </header>

      <section className="project-details-content">

        {/* Project heading */}
        <div className="project-details-heading">
          <p className="project-details-eyebrow">
            Your project
          </p>

          <h1>
            {project?.name || "Untitled Project"}
          </h1>

          <p className="project-details-description">
            {project?.description ||
              "Create an AI-powered video from your uploaded media."}
          </p>
        </div>

        {/* Project info */}
        <div className="project-info-card">
          <div className="project-info-icon">
            <FolderOpen size={23} />
          </div>

          <div>
            <h2>Project #{project?.id}</h2>

            <p>
              Your project has been successfully loaded
              from the EasyCut backend.
            </p>
          </div>
        </div>

        {/* Uploaded Media */}
        <section className="project-media-section">

          <div className="project-media-heading">
            <h2>Uploaded Media</h2>

            <p>
              Your voiceover and video clips uploaded to
              this project.
            </p>
          </div>

          {mediaLoading ? (
            <div className="project-media-empty">
              <LoaderCircle
                size={28}
                className="spin"
              />

              <h3>
                Loading your media...
              </h3>

              <p>
                Preparing your uploaded videos and audio.
              </p>
            </div>
          ) : files.length === 0 ? (
            <div className="project-media-empty">

              <div className="project-media-empty-icon">
                <FolderOpen size={25} />
              </div>

              <h3>
                No media uploaded
              </h3>

              <p>
                Upload a voiceover or video clips to start
                creating your AI video.
              </p>
            </div>
          ) : (
            <>
              {/* ================================
                  VIDEO CLIPS
              ================================= */}

              {videoFiles.length > 0 && (
                <section className="project-media-subsection">

                  <div className="project-media-subheading">
                    <div>
                      <div className="project-media-subheading-icon">
                        <Video size={19} />
                      </div>

                      <div>
                        <h3>Video Clips</h3>
                        <p>
                          Video footage available for AI
                          semantic matching.
                        </p>
                      </div>
                    </div>

                    <span>
                      {videoFiles.length}{" "}
                      {videoFiles.length === 1
                        ? "clip"
                        : "clips"}
                    </span>
                  </div>

                  <div className="project-media-grid">
                    {videoFiles.map((file) => {
                      const mediaUrl = mediaUrls[file.id];

                      return (
                        <article
                          className="project-media-card"
                          key={file.id}
                        >
                          {/* Video preview */}
                          {mediaUrl && (
                            <div className="project-media-preview">
                              <video
                                src={mediaUrl}
                                controls
                                preload="metadata"
                              />
                            </div>
                          )}

                          {/* File information */}
                          <div className="project-media-info">

                            <div className="project-media-top">

                              <div className="project-media-icon">
                                <Video size={19} />
                              </div>

                              <div className="project-media-text">

                                <h3
                                  title={file.original_name}
                                >
                                  {file.original_name}
                                </h3>

                                <p>
                                  Video clip
                                </p>

                                <div className="project-media-file">
                                  File #{file.id}
                                </div>

                              </div>

                            </div>

                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ================================
                  VOICEOVER
              ================================= */}

              {audioFiles.length > 0 && (
                <section className="project-media-subsection project-voiceover-section">

                  <div className="project-media-subheading">
                    <div>
                      <div className="project-media-subheading-icon">
                        <Music size={19} />
                      </div>

                      <div>
                        <h3>Voiceover</h3>
                        <p>
                          Audio that will be used as the
                          narration for your generated video.
                        </p>
                      </div>
                    </div>

                    <span>
                      {audioFiles.length}{" "}
                      {audioFiles.length === 1
                        ? "file"
                        : "files"}
                    </span>
                  </div>

                  <div className="project-voiceover-list">
                    {audioFiles.map((file) => {
                      const mediaUrl = mediaUrls[file.id];

                      return (
                        <article
                          className="project-voiceover-card"
                          key={file.id}
                        >

                          <div className="project-voiceover-icon">
                            <Music size={24} />
                          </div>

                          <div className="project-voiceover-details">

                            <h3
                              title={file.original_name}
                            >
                              {file.original_name}
                            </h3>

                            <p>
                              Voiceover / Audio
                            </p>

                            <span>
                              File #{file.id}
                            </span>

                          </div>

                          <div className="project-voiceover-player">
                            {mediaUrl ? (
                              <audio
                                src={mediaUrl}
                                controls
                                preload="metadata"
                              />
                            ) : (
                              <p>
                                Audio preview unavailable.
                              </p>
                            )}
                          </div>

                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* No video but audio exists */}
              {videoFiles.length === 0 &&
                audioFiles.length > 0 && (
                  <div className="project-media-empty">
                    <Video size={25} />

                    <h3>
                      No video clips uploaded
                    </h3>

                    <p>
                      Upload video clips so EasyCut can
                      match them with your voiceover.
                    </p>
                  </div>
                )}
            </>
          )}
        </section>

        {/* AI Generation */}
        <section className="project-ai-section">

          <div className="project-ai-icon">
            <Sparkles size={22} />
          </div>

          <div className="project-ai-content">

            <h2>
              AI Video Generation
            </h2>

            <p>
              EasyCut will analyze your story and find
              the most relevant scenes from your uploaded
              video footage.
            </p>

            {generationMessage && (
              <p
                style={{
                  marginTop: "10px",
                  color:
                    generationMessage.includes("successfully")
                      ? "var(--ec-success)"
                      : "var(--ec-danger)",
                }}
              >
                {generationMessage}
              </p>
            )}

          </div>

          <button
            type="button"
            className="project-ai-button"
            onClick={handleGenerateVideo}
            disabled={
              generationLoading ||
              videoFiles.length === 0
            }
          >
            {generationLoading ? (
              <>
                <LoaderCircle
                  size={17}
                  className="spin"
                />
                Generating...
              </>
            ) : (
              <>
                <Play size={17} />
                Generate Video
              </>
            )}
          </button>

        </section>

      </section>
    </main>
  );
}

export default ProjectDetails;