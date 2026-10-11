
import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Moon,
  Palette,
  Save,
  Shield,
  Sun,
  UserRound,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function Settings() {
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState({
    emailNotifications: true,
    processingNotifications: true,
    marketingEmails: false,
    defaultLanguage: "English",
    exportQuality: "1080p",
    autoSave: true,
  });

  const [saved, setSaved] = useState(false);

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setSaved(false);
  };

  const handleSave = (event) => {
    event.preventDefault();

    // Settings are currently kept in this browser session.
    // Persistent storage and backend syncing will be added later.
    setSaved(true);
  };

  return (
    <main className="settings-page">
      <div className="settings-shell">
        <Link to="/dashboard" className="settings-back">
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <header className="settings-header">
          <span className="settings-eyebrow">
            <Palette size={15} />
            Preferences
          </span>

          <h1>Settings</h1>

          <p>
            Make EasyCut feel right for the way you create.
          </p>
        </header>

        <form className="settings-content" onSubmit={handleSave}>
          <section className="settings-section">
            <div className="settings-section-heading">
              <div className="settings-section-icon">
                <Palette size={20} />
              </div>

              <div>
                <h2>Appearance</h2>
                <p>Choose how EasyCut looks.</p>
              </div>
            </div>

            <div className="settings-theme-options">
              <button
                type="button"
                className={`settings-theme-option ${
                  theme === "light" ? "selected" : ""
                }`}
                onClick={() => setTheme("light")}
              >
                <span className="settings-theme-preview light-preview">
                  <Sun size={23} />
                  <span />
                  <span />
                </span>

                <span className="settings-theme-label">
                  <strong>Light</strong>
                  <small>Clean and bright</small>
                </span>

                {theme === "light" && (
                  <Check size={18} className="settings-selected-check" />
                )}
              </button>

              <button
                type="button"
                className={`settings-theme-option ${
                  theme === "dark" ? "selected" : ""
                }`}
                onClick={() => setTheme("dark")}
              >
                <span className="settings-theme-preview dark-preview">
                  <Moon size={23} />
                  <span />
                  <span />
                </span>

                <span className="settings-theme-label">
                  <strong>Dark</strong>
                  <small>Focused and cinematic</small>
                </span>

                {theme === "dark" && (
                  <Check size={18} className="settings-selected-check" />
                )}
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-heading">
              <div className="settings-section-icon">
                <Bell size={20} />
              </div>

              <div>
                <h2>Notifications</h2>
                <p>Choose which updates you want to receive.</p>
              </div>
            </div>

            <div className="settings-options">
              <label className="settings-toggle-row">
                <span>
                  <strong>Email notifications</strong>
                  <small>Receive important account updates.</small>
                </span>

                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(event) =>
                    updateSetting("emailNotifications", event.target.checked)
                  }
                />
              </label>

              <label className="settings-toggle-row">
                <span>
                  <strong>Processing updates</strong>
                  <small>Get notified when video processing finishes.</small>
                </span>

                <input
                  type="checkbox"
                  checked={settings.processingNotifications}
                  onChange={(event) =>
                    updateSetting(
                      "processingNotifications",
                      event.target.checked
                    )
                  }
                />
              </label>

              <label className="settings-toggle-row">
                <span>
                  <strong>Product news and tips</strong>
                  <small>Receive optional news about EasyCut.</small>
                </span>

                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={(event) =>
                    updateSetting("marketingEmails", event.target.checked)
                  }
                />
              </label>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-heading">
              <div className="settings-section-icon">
                <Video size={20} />
              </div>

              <div>
                <h2>Video preferences</h2>
                <p>Set your preferred editing defaults.</p>
              </div>
            </div>

            <div className="settings-fields">
              <label className="settings-field">
                <span>Default language</span>

                <select
                  value={settings.defaultLanguage}
                  onChange={(event) =>
                    updateSetting("defaultLanguage", event.target.value)
                  }
                >
                  <option value="English">English</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Hindi">Hindi</option>
                </select>
              </label>

              <label className="settings-field">
                <span>Preferred export quality</span>

                <select
                  value={settings.exportQuality}
                  onChange={(event) =>
                    updateSetting("exportQuality", event.target.value)
                  }
                >
                  <option value="720p">720p HD</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="4K">4K Ultra HD</option>
                </select>
              </label>
            </div>

            <label className="settings-toggle-row settings-autosave-row">
              <span>
                <strong>Auto-save editing changes</strong>
                <small>Preference only; editor auto-save will be connected later.</small>
              </span>

              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(event) =>
                  updateSetting("autoSave", event.target.checked)
                }
              />
            </label>
          </section>

          <section className="settings-section settings-security-section">
            <div className="settings-section-heading">
              <div className="settings-section-icon">
                <Shield size={20} />
              </div>

              <div>
                <h2>Account and security</h2>
                <p>Manage your EasyCut account.</p>
              </div>
            </div>

            <Link to="/account" className="settings-account-link">
              <UserRound size={18} />
              <span>
                <strong>Account details</strong>
                <small>View your profile and account options.</small>
              </span>
              <ArrowLeft size={16} className="settings-link-arrow" />
            </Link>
          </section>

          <div className="settings-save-area">
            <p>
              {saved
                ? "Your preferences have been applied for this session."
                : "Preferences are not saved permanently yet."}
            </p>

            <button type="submit" className="settings-save-button">
              {saved ? <Check size={17} /> : <Save size={17} />}
              {saved ? "Applied" : "Apply Preferences"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default Settings;
