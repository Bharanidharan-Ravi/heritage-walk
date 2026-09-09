import React, { useEffect, useRef } from "react";
// Make sure to import the config file correctly
import { aboutConfig } from "../Config/aboutconfig";

export default function AboutSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
          }
        });
      },
      { threshold: 0.1 }
    );
    const elements = sectionRef.current.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Safe destructuring with fallbacks
  const theme = aboutConfig?.theme || {};
  const content = aboutConfig?.content || {};
  const features = aboutConfig?.features || [];

  return (
    <section 
      ref={sectionRef} 
      className="sticky top-0 z-0 min-h-screen flex flex-col justify-center py-20 overflow-hidden shadow-2xl"
      style={{ backgroundColor: theme.background, color: theme.textColor }}
    >
      
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")` }}>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        
        {/* --- HEADER --- */}
        <div className="mb-16 animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out">
          <span className="font-bold tracking-[0.25em] uppercase text-xs mb-4 block border-b w-fit pb-1" 
                style={{ color: theme.accentColor, borderColor: theme.accentColor }}>
            {content.badge}
          </span>
          <h2 className="text-4xl md:text-6xl font-serif font-medium leading-tight" style={{ color: theme.textColor }}>
            {content.titleLine1} <br />
            <span className="opacity-50 italic">{content.titleLine2}</span>
          </h2>
        </div>

        {/* --- BENTO GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* 1. MAIN MISSION (Large Card) */}
          <div className="md:col-span-8 p-10 rounded-[2.5rem] shadow-sm animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-100 border"
               style={{ backgroundColor: theme.cardBackground, borderColor: `${theme.accentColor}33` }}>
             <h3 className="text-3xl font-serif mb-6" style={{ color: theme.textColor }}>{content.missionTitle}</h3>
             <p className="opacity-70 text-lg leading-relaxed font-light">
               {content.missionText}
             </p>
          </div>

          {/* 2. VISION (Dark Card) */}
          <div className="md:col-span-4 p-10 rounded-[2.5rem] shadow-lg flex flex-col justify-between animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-200" 
               style={{ backgroundColor: theme.darkCard, color: "#F4F1EA" }}> 
             <div>
                <svg className="w-10 h-10 mb-6" style={{ color: theme.accentColor }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                <h3 className="text-xl font-bold uppercase tracking-widest mb-4" style={{ color: theme.accentColor }}>{content.visionTitle}</h3>
                <p className="font-light leading-relaxed opacity-80">
                  {content.visionText}
                </p>
             </div>
             <div className="mt-8 font-serif italic text-xl opacity-80">
                {content.visionQuote}
             </div>
          </div>

          {/* --- DYNAMIC FEATURE CARDS (From Config) --- */}
          {features.map((item, index) => (
            <div 
              key={item.id}
              className={`md:col-span-4 p-8 rounded-[2rem] shadow-md group transition-all duration-300 hover:-translate-y-1 animate-on-scroll opacity-0 translate-y-10 border`}
              style={{ 
                backgroundColor: item.style.bg, 
                color: item.style.text,
                borderColor: item.style.border || 'transparent',
                transitionDelay: `${300 + (index * 100)}ms` // 300ms, 400ms, 500ms
              }}
            >
              {/* Icon Box */}
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 border"
                style={{ 
                  backgroundColor: item.style.iconBg, 
                  color: item.style.iconColor,
                  borderColor: item.style.iconBorder || 'transparent'
                }}
              >
                 <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.iconPath}></path>
                 </svg>
              </div>
              
              {/* Text Content */}
              <h4 className="text-2xl font-serif font-medium mb-3">{item.title}</h4>
              <p className="text-sm opacity-70 leading-relaxed font-light">
                 {item.description}
              </p>
            </div>
          ))}

        </div>
      </div>
    </section>
  );
}

// import React, { useEffect, useRef } from "react";

// export default function AboutSection() {
//   const sectionRef = useRef(null);

//   // Simple intersection observer for fade-in animations
//   useEffect(() => {
//     const observer = new IntersectionObserver(
//       (entries) => {
//         entries.forEach((entry) => {
//           if (entry.isIntersecting) {
//             entry.target.classList.add("opacity-100", "translate-y-0");
//             entry.target.classList.remove("opacity-0", "translate-y-10");
//           }
//         });
//       },
//       { threshold: 0.1 }
//     );

//     const elements = sectionRef.current.querySelectorAll(".animate-on-scroll");
//     elements.forEach((el) => observer.observe(el));

//     return () => observer.disconnect();
//   }, []);

//   return (
//     <section ref={sectionRef} className="py-24 bg-[#0b1720] text-white relative overflow-hidden">
      
