import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  FolderOpen,
  LayoutTemplate,
  Plus,
  Settings,
  UserCircle,
  CreditCard,
  Sparkles,
  LogOut,
  Mic,
  FileText,
  Video,
  Search,
  Wrench,
} from "lucide-react";

import api from "../services/api";

function Dashboard() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("Creator");
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("easycut-token");

    if (!token) {
      return;
    }

    api
      .get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((response) => {
        setUsername(response.data.username);
      })
      .catch((error) => {
        console.error("Could not load user profile:", error);
      });

    api
      .get("/auth/projects")
      .then((response) => {
        setProjects(response.data);
      })
      .catch((error) => {
        console.error("Could not load projects:", error);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("easycut-token");
    navigate("/");
  };

  const handleOpenProject = (project) => {
    navigate(`/projects/${project.id}`);
  };

  const getProjectDate = (project) => {
    if (!project.created_at) {
      return "Recently created";
    }

    return new Date(project.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <main className="dashboard-page">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <Link to="/dashboard" className="dashboard-brand">
          <span className="dashboard-brand-icon">
            <Video size={20} />
          </span>
          <span>EasyCut</span>
        </Link>

        <nav className="dashboard-sidebar-nav">
          <Link to="/dashboard" className="dashboard-sidebar-link active">
            <Sparkles size={19} />
            <span>Dashboard</span>
          </Link>

          <Link to="/create-project" className="dashboard-sidebar-link">
            <Plus size={19} />
            <span>New Project</span>
          </Link>

          <Link to="/projects" className="dashboard-sidebar-link">
            <FolderOpen size={19} />
            <span>Projects</span>
          </Link>

          <Link to="/templates" className="dashboard-sidebar-link">
            <LayoutTemplate size={19} />
            <span>Templates</span>
          </Link>

          <Link to="/ai-tools" className="dashboard-sidebar-link">
            <Wrench size={19} />
            <span>AI Tools</span>
          </Link>

          <Link to="/pricing" className="dashboard-sidebar-link">
            <CreditCard size={19} />
            <span>Subscriptions</span>
          </Link>

          <Link to="/settings" className="dashboard-sidebar-link">
            <Settings size={19} />
            <span>Settings</span>
          </Link>

          <Link to="/support" className="dashboard-sidebar-link">
            <UserCircle size={19} />
            <span>Support</span>
          </Link>
        </nav>

        <button
          type="button"
          className="dashboard-sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main dashboard */}
      <section className="dashboard-main">
        {/* Top bar */}
        <header className="dashboard-topbar">
          <div className="dashboard-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search projects..."
              aria-label="Search projects"
            />
          </div>

          <div className="dashboard-top-actions">
            <button type="button" className="dashboard-icon-button">
              <Bell size={20} />
            </button>

            <button type="button" className="dashboard-icon-button">
              <Bell size={20} />
            </button>

            <Link to="/account" className="dashboard-profile">
              <UserCircle size={34} />
            </Link>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Welcome */}
          <section className="dashboard-welcome-new">
            <div>
              <h1>
                Welcome back, {username}! <span>👋</span>
              </h1>

              <p className="dashboard-usage">
                You have used <strong>{Math.min(projects.length, 5)} of 5</strong>{" "}
                free projects
              </p>
            </div>

            <Link
              to="/create-project"
              className="dashboard-create-new-button"
            >
              Create New Project
              <Plus size={19} />
            </Link>
          </section>

          {/* Creation options */}
          <section className="dashboard-create-options">
            <Link to="/create-project" className="dashboard-create-card text">
              <div className="dashboard-create-card-icon">
                <Sparkles size={25} />
              </div>

              <h3>Create from Text</h3>

              <p>Turn your script into video</p>
            </Link>

            <Link
              to="/create-project"
              className="dashboard-create-card audio"
            >
              <div className="dashboard-create-card-icon">
                <Mic size={25} />
              </div>

              <h3>Uploaded Audio / MP3</h3>

              <p>Use your voiceover</p>
            </Link>

            <Link
              to="/create-project"
              className="dashboard-create-card voice"
            >
              <div className="dashboard-create-card-icon">
                <Mic size={25} />
              </div>

              <h3>Record Voice</h3>

              <p>Record directly here</p>
            </Link>
          </section>

          {/* Recent projects */}
          <section className="dashboard-recent-section">
            <div className="dashboard-section-heading-new">
              <h2>Recent Projects</h2>

              <Link to="/projects">
                View All →
              </Link>
            </div>

            {projects.length > 0 ? (
              <div className="dashboard-projects-grid-new">
                {projects.slice(0, 6).map((project) => (
                  <article
                    className="dashboard-project-card-new"
                    key={project.id}
                    onClick={() => handleOpenProject(project)}
                  >
                    <div className="dashboard-project-thumbnail">
                      <div className="dashboard-project-thumbnail-icon">
                        <Video size={30} />
                      </div>
                    </div>

                    <div className="dashboard-project-card-details">
                      <div>
                        <h3>{project.name}</h3>
                        <p>{getProjectDate(project)}</p>
                      </div>

                      <button
                        type="button"
                        className="dashboard-project-menu"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenProject(project);
                        }}
                        aria-label={`Open ${project.name}`}
                      >
                        ⋮
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">
                  <FolderOpen size={28} />
                </div>

                <h3>No projects yet</h3>

                <p>
                  Create your first AI-generated video and it will appear here.
                </p>

                <Link
                  to="/create-project"
                  className="dashboard-empty-button"
                >
                  <Plus size={17} />
                  Create your first project
                </Link>
              </div>
            )}
          </section>

          {/* Quick links */}
          <section className="dashboard-quick-links">
            <Link to="/templates" className="dashboard-quick-link">
              <LayoutTemplate size={20} />
              <span>Templates</span>
            </Link>

            <Link to="/pricing" className="dashboard-quick-link">
              <CreditCard size={20} />
              <span>Subscription</span>
            </Link>

            <Link to="/account" className="dashboard-quick-link">
              <UserCircle size={20} />
              <span>Account</span>
            </Link>

            <Link to="/settings" className="dashboard-quick-link">
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;