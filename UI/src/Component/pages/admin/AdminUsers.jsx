// Admin-only: create staff accounts and manage roles. The "User" role is
// offered here only because accounts need to exist somewhere before the
// separate student portal is built — a User-role account has no admin panel
// access at all (see RequireRole.jsx / App.jsx route guards).
//
// Usernames are a manually entered login handle, separate from the account's
// email: the Admin types one when creating the account, and can rename it (or
// reset the password) later from the row's Credentials editor. Only the first
// Admin is provisioned outside this page, by IdentitySeeder on the API.

import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";
import { qk } from "../../../queryKeys";

const ROLE_OPTIONS = [adminConfig.roles.ADMIN, adminConfig.roles.EMPLOYEE, adminConfig.roles.USER];

const EMPTY_CREATE_FORM = {
  userName: "",
  email: "",
  fullName: "",
  password: "",
  role: adminConfig.roles.EMPLOYEE,
};

export default function AdminUsers() {
  const { token, user: currentUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const { theme, users: copy } = adminConfig;
  const { text, control, table, pad } = adminUi;

  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [error, setError] = useState("");

  // Which row's credentials editor is open, and its draft. Only one at a time
  // — a rename/reset is a deliberate act, not something to fan out across rows.
  const [editingId, setEditingId] = useState(null);
  const [credForm, setCredForm] = useState({ userName: "", newPassword: "" });
  const [savingCred, setSavingCred] = useState(false);
  const [credError, setCredError] = useState("");
  const [credNotice, setCredNotice] = useState("");

  const {
    data: users = [],
    isLoading: loading,
  } = useQuery({
    queryKey: qk.users(),
    queryFn: () => adminApi.listUsers(token),
    staleTime: Infinity,
    enabled: !!token,
  });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: qk.users() });

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await adminApi.createUser(token, form);
      setForm(EMPTY_CREATE_FORM);
      invalidateUsers();
    } catch (err) {
      setCreateError(err.message || "Could not create account.");
    } finally {
      setCreating(false);
    }
  };

  const openCredentials = (u) => {
    setEditingId(u.id);
    // Pre-fill with the current username so a password-only reset doesn't
    // read as "clear the username".
    setCredForm({ userName: u.userName || "", newPassword: "" });
    setCredError("");
    setCredNotice("");
  };

  const closeCredentials = () => {
    setEditingId(null);
    setCredForm({ userName: "", newPassword: "" });
    setCredError("");
  };

  const handleSaveCredentials = async (e, u) => {
    e.preventDefault();
    setSavingCred(true);
    setCredError("");
    setCredNotice("");

    // Send only what actually changed — the API treats a blank field as
    // "leave unchanged".
    const payload = {};
    const nextUserName = credForm.userName.trim();
    if (nextUserName && nextUserName !== (u.userName || "")) payload.userName = nextUserName;
    if (credForm.newPassword) payload.newPassword = credForm.newPassword;

    if (Object.keys(payload).length === 0) {
      setCredError("Change the username or enter a new password first.");
      setSavingCred(false);
      return;
    }

    try {
      const result = await adminApi.updateUserCredentials(token, u.id, payload);
      setCredNotice(
        result?.message ||
          (payload.userName && payload.newPassword
            ? "Username and password updated."
            : payload.userName
            ? "Username updated."
            : "Password updated.")
      );
      closeCredentials();
      invalidateUsers();
    } catch (err) {
      setCredError(err.message || "Could not update credentials.");
    } finally {
      setSavingCred(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await adminApi.updateUserRole(token, id, role);
      invalidateUsers();
    } catch (err) {
      setError(err.message || "Could not update role.");
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await adminApi.updateUserStatus(token, id, !isActive);
      invalidateUsers();
    } catch (err) {
      setError(err.message || "Could not update status.");
    }
  };

  return (
    <div>
      <h1 className={`${text.header} mb-3`}>{copy.title}</h1>

      <form
        onSubmit={handleCreate}
        className={`${pad.card} rounded-lg border mb-4 max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-2`}
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
      >
        <h2 className={`sm:col-span-2 ${text.bodyHeader}`}>{copy.createHeading}</h2>

        <input
          required
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className={control.input}
        />
        <input
          required
          placeholder="Username"
          pattern={copy.userNamePattern}
          title={copy.userNameHint}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={form.userName}
          onChange={(e) => setForm({ ...form, userName: e.target.value })}
          className={control.input}
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={control.input}
        />
        <input
          required
          type="password"
          minLength={copy.passwordMinLength}
          placeholder={`Temporary password (${copy.passwordMinLength}+ chars)`}
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className={control.input}
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className={control.input}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <p className={`sm:col-span-2 ${control.help}`}>
          Username is what the account signs in with — it is separate from the email.{" "}
          {copy.userNameHint}
        </p>

        {createError && (
          <p className={`sm:col-span-2 ${text.body}`} style={{ color: theme.dangerColor }}>{createError}</p>
        )}

        <button
          type="submit"
          disabled={creating}
          className={`sm:col-span-2 w-full ${control.btnPrimary}`}
          style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
        >
          {creating ? "Creating…" : "Create Account"}
        </button>
      </form>

      {error && <p className={`${text.body} mb-2`} style={{ color: theme.dangerColor }}>{error}</p>}
      {credNotice && (
        <p className={`${text.body} mb-2`} style={{ color: theme.successColor }}>{credNotice}</p>
      )}

      {loading ? (
        <p className={`${text.body} opacity-60`}>Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={table.root}>
            <thead>
              <tr className={table.head}>
                <th className={table.th}>Name</th>
                <th className={table.th}>Username</th>
                <th className={table.th}>Email</th>
                <th className={table.th}>Role</th>
                <th className={table.th}>Status</th>
                <th className={table.th}>Created</th>
                <th className={table.th}>Credentials</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr className="border-t" style={{ borderColor: theme.borderColor }}>
                    <td className={table.td}>{u.fullName}</td>
                    <td className={table.td}>
                      {u.userName}
                      {currentUser?.id === u.id && (
                        <span className={`${text.body} opacity-50`}> (you)</span>
                      )}
                    </td>
                    <td className={table.td}>{u.email}</td>
                    <td className={table.td}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={control.inputSm}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={table.td}>
                      <button
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        className={control.pill}
                        style={{
                          backgroundColor: u.isActive ? "rgba(108,193,157,0.15)" : "rgba(224,108,108,0.15)",
                          color: u.isActive ? theme.successColor : theme.dangerColor,
                        }}
                      >
                        {u.isActive ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className={`${table.td} opacity-60`}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className={table.td}>
                      <button
                        type="button"
                        onClick={() => (editingId === u.id ? closeCredentials() : openCredentials(u))}
                        className={control.btnLink}
                        style={{ color: theme.accentColor }}
                      >
                        {editingId === u.id ? "Cancel" : "Edit"}
                      </button>
                    </td>
                  </tr>

                  {editingId === u.id && (
                    <tr style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                      <td colSpan={7} className="py-2 pr-3">
                        <form
                          onSubmit={(e) => handleSaveCredentials(e, u)}
                          className={`${pad.panel} rounded-md border max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-2`}
                          style={{ borderColor: theme.borderColor }}
                        >
                          <h3 className={`sm:col-span-2 ${text.bodyHeader}`}>
                            {copy.credentialsHeading} — {u.fullName || u.userName}
                          </h3>

                          <div>
                            <label className={control.label}>Username</label>
                            <input
                              pattern={copy.userNamePattern}
                              title={copy.userNameHint}
                              autoComplete="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              value={credForm.userName}
                              onChange={(e) => setCredForm({ ...credForm, userName: e.target.value })}
                              className={control.input}
                            />
                          </div>

                          <div>
                            <label className={control.label}>New password</label>
                            <input
                              type="password"
                              minLength={copy.passwordMinLength}
                              placeholder={`${copy.passwordMinLength}+ chars`}
                              autoComplete="new-password"
                              value={credForm.newPassword}
                              onChange={(e) => setCredForm({ ...credForm, newPassword: e.target.value })}
                              className={control.input}
                            />
                          </div>

                          <p className={`sm:col-span-2 ${control.help}`}>
                            {copy.credentialsHint} {copy.userNameHint}
                          </p>

                          {credError && (
                            <p className={`sm:col-span-2 ${text.body}`} style={{ color: theme.dangerColor }}>
                              {credError}
                            </p>
                          )}

                          <div className="sm:col-span-2 flex gap-2">
                            <button
                              type="submit"
                              disabled={savingCred}
                              className={control.btnPrimary}
                              style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
                            >
                              {savingCred ? "Saving…" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={closeCredentials}
                              className={control.btnGhost}
                              style={{ borderColor: theme.borderColor, color: theme.textColor }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
