
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Music,
  Sparkles,
  Upload,
  Video,
  LoaderCircle,
  AlertCircle,
  Play,
  X,
} from "lucide-react";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../services/api";

function restoredSourceVideos(projectData = {}) {
  return (projectData.sourceVideos || []).map((sourceVideo, index) => {
    const name = String(sourceVideo).replace(/\\/g, "/").split("/").pop();
    return {
      id: `restored-${index}-${name}`,
      file: { name, size: 0 },
      status: "saved upload",
      sourceVideo,
      filename: name,
    };
  });
}

function readCreateDraft(location) {
  if (location.state?.projectData) return location.state.projectData;
  if (location.state?.projectId) {
    return {};
  }
  if (location.state?.startNew || location.state?.template) {
    const entryKey = `easycut-create-draft-started-${location.key}`;
    if (!sessionStorage.getItem(entryKey)) {
      sessionStorage.removeItem("easycut-create-draft");
      sessionStorage.setItem(entryKey, "1");
      return location.state?.template
        ? { selectedTemplate: location.state.template }
        : {};
    }
  }
  if (!location.state) {
    try {
      const pending = JSON.parse(sessionStorage.getItem("easycut-pending-project") || "null");
      if (pending?.projectData) return pending;
    } catch {
      // Fall through to the lightweight form draft.
    }
  }
  try {
    return JSON.parse(sessionStorage.getItem("easycut-create-draft") || "{}");
  } catch {
    return {};
  }
}

