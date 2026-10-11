import {
  ArrowRight,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="home-page">
      <nav className="home-nav">
        <Link to="/" className="home-logo">
          <span className="home-logo-icon">
            <Sparkles size={18} />
          </span>
          EasyCut
        </Link>

        <div className="home-nav-links">
          <Link to="/about">About</Link>
          <Link to="/how-it-works">How It Works</Link>
          <Link to="/demo">Watch Demo</Link>
        </div>

        <div className="home-nav-actions">
          <Link to="/login" className="nav-login">
            Login
          </Link>

          <Link to="/register" className="nav-signup">
            Get Started
          </Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <WandSparkles size={15} />
            AI-powered video editing
          </div>

          <h1>
            Turn your story into a
            <span> video.</span>
          </h1>

          <p>
            EasyCut understands your script or voiceover,
            finds the right moments from your video clips,
            and creates a video automatically.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="primary-button">
              Start Creating
              <ArrowRight size={18} />
            </Link>

            <Link to="/demo" className="secondary-button">
              <Play size={17} />
              Watch Demo
            </Link>
          </div>

          <p className="hero-supported">
            Supports English · Malayalam · Hindi
          </p>
        </div>

        <div className="hero-visual">
          <div className="visual-window">
            <div className="visual-topbar">
              <span />
              <span />
              <span />
            </div>

            <div className="visual-content">
              <div className="visual-video">
                <Play size={30} />
              </div>

              <div className="visual-timeline">
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section">
        <div>
          <span className="feature-number">01</span>
          <h2>Give EasyCut your story.</h2>
          <p>
            Use a text script, upload an MP3 voiceover,
            or record your voice directly in the browser.
          </p>
        </div>

        <div>
          <span className="feature-number">02</span>
          <h2>Let AI understand your footage.</h2>
          <p>
            EasyCut uses semantic scene matching to
            connect your story with the most relevant clips.
          </p>
        </div>

        <div>
          <span className="feature-number">03</span>
          <h2>Get an automatically assembled video.</h2>
          <p>
            The selected scenes are rendered and combined
            with your original voiceover.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Home;