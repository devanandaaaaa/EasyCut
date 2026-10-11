import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  FileAudio,
  FileText,
  Mic,
  Play,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";

import {
  createProject,
  uploadProjectFile,
} from "../services/api";

function CreateProject() {
  const navigate = useNavigate();

  const [sourceType, setSourceType] = useState("script");
  const [language, setLanguage] = useState("English");

  const [projectName, setProjectName] = useState("");
  const [script, setScript] = useState("");

  const [audioFile, setAudioFile] = useState(null);
  const [videoFiles, setVideoFiles] = useState([]);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError("Please enter a project name.");
      return;
    }

    if (sourceType === "script" && !script.trim()) {
      setError("Please enter your script.");
      return;
    }

    if (sourceType === "audio" && !audioFile) {
      setError("Please upload a voiceover file.");
      return;
    }

    if (videoFiles.length === 0) {
      setError("Please upload at least one video clip.");
      return;
    }

    setError("");
    setCreating(true);

    try {
      const project = await createProject({
        name: projectName.trim(),
        description:
          sourceType === "script"
            ? script.trim()
            : `${sourceType} project - ${language}`,
      });

      if (audioFile) {
        await uploadProjectFile(project.id, audioFile);
      }

      for (const videoFile of videoFiles) {
        await uploadProjectFile(project.id, videoFile);
      }

      alert(
        `Project "${project.name}" created and all selected files uploaded successfully.`
      );

      navigate("/dashboard");
    } catch (error) {
      console.error(
        "Project creation/upload failed:",
        error
      );

      const message =
        error.response?.data?.detail ||
        "Could not create the project or upload the selected files.";

      setError(
        Array.isArray(message)
          ? message.map((item) => item.msg).join(", ")
          : message
      );
    } finally {
      setCreating(false);
    }
  };

  const handleVideoSelection = (event) => {
    setVideoFiles(
      Array.from(event.target.files || [])
    );
    setError("");
  };

  return (
    <main className="create-project-page">

      {/* =========================================
          TOP BAR
      ========================================= */}

      <header className="create-project-header">

        <Link
          to="/dashboard"
          className="create-project-back"
        >
          <ArrowLeft size={17} />
          Dashboard
        </Link>

        <Link
          to="/dashboard"
          className="create-project-brand"
        >
          <span className="create-project-brand-icon">
            <Sparkles size={16} />
          </span>

          EasyCut
        </Link>

        <div className="create-project-header-spacer" />

      </header>


      {/* =========================================
          MAIN
      ========================================= */}

      <section className="create-project-content">

        {/* Progress */}
        <div className="creation-progress">

          <div className="creation-step active">
            <span>1</span>
            <small>Input</small>
          </div>

          <div className="creation-line" />

          <div className="creation-step">
            <span>2</span>
            <small>Clips</small>
          </div>

          <div className="creation-line" />

          <div className="creation-step">
            <span>3</span>
            <small>Style</small>
          </div>

          <div className="creation-line" />

          <div className="creation-step">
            <span>4</span>
            <small>Generate</small>
          </div>

        </div>


        {/* Heading */}
        <div className="create-project-heading">

          <h1>Create Your Video</h1>

          <p>
            Give EasyCut your story and raw footage.
          </p>

        </div>


        {/* =========================================
            INPUT CARD
        ========================================= */}

        <div className="create-project-card">

          {/* Source tabs */}

          <div className="source-tabs">

            <button
              type="button"
              className={
                sourceType === "script"
                  ? "source-tab active"
                  : "source-tab"
              }
              onClick={() => {
                setSourceType("script");
                setError("");
              }}
            >
              <FileText size={15} />
              Text Script
            </button>


            <button
              type="button"
              className={
                sourceType === "audio"
                  ? "source-tab active"
                  : "source-tab"
              }
              onClick={() => {
                setSourceType("audio");
                setError("");
              }}
            >
              <FileAudio size={15} />
              Uploaded Audio (MP3)
            </button>


            <button
              type="button"
              className={
                sourceType === "record"
                  ? "source-tab active"
                  : "source-tab"
              }
              onClick={() => {
                setSourceType("record");
                setError("");
              }}
            >
              <Mic size={15} />
              Record Voice
            </button>

          </div>


          {/* =====================================
              SCRIPT
          ===================================== */}

          {sourceType === "script" && (
            <div className="script-section">

              <textarea
                className="script-input"
                placeholder="Enter your script here..."
                value={script}
                onChange={(event) => {
                  setScript(event.target.value);
                  setError("");
                }}
                maxLength={5000}
              />

              <div className="script-counter">
                {script.length}/5000
              </div>

            </div>
          )}


          {/* =====================================
              AUDIO
          ===================================== */}

          {sourceType === "audio" && (
            <label className="audio-upload-box">

              <FileAudio size={27} />

              <strong>
                {audioFile
                  ? audioFile.name
                  : "Upload your MP3 voiceover"}
              </strong>

              <span>
                MP3, WAV or M4A
              </span>

              <input
                type="file"
                accept=".mp3,.wav,.m4a,audio/*"
                hidden
                onChange={(event) => {
                  setAudioFile(
                    event.target.files?.[0] || null
                  );
                  setError("");
                }}
              />

            </label>
          )}


          {/* =====================================
              RECORD VOICE
          ===================================== */}

          {sourceType === "record" && (
            <div className="record-box">

              <div className="record-box-icon">
                <Mic size={25} />
              </div>

              <h3>Record your voice</h3>

              <p>
                Record your voice directly from your browser.
              </p>

              <button
                type="button"
                className="secondary-action"
                onClick={() =>
                  alert(
                    "Voice recorder will be connected in the next step."
                  )
                }
              >
                <Mic size={16} />
                Start Recording
              </button>

            </div>
          )}


          {/* =====================================
              LANGUAGE
          ===================================== */}

          <div className="language-section">

            <label>
              Language
            </label>

            <div className="language-select-wrapper">

              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value)
                }
              >
                <option>English</option>
                <option>Malayalam</option>
                <option>Hindi</option>
              </select>

              <ChevronDown size={16} />

            </div>

            <p className="language-note">
              <span>●</span>
              We support English, Malayalam and Hindi
            </p>

          </div>


          {/* =====================================
              VIDEO CLIPS
          ===================================== */}

          <div className="video-section">

            <div className="section-title-row">

              <div>
                <h2>Video Clips</h2>

                <p>
                  Add the raw footage EasyCut should use.
                </p>
              </div>

            </div>


            <div className="video-upload-layout">

              {/* Upload card */}

              <label className="video-upload-card">

                <div className="video-upload-icon">
                  <Upload size={22} />
                </div>

                <strong>
                  Upload Video Clips
                </strong>

                <span>
                  Drag and drop or click to upload
                </span>

                <small>
                  MP4, MOV, etc.
                </small>

                <input
                  type="file"
                  accept="video/*"
                  multiple
                  hidden
                  onChange={handleVideoSelection}
                />

              </label>


              {/* Selected videos */}

              {videoFiles.length > 0 && (
                <div className="video-preview-grid">

                  {videoFiles.map((file, index) => (
                    <div
                      className="video-preview-card"
                      key={`${file.name}-${file.size}`}
                    >

                      <div className="video-preview-placeholder">
                        <Video size={25} />
                      </div>

                      <div className="video-preview-info">

                        <span>
                          Clip {index + 1}
                        </span>

                        <small
                          title={file.name}
                        >
                          {file.name}
                        </small>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

          </div>


          {/* =====================================
              PROJECT NAME
          ===================================== */}

          <div className="project-name-section">

            <label>
              Project Name
            </label>

            <input
              type="text"
              className="project-name-input"
              placeholder="e.g. College Vlog"
              value={projectName}
              onChange={(event) => {
                setProjectName(event.target.value);
                setError("");
              }}
            />

          </div>


          {/* Error */}

          {error && (
            <div className="create-project-error">
              {error}
            </div>
          )}


          {/* =====================================
              FOOTER
          ===================================== */}

          <div className="create-project-footer">

            <Link
              to="/dashboard"
              className="secondary-action"
            >
              Cancel
            </Link>

            <button
              type="button"
              className="primary-action"
              disabled={creating}
              onClick={handleCreateProject}
            >
              {creating ? (
                "Creating..."
              ) : (
                <>
                  Next
                  <Play size={15} />
                </>
              )}
            </button>

          </div>

        </div>

      </section>

    </main>
  );
}

export default CreateProject;