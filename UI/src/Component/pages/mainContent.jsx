// import React, { useEffect } from "react";
// import MainContent from "./aboutSection";
// import AboutSection from "./aboutSection";


// // Fully fixed version — all JSX validated, missing </div> restored, no unterminated blocks.

// export default function HeritageHome() {
//     // const [theme, setTheme] = useState("blue");

//     // const themes = {
//     //     blue: {
//     //         "--primary": "#12314a",
//     //         "--accent": "#caa863",
//     //         "--bg": "#f6f2ea",
//     //         "--card": "#0f3550",
//     //         "--text": "#0b1720",
//     //     },
//     //     cream: {
//     //         "--primary": "#6b4a2f",
//     //         "--accent": "#a57c44",
//     //         "--bg": "#fbf7ef",
//     //         "--card": "#5a3f2b",
//     //         "--text": "#2b1f18",
//     //     },
//     // };

//     /* Scroll + AOS + Parallax setup */
//     useEffect(() => {
//         if (typeof window === "undefined") return;

//         // const io = new IntersectionObserver(
//         //     (entries, obs) => {
//         //         entries.forEach((entry) => {
//         //             if (entry.isIntersecting) {
//         //                 const el = entry.target;
//         //                 if (el.hasAttribute("data-aos-stagger")) {
//         //                     const children = el.querySelectorAll("[data-aos]");
//         //                     children.forEach((child, index) => {
//         //                         child.style.transitionDelay = `${index * 120}ms`;
//         //                         child.classList.add("aos-animate");
//         //                     });
//         //                 } else {
//         //                     el.classList.add("aos-animate");
//         //                 }
//         //                 obs.unobserve(el);
//         //             }
//         //         });
//         //     },
//         //     { threshold: 0.15 }
//         // );
//         const io = new IntersectionObserver(
//             (entries) => {
//                 entries.forEach((entry) => {
//                     const el = entry.target;

//                     if (entry.isIntersecting) {
//                         el.classList.add("aos-animate");
//                     } else {
//                         // reset animation when out of view
//                         el.classList.remove("aos-animate");
//                     }
//                 });
//             },
//             { threshold: 0.2 }
//         );


//         document.querySelectorAll("[data-aos]").forEach((el) => {
//             el.classList.add("aos-init");
//             io.observe(el);
//         });

//         const parallaxEls = document.querySelectorAll("[data-parallax]");
//         let raf;

//         const update = () => {
//             raf = requestAnimationFrame(() => {
//                 parallaxEls.forEach((el) => {
//                     const speed = parseFloat(el.getAttribute("data-parallax-speed") || "0.12");
//                     const rect = el.getBoundingClientRect();
//                     const offset = rect.top * speed;
//                     const img = el.querySelector("img[data-parallax-image]");
//                     if (img) img.style.transform = `translateY(${offset * -1}px)`;
//                 });
//             });
//         };

//         window.addEventListener("scroll", update, { passive: true });
//         update();

//         return () => {
//             io.disconnect();
//             window.removeEventListener("scroll", update);
//             if (raf) cancelAnimationFrame(raf);
//         };
//     }, []);

//     return (
//         <div
//             className="min-h-screen font-serif w-screen"
//             style={{ background: `var(--bg)`, color: `var(--text)` }}
//         >
//             {/* Animation CSS */}
//             <style>{`
//         .aos-init { opacity: 0; transform: translateY(22px); transition: all 700ms cubic-bezier(.22,.9,.35,1); }
//         .aos-animate { opacity: 1; transform: none; }
//         [data-aos="fade-right"].aos-init { transform: translateX(-20px); }
//         [data-aos="fade-left"].aos-init { transform: translateX(20px); }
//         [data-aos="zoom-in"].aos-init { transform: scale(0.96); }
//       `}</style> 

//             {/* HEADER */}
//             <header className="max-w-8xl mx-7 p-6 flex items-center justify-between">
//                 <div className="flex items-center gap-4">

//                     <div className="w-12 h-12 rounded bg-primaryblue flex items-center justify-center text-white font-bold">HW</div>
//                     <div>
//                         <div className="text-xl font-semibold">Heritage Walks</div>
//                         <div className="text-sm opacity-80">Archaeology • Tours • Seminars</div>
//                     </div>
//                     <div className="w-12 h-12 bg-primaryblue">tailwind </div>
//                 </div>

//                 <nav className="flex gap-4 items-center">
//                     <a href="#walks" className="text-sm hover:underline">Walks</a>
//                     <a href="#seminars" className="text-sm hover:underline">Seminars</a>
//                     <a href="#gallery" className="text-sm hover:underline">Gallery</a>
//                     <a href="#about" className="text-sm hover:underline">About</a>
//                     {/* <button
//                         onClick={() => setTheme(theme === "blue" ? "cream" : "blue")}
//                         className="px-3 py-1 border rounded text-sm"
//                         style={{ borderColor: "var(--card)" }}
//                     >Toggle Theme</button> */}
//                 </nav>
//             </header>

