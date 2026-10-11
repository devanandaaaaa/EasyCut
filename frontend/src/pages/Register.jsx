import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GitBranch,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError(
        "Please agree to the Terms of Service and Privacy Policy."
      );
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        username: name.trim(),
        email: email.trim(),
        password,
      });

      navigate("/login", {
        state: {
          message:
            "Account created successfully. Please log in.",
        },
      });
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 409) {
        setError(
          detail ||
            "An account with this username or email already exists."
        );
      } else if (status === 422) {
        setError(
          "Please check your information and make sure all fields are valid."
        );
      } else if (requestError.response) {
        setError(
          detail ||
            "Unable to create your account. Please try again."
        );
      } else {
        setError(
          "Unable to connect to EasyCut. Make sure the backend is running."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-layout">

        {/* LEFT VISUAL */}
        <section className="auth-visual">
          <Link to="/" className="auth-logo">
            <span className="auth-logo-icon">
              <Sparkles size={18} />
            </span>
            EasyCut
          </Link>

          <div className="auth-visual-content">
            <div className="auth-visual-badge">
              <Sparkles size={14} />
              Start creating with AI
            </div>

            <h1>
              Create.
              <br />
              <span>Match. Edit.</span>
            </h1>

            <p>
              Build videos from your stories and raw footage with
              EasyCut's intelligent semantic video matching.
            </p>

            <div className="auth-pipeline">
              <div className="auth-pipeline-item">
                <span>01</span>
                <div>
                  <strong>Your story</strong>
                  <small>Script or voiceover</small>
                </div>
              </div>

              <div className="auth-pipeline-line" />

              <div className="auth-pipeline-item">
                <span>02</span>
                <div>
                  <strong>Your footage</strong>
                  <small>Upload your clips</small>
                </div>
              </div>

              <div className="auth-pipeline-line" />

              <div className="auth-pipeline-item">
                <span>03</span>
                <div>
                  <strong>Your video</strong>
                  <small>AI-generated rough cut</small>
                </div>
              </div>
            </div>
          </div>

          <p className="auth-visual-footer">
            AI-powered video creation by EasyCut
          </p>
        </section>

        {/* FORM */}
        <section className="auth-form-section">
          <Link to="/" className="auth-back">
            <ArrowLeft size={16} />
            Back to home
          </Link>

          <div className="auth-form-container">

            <div className="auth-mobile-logo">
              <span className="auth-logo-icon">
                <Sparkles size={18} />
              </span>
              EasyCut
            </div>

            <div className="auth-heading">
              <h2>Create your account</h2>

              <p>
                Start creating your first AI-powered video.
              </p>
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >

              {/* NAME */}
              <div className="auth-field">
                <label htmlFor="register-name">
                  Name
                </label>

                <div className="auth-input-wrapper">
                  <User size={17} />

                  <input
                    id="register-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    autoComplete="name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="auth-field">
                <label htmlFor="register-email">
                  Email address
                </label>

                <div className="auth-input-wrapper">
                  <Mail size={17} />

                  <input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="auth-field">
                <label htmlFor="register-password">
                  Password
                </label>

                <div className="auth-input-wrapper">
                  <Lock size={17} />

                  <input
                    id="register-password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="auth-field">
                <label htmlFor="register-confirm-password">
                  Confirm password
                </label>

                <div className="auth-input-wrapper">
                  <Lock size={17} />

                  <input
                    id="register-confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* TERMS */}
              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) =>
                    setAcceptedTerms(event.target.checked)
                  }
                  disabled={loading}
                />

                <span>
                  I agree to the{" "}
                  <Link to="/terms">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {/* SUBMIT */}
              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Creating account..."
                  : "Create Account"}
              </button>
            </form>

            {/* SOCIAL */}
            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="auth-socials">
              <button
                type="button"
                className="auth-social-button"
                disabled={loading}
              >
                <span className="google-mark">G</span>
                Google
              </button>

              <button
                type="button"
                className="auth-social-button"
                disabled={loading}
              >
                <GitBranch size={17} />
                GitHub
              </button>
            </div>

            <p className="auth-switch">
              Already have an account?{" "}
              <Link to="/login">Login</Link>
            </p>

          </div>
        </section>
      </div>
    </main>
  );
}

export default Register;