import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PortableText } from "@portabletext/react";
import { client, urlFor } from "/src/sanityClient";
import { blogConfig } from "../Config/blog.config";

// ─── Portable Text Renderers (Premium Typography) ─────────────────────────────
function buildPortableTextComponents(theme) {
  return {
    types: {
      image: ({ value }) => {
        if (!value?.asset?._ref) return null;
        const ref = value.asset._ref;
        const parts = ref.split("-");
        const ext = parts[parts.length - 1];
        const dim = parts[parts.length - 2];
        const id = parts.slice(1, parts.length - 2).join("-");
        return (
          <figure className="my-16">
            <img
              src={`https://cdn.sanity.io/images/nh8jhz7r/production/${id}-${dim}.${ext}`}
              alt={value.alt || ""}
              className="w-full rounded-sm shadow-2xl"
              loading="lazy"
            />
            {value.caption && (
              <figcaption
                className="text-center text-xs mt-5 tracking-[0.2em] font-medium uppercase"
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
        <h1 className="text-5xl font-serif font-medium mt-20 mb-8 leading-tight" style={{ color: theme.accentColor }}>
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="text-4xl font-serif font-medium mt-16 mb-6 text-white leading-snug">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="text-2xl font-serif font-medium mt-12 mb-4 text-white uppercase tracking-widest">
          {children}
        </h3>
      ),
      normal: ({ children }) => (
        <p className="mb-8 leading-[2.1] text-[19px] font-light" style={{ color: "rgba(255,255,255,0.85)" }}>
          {children}
        </p>
      ),
      blockquote: ({ children }) => (
        <blockquote className="my-14 pl-10 md:pl-16 relative">
          <span className="absolute left-0 top-0 text-7xl font-serif leading-none opacity-20" style={{ color: theme.accentColor }}>
            "
          </span>
          <div className="text-2xl md:text-3xl font-serif italic leading-relaxed text-white">
            {children}
          </div>
        </blockquote>
      ),
    },
    marks: {
      strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
      em: ({ children }) => <em className="italic font-serif text-xl" style={{ color: theme.accentColor }}>{children}</em>,
      link: ({ value, children }) => (
        <a
          href={value?.href}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-1 underline-offset-4 hover:opacity-70 transition-opacity"
          style={{ color: theme.accentColor }}
        >
          {children}
        </a>
      ),
    },
    list: {
      bullet: ({ children }) => (
        <ul className="mb-10 space-y-4 pl-4 list-none text-[19px] font-light" style={{ color: "rgba(255,255,255,0.85)" }}>
          {React.Children.map(children, (child) => (
            <li className="flex items-start gap-5">
              <span className="mt-3 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.accentColor }} />
              <span className="leading-[2.1]">{child}</span>
            </li>
          ))}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="mb-10 space-y-4 pl-8 list-decimal font-serif text-xl marker:text-[#CFA762] text-[rgba(255,255,255,0.85)]">
          {children}
        </ol>
      ),
    },
  };
}

// ─── Comments Section (Fully Functional & Integrated) ─────────────────────────
function CommentsSection({ slug, theme }) {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", comment: "" });
  const [submitStatus, setSubmitStatus] = useState("");
  const formRef = useRef(null);

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
    <div className="mt-32 pt-20 border-t" style={{ borderColor: theme.borderColor }}>
      <h2 className="text-4xl font-serif font-medium mb-4 text-white">
        Community <span style={{ color: theme.accentColor }}>Voices</span>
      </h2>
      <p className="text-base mb-16 font-light" style={{ color: theme.mutedText }}>
        Share your thoughts, questions, or stories about this article.
      </p>

      {/* ── Past Comments ── */}
      {loadingComments ? (
        <div className="flex items-center gap-3 mb-10" style={{ color: theme.mutedText }}>
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: theme.accentColor }}
          />
          <span className="text-sm">Loading voices...</span>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6 mb-20">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase mb-8" style={{ color: theme.mutedText }}>
            {comments.length} Response{comments.length !== 1 ? "s" : ""}
          </p>
          {comments.map((c, i) => (
            <div
              key={c.id || i}
              className="p-8 border-b"
              style={{ borderColor: theme.borderColor }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
                  >
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-base text-white">{c.name}</span>
                </div>
                <time
                  className="text-[11px] font-medium tracking-[0.1em] uppercase"
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
                className="text-base leading-relaxed pl-14 font-light"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {c.comment}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="py-16 border-b mb-20 text-left"
          style={{ borderColor: theme.borderColor, color: theme.mutedText }}
        >
          <p className="font-serif text-2xl text-white mb-2">No responses yet</p>
          <p className="text-base font-light">Be the first to share your perspective on this piece.</p>
        </div>
      )}

      {/* ── Comment Form (Minimalist Premium Design) ── */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-10 text-white">
          Leave a Note
        </h3>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your Name *"
                className="w-full px-0 py-4 text-base text-white focus:outline-none transition-colors bg-transparent border-b"
                style={{ borderColor: theme.borderColor }}
                onFocus={(e) => (e.target.style.borderColor = theme.accentColor)}
                onBlur={(e) => (e.target.style.borderColor = theme.borderColor)}
              />
            </div>
            <div>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email Address *"
                className="w-full px-0 py-4 text-base text-white focus:outline-none transition-colors bg-transparent border-b"
                style={{ borderColor: theme.borderColor }}
                onFocus={(e) => (e.target.style.borderColor = theme.accentColor)}
                onBlur={(e) => (e.target.style.borderColor = theme.borderColor)}
              />
            </div>
          </div>
          <div>
            <textarea
              required
              rows="4"
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Your thoughts..."
              className="w-full px-0 py-4 text-base text-white focus:outline-none transition-colors resize-none bg-transparent border-b"
              style={{ borderColor: theme.borderColor }}
              onFocus={(e) => (e.target.style.borderColor = theme.accentColor)}
              onBlur={(e) => (e.target.style.borderColor = theme.borderColor)}
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-xs font-light" style={{ color: theme.mutedText }}>
              * Responses are moderated for quality.
            </p>
            <button
              type="submit"
              disabled={submitStatus === "sending"}
              className="px-10 py-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
            >
              {submitStatus === "sending" ? "Publishing..." : "Publish Note"}
            </button>
          </div>

          {submitStatus === "success" && (
            <p className="text-sm py-4 border-l-2 pl-4 font-medium" style={{ borderColor: "#4ade80", color: "#4ade80" }}>
              Note submitted successfully. It will appear after moderation.
            </p>
          )}
          {submitStatus === "error" && (
            <p className="text-sm py-4 border-l-2 pl-4 font-medium" style={{ borderColor: "#f87171", color: "#f87171" }}>
              Something went wrong securely delivering your note. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Main BlogPost Component ──────────────────────────────────────────────────
export default function BlogPost() {
  const { theme, ui } = blogConfig;
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 1. Fetch ALL posts (for sidebar index + prev/next logic)
  useEffect(() => {
    const indexQuery = `*[_type == "blogPost"] | order(publishedAt desc) {
      _id, title, "slug": slug.current, publishedAt
    }`;
    client.fetch(indexQuery).then(setAllPosts).catch(console.error);
  }, []);

  // 2. Fetch current post body
  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const query = `*[_type == "blogPost" && slug.current == $slug][0] {
      title, "slug": slug.current, featuredImage, excerpt, body, publishedAt, tags, requestedBy
    }`;

    client
      .fetch(query, { slug })
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  // Derive Prev/Next articles
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  const portableTextComponents = buildPortableTextComponents(theme);

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.pageBackground }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: theme.accentColor }} />
          <p className="text-sm tracking-widest uppercase font-bold opacity-50 text-white">Loading Article...</p>
        </div>
      </div>
    );
  }

  // ── Not Found State ──
  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ backgroundColor: theme.pageBackground }}>
        <p className="text-6xl">📜</p>
        <p className="text-white font-serif text-3xl">Article not found</p>
        <Link
          to="/blog"
          className="text-[11px] font-bold uppercase tracking-[0.2em] px-8 py-4 transition-opacity hover:opacity-80"
          style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
        >
          Return to Archives
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen font-sans selection:bg-[#CFA762] selection:text-black"
      style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}
    >
      {/* ── HERO BANNER: Taller and immersive ── */}
      <div className="relative w-full h-[65vh] min-h-[500px]">
        {post.featuredImage ? (
          <img
            src={urlFor(post.featuredImage).width(1920).url()}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: "#0b1720" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#141517]/40 to-[#141517]" />

        <Link
          to="/blog"
          className="absolute top-10 left-6 md:left-12 text-[10px] font-bold uppercase tracking-[0.25em] px-6 py-3 border transition-all duration-500 hover:bg-white/5"
          style={{ color: theme.accentColor, borderColor: "rgba(207,167,98,0.3)" }}
        >
          {ui.backButton}
        </Link>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="max-w-[90rem] mx-auto px-6 md:px-12 -mt-40 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-16 lg:gap-24 items-start">
          {/* ══ LEFT: Article Content ══ */}
          <main>
            <header className="mb-16">
              <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.05] mb-10 text-white">
                {post.title}
              </h1>

              <div
                className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[11px] font-bold tracking-[0.2em] uppercase pb-10 border-b"
                style={{ color: theme.mutedText, borderColor: theme.borderColor }}
              >
                {post.publishedAt && (
                  <time>
                    {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
                {post.requestedBy && (
                  <>
                    <span>|</span>
                    <span style={{ color: theme.accentColor }}>
                      {ui.requestedByBadge} {post.requestedBy}
                    </span>
                  </>
                )}
              </div>

              {post.excerpt && (
                <p
                  className="text-2xl md:text-3xl font-serif italic font-light leading-relaxed mt-12"
                  style={{ color: theme.accentColor }}
                >
                  {post.excerpt}
                </p>
              )}
            </header>

            {/* EXPANDED WIDTH FOR READING: max-w-[880px] */}
            <div className="max-w-[880px] lg:pr-10">
              {post.body ? (
                <PortableText value={post.body} components={portableTextComponents} />
              ) : (
                <p style={{ color: theme.mutedText }}>No text content available.</p>
              )}
            </div>

            <div className="max-w-[880px] lg:pr-10">
              {/* ── PREV / NEXT NAVIGATION (Premium styling) ── */}
              <div
                className="mt-32 pt-16 border-t grid grid-cols-1 md:grid-cols-2 gap-10"
                style={{ borderColor: theme.borderColor }}
              >
                {/* Previous (Older) */}
                {prevPost ? (
                  <Link
                    to={`/blog/${prevPost.slug}`}
                    className="group flex flex-col transition-opacity hover:opacity-70"
                  >
                    <span
                      className="text-[10px] font-bold tracking-[0.25em] uppercase block mb-4"
                      style={{ color: theme.mutedText }}
                    >
                      ← Previous Dispatch
                    </span>
                    <p className="font-serif text-2xl font-medium leading-snug text-white">
                      {prevPost.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}

                {/* Next (Newer) */}
                {nextPost ? (
                  <Link
                    to={`/blog/${nextPost.slug}`}
                    className="group flex flex-col md:text-right transition-opacity hover:opacity-70"
                  >
                    <span
                      className="text-[10px] font-bold tracking-[0.25em] uppercase block mb-4"
                      style={{ color: theme.mutedText }}
                    >
                      Next Dispatch →
                    </span>
                    <p className="font-serif text-2xl font-medium leading-snug text-white">
                      {nextPost.title}
                    </p>
                  </Link>
                ) : (
                  <div />
                )}
              </div>

              {/* ── COMMENTS SECTION ── */}
              <CommentsSection slug={slug} theme={theme} />
            </div>
          </main>

          {/* ══ RIGHT: Sticky Sidebar Index ══ */}
          <aside className="hidden lg:block pt-40">
            <div
              className="sticky top-12 border-l pl-10"
              style={{ borderColor: theme.borderColor }}
            >
              <span
                className="text-[10px] font-bold tracking-[0.3em] uppercase mb-10 block"
                style={{ color: theme.accentColor }}
              >
                Journal Directory
              </span>
              <nav className="flex flex-col gap-6">
                {allPosts.map((p) => {
                  const isActive = p.slug === slug;
                  return (
                    <Link key={p._id} to={`/blog/${p.slug}`} className="group relative">
                      <p
                        className="text-base font-serif font-medium leading-snug transition-colors duration-500 group-hover:text-[#CFA762]"
                        style={{ color: isActive ? theme.accentColor : theme.mutedText }}
                      >
                        {p.title}
                      </p>
                      {isActive && (
                        <div
                          className="absolute -left-[41px] top-2 w-[3px] h-4"
                          style={{ backgroundColor: theme.accentColor }}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      </div>

      {/* ── MOBILE: Floating Sidebar Toggle ── */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl transition-transform active:scale-95"
        style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
        title="View all articles"
      >
        ☰
      </button>

      {/* ── MOBILE: Sidebar Drawer ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className="relative ml-auto w-80 max-w-[90vw] h-full overflow-y-auto flex flex-col shadow-2xl"
            style={{ backgroundColor: "#141517", borderLeft: `1px solid ${theme.borderColor}` }}
          >
            <div
              className="px-8 py-8 border-b flex items-center justify-between sticky top-0 z-10"
              style={{ borderColor: theme.borderColor, backgroundColor: "#141517" }}
            >
              <span
                className="text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: theme.accentColor }}
              >
                Directory
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-white opacity-60 hover:opacity-100 text-3xl font-light"
              >
                ×
              </button>
            </div>
            <nav className="flex-1 px-8 py-6 flex flex-col gap-6">
              {allPosts.map((p) => {
                const isActive = p.slug === slug;
                return (
                  <Link
                    key={p._id}
                    to={`/blog/${p.slug}`}
                    onClick={() => setSidebarOpen(false)}
                    className="relative"
                  >
                    <p
                      className="text-lg font-serif font-medium leading-snug"
                      style={{ color: isActive ? theme.accentColor : "rgba(255,255,255,0.7)" }}
                    >
                      {p.title}
                    </p>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}