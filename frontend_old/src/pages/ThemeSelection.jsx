import { Moon, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function ThemeSelection() {
  const { theme, setTheme } = useTheme();

  return (
    <main className="theme-page">
      <div className="theme-container">
        <div className="brand-mark">
          <Sparkles size={24} />
        </div>

        <h1>EasyCut</h1>

        <p className="theme-subtitle">
          Choose your editing experience
        </p>

        <div className="theme-options">
          {/* Light Cute Theme */}
          <button
            type="button"
            className={`theme-card ${
              theme === "cute" ? "selected" : ""
            }`}
            onClick={() => setTheme("cute")}
          >
            <div className="theme-icon cute-icon">
              ✦
            </div>

            <div>
              <h2>Light Cute</h2>
              <p>Soft, warm and creative</p>
            </div>

            {theme === "cute" && (
              <span className="selected-label">
                Selected
              </span>
            )}
          </button>

          {/* Dark Professional Theme */}
          <button
            type="button"
            className={`theme-card ${
              theme === "dark" ? "selected" : ""
            }`}
            onClick={() => setTheme("dark")}
          >
            <div className="theme-icon dark-icon">
              <Moon size={22} />
            </div>

            <div>
              <h2>Dark Professional</h2>
              <p>Cinematic, focused and professional</p>
            </div>

            {theme === "dark" && (
              <span className="selected-label">
                Selected
              </span>
            )}
          </button>
        </div>

        <p className="theme-note">
          You can change your theme anytime from Settings.
        </p>
      </div>
    </main>
  );
}

export default ThemeSelection;