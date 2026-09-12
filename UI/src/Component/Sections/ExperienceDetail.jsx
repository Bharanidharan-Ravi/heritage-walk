// src/Component/Sections/ExperienceDetail.jsx
//
// The public "second page" for a Walk / Seminar / Course — reached after a
// visitor picks one on ExperienceList.jsx. Fetches the saved experience and
// hands it to ExperiencePageView, which owns the actual page markup — the
// exact same component the admin "Preview" uses (see
// Admin/ExperienceBuilder/ExperiencePreviewModal.jsx), so what gets built in
// the Experience Builder and what a visitor eventually sees are guaranteed
// to be the same rendering, not two things that can drift apart.

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { experiencePublicConfig } from "../Config/experiencePublic.config";
import ExperiencePageView from "./ExperiencePageView";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ExperienceDetail() {
  const { id } = useParams();
  const { theme, content } = experiencePublicConfig;

  const [experience, setExperience] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const res = await fetch(`${API_BASE}/api/experiences/public/${id}`);
        if (cancelled) return;
        if (res.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        setExperience(await res.json());
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (status === "loading") {
    return <CenteredMessage theme={theme} text={content.loadingMessage} />;
  }
  if (status === "notfound") {
    return (
      <CenteredMessage theme={theme} title={content.notFoundTitle} text={content.notFoundBody}>
        <BackLink theme={theme} content={content} />
      </CenteredMessage>
    );
  }
  if (status === "error" || !experience) {
    return (
      <CenteredMessage theme={theme} text={content.genericErrorMessage}>
        <BackLink theme={theme} content={content} />
      </CenteredMessage>
    );
  }

  return <ExperiencePageView experience={experience} />;
}

function BackLink({ theme, content }) {
  return (
    <Link to="/experiences" className="group flex items-center gap-2 uppercase tracking-widest text-xs font-bold w-max transition-all" style={{ color: theme.accentColor }}>
      <span className="transform transition-transform group-hover:-translate-x-1">←</span>
      {content.backToListLabel.replace("← ", "")}
    </Link>
  );
}

function CenteredMessage({ theme, title, text, children }) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-24 px-6 text-center" style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}>
      {title && <h2 className="text-3xl font-serif mb-4">{title}</h2>}
      <p className="mb-6" style={{ color: theme.mutedColor }}>{text}</p>
      {children}
    </section>
  );
}
