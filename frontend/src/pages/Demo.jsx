
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const demoSteps = [
  {
    number: "01",
    icon: "✎",
    title: "Start with your script",
    description:
      "Write your story, choose your language, and provide a voiceover or record your own narration.",
  },
  {
    number: "02",
    icon: "▧",
    title: "Add your video clips",
    description:
      "Upload your footage and let the semantic matching workflow find scenes that fit your script.",
  },
  {
    number: "03",
    icon: "✳",
    title: "Generate with AI",
    description:
      "Analyze your story, match relevant scenes, and assemble a video around your content.",
  },
  {
    number: "04",
    icon: "▶",
    title: "Edit and export",
    description:
      "Review the result, refine your video in the editor, and prepare your final output.",
  },
];

const animationStages = [
  {
    label: "01 / SCRIPT",
    title: "Start with your story.",
    description: "Turn your idea into a clear visual direction.",
    status: "Understanding script",
  },
  {
    label: "02 / SCENE MATCHING",
    title: "Find the right moments.",
    description: "Match your words with relevant video scenes.",
    status: "Matching scenes",
  },
  {
    label: "03 / VIDEO ASSEMBLY",
    title: "Bring it all together.",
    description: "Arrange matched clips into a video sequence.",
    status: "Assembling timeline",
  },
];

function AnimatedWorkflowDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((current) => (current + 1) % animationStages.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const currentStage = animationStages[stage];

  return (
    <div
      className="demo-animation"
      aria-label="Animated preview of the EasyCut video editing workflow"
    >
      <div className="demo-animation-topbar">
        <div className="demo-animation-dots">
          <span />
          <span />
          <span />
        </div>

        <span className="demo-animation-app-title">EasyCut Studio</span>

        <span className="demo-animation-badge">
          <span className="demo-animation-live-dot" />
          LIVE PREVIEW
        </span>
      </div>

      <div className="demo-animation-body">
        <aside className="demo-animation-sidebar">
          <div className="demo-animation-sidebar-brand">
            <span className="demo-animation-brand-icon">E</span>
            <span>EasyCut</span>
          </div>

          {["Your script", "Scene matching", "Timeline", "Export"].map(
            (item, index) => (
              <div
                key={item}
                className={`demo-animation-nav-item ${
                  index === stage ? "is-active" : ""
                }`}
              >
                <span className="demo-animation-nav-number">
                  0{index + 1}
                </span>
                {item}
              </div>
            )
          )}

          <div className="demo-animation-sidebar-bottom">
            <span className="demo-animation-live-dot" />
            Workflow preview
          </div>
        </aside>

        <div className="demo-animation-workspace">
          <div className="demo-animation-heading">
            <div>
              <span className="demo-animation-overline">
                {currentStage.label}
              </span>

              <h3 key={`title-${stage}`}>{currentStage.title}</h3>

              <p>{currentStage.description}</p>
            </div>

            <span className="demo-animation-stage-count">
              0{stage + 1} / 03
            </span>
          </div>

          <div className="demo-animation-content">
            <div className="demo-animation-script-panel">
              <div className="demo-animation-panel-title">
                <span>STORY SCRIPT</span>
                <span className="demo-animation-file-icon">✎</span>
              </div>

              <div className="demo-animation-script-lines">
                <span className={stage >= 0 ? "line-active" : ""} />
                <span />
                <span className={stage >= 1 ? "line-active" : ""} />
                <span />
                <span className={stage >= 2 ? "line-active" : ""} />
                <span className="line-short" />
              </div>

              <div className="demo-animation-script-footer">
                <span>Story context</span>
                <span>{stage === 0 ? "Reading…" : "Analyzed ✓"}</span>
              </div>
            </div>

            <div className="demo-animation-scenes-panel">
              <div className="demo-animation-panel-title">
                <span>
                  {stage === 0
                    ? "VISUAL DIRECTION"
                    : stage === 1
                      ? "MATCHED SCENES"
                      : "ASSEMBLED VIDEO"}
                </span>

                <span className="demo-animation-scene-count">
                  {stage === 0
                    ? "Preparing"
                    : stage === 1
                      ? "3 matches"
                      : "3 clips"}
                </span>
              </div>

              <div className="demo-animation-scene-grid">
                <div className="demo-scene-card demo-scene-one">
                  <div className="demo-scene-art">
                    <span className="demo-scene-sun" />
                    <span className="demo-scene-mountain" />
                  </div>

                  <div className="demo-scene-caption">
                    <span>Scene 01</span>
                    {stage >= 1 && (
                      <span className="demo-scene-check">✓</span>
                    )}
                  </div>
                </div>

                <div className="demo-scene-card demo-scene-two">
                  <div className="demo-scene-art">
                    <span className="demo-scene-window" />
                    <span className="demo-scene-light" />
                  </div>

                  <div className="demo-scene-caption">
                    <span>Scene 02</span>
                    {stage >= 1 && (
                      <span className="demo-scene-check">✓</span>
                    )}
                  </div>
                </div>

                <div className="demo-scene-card demo-scene-three">
                  <div className="demo-scene-art">
                    <span className="demo-scene-water" />
                    <span className="demo-scene-reflection" />
                  </div>

                  <div className="demo-scene-caption">
                    <span>Scene 03</span>
                    {stage >= 1 && (
                      <span className="demo-scene-check">✓</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={`demo-animation-timeline stage-${stage}`}>
                <div className="demo-animation-timeline-head">
                  <span>VIDEO TIMELINE</span>
                  <span>
                    {stage === 2 ? "Sequence ready" : "Building sequence"}
                  </span>
                </div>

                <div className="demo-animation-track">
                  <span className="demo-animation-track-label">V1</span>

                  <div className="demo-animation-track-clips">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div className="demo-animation-track audio-track">
                  <span className="demo-animation-track-label">A1</span>

                  <div className="demo-animation-audio">
                    <span />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="demo-animation-bottom">
            <div className="demo-animation-progress-copy">
              <span className="demo-animation-live-dot" />
              {currentStage.status}
            </div>

            <div
              className="demo-animation-progress"
              role="progressbar"
              aria-label="Demo stage progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(((stage + 1) / 3) * 100)}
            >
              <span style={{ width: `${((stage + 1) / 3) * 100}%` }} />
            </div>

            <span className="demo-animation-percent">
              {Math.round(((stage + 1) / 3) * 100)}%
            </span>
          </div>
        </div>
      </div>

      <div className="demo-animation-stage-tabs">
        {animationStages.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className={index === stage ? "is-active" : ""}
            onClick={() => setStage(index)}
            aria-pressed={index === stage}
          >
            <span>{item.label}</span>
            <span className="demo-animation-tab-dot" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Demo() {
  const navigate = useNavigate();

  return (
    <main className="demo-page">
      <div className="demo-shell">
        <header className="demo-nav">
          <button
            type="button"
            className="demo-brand"
            onClick={() => navigate("/")}
          >
            <span className="demo-brand-icon">E</span>
            EasyCut
          </button>

          <div className="demo-nav-actions">
            <button
              type="button"
              className="demo-nav-link"
              onClick={() => navigate("/login")}
            >
              Log in
            </button>

            <button
              type="button"
              className="demo-nav-cta"
              onClick={() => navigate("/register")}
            >
              Get started →
            </button>
          </div>
        </header>

        <section className="demo-hero">
          <span className="demo-eyebrow">A NEW WAY TO CREATE VIDEO</span>

          <h1>
            Your footage.
            <br />
            <span>Your story.</span> One creative workflow.
          </h1>

          <p>
            Discover how EasyCut transforms a script and your video
            clips into a story-driven video using semantic scene
            matching and AI-assisted editing.
          </p>

          <div className="demo-hero-actions">
            <button
              type="button"
              className="demo-primary-button"
              onClick={() => {
                const token = localStorage.getItem("easycut-token");

                if (token) {
                    navigate("/create-project", { state: { startNew: true } });
                } else {
                    navigate("/login", {
                        state: {
                            from: "/create-project",
                            fromState: { startNew: true },
                            message: "Please log in to start creating your video.",
                        },
                    });
                }
            }}
            >
              Create a project →
            </button>

            <button
              type="button"
              className="demo-secondary-button"
              onClick={() => navigate("/")}
            >
              Explore EasyCut
            </button>
          </div>

          <AnimatedWorkflowDemo />
        </section>

        <section className="demo-process">
          <div className="demo-section-heading">
            <span className="demo-eyebrow">HOW IT WORKS</span>
            <h2>Four steps. One creative journey.</h2>
            <p>
              From your initial idea to a video you can review and refine.
            </p>
          </div>

          <div className="demo-steps">
            {demoSteps.map((step) => (
              <article className="demo-step" key={step.number}>
                <div className="demo-step-top">
                  <span className="demo-step-icon">{step.icon}</span>
                  <span className="demo-step-number">{step.number}</span>
                </div>

                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="demo-bottom-cta">
          <span className="demo-eyebrow">
            YOUR NEXT CREATION STARTS HERE
          </span>

          <h2>Ready to try EasyCut?</h2>

          <p>
            Start a project and explore the script-to-video workflow.
          </p>

          {/* <button
            type="button"
            className="demo-primary-button"
            onClick={() => navigate("/create-project")}
          >
            Start creating →
          </button> */}
        </section>

        <footer className="demo-footer">
          <button
            type="button"
            className="demo-brand"
            onClick={() => navigate("/")}
          >
            <span className="demo-brand-icon">E</span>
            EasyCut
          </button>

          <span>Turn your ideas into stories.</span>
        </footer>
      </div>
    </main>
  );
}