//       {/* Background Decor: Faded Map/Texture */}
//       <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03] pointer-events-none">
//          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
//             <path fill="#FFD050" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.6,-46.6C91.4,-34.1,98.1,-19.2,95.8,-5.3C93.5,8.6,82.2,21.5,70.9,32.2C59.6,42.9,48.3,51.4,36.9,58.6C25.5,65.8,14.1,71.7,1.1,69.8C-11.9,67.9,-26.5,58.2,-39.7,49.1C-52.9,40,-64.7,31.5,-72.6,20.2C-80.5,8.9,-84.5,-5.2,-80.7,-17.8C-76.9,-30.4,-65.3,-41.5,-52.8,-49.4C-40.3,-57.3,-26.9,-62,-13.6,-64.4C-0.3,-66.8,13,-66.9,30.5,-83.6L44.7,-76.4Z" transform="translate(100 100)" />
//          </svg>
//       </div>

//       <div className="max-w-7xl mx-auto px-6 relative z-10">
        
//         {/* 1. HEADER */}
//         <div className="mb-20 animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 ease-out">
//           <span className="text-[#FFD050] font-bold tracking-[0.2em] uppercase text-xs mb-4 block">
//             Who We Are
//           </span>
//           <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight">
//             Bridging the gap between <br />
//             <span className="text-gray-400">textbooks & the terrain.</span>
//           </h2>
//         </div>

//         {/* 2. BENTO GRID LAYOUT */}
//         <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
//           {/* Card 1: Main Mission (Large) */}
//           <div className="md:col-span-8 bg-[#15202b] p-8 md:p-12 rounded-2xl border border-white/5 shadow-xl animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-100">
//              <h3 className="text-2xl font-serif text-[#FFD050] mb-6">History Beyond Textbooks</h3>
//              <p className="text-gray-300 text-lg leading-relaxed mb-6">
//                Archaeo Trails was born from a realization: there is a lack of hands-on opportunities to truly know our cultural past. 
//                We are an initiative founded by passionate postgraduate archaeology students to transform history from a static academic study 
//                into an <strong>interactive, field-based experience</strong>.
//              </p>
//              {/* REMOVED BADGES HERE (Est. 2023 / Founded by) */}
//           </div>

//           {/* Card 2: The Vision (Tall Side) */}
//           <div className="md:col-span-4 bg-[#FFD050] text-[#0b1720] p-8 md:p-10 rounded-2xl shadow-xl flex flex-col justify-between animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-200">
//              <div>
//                 <svg className="w-10 h-10 mb-6 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
//                 <h3 className="text-xl font-bold uppercase tracking-widest mb-4">Our Vision</h3>
//                 <p className="font-medium leading-relaxed opacity-90">
//                   To extend the reach of our culture beyond academic institutions. We aspire to nurture the next generation of heritage custodians through authentic learning.
//                 </p>
//              </div>
//              <div className="mt-8 font-serif italic text-2xl font-bold opacity-80">
//                 "Every Story Needs a Seeker."
//              </div>
//           </div>

//           {/* Card 3: What We Do (3 Columns) */}
//           <div className="md:col-span-4 bg-[#1a2632] p-8 rounded-2xl border border-white/5 hover:border-[#FFD050]/50 transition-colors group animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-300">
//             <div className="w-12 h-12 bg-[#FFD050]/10 text-[#FFD050] rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
//                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"></path></svg>
//             </div>
//             <h4 className="text-xl font-bold text-white mb-2">Field Visits</h4>
//             <p className="text-sm text-gray-400 leading-relaxed">
//                Structured study visits for schools and colleges, focusing on site-based learning and practical understanding of excavations.
//             </p>
//           </div>

//           <div className="md:col-span-4 bg-[#1a2632] p-8 rounded-2xl border border-white/5 hover:border-[#FFD050]/50 transition-colors group animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-400">
//             <div className="w-12 h-12 bg-[#FFD050]/10 text-[#FFD050] rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
//                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
//             </div>
//             <h4 className="text-xl font-bold text-white mb-2">Workshops</h4>
//             <p className="text-sm text-gray-400 leading-relaxed">
//                Hands-on training in epigraphy, ceramics, and conservation to promote practical skills and methodological awareness.
//             </p>
//           </div>

//           <div className="md:col-span-4 bg-[#1a2632] p-8 rounded-2xl border border-white/5 hover:border-[#FFD050]/50 transition-colors group animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-500">
//             <div className="w-12 h-12 bg-[#FFD050]/10 text-[#FFD050] rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
//                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
//             </div>
//             <h4 className="text-xl font-bold text-white mb-2">Seminars</h4>
//             <p className="text-sm text-gray-400 leading-relaxed">
//                Academic sessions featuring experts in museology, history, and cultural studies to inspire research and discussion.
//             </p>
//           </div>

//         </div>

//         {/* 3. CTA FOOTER */}
//         <div className="mt-20 text-center animate-on-scroll opacity-0 translate-y-10 transition-all duration-1000 delay-700">
//           <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
//              "We aspire to preserve and promote cultural heritage by inspiring curiosity, encouraging authentic learning, and nurturing the next generation."
//           </p>
//           <button className="px-8 py-3 border border-[#FFD050] text-[#FFD050] text-sm font-bold uppercase tracking-widest hover:bg-[#FFD050] hover:text-[#0b1720] transition-all duration-300">
//              Join Our Next Trail
//           </button>
//         </div>

//       </div>
//     </section>
//   );
// }








