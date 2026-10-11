import { useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  FileVideo,
  FolderOpen,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

function Account() {
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [name, setName] = useState("Devananda K");
  const [email, setEmail] = useState("devananda@example.com");

  const [editName, setEditName] = useState(name);
  const [editEmail, setEditEmail] = useState(email);

  const handleEditOpen = () => {
    setEditName(name);
    setEditEmail(email);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setEditName(name);
    setEditEmail(email);
    setIsEditing(false);
  };

  const handleEditSave = (event) => {
    event.preventDefault();

    if (!editName.trim() || !editEmail.trim()) {
      return;
    }

    setName(editName.trim());
    setEmail(editEmail.trim());
    setIsEditing(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <main className="account-page">
      <div className="account-shell">

        {/* Header */}
        <header className="account-header">
          <Link to="/" className="account-brand">
            <span className="account-brand-icon">
              <Sparkles size={17} />
            </span>
            <span>EasyCut</span>
          </Link>

          <Link to="/dashboard" className="account-back">
            <ArrowLeft size={15} />
            Back to Dashboard
          </Link>
        </header>

        {/* Page heading */}
        <section className="account-heading">
          <div>
            <span className="account-eyebrow">
              <User size={13} />
              Account
            </span>

            <h1>Your account</h1>

            <p>
              Manage your profile, account information, and EasyCut
              workspace.
            </p>
          </div>
        </section>

        {/* Main grid */}
        <section className="account-grid">

          {/* Profile */}
          <article className="account-card account-profile-card">
            <div className="account-card-header">
              <div>
                <h2>Profile</h2>
                <p>Your personal account information.</p>
              </div>

              <button
                type="button"
                className="account-icon-button"
                title="Edit profile"
                onClick={handleEditOpen}
              >
                <Pencil size={16} />
              </button>
            </div>

            <div className="account-profile">
              <div className="account-avatar">
                <span>
                  {name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>

                <button
                  type="button"
                  className="account-avatar-camera"
                  title="Change profile picture"
                >
                  <Camera size={13} />
                </button>
              </div>

              <div className="account-profile-info">
                <h3>{name}</h3>
                <p>{email}</p>

                <span className="account-status">
                  <span className="account-status-dot" />
                  Active account
                </span>
              </div>
            </div>

            <div className="account-details">
              <div className="account-detail-row">
                <div className="account-detail-icon">
                  <User size={16} />
                </div>

                <div>
                  <span>Name</span>
                  <strong>{name}</strong>
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-icon">
                  <Mail size={16} />
                </div>

                <div>
                  <span>Email</span>
                  <strong>{email}</strong>
                </div>
              </div>

              <div className="account-detail-row">
                <div className="account-detail-icon">
                  <ShieldCheck size={16} />
                </div>

                <div>
                  <span>Account security</span>
                  <strong>Password protected</strong>
                </div>
              </div>
            </div>
          </article>

          {/* Plan */}
          <article className="account-card account-plan-card">
            <div className="account-card-header">
              <div>
                <h2>Your plan</h2>
                <p>Your current EasyCut usage.</p>
              </div>

              <span className="account-plan-badge">
                Free
              </span>
            </div>

            <div className="account-plan-main">
              <div className="account-plan-icon">
                <Sparkles size={22} />
              </div>

              <div>
                <h3>Free Plan</h3>
                <p>
                  Perfect for getting started with EasyCut.
                </p>
              </div>
            </div>

            <div className="account-usage">
              <div className="account-usage-top">
                <span>Projects used</span>
                <strong>0 / 5</strong>
              </div>

              <div className="account-progress">
                <span style={{ width: "0%" }} />
              </div>

              <p>
                You have 5 free projects available before
                upgrading is required.
              </p>
            </div>

            <Link
              to="/subscription"
              className="account-primary-button"
            >
              Explore Premium
              <ChevronRight size={16} />
            </Link>
          </article>

          {/* Workspace */}
          <article className="account-card account-stats-card">
            <div className="account-card-header">
              <div>
                <h2>Workspace overview</h2>
                <p>A quick look at your EasyCut workspace.</p>
              </div>
            </div>

            <div className="account-stats">
              <div className="account-stat">
                <div className="account-stat-icon">
                  <FolderOpen size={18} />
                </div>

                <div>
                  <strong>0</strong>
                  <span>Projects</span>
                </div>
              </div>

              <div className="account-stat">
                <div className="account-stat-icon">
                  <FileVideo size={18} />
                </div>

                <div>
                  <strong>0</strong>
                  <span>Videos created</span>
                </div>
              </div>

              <div className="account-stat">
                <div className="account-stat-icon">
                  <Check size={18} />
                </div>

                <div>
                  <strong>0</strong>
                  <span>Exports</span>
                </div>
              </div>
            </div>
          </article>

          {/* Account actions */}
          <article className="account-card account-actions-card">
            <div className="account-card-header">
              <div>
                <h2>Account actions</h2>
                <p>Manage your EasyCut account.</p>
              </div>
            </div>

            <div className="account-action-list">

              <Link
                to="/settings"
                className="account-action"
              >
                <div className="account-action-left">
                  <div className="account-action-icon">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <strong>Account & Security</strong>
                    <span>
                      Manage password and security
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} />
              </Link>

              <button
                type="button"
                className="account-action account-logout"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <div className="account-action-left">
                  <div className="account-action-icon">
                    <LogOut size={17} />
                  </div>

                  <div>
                    <strong>Log out</strong>
                    <span>
                      Sign out of this account
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} />
              </button>

            </div>
          </article>

        </section>

        {/* Footer */}
        <footer className="account-footer">
          <span>EasyCut</span>
          <span>AI-powered video creation</span>
        </footer>

      </div>

      {/* =====================================================
          EDIT PROFILE MODAL
          ===================================================== */}

      {isEditing && (
        <div
          className="account-modal-overlay"
          onMouseDown={handleEditCancel}
        >
          <div
            className="account-edit-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="account-edit-header">
              <div>
                <span className="account-eyebrow">
                  <Pencil size={13} />
                  Edit Profile
                </span>

                <h2>Update your profile</h2>

                <p>
                  Change the information displayed on your
                  EasyCut account.
                </p>
              </div>

              <button
                type="button"
                className="account-icon-button"
                onClick={handleEditCancel}
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <form
              className="account-edit-form"
              onSubmit={handleEditSave}
            >
              <div className="account-edit-field">
                <label htmlFor="account-name">
                  Full name
                </label>

                <div className="account-edit-input">
                  <User size={16} />

                  <input
                    id="account-name"
                    type="text"
                    value={editName}
                    onChange={(event) =>
                      setEditName(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="account-edit-field">
                <label htmlFor="account-email">
                  Email address
                </label>

                <div className="account-edit-input">
                  <Mail size={16} />

                  <input
                    id="account-email"
                    type="email"
                    value={editEmail}
                    onChange={(event) =>
                      setEditEmail(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="account-edit-actions">
                <button
                  type="button"
                  className="account-edit-cancel"
                  onClick={handleEditCancel}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="account-edit-save"
                >
                  <Check size={15} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          LOGOUT CONFIRMATION MODAL
          ===================================================== */}

      {showLogoutConfirm && (
        <div
          className="account-modal-overlay"
          onMouseDown={handleLogoutCancel}
        >
          <div
            className="account-logout-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="account-logout-icon">
              <LogOut size={22} />
            </div>

            <h2>Log out of EasyCut?</h2>

            <p>
              Are you sure you want to log out of your account?
              You can sign back in anytime.
            </p>

            <div className="account-logout-actions">
              <button
                type="button"
                className="account-logout-cancel"
                onClick={handleLogoutCancel}
              >
                Cancel
              </button>

              <Link
                to="/login"
                className="account-logout-confirm"
              >
                <LogOut size={15} />
                Log Out
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Account;