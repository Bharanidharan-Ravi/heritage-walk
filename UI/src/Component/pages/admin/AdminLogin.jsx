import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminConfig } from "../../Config/admin.config";

export default function AdminLogin() {
  const { user, login, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = adminConfig;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    const redirectTo = location.state?.from?.pathname || "/admin";
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: theme.pageBackground, color: theme.textColor }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-8 rounded-2xl border space-y-6"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.accentColor }}>
            Admin Login
          </h1>
          <p className="text-sm opacity-60 mt-1">Staff access only.</p>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold tracking-widest mb-2 opacity-70">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/20 border rounded-lg px-4 py-3 focus:outline-none"
            style={{ borderColor: theme.borderColor }}
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold tracking-widest mb-2 opacity-70">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/20 border rounded-lg px-4 py-3 focus:outline-none"
            style={{ borderColor: theme.borderColor }}
          />
        </div>

        {error && (
          <p className="text-sm font-medium" style={{ color: theme.dangerColor }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg font-bold uppercase tracking-widest disabled:opacity-50"
          style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