function CreateProject() {
  const location = useLocation();
  const navigate = useNavigate();

  const templateOptions = [
    "Cinematic Story",
    "Travel Journal",
    "Daily Vlog",
    "Short Social",
    "Visual Documentary",
    "Product Showcase",
  ];

  const initialProjectData = readCreateDraft(location);
  const [projectId, setProjectId] = useState(
    location.state?.projectId || initialProjectData.projectId || null
  );
  const initialVideos = restoredSourceVideos(initialProjectData);

  const [selectedTemplate, setSelectedTemplate] = useState(
    location.state?.template || initialProjectData.selectedTemplate || ""
  );
  const [language, setLanguage] = useState(initialProjectData.language || "English");
  const [inputType, setInputType] = useState(
    initialProjectData.inputType === "audio" || initialProjectData.inputType === "record"
      ? "audio"
      : "script"
  );
  const [projectName, setProjectName] = useState(
    location.state?.projectName || initialProjectData.projectName || ""
  );
  const [script, setScript] = useState(initialProjectData.script || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projectUsage, setProjectUsage] = useState(null);
  const [selectedVideos, setSelectedVideos] = useState(initialVideos);
  const [uploadedVideos, setUploadedVideos] = useState(initialVideos);
  const [uploading, setUploading] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [savedVoiceoverRef, setSavedVoiceoverRef] = useState(
    initialProjectData.voiceoverFile || null
  );
  const voiceoverFileId = savedVoiceoverRef?.id || null;
  const voiceoverFileName = savedVoiceoverRef?.name || "";
  const voiceoverFileType = savedVoiceoverRef?.type || "";
  const voiceoverFileKind = savedVoiceoverRef?.kind || "audio";
  const [restoringVoiceover, setRestoringVoiceover] = useState(
    Boolean(voiceoverFileId)
  );
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get("/auth/usage").then(({ data }) => {
      if (!cancelled) setProjectUsage(data);
    }).catch(() => {
      // The create endpoint remains authoritative if usage cannot be loaded.
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!projectId || !voiceoverFileId) return undefined;

    let cancelled = false;
    api.get(`/auth/projects/${projectId}/files/${voiceoverFileId}/media`, {
      responseType: "blob",
    }).then((response) => {
      if (cancelled) return;
      const file = new File(
        [response.data],
        voiceoverFileName || "saved-voiceover.webm",
        { type: voiceoverFileType || response.data.type || "audio/webm" }
      );
      // Legacy camera recordings are kept usable as voiceover media when they
      // contain an audio stream; new projects use uploaded voiceover files.
      setAudioFile(file);
    }).catch((restoreError) => {
      if (cancelled) return;
      setError(
        restoreError.response?.status === 404
          ? "The saved voiceover upload is no longer available. Please choose the audio file again."
          : "Could not restore the saved voiceover. Check your connection and retry."
      );
    }).finally(() => {
      if (!cancelled) setRestoringVoiceover(false);
    });

    return () => { cancelled = true; };
  }, [projectId, voiceoverFileId, voiceoverFileName, voiceoverFileType, voiceoverFileKind]);

  useEffect(() => {
    try {
      sessionStorage.setItem("easycut-create-draft", JSON.stringify({
        projectId,
        projectName,
        selectedTemplate,
        language,
        inputType,
        script,
        sourceVideos: uploadedVideos
          .map((video) => video.sourceVideo)
          .filter(Boolean),
        voiceoverFile: voiceoverFileId
          ? { id: voiceoverFileId, name: voiceoverFileName, type: voiceoverFileType, kind: voiceoverFileKind }
          : null,
        // Preserve this legacy field for old project records; it is no longer
        // used to expose or create camera recordings.
        recordingSourcePath: initialProjectData.recordingSourcePath || "",
        voiceoverName: audioFile?.name || "",
      }));
    } catch (draftError) {
      console.warn("Could not save the project form draft:", draftError);
    }
  }, [projectId, projectName, selectedTemplate, language, inputType, script, uploadedVideos, audioFile, voiceoverFileId, voiceoverFileName, voiceoverFileType, voiceoverFileKind, initialProjectData.recordingSourcePath]);

  const handleVideoUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const allowedExtensions = [".mp4", ".mov", ".webm"];
    const validFiles = files.filter((file) =>
      allowedExtensions.includes(
        file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      )
    );

    if (validFiles.length !== files.length) {
      setError("Only MP4, MOV, and WebM video files are supported.");
    } else {
      setError("");
    }
    if (!validFiles.length) return;

    const newItems = validFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      status: "uploading",
      sourceVideo: null,
    }));

    setSelectedVideos((previous) => [...previous, ...newItems]);
    setUploading(true);

    try {
      let uploadProjectId = projectId;
      if (!uploadProjectId) {
        const fallbackName = validFiles[0].name.replace(/\.[^.]+$/, "");
        const draftName = projectName.trim() || fallbackName || "Untitled project";
        const draftResponse = await api.post("/auth/projects", {
          name: draftName,
          description: script.trim() || "Video project draft",
        });
        uploadProjectId = draftResponse.data.id;
        setProjectId(uploadProjectId);
        if (!projectName.trim()) setProjectName(draftName);
      }

      for (const item of newItems) {
        const formData = new FormData();
        formData.append("video", item.file);
        formData.append("project_id", String(uploadProjectId));

        const response = await api.post(
          "/processing/upload-video",
          formData
        );

        const uploaded = {
          ...item,
          status:
            response.data?.indexing_status === "quota_exceeded"
              ? "uploaded — indexing paused"
              : "uploaded",
          sourceVideo: response.data.source_video,
          filename: response.data.filename,
        };

        setSelectedVideos((previous) =>
          previous.map((video) =>
            video.id === item.id ? uploaded : video
          )
        );

        setUploadedVideos((previous) => [...previous, uploaded]);

        if (response.data?.indexing_status === "quota_exceeded") {
          setError(
            "Video uploaded, but AI indexing paused because the Gemini quota was exceeded. Generation may not find scenes from this video until indexing succeeds."
          );
        }
      }
    } catch (uploadError) {
      const detail = uploadError.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "A video could not be uploaded. Please try again."
      );

      setSelectedVideos((previous) =>
        previous.map((video) =>
          newItems.some((item) => item.id === video.id) &&
          video.status === "uploading"
            ? { ...video, status: "upload failed" }
            : video
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = (id) => {
    setSelectedVideos((previous) =>
      previous.filter((video) => video.id !== id)
    );
    setUploadedVideos((previous) =>
      previous.filter((video) => video.id !== id)
    );
  };

  const handleAudioSelection = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowedExtensions = [".mp3", ".wav", ".m4a", ".ogg", ".webm"];
    const extension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError("Choose an MP3, WAV, M4A, OGG, or WebM audio file.");
      return;
    }

    setAudioFile(file);
    setSavedVoiceoverRef(null);
    setError("");
  };

  // Save the project to the backend before starting video generation.
  const handleGenerateVideo = async () => {
    if (!projectName.trim()) {
      setError("Please enter a project name.");
      return;
    }

    if (uploading) {
      setError("Please wait until video uploads finish.");
      return;
    }

    if (inputType === "script" && !script.trim()) {
      setError("Please enter a script before generating your video.");
      return;
    }

    if (
      inputType === "script" &&
      !uploadedVideos.some((video) => video.sourceVideo)
    ) {
      setError("Please upload at least one video before generating.");
      return;
    }

    if (inputType === "audio" && !audioFile) {
      setError(restoringVoiceover
        ? "Wait for the saved voiceover to finish restoring."
        : "Please choose an audio file first.");
      return;
    }

    if (
      inputType !== "script" &&
      !uploadedVideos.some((video) => video.sourceVideo)
    ) {
      setError("Please upload at least one video to use with your voiceover.");
      return;
    }

    const projectData = {
      projectName: projectName.trim(),
      selectedTemplate,
      language,
      inputType,
      script: script.trim(),
      sourceVideos: uploadedVideos
        .map((video) => video.sourceVideo)
        .filter(Boolean),
      voiceoverFile: savedVoiceoverRef,
      recordingSourcePath: initialProjectData.recordingSourcePath || "",
    };

    setError("");
    setLoading(true);

    try {
      const existingProjectId = projectId;
      let savedProject;
      if (existingProjectId) {
        savedProject = { id: existingProjectId };
      } else {
        const response = await api.post("/auth/projects", {
          name: projectData.projectName,
          description:
            projectData.script ||
            `${selectedTemplate || "Video project"} - ${language}`,
        });
        savedProject = response.data;
        setProjectId(savedProject.id);
        try {
          sessionStorage.setItem("easycut-create-draft", JSON.stringify({
            ...projectData,
            projectId: savedProject.id,
          }));
        } catch (draftError) {
          console.warn("Could not persist the draft identifier:", draftError);
        }
      }

      if (!savedProject || savedProject.id == null) {
        throw new Error("The server did not return the saved project ID.");
      }

      const voiceover = inputType === "audio" ? audioFile : null;
      if (voiceover && !projectData.voiceoverFile?.id) {
        const formData = new FormData();
        const extension = voiceover.name.includes(".")
          ? voiceover.name.slice(voiceover.name.lastIndexOf("."))
          : ".webm";
        const uniqueName = `easycut-voiceover-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
        formData.append("file", voiceover, uniqueName);
        const fileResponse = await api.post(
          `/auth/projects/${savedProject.id}/files`,
          formData
        );
        projectData.voiceoverFile = {
          id: fileResponse.data.id,
          name: fileResponse.data.original_name,
          type: voiceover.type,
          kind: "audio",
        };
      }

      const projectWithId = {
        ...projectData,
        projectData,
        editorSettings: {
          ...(location.state?.editorSettings || {}),
          projectData,
        },
        projectId: savedProject.id,
      };

      await api.put(`/auth/projects/${savedProject.id}/draft`, {
        editor_settings: projectWithId.editorSettings,
      });

      try {
        sessionStorage.setItem("easycut-create-draft", JSON.stringify({
          ...projectWithId,
          ...projectData,
        }));
      } catch (draftError) {
        console.warn("Could not persist the generated draft details:", draftError);
      }

      sessionStorage.setItem(
        "easycut-pending-project",
        JSON.stringify(projectWithId)
      );

      navigate("/generation", {
        state: {
          ...projectWithId,
          audioFile: inputType === "audio" ? audioFile : null,
        },
      });
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 401) {
        setError("Your login session may have expired. Please log in again.");
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError(
          requestError.message ||
            "Could not save your project. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-project-page">
      <header className="create-project-header">
        <Link to="/dashboard" className="create-project-back">
          <ArrowLeft size={16} />
          Dashboard
        </Link>

        <div className="create-project-logo">
          <span><Sparkles size={16} /></span>
          EasyCut
        </div>

        <div className="create-project-step">
          Step <strong>01</strong> of 03
        </div>
      </header>

      <div className="create-project-content">
        <section className="create-project-intro">
          <div className="create-project-eyebrow">
            <Sparkles size={14} />
            AI Video Studio
          </div>

          <h1>
            Create your<br />
            <span>next video.</span>
          </h1>

          <p>
            Give EasyCut your story, voice and footage. Our AI will
            understand your content and find the scenes that belong together.
          </p>
        </section>

        <section className="create-project-workspace">
          <div className="create-project-section">
            <div className="create-project-section-heading">
              <div className="create-project-number">01</div>
              <div>
                <h2>Project information</h2>
                <p>Start by giving your project a name.</p>
              </div>
            </div>

            <div className="create-project-field">
              <label htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="My cinematic story"
                maxLength={100}
              />
            </div>

            <div className="create-project-field">
              <label htmlFor="project-template">Video template</label>
              <select
                id="project-template"
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
              >
                <option value="">Choose a template (optional)</option>
                {templateOptions.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>

              {selectedTemplate && (
                <p style={{ marginTop: 8 }}>
                  Selected template: <strong>{selectedTemplate}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="create-project-section">
            <div className="create-project-section-heading">
              <div className="create-project-number">02</div>
              <div>
                <h2>Your story</h2>
                <p>Choose how you want to give EasyCut your story.</p>
              </div>
            </div>

            <div className="create-project-input-tabs">
              <button
                type="button"
                className={inputType === "script" ? "create-input-tab active" : "create-input-tab"}
                onClick={() => {
                  setInputType("script");
                  setError("");
                }}
              >
                <FileText size={16} /> Script
              </button>

              <button
                type="button"
                className={inputType === "audio" ? "create-input-tab active" : "create-input-tab"}
                onClick={() => {
                  setInputType("audio");
                  setError("");
                }}
              >
                <Music size={16} /> Voiceover
              </button>
            </div>

            {inputType === "script" && (
              <div className="create-script-box">
                <textarea
                  value={script}
                  onChange={(event) => setScript(event.target.value)}
                  maxLength={5000}
                  placeholder={`Write or paste your story here...

Example:

A young traveler wakes up early in the morning.
She packs her bag and begins her journey through the mountains...`}
                />
                <div className="create-script-footer">
                  <span>Describe the story you want to turn into a video.</span>
                  <span>{script.length} / 5000</span>
                </div>
              </div>
            )}

            {inputType === "audio" && (
              <div className="create-upload-box">
                <div className="create-upload-icon"><Music size={22} /></div>
                <h3>Upload your voiceover</h3>
                <p>
                  Choose an audio file. EasyCut will analyze the narration and match relevant scenes.
                </p>
                {!restoringVoiceover && initialProjectData.voiceoverName && !audioFile && !voiceoverFileId && (
                  <p role="status" className="create-upload-warning">
                    The browser draft saved the file name, but not the audio data. Please choose the audio file again.
                  </p>
                )}

                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.webm,audio/*"
                  hidden
                  onChange={handleAudioSelection}
                />

                <button
                  type="button"
                  className="create-upload-button"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Upload size={15} /> Choose Audio
                </button>

                {audioFile && (
                  <p style={{ marginTop: 12, overflowWrap: "anywhere" }}>
                    <Check size={14} /> {audioFile.name} ·{" "}
                    {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                    <button
                      type="button"
                      onClick={() => setAudioFile(null)}
                      aria-label="Remove audio file"
                      style={{
                        border: 0,
                        background: "transparent",
                        cursor: "pointer",
                        marginLeft: 8,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </p>
                )}

                <small>MP3, WAV, M4A, OGG, or WebM audio</small>
              </div>
            )}

          </div>

          <div className="create-project-section">
            <div className="create-project-section-heading">
              <div className="create-project-number">03</div>
              <div>
                <h2>Language</h2>
                <p>Select the language of your story or voiceover.</p>
              </div>
            </div>

            <div className="create-language-grid">
              {["English", "Malayalam", "Hindi"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={language === item ? "create-language-card active" : "create-language-card"}
                  onClick={() => setLanguage(item)}
                >
                  <span className="create-language-check">
                    {language === item && <Check size={13} />}
                  </span>
                  <strong>{item}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="create-project-section">
            <div className="create-project-section-heading">
              <div className="create-project-number">04</div>
              <div>
                <h2>Your footage</h2>
                <p>Upload raw clips for EasyCut to use in your video.</p>
              </div>
            </div>

            <div className="create-footage-box">
              <div className="create-footage-icon"><Video size={22} /></div>

              <div className="create-footage-text">
                <h3>Upload video clips</h3>
                <p>Select one or more videos from your computer.</p>
                <span>MP4, MOV and WebM supported</span>

                {selectedVideos.length > 0 && (
                  <ul style={{ paddingLeft: 18, marginTop: 12 }}>
                    {selectedVideos.map((item) => (
                      <li
                        key={item.id}
                        style={{ marginBottom: 8, overflowWrap: "anywhere" }}
                      >
                        {item.file.name} — {item.status}
                        <button
                          type="button"
                          onClick={() => removeVideo(item.id)}
                          disabled={uploading}
                          aria-label={`Remove ${item.file.name}`}
                          style={{
                            border: 0,
                            background: "transparent",
                            cursor: "pointer",
                            marginLeft: 6,
                          }}
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                multiple
                hidden
                onChange={handleVideoUpload}
                disabled={uploading}
              />

              <button
                type="button"
                className="create-upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <LoaderCircle size={15} /> : <Upload size={15} />}
                {uploading ? "Uploading..." : "Upload Videos"}
              </button>
            </div>
          </div>

          <div className="create-ai-preview">
            <div className="create-ai-preview-heading">
              <div>
                <span><Sparkles size={14} /> AI workflow</span>
                <h2>What EasyCut will do</h2>
              </div>
            </div>

            <div className="create-ai-steps">
              <div className="create-ai-step active">
                <div className="create-ai-step-icon"><Sparkles size={15} /></div>
                <div><strong>Understand</strong><span>Analyze your story</span></div>
              </div>

              <ArrowRight className="create-ai-arrow" size={16} />

              <div className="create-ai-step">
                <div className="create-ai-step-icon"><Video size={15} /></div>
                <div><strong>Match</strong><span>Find relevant scenes</span></div>
              </div>

              <ArrowRight className="create-ai-arrow" size={16} />

              <div className="create-ai-step">
                <div className="create-ai-step-icon"><Sparkles size={15} /></div>
                <div><strong>Edit</strong><span>Build your rough cut</span></div>
              </div>

              <ArrowRight className="create-ai-arrow" size={16} />

              <div className="create-ai-step">
                <div className="create-ai-step-icon"><Check size={15} /></div>
                <div><strong>Create</strong><span>Generate your video</span></div>
              </div>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 14,
                marginTop: 18,
                borderRadius: 10,
                color: "#dc2626",
                background: "rgba(220, 38, 38, 0.08)",
              }}
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {!projectId && projectUsage && !projectUsage.project_creation_allowed && (
            <div role="status" className="create-project-limit-notice">
              <span>You have used {projectUsage.project_count}/5 saved projects. You can still generate a draft, but need Premium to save another project.</span>
              <Link to="/subscription">View Premium plans</Link>
            </div>
          )}

          <div className="create-project-footer">
            <Link to="/dashboard" className="create-cancel-button">
              Cancel
            </Link>

            <button
              type="button"
              className="create-project-button"
              onClick={handleGenerateVideo}
              disabled={loading || uploading}
              style={{
                opacity: loading || uploading ? 0.7 : 1,
                cursor: loading || uploading ? "wait" : "pointer",
              }}
            >
              {loading ? (
                <><LoaderCircle size={16} /> Preparing draft...</>
              ) : (
                <><Play size={16} /> Generate Video <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CreateProject;
