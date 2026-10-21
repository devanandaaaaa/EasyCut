
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
  User,
  WandSparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardProjects() {
      setProjectsLoading(true);
      setProjectsError("");

      try {
        const [response, usageResponse] = await Promise.all([
          api.get("/auth/projects"),
          api.get("/auth/usage"),
        ]);
        const items = Array.isArray(response.data) ? response.data : [];

        items.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );

        if (!cancelled) {
          setRecentProjects(items);
          setUsage(usageResponse.data);
        }
      } catch (error) {
        console.error("Could not load dashboard projects:", error);

        if (!cancelled) {
          setProjectsError(
            error.response?.data?.detail ||
              "Could not load projects. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }

    loadDashboardProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalProjects = recentProjects.length;

  const videosCreated = recentProjects.filter(
    (project) => Boolean(project.final_video_url || project.video_url)
  ).length;

  const aiProjectsLeft = usage?.subscription_active
    ? "Unlimited"
    : Math.max(0, 5 - (usage?.project_count ?? totalProjects));

  function handleLogout() {
    localStorage.removeItem("easycut-token");
    setIsUserMenuOpen(false);
    navigate("/login");
  }

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-logo">
          <span className="dashboard-logo-icon">
            <Sparkles size={17} />
          </span>
          EasyCut
        </Link>

        <nav className="dashboard-nav">
          <p className="dashboard-nav-label">Workspace</p>

          <Link
            to="/dashboard"
            className="dashboard-nav-item active"
          >
            <LayoutDashboard size={17} />
            Dashboard
          </Link>

          <Link to="/projects" className="dashboard-nav-item">
            <FolderOpen size={17} />
            Projects
          </Link>

          <Link to="/templates" className="dashboard-nav-item">
            <WandSparkles size={17} />
            Templates
          </Link>

          <p className="dashboard-nav-label dashboard-nav-label-spaced">
            Account
          </p>

          <Link to="/account" className="dashboard-nav-item">
            <User size={17} />
            Account
          </Link>

          <Link to="/settings" className="dashboard-nav-item">
            <Settings size={17} />
            Settings
          </Link>

          <Link to="/about" className="dashboard-nav-item">
            <Sparkles size={17} />
            About EasyCut
          </Link>
        </nav>

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-free-card">
            <div className="dashboard-free-icon">
              <Sparkles size={15} />
            </div>

            <div>
              <strong>Free Plan</strong>
              <span>{aiProjectsLeft} projects available</span>
            </div>

            <Link to="/subscription">
              Upgrade <ArrowRight size={13} />
            </Link>
          </div>

          <button
            type="button"
            className="dashboard-nav-item dashboard-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="dashboard-mobile-menu"
            aria-label="Open menu"
            onClick={() => setIsWorkspaceMenuOpen((current) => !current)}
          >
            <Menu size={19} />
          </button>

          <div className="dashboard-workspace-menu">
            <button
              type="button"
              className="dashboard-breadcrumb"
              onClick={() =>
                setIsWorkspaceMenuOpen((current) => !current)
              }
              aria-expanded={isWorkspaceMenuOpen}
              aria-haspopup="menu"
            >
              <span>Workspace</span>
              <ChevronDown
                size={14}
                className={
                  isWorkspaceMenuOpen
                    ? "dashboard-user-chevron-open"
                    : ""
                }
              />
            </button>

            {isWorkspaceMenuOpen && (
              <div
                className="dashboard-workspace-dropdown"
                role="menu"
              >
                <Link
                  to="/dashboard"
                  className="dashboard-dropdown-item"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/about"
                  className="dashboard-dropdown-item"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                >
                  <Sparkles size={16} />
                  <span>About EasyCut</span>
                </Link>

                <Link
                  to="/account"
                  className="dashboard-dropdown-item"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                >
                  <User size={16} />
                  <span>Account</span>
                </Link>

                <Link
                  to="/settings"
                  className="dashboard-dropdown-item"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
              </div>
            )}
          </div>

          <div className="dashboard-topbar-actions">
            <button
              type="button"
              className="dashboard-theme-button"
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

            <div className="dashboard-user-menu">
              <button
                type="button"
                className="dashboard-user"
                onClick={() =>
                  setIsUserMenuOpen((current) => !current)
                }
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
              >
                <div className="dashboard-avatar">D</div>

                <div className="dashboard-user-info">
                  <strong>Devananda</strong>
                  <span>Free Plan</span>
                </div>

                <ChevronDown
                  size={14}
                  className={
                    isUserMenuOpen
                      ? "dashboard-user-chevron-open"
                      : ""
                  }
                />
              </button>

              {isUserMenuOpen && (
                <div className="dashboard-user-dropdown" role="menu">
                  <div className="dashboard-dropdown-profile">
                    <div className="dashboard-avatar">D</div>
                    <div>
                      <strong>Devananda</strong>
                      <span>Free Plan</span>
                    </div>
                  </div>

                  <div className="dashboard-dropdown-divider" />

                  <Link
                    to="/account"
                    className="dashboard-dropdown-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User size={16} />
                    <span>Account</span>
                  </Link>

                  <Link
                    to="/settings"
                    className="dashboard-dropdown-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>

                  <Link
                    to="/projects"
                    className="dashboard-dropdown-item"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <FolderOpen size={16} />
                    <span>Projects</span>
                  </Link>

                  <div className="dashboard-dropdown-divider" />

                  <button
                    type="button"
                    className="dashboard-dropdown-item dashboard-dropdown-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-welcome">
            <div>
              <div className="dashboard-eyebrow">
                <Sparkles size={14} />
                AI Video Studio
              </div>

              <h1>
                Welcome back, <span>Devananda.</span>
              </h1>

              <p>
                Turn your scripts, voiceovers and raw footage into
                intelligently edited videos.
              </p>
            </div>

            <Link
              to="/create-project"
              state={{ startNew: true }}
              className="dashboard-create-button"
            >
              <Plus size={18} />
              New Project
            </Link>
          </section>

          <section className="dashboard-ai-card">
            <div className="dashboard-ai-content">
              <div className="dashboard-ai-badge">
                <Sparkles size={14} />
                AI-powered editing
              </div>

              <h2>
                Start with an idea.
                <br />
                <span>EasyCut handles the rest.</span>
              </h2>

              <p>
                Give EasyCut your story, voiceover and footage. Our AI
                understands your content and finds the right scenes
                automatically.
              </p>

              <Link
                to="/create-project"
                state={{ startNew: true }}
                className="dashboard-ai-button"
              >
                Create with AI
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="dashboard-ai-visual">
              <div className="dashboard-ai-orbit">
                <Sparkles size={28} />
              </div>

              <div className="dashboard-ai-node node-one">
                <Clock3 size={15} />
              </div>

              <div className="dashboard-ai-node node-two">
                <WandSparkles size={15} />
              </div>

              <div className="dashboard-ai-node node-three">
                <FolderOpen size={15} />
              </div>

              <div className="dashboard-ai-ring ring-one" />
              <div className="dashboard-ai-ring ring-two" />
            </div>
          </section>

          <section className="dashboard-stats">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <FolderOpen size={17} />
              </div>
              <div>
                <span>Total Projects</span>
                <strong>{totalProjects}</strong>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <Clock3 size={17} />
              </div>
              <div>
                <span>Videos Created</span>
                <strong>{videosCreated}</strong>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="dashboard-stat-icon">
                <Sparkles size={17} />
              </div>
              <div>
                <span>AI Projects Left</span>
                <strong>{aiProjectsLeft}</strong>
              </div>
            </div>
          </section>

          {!usage?.subscription_active && (
            <section className="dashboard-project-section" aria-live="polite">
              <div className="dashboard-section-heading">
                <div>
                  <h2>Free project usage</h2>
                  <p>{usage?.project_count ?? totalProjects}/5 projects used</p>
                </div>
                {(usage?.project_count ?? totalProjects) >= 5 && (
                  <Link to="/subscription">
                    View Premium plans <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </section>
          )}

          <section className="dashboard-project-section">
            <div className="dashboard-section-heading">
              <div>
                <h2>Recent Projects</h2>
                <p>Your latest video projects will appear here.</p>
              </div>

              <Link to="/projects">
                View all
                <ArrowRight size={14} />
              </Link>
            </div>

            {projectsLoading ? (
              <div className="dashboard-empty">
                <p>Loading your projects...</p>
              </div>
            ) : projectsError ? (
              <div className="dashboard-empty">
                <h3>Couldn't load projects</h3>
                <p>{projectsError}</p>
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">
                  <FolderOpen size={22} />
                </div>

                <h3>No projects yet</h3>
                <p>
                  Create your first AI-powered video and it will appear
                  here.
                </p>

                <Link
                  to="/create-project"
                  state={{ startNew: true }}
                  className="dashboard-empty-button"
                >
                  <Plus size={16} />
                  Create your first project
                </Link>
              </div>
            ) : (
              <div className="dashboard-project-grid">
                {recentProjects.slice(0, 4).map((project) => (
                  <button
                    type="button"
                    className="dashboard-project-card"
                    key={project.id}
                    onClick={() => navigate("/projects")}
                  >
                    <span className="dashboard-project-icon">
                      <FolderOpen size={20} />
                    </span>

                    <span className="dashboard-project-details">
                      <strong>{project.name}</strong>
                      <small>
                        {project.created_at
                          ? new Date(
                              project.created_at
                            ).toLocaleDateString()
                          : "Date unavailable"}
                      </small>
                      <small>
                        {project.final_video_url || project.video_url
                          ? "Video saved"
                          : "No video saved yet"}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
