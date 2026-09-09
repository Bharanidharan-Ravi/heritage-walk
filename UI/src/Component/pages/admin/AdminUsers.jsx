// Admin-only: create staff accounts and manage roles. The "User" role is
// offered here only because accounts need to exist somewhere before the
// separate student portal is built — a User-role account has no admin panel
// access at all (see RequireRole.jsx / App.jsx route guards).

import { useEffect, useState } from "react";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";

const ROLE_OPTIONS = [adminConfig.roles.ADMIN, adminConfig.roles.EMPLOYEE, adminConfig.roles.USER];

export default function AdminUsers() {
  const { token } = useAdminAuth();
  const { theme } = adminConfig;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ email: "", fullName: "", password: "", role: adminConfig.roles.EMPLOYEE });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await adminApi.listUsers(token));
      setError("");
    } catch (err) {
      setError(err.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await adminApi.createUser(token, form);
      setForm({ email: "", fullName: "", password: "", role: adminConfig.roles.EMPLOYEE });
      await loadUsers();
    } catch (err) {
      setCreateError(err.message || "Could not create account.");
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await adminApi.updateUserRole(token, id, role);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Could not update role.");
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await adminApi.updateUserStatus(token, id, !isActive);
      await loadUsers();
    } catch (err) {
      setError(err.message || "Could not update status.");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Users & Roles</h1>

      <form
        onSubmit={handleCreate}
        className="p-6 rounded-2xl border mb-8 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
      >
        <h2 className="sm:col-span-2 font-bold">Create account</h2>

        <input
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="bg-black/20 border rounded-lg px-3 py-2"
          style={{ borderColor: theme.borderColor }}
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="bg-black/20 border rounded-lg px-3 py-2"
          style={{ borderColor: theme.borderColor }}
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Temporary password (8+ chars)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="bg-black/20 border rounded-lg px-3 py-2"
          style={{ borderColor: theme.borderColor }}
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="bg-black/20 border rounded-lg px-3 py-2"
          style={{ borderColor: theme.borderColor }}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {createError && <p className="sm:col-span-2 text-sm" style={{ color: theme.dangerColor }}>{createError}</p>}

        <button
          type="submit"
          disabled={creating}
          className="sm:col-span-2 py-3 rounded-lg font-bold uppercase tracking-widest disabled:opacity-50"
          style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
        >
          {creating ? "Creating…" : "Create Account"}
        </button>
      </form>

      {error && <p className="mb-4" style={{ color: theme.dangerColor }}>{error}</p>}

      {loading ? (
        <p className="opacity-60">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left opacity-60 uppercase text-xs tracking-widest">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t" style={{ borderColor: theme.borderColor }}>
                  <td className="py-3 pr-4">{u.fullName}</td>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-black/20 border rounded-lg px-2 py-1"
                      style={{ borderColor: theme.borderColor }}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: u.isActive ? "rgba(108,193,157,0.15)" : "rgba(224,108,108,0.15)",
                        color: u.isActive ? theme.successColor : theme.dangerColor,
                      }}
                    >
                      {u.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="py-3 pr-4 opacity-60">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
