import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";

export default function AdminLogin() {
  const { user, login, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = adminConfig;
  const { text, control, pad } = adminUi;

  // Accounts sign in with their username, not their email — an Admin sets
  // that handle when provisioning the account (see AdminUsers.jsx).
  const [userName, setUserName] = useState("");
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
      await login(userName, password);
      navigate("/admin");
    } catch (err) {
      setError(err.message || adminConfig.auth.invalidCredentials);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: theme.pageBackground, color: theme.textColor }}
    >
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-xs ${pad.card} rounded-lg border ${adminUi.stack.md}`}
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
      >
        <div>
          <h1 className={text.header} style={{ color: theme.accentColor }}>
            {adminConfig.auth.loginTitle}
          </h1>
          <p className={`${text.body} opacity-60 mt-0.5`}>{adminConfig.auth.loginSubtitle}</p>
        </div>

        <div>
          <label className={control.label}>{adminConfig.auth.userNameLabel}</label>
          <input
            type="text"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className={control.input}
          />
        </div>

        <div>
          <label className={control.label}>{adminConfig.auth.passwordLabel}</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={control.input}
          />
        </div>

        {error && (
          <p className={text.body} style={{ color: theme.dangerColor }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full ${control.btnPrimary}`}
          style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
