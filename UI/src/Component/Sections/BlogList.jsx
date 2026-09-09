import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { client, urlFor } from "/src/sanityClient";
import { blogConfig } from "../Config/blog.config";

export default function BlogList() {
  const { theme } = blogConfig;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = `*[_type == "blogPost"] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      featuredImage,
      excerpt,
      publishedAt,
      tags,
      requestedBy
    }`;

    client
      .fetch(query)
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching blog posts:", error);
        setLoading(false);
      });
  }, []);

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
            Loading Articles...
          </p>
        </div>
      </div>
    );
  }

  // Split posts: first post is "featured", rest are grid
  const [featured, ...rest] = posts;

  return (
    <section
      className="min-h-screen font-sans"
      style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}
    >
      {/* ── PAGE HEADER ── */}
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-12"
          style={{ borderColor: theme.borderColor }}>
          <div>
            <span
              className="text-xs font-bold tracking-[0.3em] uppercase block mb-4"
              style={{ color: theme.accentColor }}
            >
              Heritage Journal
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-medium leading-none">
              Stories &<br />
              <span style={{ color: theme.accentColor }}>Discoveries</span>
            </h1>
          </div>
          <p
            className="text-base font-light max-w-xs leading-relaxed md:text-right"
            style={{ color: theme.mutedText }}
          >
            Dispatches from the field — archaeology, architecture, and the
            living history beneath our feet.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">

        {/* ── FEATURED POST (first/latest) ── */}
        {featured && (
          <Link
            to={`/blog/${featured.slug}`}
            className="group block mb-20 rounded-[2rem] overflow-hidden border relative transition-all duration-500 hover:shadow-[0_0_60px_rgba(193,157,96,0.15)]"
            style={{
              backgroundColor: theme.articleBackground,
              borderColor: theme.borderColor,
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[460px]">
              {/* Image */}
              <div className="relative overflow-hidden bg-[#0b1720] min-h-[300px] lg:min-h-0">
                {featured.featuredImage ? (
                  <img
                    src={urlFor(featured.featuredImage).width(900).url()}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 absolute inset-0"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {/* Featured badge */}
                <div
                  className="absolute top-6 left-6 px-4 py-1.5 text-xs font-bold tracking-widest uppercase rounded-full"
                  style={{ backgroundColor: theme.accentColor, color: "#0F161E" }}
                >
                  Latest
                </div>
              </div>

              {/* Content */}
              <div className="p-10 md:p-14 flex flex-col justify-between">
                <div>
                  <div
                    className="text-xs font-bold tracking-widest uppercase mb-6"
                    style={{ color: theme.accentColor }}
                  >
                    <time>
                      {featured.publishedAt
                        ? new Date(featured.publishedAt).toLocaleDateString("en-IN", {
                            month: "long", day: "numeric", year: "numeric",
                          })
                        : ""}
                    </time>
                    {featured.tags?.[0] && (
                      <span className="ml-4 opacity-60">#{featured.tags[0]}</span>
                    )}
                  </div>

                  <h2 className="text-3xl md:text-4xl font-serif font-medium leading-snug mb-6 group-hover:underline decoration-1 underline-offset-4">
                    {featured.title}
                  </h2>

                  <p
                    className="text-base leading-relaxed font-light"
                    style={{ color: theme.mutedText }}
                  >
                    {featured.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-10">
                  {featured.requestedBy && (
                    <span
                      className="text-xs font-bold tracking-wider uppercase"
                      style={{ color: theme.mutedText }}
                    >
                      Suggested by{" "}
                      <span style={{ color: theme.accentColor }}>
                        {featured.requestedBy}
                      </span>
                    </span>
                  )}
                  <span
                    className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 ml-auto"
                    style={{ color: theme.accentColor }}
                  >
                    Read Article
                    <span className="transition-transform duration-300 group-hover:translate-x-2 inline-block">→</span>
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ── GRID OF REMAINING POSTS ── */}
        {rest.length > 0 && (
          <>
            <div
              className="text-xs font-bold tracking-[0.3em] uppercase mb-8 pb-4 border-b"
              style={{ color: theme.mutedText, borderColor: theme.borderColor }}
            >
              All Articles — {posts.length} total
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rest.map((post, i) => (
                <Link
                  to={`/blog/${post.slug}`}
                  key={post._id}
                  className="group flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    backgroundColor: theme.articleBackground,
                    borderColor: theme.borderColor,
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  {/* Card Image */}
                  <div className="aspect-video w-full overflow-hidden bg-[#0b1720] relative">
                    {post.featuredImage ? (
                      <img
                        src={urlFor(post.featuredImage).width(600).url()}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20 text-white">
                        No Image
                      </div>
                    )}
                    {/* Tag pill on image */}
                    {post.tags?.[0] && (
                      <span
                        className="absolute bottom-3 left-3 px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full"
                        style={{ backgroundColor: "rgba(15,22,30,0.85)", color: theme.accentColor }}
                      >
                        #{post.tags[0]}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-7 flex flex-col flex-grow">
                    <time
                      className="text-[10px] font-bold tracking-widest uppercase mb-3 block"
                      style={{ color: theme.accentColor }}
                      dateTime={post.publishedAt}
                    >
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("en-IN", {
                            month: "short", day: "numeric", year: "numeric",
                          })
                        : ""}
                    </time>

                    <h2
                      className="text-xl font-serif font-semibold mb-3 leading-snug group-hover:underline decoration-1 underline-offset-4"
                      style={{ color: theme.textColor }}
                    >
                      {post.title}
                    </h2>

                    <p
                      className="text-sm leading-relaxed flex-grow line-clamp-3"
                      style={{ color: theme.mutedText }}
                    >
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-6 pt-5 border-t"
                      style={{ borderColor: theme.borderColor }}>
                      {post.requestedBy ? (
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: theme.mutedText }}>
                          By <span style={{ color: theme.accentColor }}>{post.requestedBy}</span>
                        </span>
                      ) : <span />}
                      <span
                        className="text-xs font-bold tracking-widest uppercase flex items-center gap-1.5"
                        style={{ color: theme.textColor }}
                      >
                        Read
                        <span
                          className="transition-transform duration-300 group-hover:translate-x-1 inline-block"
                          style={{ color: theme.accentColor }}
                        >
                          →
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ── EMPTY STATE ── */}
        {posts.length === 0 && (
          <div className="text-center py-32">
            <p className="text-4xl mb-4">📜</p>
            <p className="font-serif text-2xl mb-2 text-white">No Articles Yet</p>
            <p style={{ color: theme.mutedText }} className="text-sm">
              The first story is being written. Check back soon.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}