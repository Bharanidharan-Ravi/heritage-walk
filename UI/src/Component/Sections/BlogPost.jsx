import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PortableText } from "@portabletext/react";
import { client, urlFor } from "/src/sanityClient";
import { blogConfig } from "../Config/blog.config";

// ─── Portable Text Renderers ──────────────────────────────────────────────────
function buildPortableTextComponents(theme) {
  return {
    types: {
      image: ({ value }) => {
        if (!value?.asset?._ref) return null;
        const ref = value.asset._ref; // image-xxxx-800x600-jpg
        const parts = ref.split("-");
        const ext = parts[parts.length - 1];
        const dim = parts[parts.length - 2];
        const id = parts.slice(1, parts.length - 2).join("-");
        return (
          <figure className="my-10">
            <img
              src={`https://cdn.sanity.io/images/nh8jhz7r/production/${id}-${dim}.${ext}`}
              alt={value.alt || ""}
              className="w-full rounded-xl shadow-lg"
              style={{ border: `1px solid ${theme.borderColor}` }}
              loading="lazy"
            />
            {value.caption && (
              <figcaption
                className="text-center text-xs mt-3 tracking-wider font-medium uppercase"
                style={{ color: theme.mutedText }}
              >
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },
    },
    block: {
      h1: ({ children }) => (
        <h1 className="text-4xl font-serif font-bold mt-14 mb-6" style={{ color: theme.accentColor }}>
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-3xl font-serif font-semibold mt-12 mb-5 text-white border-l-4 pl-5"
          style={{ borderColor: theme.accentColor }}>
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-2xl font-serif font-medium mt-10 mb-4 text-white">{children}</h3>
      ),
      normal: ({ children }) => (
        <p className="mb-6 leading-[1.9] text-[17px]" style={{ color: "rgba(255,255,255,0.72)" }}>
          {children}
        </p>
      ),
      blockquote: ({ children }) => (
        <blockquote
          className="border-l-4 pl-8 my-10 py-4 italic text-xl font-serif rounded-r-xl"
          style={{
            borderColor: theme.accentColor,
            color: theme.textColor,
            backgroundColor: "rgba(193,157,96,0.06)",
          }}
        >
          {children}
        </blockquote>
      ),
    },
    marks: {
      strong: ({ children }) => (
        <strong className="font-bold text-white">{children}</strong>
      ),
      em: ({ children }) => (
        <em className="italic" style={{ color: theme.accentColor }}>{children}</em>
      ),
      link: ({ value, children }) => (
        <a
          href={value?.href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:opacity-80 transition-opacity"
          style={{ color: theme.accentColor }}
        >
          {children}
        </a>
      ),
    },
    list: {
      bullet: ({ children }) => (
        <ul className="mb-6 space-y-2 pl-6 list-none">
          {React.Children.map(children, (child) => (
            <li className="flex items-start gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.accentColor }} />
              <span>{child}</span>
            </li>
          ))}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="mb-6 space-y-2 pl-4 list-decimal marker:text-[#C19D60]">{children}</ol>
      ),
    },
  };
}

// ─── Comments Section ─────────────────────────────────────────────────────────
function CommentsSection({ slug, theme }) {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", comment: "" });
  const [submitStatus, setSubmitStatus] = useState(""); // sending | success | error
  const formRef = useRef(null);

  // Fetch approved comments for this post
  useEffect(() => {
    if (!slug) return;
    const apiUrl = `${import.meta.env.VITE_API_URL}/api/comments/${slug}`;
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        setComments(Array.isArray(data) ? data : []);
        setLoadingComments(false);
      })
      .catch(() => {
        setComments([]);
        setLoadingComments(false);
      });
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.comment) return;
    setSubmitStatus("sending");

    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/comments`;
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogSlug: slug,
          name: form.name,
          email: form.email,
          comment: form.comment,
        }),
      });

      if (res.ok) {
        setSubmitStatus("success");
        setForm({ name: "", email: "", comment: "" });
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    }
  };

  return (
    <div
      className="mt-24 pt-16 border-t"
      style={{ borderColor: theme.borderColor }}
    >
      <h2 className="text-3xl font-serif font-medium mb-2 text-white">
        Community{" "}
        <span style={{ color: theme.accentColor }}>Voices</span>
      </h2>
      <p className="text-sm mb-12" style={{ color: theme.mutedText }}>
        Share your thoughts, questions, or stories about this article.
      </p>

      {/* ── Past Comments ── */}
      {loadingComments ? (
        <div className="flex items-center gap-3 mb-10" style={{ color: theme.mutedText }}>
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: theme.accentColor }}
          />
          <span className="text-sm">Loading comments...</span>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6 mb-16">
          <p className="text-xs font-bold tracking-[0.25em] uppercase mb-6" style={{ color: theme.mutedText }}>
            {comments.length} Comment{comments.length !== 1 ? "s" : ""}
          </p>
          {comments.map((c, i) => (
            <div
              key={c.id || i}
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                borderColor: theme.borderColor,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar Circle */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
                  >
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm text-white">{c.name}</span>
                </div>
                <time
                  className="text-[11px] font-medium tracking-wider"
                  style={{ color: theme.mutedText }}
                >
                  {c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : ""}
                </time>
              </div>
              <p
                className="text-sm leading-relaxed pl-12"
                style={{ color: "rgba(255,255,255,0.7)" }}
              >
                {c.comment}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 rounded-2xl border mb-14"
          style={{
            borderColor: theme.borderColor,
            backgroundColor: "rgba(255,255,255,0.02)",
            color: theme.mutedText,
          }}
        >
          <p className="text-4xl mb-3">💬</p>
          <p className="font-serif text-lg text-white mb-1">No comments yet</p>
          <p className="text-sm">Be the first to share your thoughts.</p>
        </div>
      )}

      {/* ── Comment Form ── */}
      {/* <div
        className="rounded-[1.5rem] p-8 md:p-10 border"
        style={{
          backgroundColor: "rgba(255,255,255,0.03)",
          borderColor: theme.borderColor,
        }}
      >
        <h3 className="text-lg font-bold uppercase tracking-widest mb-8 text-white">
          Leave a Comment
        </h3>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label
                className="block text-[10px] font-bold tracking-[0.25em] uppercase mb-2"
                style={{ color: theme.mutedText }}
              >
                Your Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Priya Sharma"
                className="w-full rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: `1px solid ${theme.borderColor}`,
                  "--tw-ring-color": theme.accentColor,
                }}
                onFocus={(e) => (e.target.style.borderColor = theme.accentColor)}
                onBlur={(e) => (e.target.style.borderColor = theme.borderColor)}
              />
            </div>
            <div>
              <label
                className="block text-[10px] font-bold tracking-[0.25em] uppercase mb-2"
                style={{ color: theme.mutedText }}
              >
                Email Address *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="priya@example.com"
                className="w-full rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: `1px solid ${theme.borderColor}`,
                }}
                onFocus={(e) => (e.target.style.borderColor = theme.accentColor)}
                onBlur={(e) => (e.target.style.borderColor = theme.borderColor)}
              />
            </div>
          </div>
          <div>
            <label
              className="block text-[10px] font-bold tracking-[0.25em] uppercase mb-2"
              style={{ color: theme.mutedText }}
            >
              Your Comment *
            </label>
            <textarea
              required
              rows="5"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Share your thoughts or ask a question..."
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none transition-colors resize-none"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: `1px solid ${theme.borderColor}`,
              }}
              onFocus={(e) => (e.target.style.borderColor = theme.accentColor)}
              onBlur={(e) => (e.target.style.borderColor = theme.borderColor)}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: theme.mutedText }}>
              * Your comment will appear after moderation.
            </p>
            <button
              type="submit"
              disabled={submitStatus === "sending"}
              className="px-8 py-3.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: theme.accentColor,
                color: "#0F161E",
              }}
            >
              {submitStatus === "sending" ? "Posting..." : "Post Comment"}
            </button>
          </div>

          {submitStatus === "success" && (
            <p
              className="text-sm text-center py-3 rounded-xl font-medium"
              style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ade80" }}
            >
              ✓ Comment submitted! It will appear after moderation.
            </p>
          )}
          {submitStatus === "error" && (
            <p
              className="text-sm text-center py-3 rounded-xl font-medium"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
            >
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      </div> */}
    </div>
  );
}

// ─── Main BlogPost Component ──────────────────────────────────────────────────
export default function BlogPost() {
  const { theme, ui } = blogConfig;
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [allPosts, setAllPosts] = useState([]); // for sidebar index + prev/next
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile sidebar toggle

  // 1. Fetch ALL posts (for sidebar index + prev/next)
  useEffect(() => {
    const indexQuery = `*[_type == "blogPost"] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      publishedAt
    }`;
    client.fetch(indexQuery).then(setAllPosts).catch(console.error);
  }, []);

  // 2. Fetch current post body when slug changes
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const query = `*[_type == "blogPost" && slug.current == $slug][0] {
      title,
      "slug": slug.current,
      featuredImage,
      excerpt,
      body,
      publishedAt,
      tags,
      requestedBy
    }`;

    client
      .fetch(query, { slug })
      .then((data) => { setPost(data); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [slug]);

  // Derive prev / next from ordered list
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  const portableTextComponents = buildPortableTextComponents(theme);

  // ── Loading ──
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.pageBackground }}
      >
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: theme.accentColor }}
          />
          <p className="text-sm tracking-widest uppercase font-bold opacity-50 text-white">
            Loading Article...
          </p>
        </div>
      </div>
    );
  }

  // ── Not Found ──
  if (!post) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ backgroundColor: theme.pageBackground }}
      >
        <p className="text-6xl">📜</p>
        <p className="text-white font-serif text-3xl">Article not found</p>
        <Link
          to="/blog"
          className="text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-xl"
          style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
        >
          Back to Journal
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-sans"
      style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}
    >
      {/* ── HERO BANNER ── */}
      <div className="relative w-full h-[55vh] min-h-[340px] overflow-hidden">
        {post.featuredImage ? (
          <img
            src={urlFor(post.featuredImage).width(1600).url()}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: "#0b1720" }} />
        )}
        {/* Dark gradient over image */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F161E] via-[#0F161E]/60 to-transparent" />

        {/* Back button */}
        <Link
          to="/blog"
          className="absolute top-8 left-6 md:left-10 text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full backdrop-blur-md border transition-all hover:opacity-80"
          style={{
            color: theme.accentColor,
            borderColor: "rgba(193,157,96,0.4)",
            backgroundColor: "rgba(15,22,30,0.6)",
          }}
        >
          ← Journal
        </Link>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">

          {/* ══ LEFT: Article Content ══ */}
          <main>
            {/* Post Header */}
            <header className="mb-12">
              {/* Tags */}
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full border"
                      style={{ borderColor: "rgba(193,157,96,0.4)", color: theme.accentColor }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium leading-[1.1] mb-8 text-white">
                {post.title}
              </h1>

              {/* Meta row */}
              <div
                className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold tracking-widest uppercase pb-8 border-b"
                style={{ color: theme.mutedText, borderColor: theme.borderColor }}
              >
                {post.publishedAt && (
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </time>
                )}
                {post.requestedBy && (
                  <>
                    <span>·</span>
                    <span>
                      Suggested by{" "}
                      <span style={{ color: theme.accentColor }}>{post.requestedBy}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Excerpt (lead paragraph) */}
              {post.excerpt && (
                <p
                  className="text-xl font-light leading-relaxed mt-8"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  {post.excerpt}
                </p>
              )}
            </header>

            {/* Portable Text Body */}
            <div className="max-w-[720px]">
              {post.body ? (
                <PortableText value={post.body} components={portableTextComponents} />
              ) : (
                <p style={{ color: theme.mutedText }}>No content available.</p>
              )}
            </div>

            {/* ── PREV / NEXT NAVIGATION ── */}
            <div
              className="mt-20 pt-10 border-t grid grid-cols-1 md:grid-cols-2 gap-4"
              style={{ borderColor: theme.borderColor }}
            >
              {/* Previous (older) */}
              {prevPost ? (
                <Link
                  to={`/blog/${prevPost.slug}`}
                  className="group p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderColor: theme.borderColor,
                  }}
                >
                  <span
                    className="text-[10px] font-bold tracking-[0.25em] uppercase block mb-3"
                    style={{ color: theme.mutedText }}
                  >
                    ← Previous Article
                  </span>
                  <p
                    className="font-serif text-lg font-medium leading-snug group-hover:underline decoration-1 underline-offset-2 text-white"
                  >
                    {prevPost.title}
                  </p>
                  <time
                    className="text-[10px] mt-2 block"
                    style={{ color: theme.mutedText }}
                  >
                    {prevPost.publishedAt
                      ? new Date(prevPost.publishedAt).toLocaleDateString("en-IN", {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : ""}
                  </time>
                </Link>
              ) : (
                <div /> // empty cell to keep grid alignment
              )}

              {/* Next (newer) */}
              {nextPost ? (
                <Link
                  to={`/blog/${nextPost.slug}`}
                  className="group p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg text-right"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    borderColor: theme.borderColor,
                  }}
                >
                  <span
                    className="text-[10px] font-bold tracking-[0.25em] uppercase block mb-3"
                    style={{ color: theme.mutedText }}
                  >
                    Next Article →
                  </span>
                  <p
                    className="font-serif text-lg font-medium leading-snug group-hover:underline decoration-1 underline-offset-2 text-white"
                  >
                    {nextPost.title}
                  </p>
                  <time
                    className="text-[10px] mt-2 block"
                    style={{ color: theme.mutedText }}
                  >
                    {nextPost.publishedAt
                      ? new Date(nextPost.publishedAt).toLocaleDateString("en-IN", {
                          month: "short", day: "numeric", year: "numeric",
                        })
                      : ""}
                  </time>
                </Link>
              ) : (
                <div />
              )}
            </div>

            {/* ── COMMENTS ── */}
            {/* <CommentsSection slug={slug} theme={theme} /> */}
          </main>

          {/* ══ RIGHT: Sticky Sidebar Index ══ */}
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              {/* "All Articles" Index */}
              <div
                className="rounded-[1.5rem] overflow-hidden border"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: theme.borderColor,
                }}
              >
                <div
                  className="px-6 py-5 border-b flex items-center justify-between"
                  style={{ borderColor: theme.borderColor }}
                >
                  <span
                    className="text-[10px] font-bold tracking-[0.3em] uppercase"
                    style={{ color: theme.accentColor }}
                  >
                    All Articles
                  </span>
                  <span
                    className="text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(193,157,96,0.15)", color: theme.accentColor }}
                  >
                    {allPosts.length}
                  </span>
                </div>

                <nav className="divide-y" style={{ "--tw-divide-opacity": 0.08 }}>
                  {allPosts.map((p, i) => {
                    const isActive = p.slug === slug;
                    return (
                      <Link
                        key={p._id}
                        to={`/blog/${p.slug}`}
                        className="flex items-start gap-3 px-6 py-4 transition-colors group"
                        style={{
                          backgroundColor: isActive
                            ? "rgba(193,157,96,0.1)"
                            : "transparent",
                          borderColor: theme.borderColor,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {/* Number */}
                        <span
                          className="text-[10px] font-bold mt-0.5 w-5 shrink-0 tabular-nums"
                          style={{
                            color: isActive ? theme.accentColor : theme.mutedText,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium leading-snug line-clamp-2"
                            style={{
                              color: isActive ? theme.accentColor : "rgba(255,255,255,0.75)",
                            }}
                          >
                            {p.title}
                          </p>
                          {p.publishedAt && (
                            <time
                              className="text-[10px] mt-1 block"
                              style={{ color: theme.mutedText }}
                            >
                              {new Date(p.publishedAt).toLocaleDateString("en-IN", {
                                month: "short",
                                year: "numeric",
                              })}
                            </time>
                          )}
                        </div>
                        {/* Active indicator */}
                        {isActive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </nav>

                {/* Back to all */}
                <div className="px-6 py-5 border-t" style={{ borderColor: theme.borderColor }}>
                  <Link
                    to="/blog"
                    className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-70 transition-opacity"
                    style={{ color: theme.accentColor }}
                  >
                    ← View All Articles
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── MOBILE: floating sidebar toggle ── */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl"
        style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
        title="View all articles"
      >
        ☰
      </button>

      {/* ── MOBILE: sidebar drawer ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div
            className="relative ml-auto w-80 max-w-[90vw] h-full overflow-y-auto flex flex-col"
            style={{ backgroundColor: "#0F161E", borderLeft: `1px solid ${theme.borderColor}` }}
          >
            <div
              className="px-6 py-5 border-b flex items-center justify-between sticky top-0"
              style={{ borderColor: theme.borderColor, backgroundColor: "#0F161E" }}
            >
              <span
                className="text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: theme.accentColor }}
              >
                All Articles
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white opacity-60 hover:opacity-100 text-xl"
              >
                ×
              </button>
            </div>
            <nav className="flex-1">
              {allPosts.map((p, i) => {
                const isActive = p.slug === slug;
                return (
                  <Link
                    key={p._id}
                    to={`/blog/${p.slug}`}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-start gap-3 px-6 py-4 border-b"
                    style={{
                      backgroundColor: isActive ? "rgba(193,157,96,0.1)" : "transparent",
                      borderColor: theme.borderColor,
                    }}
                  >
                    <span
                      className="text-[10px] font-bold mt-0.5 w-5 shrink-0"
                      style={{ color: isActive ? theme.accentColor : theme.mutedText }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p
                      className="text-sm font-medium leading-snug"
                      style={{ color: isActive ? theme.accentColor : "rgba(255,255,255,0.8)" }}
                    >
                      {p.title}
                    </p>
                  </Link>
                );
              })}
            </nav>
            <div className="px-6 py-5 border-t" style={{ borderColor: theme.borderColor }}>
              <Link
                to="/blog"
                onClick={() => setSidebarOpen(false)}
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: theme.accentColor }}
              >
                ← View All Articles
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}