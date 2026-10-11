import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, Sparkles, User } from "lucide-react";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", formData);

      navigate("/login", {
        state: {
          message: "Account created successfully. Please log in.",
        },
      });
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        "Registration failed. Please try again.";

      setError(
        Array.isArray(message)
          ? message.map((item) => item.msg).join(", ")
          : message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-icon">
            <Sparkles size={18} />
          </span>
          EasyCut
        </Link>

        <div className="auth-heading">
          <h1>Create your account</h1>
          <p>
            Start creating AI-powered videos with EasyCut.
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Username
            <div className="input-wrapper">
              <User size={18} />
              <input
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </label>

          <label>
            Email
            <div className="input-wrapper">
              <Mail size={18} />
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </label>

          <label>
            Password
            <div className="input-wrapper">
              <Lock size={18} />
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </label>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}

export default Register;