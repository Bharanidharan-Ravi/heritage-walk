import React, { useEffect, useRef } from 'react';
import { heroConfig } from '../Config/heroConfig';
export default function Hero() {
  const bgRef = useRef(null);
  const textRef = useRef(null);
  const { assets, content, animation } = heroConfig;

  // Parallax Logic
  useEffect(() => {
    let requestRunning = null;
    const handleScroll = () => {
      if (requestRunning) return;
      requestRunning = requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        // Background moves slower than foreground
        if (bgRef.current) {
          bgRef.current.style.transform = `translate3d(0, ${scrolled * 0.5}px, 0)`;
        }
        // Text moves slightly and fades
        if (textRef.current) {
          textRef.current.style.transform = `translate3d(0, ${scrolled * 0.2}px, 0)`;
          textRef.current.style.opacity = `${1 - scrolled / 600}`;
        }
        requestRunning = null;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [animation]);

  return (
    // 'min-h-[110vh]' ensures the Hero is slightly taller than the screen
    // so when the About section overlaps, we don't lose content.
    <section className="relative w-full min-h-[110vh] overflow-hidden bg-[#0b1720] flex items-center justify-center">
      
      {/* 1. PARALLAX BACKGROUND */}
      <div className="absolute inset-0 w-full h-full z-0">
        <div ref={bgRef} className="w-full h-full will-change-transform">
          <img
            src={assets.bgImage} 
            alt="Hero Background" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

   {/* 2. OVERLAYS */}
      {/* --- BLUR ADDED HERE --- */}
      {/* Changed bg-black/30 to include backdrop-blur-[6px] */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[6px] z-0"></div>
      
      {/* Gradient Overlay remains on top */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1720] via-transparent to-black/40 opacity-90 z-0"></div>
      
      {/* 3. HERO CONTENT */}
      <div 
        ref={textRef}
        className="relative z-10 text-center px-6 -mt-20 will-change-transform"
      >
        <div className="animate-fade-in-up">
            <h1 className="text-5xl md:text-8xl font-serif text-white leading-[1.1] drop-shadow-2xl mb-6 max-w-6xl mx-auto">
              {content.titleLine1}<br />
              <span className="italic font-normal text-[#FFD050]">
                {content.titleLine2}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-200 font-medium max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-md">
               {content.subtitle}
            </p>

            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <button className="px-10 py-4 bg-[#FFD050] text-[#0b1720] font-bold text-sm tracking-widest uppercase rounded hover:bg-white transition-all shadow-lg hover:-translate-y-1">
                {content.primaryButton}
              </button>
              <button className="px-10 py-4 border border-white/30 text-white font-bold text-sm tracking-widest uppercase rounded hover:bg-white/10 backdrop-blur-md transition-all">
                {content.secondaryButton} →
              </button>
            </div>
        </div>
      </div>

    </section>
  );
}



// export default function Hero() {
//   const bgRef = useRef(null);
//   const textRef = useRef(null);

//   useEffect(() => {
//     let requestRunning = null;
//     const handleScroll = () => {
//       if (requestRunning) return;
//       requestRunning = requestAnimationFrame(() => {
//         const scrolled = window.scrollY;
//         if (bgRef.current) {
//             bgRef.current.style.transform = `translate3d(0, ${scrolled * 0.4}px, 0) scale(${1 + scrolled * 0.0001})`;
//         }
//         if (textRef.current) {
//           textRef.current.style.transform = `translate3d(0, ${scrolled * 0.1}px, 0)`;
//           textRef.current.style.opacity = `${1 - scrolled / 500}`;
//         }
//         requestRunning = null;
//       });
//     };
//     window.addEventListener("scroll", handleScroll, { passive: true });
//     return () => window.removeEventListener("scroll", handleScroll);
//   }, []);

//   return (
//     <section className="relative w-full h-screen overflow-hidden bg-[#0b1720]">
      
//       {/* 1. BACKGROUND IMAGE */}
//       <div className="absolute inset-0 w-full h-full">
//         <div ref={bgRef} className="w-full h-full relative will-change-transform">
//           <img
//             src="/images/GoldenTemple.png" // Your Golden Temple Image
//             alt="Temple Background" 
//             className="w-full h-full object-cover"
//           />
//           {/* Film Grain Texture for "Movie" Feel */}
//           {/* <div className="absolute test inset-0 opacity-[0.04] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div> */}
//         </div>
//       </div>

//       {/* 2. CINEMATIC GRADIENT (Static Overlay) */}
      
//       {/* A. Bottom Blur: Smooths out the temple details behind the text */}
//       <div className="absolute bottom-0 w-full test h-full backdrop-blur-[10px] mask-gradient-to-top"></div>

//       {/* 2. OVERLAYS FOR READABILITY */}
//       {/* Bottom fade to black to make text pop */}
//       <div className="absolute inset-0 bg-gradient-to-t from-[#0b1720] via-[#0b1720]/50 to-transparent opacity-90"></div>
      
//       {/* Texture */}
//       <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("${NOISE_PATTERN}")` }}></div>

//       {/* 3. HERO CONTENT */}
//       <div 
//         ref={textRef}
//         className="relative z-10 h-full flex flex-col items-center justify-center pt-20 px-6 text-center will-change-transform"
//       >
//         <div className="animate-fade-in-up flex flex-col items-center">
//             {/* MAIN HEADING */}
//             <h1 className="text-5xl md:text-8xl font-serif text-white leading-[1.1] drop-shadow-2xl mb-6 max-w-6xl mx-auto">
//               Every Site Holds a Story,<br />
//               <span className="italic font-normal" style={{ color: THEME_ACCENT }}>
//                 Every Story Needs a Seeker.
//               </span>
//             </h1>

//             {/* SUBTITLE - Pure White for maximum visibility */}
//             <p className="text-lg md:text-xl text-white font-medium max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-md">
//                Transforming archaeology from an academic study into an interactive and meaningful experience for everyone.
//             </p>

//             {/* BUTTONS */}
//             <div className="flex flex-col md:flex-row gap-6 justify-center">
//               {/* Primary Button - Matches Logo Color */}
//               <button className="px-10 py-4 bg-[#FFD050] text-[#0b1720] font-bold text-sm tracking-widest uppercase rounded hover:bg-white transition-all shadow-[0_0_20px_rgba(255,208,80,0.3)] hover:-translate-y-1">
//                 Explore Our Trails
//               </button>
              
//               {/* Secondary Button */}
//               <button className="px-10 py-4 border border-white text-white font-bold text-sm tracking-widest uppercase rounded hover:bg-white/10 backdrop-blur-sm transition-all group">
//                 View Seminars <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
//               </button>
//             </div>
//         </div>
//       </div>

//       <style>{`
//         @keyframes fadeInUp {
//           from { opacity: 0; transform: translateY(40px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
//         .animate-fade-in-up {
//           animation: fadeInUp 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
//         }
//         .will-change-transform {
//           will-change: transform;
//         }
//       `}</style>
//     </section>
//   );
// }

