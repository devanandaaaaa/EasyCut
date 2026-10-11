import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Mic,
  Music,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

function CreateProject() {
  const [language, setLanguage] = useState("English");
  const [inputType, setInputType] = useState("script");

  return (
    <main className="create-project-page">
      {/* Top bar */}
      <header className="create-project-header">
        <Link to="/dashboard" className="create-project-back">
          <ArrowLeft size={16} />
          Dashboard
        </Link>

        <div className="create-project-logo">
          <span>
            <Sparkles size={16} />
          </span>
          EasyCut
        </div>

        <div className="create-project-step">
          Step <strong>01</strong> of 03
        </div>
      </header>

      {/* Main */}
      <div className="create-project-content">
        <section className="create-project-intro">
          <div className="create-project-eyebrow">
            <Sparkles size={14} />
            AI Video Studio
          </div>

          <h1>
            Create your
            <br />
            <span>next video.</span>
          </h1>

          <p>
            Give EasyCut your story, voice and footage. Our AI will
            understand your content and find the scenes that belong
            together.
          </p>
        </section>

        <section className="create-project-workspace">
          {/* Project information */}
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
                type="text"
                placeholder="My cinematic story"
              />
            </div>
          </div>

          {/* Story input */}
          <div className="create-project-section">
            <div className="create-project-section-heading">
              <div className="create-project-number">02</div>

              <div>
                <h2>Your story</h2>
                <p>
                  Choose how you want to give EasyCut your story.
                </p>
              </div>
            </div>

            <div className="create-project-input-tabs">
              <button
                type="button"
                className={
                  inputType === "script"
                    ? "create-input-tab active"
                    : "create-input-tab"
                }
                onClick={() => setInputType("script")}
              >
                <FileText size={16} />
                Text Script
              </button>

              <button
                type="button"
                className={
                  inputType === "audio"
                    ? "create-input-tab active"
                    : "create-input-tab"
                }
                onClick={() => setInputType("audio")}
              >
                <Music size={16} />
                Upload MP3
              </button>

              <button
                type="button"
                className={
                  inputType === "record"
                    ? "create-input-tab active"
                    : "create-input-tab"
                }
                onClick={() => setInputType("record")}
              >
                <Mic size={16} />
                Record Voice
              </button>
            </div>

            {inputType === "script" && (
              <div className="create-script-box">
                <textarea
                  placeholder="Write or paste your story here...

Example:
A young traveler wakes up early in the morning.
She packs her bag and begins her journey through the mountains..."
                />

                <div className="create-script-footer">
                  <span>Describe the story you want to turn into a video.</span>
                  <span>0 / 5000</span>
                </div>
              </div>
            )}

            {inputType === "audio" && (
              <div className="create-upload-box">
                <div className="create-upload-icon">
                  <Music size={22} />
                </div>

                <h3>Upload your voiceover</h3>

                <p>
                  Drop an MP3 file here or choose one from your
                  computer.
                </p>

                <button type="button" className="create-upload-button">
                  <Upload size={15} />
                  Choose MP3
                </button>

                <small>MP3 audio files only</small>
              </div>
            )}

            {inputType === "record" && (
              <div className="create-upload-box">
                <div className="create-upload-icon">
                  <Mic size={22} />
                </div>

                <h3>Record your voice</h3>

                <p>
                  Record your story directly in EasyCut using your
                  microphone.
                </p>

                <button type="button" className="create-upload-button">
                  <Mic size={15} />
                  Start Recording
                </button>

                <small>Your browser will ask for microphone access.</small>
              </div>
            )}
          </div>

          {/* Language */}
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
                  className={
                    language === item
                      ? "create-language-card active"
                      : "create-language-card"
                  }
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

          {/* Video footage */}
          <div className="create-project-section">
            <div className="create-project-section-heading">
              <div className="create-project-number">04</div>

              <div>
                <h2>Your footage</h2>
                <p>
                  Upload the raw video clips EasyCut should analyze.
                </p>
              </div>
            </div>

            <div className="create-footage-box">
              <div className="create-footage-icon">
                <Video size={22} />
              </div>

              <div className="create-footage-text">
                <h3>Upload video clips</h3>

                <p>
                  Add multiple raw videos. EasyCut will analyze their
                  scenes and match them with your story.
                </p>

                <span>
                  MP4, MOV and WebM supported
                </span>
              </div>

              <button type="button" className="create-upload-button">
                <Upload size={15} />
                Upload Videos
              </button>
            </div>
          </div>

          {/* AI workflow */}
          <div className="create-ai-preview">
            <div className="create-ai-preview-heading">
              <div>
                <span>
                  <Sparkles size={14} />
                  AI workflow
                </span>

                <h2>What EasyCut will do</h2>
              </div>
            </div>

            <div className="create-ai-steps">
              <div className="create-ai-step active">
                <div className="create-ai-step-icon">
                  <Sparkles size={15} />
                </div>

                <div>
                  <strong>Understand</strong>
                  <span>Analyze your story</span>
                </div>
              </div>

              <ArrowRight className="create-ai-arrow" size={16} />

              <div className="create-ai-step">
                <div className="create-ai-step-icon">
                  <Video size={15} />
                </div>

                <div>
                  <strong>Match</strong>
                  <span>Find relevant scenes</span>
                </div>
              </div>

              <ArrowRight className="create-ai-arrow" size={16} />

              <div className="create-ai-step">
                <div className="create-ai-step-icon">
                  <WandSparklesIcon />
                </div>

                <div>
                  <strong>Edit</strong>
                  <span>Build your rough cut</span>
                </div>
              </div>

              <ArrowRight className="create-ai-arrow" size={16} />

              <div className="create-ai-step">
                <div className="create-ai-step-icon">
                  <Sparkles size={15} />
                </div>

                <div>
                  <strong>Create</strong>
                  <span>Generate your video</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="create-project-footer">
            <Link to="/dashboard" className="create-cancel-button">
              Cancel
            </Link>

            <button type="button" className="create-project-button">
              Continue
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function WandSparklesIcon() {
  return <Sparkles size={15} />;
}

export default CreateProject;