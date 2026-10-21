import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GitBranch,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);

      // Remove the message from browser history
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const responseData = response.data;

      const token =
        typeof responseData === "string"
        ? responseData
        : responseData?.access_token;

      if (!token) {
        setError("Login succeeded, but the server returned an invalid token.");
        return;
      }

      localStorage.setItem("easycut-token", token);

      const destination = location.state?.from || "/dashboard";
      navigate(destination, { replace: true });
    } catch (requestError) {
      const status = requestError.response?.status;
      const detail = requestError.response?.data?.detail;

      if (status === 401) {
        setError(
          detail || "Invalid email or password."
        );
      } else if (status === 422) {
        setError(
          "Please enter a valid email and password."
        );
      } else if (requestError.response) {
        setError(
          detail ||
            "Unable to log in. Please try again."
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
              AI Video Studio
            </div>

            <h1>
              Your story.
              <br />
              <span>Our intelligence.</span>
            </h1>

            <p>
              Turn your scripts and raw footage into meaningful
              videos with AI-powered semantic scene matching.
            </p>

            <div className="auth-pipeline">

              <div className="auth-pipeline-item">
                <span>01</span>

                <div>
                  <strong>Understand</strong>
                  <small>Read your story</small>
                </div>
              </div>

              <div className="auth-pipeline-line" />

              <div className="auth-pipeline-item">
                <span>02</span>

                <div>
                  <strong>Match</strong>
                  <small>Find the right scenes</small>
                </div>
              </div>

              <div className="auth-pipeline-line" />

              <div className="auth-pipeline-item">
                <span>03</span>

                <div>
                  <strong>Create</strong>
                  <small>Build your video</small>
                </div>
              </div>

            </div>
          </div>

          <p className="auth-visual-footer">
            AI-powered video creation by EasyCut
          </p>
        </section>

        {/* LOGIN FORM */}
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
              <h2>Welcome back</h2>

              <p>
                Sign in to continue creating with EasyCut.
              </p>
            </div>

            {/* SUCCESS MESSAGE */}
            {successMessage && (
              <div className="auth-success">
                {successMessage}
              </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <form
              className="auth-form"
              onSubmit={handleSubmit}
            >

              {/* EMAIL */}
              <div className="auth-field">
                <label htmlFor="login-email">
                  Email address
                </label>

                <div className="auth-input-wrapper">
                  <Mail size={17} />

                  <input
                    id="login-email"
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
                <div className="auth-label-row">
                  <label htmlFor="login-password">
                    Password
                  </label>

                  <Link to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <div className="auth-input-wrapper">
                  <Lock size={17} />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
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

              {/* LOGIN */}
              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >
                {loading
                  ? "Logging in..."
                  : "Login"}
              </button>

            </form>

            {/* SOCIAL LOGIN */}
            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="auth-socials">

              <button
                type="button"
                className="auth-social-button"
                disabled={loading}
              >
                <span className="google-mark">
                  G
                </span>
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
              Don't have an account?{" "}
              <Link to="/register">
                Create one
              </Link>
            </p>

          </div>
        </section>

      </div>
    </main>
  );
}

export default Login;
