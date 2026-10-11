import {
  ArrowRight,
  FolderOpen,
  Grid2X2,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

function Projects() {
  const [view, setView] = useState("grid");
  const [search, setSearch] = useState("");

  // Real projects will be loaded from the backend later.
  const projects = [];

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="projects-page">
      {/* Sidebar */}
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

          <Link
            to="/projects"
            className="projects-nav-item active"
          >
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
              <span>5 projects available</span>
            </div>

            <Link to="/pricing">
              Upgrade
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main */}
      <section className="projects-main">
        <header className="projects-topbar">
          <div>
            <span>Workspace</span>
            <strong> / Projects</strong>
          </div>

          <Link to="/create-project" className="projects-new-button">
            <Plus size={16} />
            New Project
          </Link>
        </header>

        <div className="projects-content">
          {/* Heading */}
          <section className="projects-heading">
            <div>
              <div className="projects-eyebrow">
                <Sparkles size={13} />
                Your workspace
              </div>

              <h1>Your Projects</h1>

              <p>
                All your EasyCut video projects in one place.
              </p>
            </div>

          </section>

          {/* Toolbar */}
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

          {/* Projects */}
          {filteredProjects.length === 0 ? (
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
                    Your AI-generated videos will appear here after
                    you create your first project.
                  </p>

                  <Link
                    to="/create-project"
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
                view === "grid"
                  ? "projects-grid"
                  : "projects-list"
              }
            >
              {filteredProjects.map((project) => (
                <article
                  className="project-card"
                  key={project.id}
                >
                  <div className="project-card-thumbnail">
                    <span>
                      <Sparkles size={17} />
                    </span>
                  </div>

                  <div className="project-card-info">
                    <div>
                      <h3>{project.name}</h3>
                      <p>{project.createdAt}</p>
                    </div>

                    <button
                      type="button"
                      className="project-more-button"
                      aria-label="Project options"
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

export default Projects;