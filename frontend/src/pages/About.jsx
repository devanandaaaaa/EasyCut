
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Clapperboard,
  Film,
  Mic2,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: BrainCircuit,
    title: "Understand the story",
    description:
      "AI analyses your script or voiceover to identify the scenes and visual moments your story needs.",
  },
  {
    icon: Film,
    title: "Find matching footage",
    description:
      "Semantic video matching helps identify relevant moments in your uploaded clips.",
  },
  {
    icon: Mic2,
    title: "Work with voiceovers",
    description:
      "Create videos around your narration, with support for English, Malayalam and Hindi.",
  },
  {
    icon: Clapperboard,
    title: "Build a video automatically",
    description:
      "Selected clips can be assembled into a video using video-processing tools.",
  },
];

function About() {
  return (
    <main className="about-page">
      <div className="about-shell">
        <Link to="/dashboard" className="about-back">
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <section className="about-hero">
          <div className="about-eyebrow">
            <Sparkles size={15} />
            About EasyCut
          </div>

          <h1>
            Your story deserves
            <span> the right visuals.</span>
          </h1>

          <p>
            EasyCut is an AI-assisted video editing project designed to
            connect a script or voiceover with relevant moments in raw
            video footage through semantic understanding and automated
            video assembly.
          </p>

          <Link to="/how-it-works" className="about-primary-button">
            Discover how it works
            <ArrowRight size={17} />
          </Link>
        </section>

        <section className="about-mission">
          <div className="about-mission-visual">
            <div className="about-visual-orbit orbit-one" />
            <div className="about-visual-orbit orbit-two" />

            <div className="about-visual-icon">
              <WandSparkles size={43} />
            </div>

            <span className="about-floating-chip chip-script">
              <Mic2 size={15} />
              Your story
            </span>

            <span className="about-floating-chip chip-video">
              <Film size={15} />
              Matching scenes
            </span>
          </div>

          <div className="about-mission-copy">
            <span className="about-section-label">Our purpose</span>

            <h2>Less searching. More storytelling.</h2>

            <p>
              Finding the right clip in a collection of raw footage can
              take time. EasyCut explores how AI can understand the meaning
              of a script, analyse video scenes and rank footage by
              semantic relevance.
            </p>

            <p>
              The goal is to make the initial editing process more
              organised and accessible while leaving room for creators to
              refine the final result.
            </p>
          </div>
        </section>

        <section className="about-features">
          <div className="about-section-heading">
            <span className="about-section-label">What EasyCut does</span>
            <h2>From your idea to a video draft</h2>
            <p>
              An AI-assisted workflow built around the meaning of your
              story, rather than filenames alone.
            </p>
          </div>

          <div className="about-feature-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article className="about-feature-card" key={feature.title}>
                  <div className="about-feature-icon">
                    <Icon size={22} />
                  </div>

                  <span className="about-feature-number">
                    0{index + 1}
                  </span>

                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-technology">
          <div>
            <span className="about-section-label">Behind the workflow</span>
            <h2>AI meets video processing.</h2>
            <p>
              EasyCut brings together language understanding, semantic
              retrieval and video-processing technologies in one project.
            </p>
          </div>

          <div className="about-tech-list">
            <span>Gemini API</span>
            <span>ChromaDB</span>
            <span>FastAPI</span>
            <span>React</span>
            <span>FFmpeg</span>
            <span>MoviePy</span>
          </div>
        </section>

        <section className="about-cta">
          <div className="about-cta-icon">
            <Sparkles size={23} />
          </div>

          <h2>Ready to create something?</h2>

          <p>
            Explore your workspace and start building your next video
            project.
          </p>

          <Link to="/dashboard" className="about-primary-button">
            Go to Dashboard
            <ArrowRight size={17} />
          </Link>
        </section>

        <footer className="about-footer">
          <span>EasyCut</span>
          <span>AI-assisted video editing</span>
        </footer>
      </div>
    </main>
  );
}

export default About;