//             {/* HERO */}
//             <section id="hero"
//                 className="relative max-w-8xl h-158 mx-auto px-8 py-24 grid grid-cols-1 md:grid-cols-1 gap-10 items-center overflow-hidden rounded-xl"
//                 data-parallax-container >
//                 {/* BACKGROUND IMAGE WITH BLUR */}
//                 <div className="absolute inset-0 z-0 overflow-hidden" data-parallax speed="0.15">
//                     <img
//                         src="public/images/ChatGPT Image Nov 22, 2025, 12_59_02 PM.png"
//                         alt="Heritage Walk Hero"
//                         className="w-screen h-full object-cover scale-100 blur-sm opacity-60"
//                     />
//                 </div>
//                 <div className="absolute inset-0 z-10 pointer-events-none opacity-50">
//                     <div className="absolute inset-0 bg-[url('public/images/fog.png')] bg-cover bg-center opacity-40 mix-blend-screen"></div>
//                 </div>
//                 {/* TAMIL MANDALA PATTERN BEHIND TEXT */}
//                 {/* <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-15 z-5"> */}
//                 {/* <img
//                         src="public/images/mandala.png"
//                         alt="Tamil Mandala"
//                         className="w-full h-full object-contain animate-slowspin"
//                     />
//                 </div> */}
//                 {/* LEFT TEXT BLOCK */}
//                 <div
//                     data-aos="fade-up"
//                     className="
//       z-10
//       max-w-3xl
//       mx-auto        /* center on mobile */
//       md:mx-0        /* shift left on desktop */
//       text-center    /* text center on mobile */
//     "
//                 >
//                     <h1 className="text-4xl md:text-5xl font-bold leading-tight text-primaryBlue drop-shadow-xl">
//                         Every Site Holds a Story,<br /> Every Story Needs a Seeker
//                     </h1>

//                     <p className="mt-4 text-lg text-primaryBlue text-[(--text)]/80 drop-shadow-md max-w-2xl mx-auto">
//                         Experience Tamil Nadu’s rich heritage through immersive walks, guided trails,
//                         and field-based explorations that take history beyond textbooks.
//                     </p>
//                     <div className="mt-6 flex gap-4 justify-center">
//                         <button className="px-6 py-3 rounded bg-(--primary) text-white shadow-lg hover:bg-opacity-90 transition">
//                             Explore Walks
//                         </button>
//                         <button className="px-6 py-3 rounded border border-(--primary) text-(--primary) hover:bg-(--primary) hover:text-white transition">
//                             Join Seminar
//                         </button>
//                     </div>
//                 </div>

//                 {/* RIGHT IMAGE CARD REMOVED FOR FULL BACKGROUND EFFECT */}
//             </section>
//             <style>{`
// /* Animated Fog */
// @keyframes fogMove {
// 0% { transform: translateX(-10%); opacity: 0.4; }
// 50% { transform: translateX(10%); opacity: 0.6; }
// 100% { transform: translateX(-10%); opacity: 0.4; }
// }
// .animate-fog { animation: fogMove 18s ease-in-out infinite alternate; }


// /* Mandala Slow Rotation */
// @keyframes slowspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
// .animate-slowspin { animation: slowspin 110s linear infinite; }
// `}</style>
//             <AboutSection />
//             {/* SERVICES */}
//             <section id="services" data-aos="fade-up" className="max-w-6xl mx-auto px-6 py-10">
//                 <h2 className="text-2xl font-semibold mb-6">Our Services</h2>

//                 <div data-aos-stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     <div data-aos="fade-up" className="p-6 rounded bg-white/70 shadow hover:-translate-y-1 transition">
//                         <h3 className="font-semibold">Heritage Walks</h3>
//                         <p className="mt-2 text-sm opacity-80">Guided temple, fort and historical city trails.</p>
//                     </div>

//                     <div data-aos="fade-up" className="p-6 rounded bg-white/70 shadow hover:-translate-y-1 transition">
//                         <h3 className="font-semibold">Archaeology Seminars</h3>
//                         <p className="mt-2 text-sm opacity-80">Hands-on sessions with expert archaeologists.</p>
//                     </div>

//                     <div data-aos="fade-up" className="p-6 rounded bg-white/70 shadow hover:-translate-y-1 transition">
//                         <h3 className="font-semibold">Workshops & Education</h3>
//                         <p className="mt-2 text-sm opacity-80">School talks, conservation awareness, field skills.</p>
//                     </div>
//                 </div>
//             </section>

//             {/* FOOTER */}
//             <footer className="max-w-6xl mx-auto px-6 py-10 text-sm opacity-70 text-center">
//                 © {new Date().getFullYear()} Heritage Walks — All rights reserved.
//             </footer>
//         </div>
//     );
// }
