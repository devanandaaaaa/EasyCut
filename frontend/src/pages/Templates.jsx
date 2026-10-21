import {
  ArrowRight,
  Film,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const categories = [
  "All",
  "Cinematic",
  "Travel",
  "Vlog",
  "Social",
  "Documentary",
  "Product",
];

const templates = [
  {
    id: 1,
    name: "Cinematic Story",
    category: "Cinematic",
    description:
      "A polished cinematic structure for story-driven videos.",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 2,
    name: "Travel Journal",
    category: "Travel",
    description:
      "A dynamic format for journeys, adventures and memories.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 3,
    name: "Daily Vlog",
    category: "Vlog",
    description:
      "A clean structure for everyday moments and personal stories.",
    image:
      "https://images.unsplash.com/photo-1492724441997-5dc865305da7?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 4,
    name: "Short Social",
    category: "Social",
    description:
      "A fast-paced format designed for short-form content.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 5,
    name: "Visual Documentary",
    category: "Documentary",
    description:
      "A thoughtful structure for documentary-style storytelling.",
    image:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: 6,
    name: "Product Showcase",
    category: "Product",
    description:
      "A focused format for showcasing products and features.",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=85",
  },
];

function Templates() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory =
      category === "All" || template.category === category;

    const matchesSearch =
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <main className="templates-page">
      {/* Sidebar */}
      <aside className="templates-sidebar">
        <Link to="/" className="templates-logo">
          <span className="templates-logo-icon">
            <Sparkles size={17} />
          </span>
          EasyCut
        </Link>

        <nav className="templates-nav">
          <p>Workspace</p>

          <Link to="/dashboard" className="templates-nav-item">
            <Sparkles size={17} />
            Dashboard
          </Link>

          <Link to="/projects" className="templates-nav-item">
            <Film size={17} />
            Projects
          </Link>

          <Link
            to="/templates"
            className="templates-nav-item active"
          >
            <WandSparkles size={17} />
            Templates
          </Link>

          <p className="templates-nav-spaced">Account</p>

          <Link to="/account" className="templates-nav-item">
            <Sparkles size={17} />
            Account
          </Link>

          <Link to="/settings" className="templates-nav-item">
            <Sparkles size={17} />
            Settings
          </Link>
        </nav>

        <div className="templates-plan-card">
          <Sparkles size={15} />

          <strong>Free Plan</strong>
          <span>5 projects available</span>

          <Link to="/pricing">
            Upgrade
            <ArrowRight size={12} />
          </Link>
        </div>
      </aside>

      {/* Main */}
      <section className="templates-main">
        <header className="templates-topbar">
          <div>
            <span>Workspace</span>
            <strong> / Templates</strong>
          </div>

          <Link
            to="/create-project"
            state={{ startNew: true }}
            className="templates-new-button"
          >
            <Sparkles size={15} />
            New Project
          </Link>
        </header>

        <div className="templates-content">
          {/* Heading */}
          <section className="templates-heading">
            <div>
              <div className="templates-eyebrow">
                <WandSparkles size={13} />
                Creative library
              </div>

              <h1>Templates</h1>

              <p>
                Start with a structure and let EasyCut shape your
                story around it.
              </p>
            </div>
          </section>

          {/* Featured Template */}
          <section className="templates-featured">
            <div className="templates-featured-content">
              <span className="templates-featured-badge">
                <Sparkles size={13} />
                Featured template
              </span>

              <h2>
                Tell your story
                <br />
                <span>cinematically.</span>
              </h2>

              <p>
                A flexible AI editing structure designed for
                cinematic storytelling, travel films and personal
                stories.
              </p>

              <Link
                to="/create-project"
                state={{ template: "Cinematic Story" }}
                className="templates-featured-button"
              >
                Start with this template
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="templates-featured-visual">
              <img
                src="https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=90"
                alt="Cinematic mountain landscape"
              />

              <div className="templates-featured-overlay">
                <span>
                  <Sparkles size={13} />
                  AI Cinematic
                </span>
              </div>
            </div>
          </section>

          {/* Toolbar */}
          <section className="templates-toolbar">
            <div className="templates-search">
              <Search size={16} />

              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <div className="templates-category-list">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={
                    category === item
                      ? "templates-category active"
                      : "templates-category"
                  }
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          {/* Template Grid */}
          {filteredTemplates.length > 0 ? (
            <section className="templates-grid">
              {filteredTemplates.map((template) => (
                <article
                  className="template-card"
                  key={template.id}
                >
                  <div className="template-thumbnail">
                    <img
                      src={template.image}
                      alt={template.name}
                    />

                    <span>{template.category}</span>
                  </div>

                  <div className="template-card-content">
                    <h3>{template.name}</h3>

                    <p>{template.description}</p>

                    <Link
                      to="/create-project"
                      state={{ template: template.name }}
                      className="template-use-button"
                    >
                      Use Template
                      <ArrowRight size={14} />
                    </Link>

                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="templates-empty">
              <div className="templates-empty-icon">
                <Search size={22} />
              </div>

              <h2>No templates found</h2>

              <p>
                Try another search or choose a different category.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
              >
                Clear filters
              </button>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

export default Templates;
