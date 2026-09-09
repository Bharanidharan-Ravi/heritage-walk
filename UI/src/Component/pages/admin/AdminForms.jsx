// Admin/Employee: create pay-to-submit forms and see submission counts.
// Reuses FormShare.jsx for the link/QR once a form is created.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import FormShare from "../../Sections/FormShare";

const FIELD_TYPES = ["text", "email", "phone", "number", "textarea"];

export default function AdminForms() {
  const { token } = useAdminAuth();
  const { theme } = adminConfig;

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [fields, setFields] = useState([{ name: "", label: "", type: "text", required: true }]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newSlug, setNewSlug] = useState(null);

  const loadForms = async () => {
    setLoading(true);
    try {
      setForms(await adminApi.listForms(token));
      setError("");
    } catch (err) {
      setError(err.message || "Could not load forms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (index, patch) =>
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));

  const addField = () => setFields([...fields, { name: "", label: "", type: "text", required: false }]);
  const removeField = (index) => setFields(fields.filter((_, i) => i !== index));

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setNewSlug(null);
    try {
      const result = await adminApi.createForm(token, {
        title,
        price: Number(price),
        currency: "INR",
        fields,
      });
      setNewSlug(result.slug);
      setTitle("");
      setPrice("");
      setFields([{ name: "", label: "", type: "text", required: true }]);
      await loadForms();
    } catch (err) {
      setCreateError(err.message || "Could not create form.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await adminApi.updateFormStatus(token, id, !isActive);
      await loadForms();
    } catch (err) {
      setError(err.message || "Could not update form status.");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Forms & Submissions</h1>

      <form
        onSubmit={handleCreate}
        className="p-6 rounded-2xl border mb-8 max-w-2xl space-y-4"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
      >
        <h2 className="font-bold">Create a form</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            required
            placeholder="Form title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-black/20 border rounded-lg px-3 py-2"
            style={{ borderColor: theme.borderColor }}
          />
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Price (INR)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="bg-black/20 border rounded-lg px-3 py-2"
            style={{ borderColor: theme.borderColor }}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase font-bold tracking-widest opacity-60">Fields</p>
          {fields.map((field, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_auto_auto] gap-2 items-center">
              <input
                required
                placeholder="name (e.g. fullName)"
                value={field.name}
                onChange={(e) => updateField(i, { name: e.target.value })}
                className="bg-black/20 border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: theme.borderColor }}
              />
              <input
                required
                placeholder="Label"
                value={field.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                className="bg-black/20 border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: theme.borderColor }}
              />
              <select
                value={field.type}
                onChange={(e) => updateField(i, { type: e.target.value })}
                className="bg-black/20 border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: theme.borderColor }}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs opacity-70">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(i, { required: e.target.checked })}
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => removeField(i)}
                disabled={fields.length === 1}
                className="text-xs disabled:opacity-30"
                style={{ color: theme.dangerColor }}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addField}
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: theme.accentColor }}
          >
            + Add field
          </button>
        </div>

        {createError && <p className="text-sm" style={{ color: theme.dangerColor }}>{createError}</p>}

        <button
          type="submit"
          disabled={creating}
          className="py-3 px-6 rounded-lg font-bold uppercase tracking-widest disabled:opacity-50"
          style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
        >
          {creating ? "Creating…" : "Create Form"}
        </button>
      </form>

      {newSlug && (
        <div className="mb-8">
          <p className="text-sm mb-3 opacity-70">Form created — share it:</p>
          <FormShare slug={newSlug} />
        </div>
      )}

      {error && <p className="mb-4" style={{ color: theme.dangerColor }}>{error}</p>}

      {loading ? (
        <p className="opacity-60">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left opacity-60 uppercase text-xs tracking-widest">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Submissions</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-t" style={{ borderColor: theme.borderColor }}>
                  <td className="py-3 pr-4">{f.title}</td>
                  <td className="py-3 pr-4">{f.price} {f.currency}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => handleToggleActive(f.id, f.isActive)}
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: f.isActive ? "rgba(108,193,157,0.15)" : "rgba(224,108,108,0.15)",
                        color: f.isActive ? theme.successColor : theme.dangerColor,
                      }}
                    >
                      {f.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="py-3 pr-4">{f.submissionCount}</td>
                  <td className="py-3 pr-4">
                    <Link
                      to={`/admin/forms/${f.id}/submissions`}
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: theme.accentColor }}
                    >
                      View submissions
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
