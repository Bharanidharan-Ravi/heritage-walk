import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { client, urlFor } from "/src/sanityClient";
import { blogConfig } from "../Config/blog.config";

export default function BlogList2() {
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
            Loading Archives...
          </p>
        </div>
      </div>
    );
  }

  // Split posts: first post is "featured" (latest), rest go in the grid
  const [featured, ...rest] = posts;

  return (
    <section
      className="min-h-screen font-sans"
      style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}
    >
      {/* ── LUXURY PAGE HEADER ── */}
      <div className="max-w-[90rem] mx-auto px-6 md:px-12 pt-40 pb-20">
        <div
          className="border-b pb-16 flex flex-col justify-end min-h-[30vh]"
          style={{ borderColor: theme.borderColor }}
        >
          <span
            className="text-[11px] font-bold tracking-[0.4em] uppercase mb-6"
            style={{ color: theme.accentColor }}
          >
            The Archives
          </span>
          <h1 className="text-6xl md:text-8xl font-serif font-light leading-[0.9]">
            Heritage <br />
            <span className="italic font-medium" style={{ color: theme.accentColor }}>
              Journal
            </span>
          </h1>
        </div>
      </div>

      <div className="max-w-[90rem] mx-auto px-6 md:px-12 pb-32">
        {/* ── FEATURED POST (Editorial Split Layout) ── */}
        {featured && (
          <Link
            to={`/blogs/${featured.slug}`}
            className="group block mb-32 relative"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
              {/* Massive 4:3 Image */}
              <div className="relative overflow-hidden aspect-[4/3] w-full shadow-2xl bg-[#0b1720]">
                {featured.featuredImage ? (
                  <img
                    src={urlFor(featured.featuredImage).width(1200).url()}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-0 left-0 w-full h-full bg-black/10 transition-opacity duration-700 group-hover:bg-transparent" />
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center">
                <div
                  className="text-[10px] font-bold tracking-[0.3em] uppercase mb-8"
                  style={{ color: theme.accentColor }}
                >
                  <time>
                    {featured.publishedAt
                      ? new Date(featured.publishedAt).toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })
                      : ""}
                  </time>
                  <span className="mx-4">|</span> Latest Dispatch
                </div>

                <h2 className="text-4xl md:text-6xl font-serif font-medium leading-[1.1] mb-8 transition-colors duration-500 group-hover:text-[#CFA762]">
                  {featured.title}
                </h2>

                <p
                  className="text-xl font-light leading-relaxed mb-12 max-w-xl"
                  style={{ color: theme.mutedText }}
                >
                  {featured.excerpt}
                </p>

                <span
                  className="text-[11px] font-bold tracking-[0.25em] uppercase border-b pb-2 inline-flex w-fit transition-all duration-300 group-hover:pr-4"
                  style={{ borderColor: theme.accentColor, color: theme.textColor }}
                >
                  Read the Article
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* ── GRID OF REMAINING POSTS (Minimalist & Refined) ── */}
        {rest.length > 0 && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20 border-t pt-20"
            style={{ borderColor: theme.borderColor }}
          >
            {rest.map((post) => (
              <Link
                to={`/blogs/${post.slug}`}
                key={post._id}
                className="group flex flex-col"
              >
                {/* Print Photography 4:3 Aspect Ratio */}
                <div className="aspect-[4/3] w-full overflow-hidden mb-8 relative bg-[#0b1720]">
                  {post.featuredImage ? (
                    <img
                      src={urlFor(post.featuredImage).width(800).url()}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20 text-white">
                      No Image
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 transition-colors duration-500 group-hover:bg-transparent" />
                </div>

                <time
                  className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block"
                  style={{ color: theme.accentColor }}
                >
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : ""}
                </time>

                <h2 className="text-2xl font-serif font-medium leading-snug mb-4 transition-colors duration-500 text-white group-hover:text-[#CFA762]">
                  {post.title}
                </h2>

                <p
                  className="text-[15px] font-light leading-relaxed flex-grow line-clamp-3 mb-6"
                  style={{ color: theme.mutedText }}
                >
                  {post.excerpt}
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {posts.length === 0 && (
          <div className="text-center py-32 border-t" style={{ borderColor: theme.borderColor }}>
            <p className="text-4xl mb-4">📜</p>
            <p className="font-serif text-2xl mb-2 text-white">No Archives Found</p>
            <p style={{ color: theme.mutedText }} className="text-sm">
              The first story is currently being recorded.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}