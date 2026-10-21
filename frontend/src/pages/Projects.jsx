
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FolderOpen,
  Grid2X2,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  RefreshCw,
  Play,
  Film,
  AlertCircle,
  Trash2,
} from "lucide-react";
import api from "../services/api";

const API_BASE = "http://127.0.0.1:8000";
const STORAGE_KEY = "easycut-generated-result";

function resolveVideoUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function parseSettings(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

export default function Projects() {
  const navigate = useNavigate();

  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [openingId, setOpeningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [menuProjectId, setMenuProjectId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    ready: false,
  });

  const menuButtonRefs = useRef({});
  const menuRef = useRef(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/auth/projects");
      setProjects(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError(
        err.response?.status === 401 || err.response?.status === 403
          ? "Please log in again to view your projects."
          : err.response?.data?.detail ||
              "Could not load projects. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => loadProjects());
    return () => window.cancelAnimationFrame(frame);
  }, [loadProjects]);

  const filteredProjects = projects.filter((project) =>
    (project.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const updateMenuPosition = useCallback(() => {
    if (menuProjectId === null) return;

    const button = menuButtonRefs.current[menuProjectId];
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = Math.min(180, window.innerWidth - 16);
    const menuHeight = 52;
    const gap = 6;
    const edge = 8;

    let left = rect.right - menuWidth;
    left = Math.max(edge, Math.min(left, window.innerWidth - menuWidth - edge));

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top =
      spaceBelow >= menuHeight + gap + edge || spaceBelow >= spaceAbove
        ? rect.bottom + gap
        : rect.top - menuHeight - gap;

    top = Math.max(
      edge,
      Math.min(top, window.innerHeight - menuHeight - edge)
    );

    setMenuPosition({ top, left, ready: true });
  }, [menuProjectId]);

  useLayoutEffect(() => {
    if (menuProjectId === null) {
      return;
    }

    updateMenuPosition();

    const handleScroll = () => updateMenuPosition();
    const handleResize = () => updateMenuPosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuProjectId, updateMenuPosition]);

  useEffect(() => {
    if (menuProjectId === null) return;

    function handlePointerDown(event) {
      const button = menuButtonRefs.current[menuProjectId];

      if (
        menuRef.current?.contains(event.target) ||
        button?.contains(event.target)
      ) {
        return;
      }

      setMenuProjectId(null);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setMenuProjectId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuProjectId]);

  async function openProject(project) {
    setOpeningId(project.id);
    setActionError("");
    setMenuProjectId(null);

    try {
      const response = await api.get(`/auth/projects/${project.id}`);
      const savedProject = response.data || project;

      const sourceUrl = resolveVideoUrl(savedProject.video_url || "");
      const finalUrl = resolveVideoUrl(savedProject.final_video_url || "");
      const editorSettings = parseSettings(savedProject.editor_settings);
      const workflowData = editorSettings.projectData || {};

      const projectData = {
        projectId: savedProject.id,
        id: savedProject.id,
        projectName: savedProject.name || "My EasyCut project",
        name: savedProject.name || "My EasyCut project",
        description: savedProject.description || "",
        // Editor changes must be rendered from the source, otherwise saved
        // text and stickers would be burned into the already-edited output again.
        videoUrl: sourceUrl || finalUrl,
        originalVideoUrl: sourceUrl,
        finalVideoUrl: finalUrl,
        editorSettings,
        projectData: workflowData,
        savedToDatabase: true,
      };

      if (!projectData.videoUrl) {
        navigate("/create-project", {
          state: {
            projectId: savedProject.id,
            projectName: savedProject.name,
            description: savedProject.description || "",
            projectData: workflowData,
            editorSettings,
          },
        });
        return;
      }

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
      navigate(`/editor/${savedProject.id}`, { state: projectData });
    } catch (err) {
      console.error("Could not open project:", err);
      setActionError(
        err.response?.data?.detail ||
          "Could not open this project. Please try again."
      );
    } finally {
      setOpeningId(null);
    }
  }

  async function deleteProject(project) {
    const confirmed = window.confirm(
      `Delete "${project.name}" permanently? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(project.id);
    setMenuProjectId(null);
    setActionError("");

    try {
      await api.delete(`/auth/projects/${project.id}`);

      setProjects((current) =>
        current.filter((item) => item.id !== project.id)
      );

      try {
        const cached = JSON.parse(
          sessionStorage.getItem(STORAGE_KEY) || "{}"
        );

        if (String(cached.projectId ?? cached.id) === String(project.id)) {
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(`easycut-editor-settings-${project.id}`);
        }
      } catch (storageError) {
        console.warn("Could not clear project cache:", storageError);
      }
    } catch (err) {
      console.error("Could not delete project:", err);
      setActionError(
        err.response?.data?.detail ||
          "Could not delete this project. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function toggleProjectMenu(event, projectId) {
    event.stopPropagation();

    if (menuProjectId === projectId) {
      setMenuProjectId(null);
      return;
    }

    setMenuPosition({ top: 0, left: 0, ready: false });
    setMenuProjectId(projectId);
  }

  const activeMenuProject = projects.find(
    (project) => project.id === menuProjectId
  );

  const deleteMenu =
    menuProjectId !== null &&
    activeMenuProject &&
    menuPosition.ready
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 999999,
              width: 180,
              boxSizing: "border-box",
              padding: 5,
              margin: 0,
              background: "#ffffff",
              border: "1px solid #e8e3ee",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(35,25,55,.15)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              disabled={deletingId === activeMenuProject.id}
              onClick={() => deleteProject(activeMenuProject)}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 9,
                width: "100%",
                minWidth: 0,
                minHeight: 38,
                boxSizing: "border-box",
                padding: "9px 10px",
                margin: 0,
                border: 0,
                borderRadius: 7,
                background: "transparent",
                color: "#c44753",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 500,
                lineHeight: "18px",
                textAlign: "left",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              <Trash2 size={15} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap" }}>
                {deletingId === activeMenuProject.id
                  ? "Deleting..."
                  : "Delete project"}
              </span>
            </button>
          </div>,
          document.body
        )
      : null;

  return (
    <main className="projects-page">
      <aside className="projects-sidebar">
        <Link to="/" className="projects-logo">
          <span className="projects-logo-icon">
            <Sparkles size={17} />
          </span>
          EasyCut
        </Link>

        <nav className="projects-nav">
          <p>Workspace</p>
          <Link to="/dashboard" className="projects-nav-item">
            <Sparkles size={17} />
            Dashboard
          </Link>
          <Link to="/projects" className="projects-nav-item active">
            <FolderOpen size={17} />
            Projects
          </Link>
          <Link to="/templates" className="projects-nav-item">
            <Sparkles size={17} />
            Templates
          </Link>

          <p className="projects-nav-spaced">Account</p>
          <Link to="/account" className="projects-nav-item">
            <Sparkles size={17} />
            Account
          </Link>
          <Link to="/settings" className="projects-nav-item">
            <Sparkles size={17} />
            Settings
          </Link>
        </nav>

        <div className="projects-sidebar-bottom">
          <div className="projects-plan-card">
            <Sparkles size={15} />
            <div>
              <strong>Free Plan</strong>
              <span>{projects.length} projects created</span>
            </div>
            <Link to="/subscription">
              Upgrade <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </aside>

      <section className="projects-main">
        <header className="projects-topbar">
          <div>
            <span>Workspace</span>
            <strong> / Projects</strong>
          </div>
          <Link to="/create-project" state={{ startNew: true }} className="projects-new-button">
            <Plus size={16} />
            New Project
          </Link>
        </header>

        <div className="projects-content">
          <section className="projects-heading">
            <div>
              <div className="projects-eyebrow">
                <Sparkles size={13} />
                Your workspace
              </div>
              <h1>Your Projects</h1>
              <p>All your EasyCut video projects in one place.</p>
            </div>

            <button
              type="button"
              className="projects-view-button"
              onClick={loadProjects}
              disabled={loading}
              title="Refresh projects"
              aria-label="Refresh projects"
            >
              <RefreshCw size={16} />
            </button>
          </section>

          <section className="projects-toolbar">
            <div className="projects-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="projects-view-controls">
              <button
                type="button"
                className={
                  view === "grid"
                    ? "projects-view-button active"
                    : "projects-view-button"
                }
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <Grid2X2 size={16} />
              </button>

              <button
                type="button"
                className={
                  view === "list"
                    ? "projects-view-button active"
                    : "projects-view-button"
                }
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List size={17} />
              </button>
            </div>
          </section>

          {actionError && (
            <section className="projects-empty">
              <p>
                <AlertCircle size={16} /> {actionError}
              </p>
              <button
                type="button"
                className="projects-clear-button"
                onClick={() => setActionError("")}
              >
                Dismiss
              </button>
            </section>
          )}

          {loading ? (
            <section className="projects-empty">
              <p>Loading your projects...</p>
            </section>
          ) : error ? (
            <section className="projects-empty">
              <h2>Couldn't load projects</h2>
              <p>{error}</p>
              <button
                type="button"
                className="projects-clear-button"
                onClick={loadProjects}
              >
                Try again
              </button>
            </section>
          ) : filteredProjects.length === 0 ? (
            <section className="projects-empty">
              <div className="projects-empty-visual">
                <div className="projects-empty-ring ring-a" />
                <div className="projects-empty-ring ring-b" />
                <div className="projects-empty-icon">
                  <FolderOpen size={25} />
                </div>
              </div>

              {search ? (
                <>
                  <h2>No projects found</h2>
                  <p>
                    We couldn't find a project matching{" "}
                    <strong>"{search}"</strong>.
                  </p>
                  <button
                    type="button"
                    className="projects-clear-button"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <h2>No projects yet</h2>
                  <p>
                    Your saved projects will appear here after you create
                    one while logged in.
                  </p>
                  <Link
                    to="/create-project"
                    state={{ startNew: true }}
                    className="projects-empty-button"
                  >
                    <Plus size={16} />
                    Create your first project
                  </Link>
                </>
              )}
            </section>
          ) : (
            <section
              className={
                view === "grid" ? "projects-grid" : "projects-list"
              }
            >
              {filteredProjects.map((project) => {
                const savedVideo =
                  project.final_video_url || project.video_url;
                const menuOpen = menuProjectId === project.id;

                return (
                  <article
                    className="project-card"
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open project ${project.name}`}
                    onClick={() => openProject(project)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        openProject(project);
                      }
                    }}
                  >
                    <div className="project-card-thumbnail">
                      <span>
                        {savedVideo ? (
                          <Play size={19} />
                        ) : (
                          <Film size={19} />
                        )}
                      </span>
                      {openingId === project.id && (
                        <span className="project-opening-label">
                          Opening...
                        </span>
                      )}
                    </div>

                    <div className="project-card-info">
                      <div>
                        <h3>{project.name}</h3>
                        <p>{formatDate(project.created_at)}</p>
                        {project.description && (
                          <p>{project.description}</p>
                        )}
                        <p>
                          {savedVideo
                            ? "Video saved · Click to edit"
                            : "No video saved yet"}
                        </p>
                      </div>

                      <div className="project-card-menu">
                        <button
                          ref={(element) => {
                            if (element) {
                              menuButtonRefs.current[project.id] = element;
                            } else {
                              delete menuButtonRefs.current[project.id];
                            }
                          }}
                          type="button"
                          className="project-more-button"
                          aria-label={`Actions for ${project.name}`}
                          aria-expanded={menuOpen}
                          aria-haspopup="menu"
                          title="Project actions"
                          disabled={
                            openingId === project.id ||
                            deletingId === project.id
                          }
                          onClick={(event) =>
                            toggleProjectMenu(event, project.id)
                          }
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </section>

      {deleteMenu}
    </main>
  );
}
