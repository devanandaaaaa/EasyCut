import {
  ArrowRight,
  Check,
  Moon,
  Play,
  Sparkles,
  Sun,
  WandSparkles,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

function Home() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  return (
    <main className="landing-page">
      {/* Navigation */}
      <header className="landing-header">
        <a href="/" className="landing-logo">
          <span className="landing-logo-icon">
            <Sparkles size={18} />
          </span>

          <span>EasyCut</span>
        </a>

        <nav className="landing-nav">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
        </nav>

        <div className="landing-actions">
          <button
            type="button"
            className="landing-theme-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={
              theme === "light"
              ? "Switch to dark theme"
              : "Switch to light theme"
            }
          >
            {theme === "light" ? (
              <Moon size={17} />
            ) : (
              <Sun size={17} />
            )}
          </button>

          <a href="/login" className="landing-login">
            Login
          </a>

          <a href="/register" className="landing-primary-button">
            Get Started
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <Sparkles size={14} />
            AI Video Editing Made Simple
          </div>

          <h1>
            Turn Your Ideas
            <br />
            Into <span>Stunning Videos</span>
          </h1>

          <p>
            EasyCut uses AI to understand your story, find the best
            scenes from your footage, and create professional videos
            automatically.
          </p>

          <div className="landing-hero-actions">
            <a href="/register" className="landing-primary-button large">
              Get Started
              <ArrowRight size={17} />
            </a>

            <button
              type="button"
              className="landing-demo-button"
              onClick={() => navigate("/demo")}
            >
              <span className="landing-play-icon">
                <Play size={13} fill="currentColor" />
              </span>
              Watch Demo
            </button>

          </div>
        </div>

        {/* Hero visual */}
        <div className="landing-hero-visual">
          <div className="landing-video-window">
            <div className="landing-video-topbar">
              <div className="landing-window-dots">
                <span />
                <span />
                <span />
              </div>

              <span>EasyCut AI Studio</span>
            </div>

            <div className="landing-video-preview">
              <div className="landing-video-image">
                <div className="landing-video-play">
                  <Play size={20} fill="currentColor" />
                </div>
              </div>

              <div className="landing-mini-timeline">
                <div />
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
          </div>

          <div className="landing-ai-card">
            <div className="landing-ai-card-icon">
              <Sparkles size={16} />
            </div>

            <div>
              <strong>AI Analysis</strong>
              <span>Scene Matching</span>
              <span>Smart Editing</span>
              <span>Export Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="landing-features" id="features">
        <div className="landing-feature-card">
          <div className="landing-feature-icon">
            <WandSparkles size={20} />
          </div>

          <h3>AI Powered Editing</h3>
          <p>Let AI understand and edit your footage.</p>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feature-icon">
            <Sparkles size={20} />
          </div>

          <h3>Smart Scene Matching</h3>
          <p>Find footage that actually matches your story.</p>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feature-icon">
            <Play size={20} />
          </div>

          <h3>Multiple Templates</h3>
          <p>Create videos for different styles and formats.</p>
        </div>

        <div className="landing-feature-card">
          <div className="landing-feature-icon">
            <Check size={20} />
          </div>

          <h3>Export in High Quality</h3>
          <p>Take your finished video wherever you need it.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-how" id="how-it-works">
        <div className="landing-section-heading">
          <span>HOW IT WORKS</span>
          <h2>From story to finished video.</h2>
          <p>
            EasyCut connects your story with the right footage using
            semantic video understanding.
          </p>
        </div>

        <div className="landing-steps">
          <div className="landing-step">
            <span>01</span>
            <h3>Tell your story</h3>
            <p>Add a script or voiceover.</p>
          </div>

          <div className="landing-step">
            <span>02</span>
            <h3>Add your footage</h3>
            <p>Upload your raw video clips.</p>
          </div>

          <div className="landing-step">
            <span>03</span>
            <h3>Let AI match scenes</h3>
            <p>EasyCut finds the most relevant clips.</p>
          </div>

          <div className="landing-step">
            <span>04</span>
            <h3>Get your video</h3>
            <p>Review, edit and export.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;