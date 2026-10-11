import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
  };

  return (
    <main className="auth-page">
      <div className="auth-layout">
        {/* Visual panel */}
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
              Secure account recovery
            </div>

            <h1>
              Get back
              <br />
              <span>to creating.</span>
            </h1>

            <p>
              Enter the email connected to your EasyCut account and
              we'll help you regain access.
            </p>

            <div className="auth-recovery-points">
              <div>
                <span>01</span>
                <p>Enter your account email</p>
              </div>

              <div>
                <span>02</span>
                <p>Receive a secure reset link</p>
              </div>

              <div>
                <span>03</span>
                <p>Create a new password</p>
              </div>
            </div>
          </div>

          <p className="auth-visual-footer">
            Your account security matters to EasyCut
          </p>
        </section>

        {/* Form */}
        <section className="auth-form-section">
          <Link to="/login" className="auth-back">
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <div className="auth-form-container">
            <div className="auth-mobile-logo">
              <span className="auth-logo-icon">
                <Sparkles size={18} />
              </span>
              EasyCut
            </div>

            {!submitted ? (
              <>
                <div className="auth-heading">
                  <h2>Forgot your password?</h2>
                  <p>
                    No worries. Enter your email and we'll send you
                    a password reset link.
                  </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                  <div className="auth-field">
                    <label htmlFor="forgot-email">
                      Email address
                    </label>

                    <div className="auth-input-wrapper">
                      <Mail size={17} />

                      <input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="auth-submit">
                    Send Reset Link
                    <ArrowRight size={16} />
                  </button>
                </form>

                <p className="auth-switch">
                  Remember your password?{" "}
                  <Link to="/login">Back to login</Link>
                </p>
              </>
            ) : (
              <div className="auth-success-state">
                <div className="auth-success-icon">
                  <Mail size={25} />
                </div>

                <h2>Check your email</h2>

                <p>
                  If an EasyCut account exists for{" "}
                  <strong>{email}</strong>, we've sent instructions
                  to reset your password.
                </p>

                <Link to="/login" className="auth-submit auth-success-button">
                  Return to Login
                </Link>

                <button
                  type="button"
                  className="auth-resend-button"
                  onClick={() => setSubmitted(false)}
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ForgotPassword;