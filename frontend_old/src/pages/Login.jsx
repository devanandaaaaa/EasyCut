import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registrationMessage = location.state?.message || "";

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
      const response = await api.post("/auth/login", formData);

      const token = response.data.access_token;

      localStorage.setItem("easycut-token", token);

      navigate("/dashboard");
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        "Login failed. Please check your email and password.";

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
          <h1>Welcome back</h1>
          <p>
            Log in to continue creating with EasyCut.
          </p>
        </div>

        {registrationMessage && (
          <div className="auth-success">
            {registrationMessage}
          </div>
        )}

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </label>

          <div className="auth-extra-row">
            <span />
            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </main>
  );
}

export default Login;