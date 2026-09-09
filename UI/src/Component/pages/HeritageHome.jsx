import React from "react";
import AboutSection from "../Sections/aboutSection"; // Assuming this exists or will be created
import Hero from "../Sections/Hero";
import Services from "../Sections/Services";
import Contact from "../Sections/Contact";
import Walks from "../Sections/Walk";
import Discover from "../Sections/Discover";
import { useEffect } from "react";

export default function HeritageHome() {
  // 2. Add Scroll Spy Logic
// --- SCROLL SPY LOGIC ---
  useEffect(() => {
    // 1. Select all sections that have an ID
    const sections = document.querySelectorAll("div[id]");
    
    // 2. Create an Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 3. Update the URL Hash when section is in view
            // We use 'replaceState' so it doesn't clutter your browser history
            const newHash = `#${entry.target.id}`;
            
            // Only update if it's different to prevent loops
            if (window.location.hash !== newHash) {
              window.history.replaceState(null, null, newHash);
            }
          }
        });
      },
      { 
        // 4. Configuration: This defines the "Active Area"
        // "-50% 0px -50% 0px" means the trigger line is exactly in the middle of the screen.
        // The section must cross the center line to become active.
        rootMargin: "-50% 0px -50% 0px", 
        threshold: 0 
      }
    );

    // 5. Start Observing
    sections.forEach((section) => observer.observe(section));

    // 6. Cleanup on unmount
    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);
  return (
    // <div className="w-full bg-[#f6f2ea] text-[#0b1720]">
    <div className="w-full relative bg-[#0F161E]">
      
      {/* 1. HERO (Top of page, no ID needed usually, but good practice) */}
      <div id="home">
        <Hero />
      </div>

      {/* 2. ABOUT Section */}
      <div id="about">
        <AboutSection />
      </div>

      {/* 3. WALKS / SERVICES Section */}
      <div id="walks">
        <Walks />
      </div>

      {/* 4. GALLERY Section */}
     <div id="discover">
        <Discover />
      </div>
      {/* 5. CONTACT Section */}
      <div id="contact">
        <Contact />
      </div>

    </div>
  );
}




// export default function HeritageHome() {

//     // --- AOS & Parallax Logic (Kept as is) ---
//     useEffect(() => {
//         if (typeof window === "undefined") return;

//         const io = new IntersectionObserver(
//             (entries) => {
//                 entries.forEach((entry) => {
//                     const el = entry.target;
//                     if (entry.isIntersecting) {
//                         el.classList.add("aos-animate");
//                     } else {
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
//         <div className="min-h-screen font-serif w-full bg-[var(--bg)] text-[var(--text)] overflow-x-hidden">
            
//             {/* --- Global Styles --- */}
//             <style>{`
//                 :root { --bg: #f6f2ea; --text: #0b1720; --primary: #12314a; --accent: #caa863; }
//                 .aos-init { opacity: 0; transform: translateY(22px); transition: all 700ms cubic-bezier(.22,.9,.35,1); }
//                 .aos-animate { opacity: 1; transform: none; }
//                 [data-aos="fade-right"].aos-init { transform: translateX(-20px); }
//                 [data-aos="fade-left"].aos-init { transform: translateX(20px); }
//                 /* Fog & Spin Animations */
//                 @keyframes fogMove { 0% { transform: translateX(-10%); opacity: 0.4; } 50% { transform: translateX(10%); opacity: 0.6; } 100% { transform: translateX(-10%); opacity: 0.4; } }
//                 .animate-fog { animation: fogMove 18s ease-in-out infinite alternate; }
//             `}</style> 

//             {/* --- 1. HERO SECTION --- */}
//             {/* Added pt-20 to account for fixed header in Layout.jsx */}
//             <section id="home" className="relative w-full h-[90vh] flex items-center justify-center overflow-hidden">
                
//                 {/* Parallax Background */}
//                 <div className="absolute inset-0 z-0" data-parallax speed="0.15">
//                     <img
//                         src="/images/your-hero-image.jpg" // Replace with your actual path
//                         alt="Heritage Walk Hero"
//                         className="w-full h-full object-cover"
//                         data-parallax-image
//                     />
//                     <div className="absolute inset-0 bg-black/40"></div> {/* Overlay for text readability */}
//                 </div>

//                 {/* Hero Content */}
//                 <div data-aos="fade-up" className="relative z-10 text-center px-6 max-w-4xl mx-auto text-white">
//                     <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-xl mb-6">
//                         Every Site Holds a Story,<br /> 
//                         <span className="text-[var(--accent)]">Every Story Needs a Seeker</span>
//                     </h1>
//                     <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
//                         Experience Tamil Nadu’s rich heritage through immersive walks, guided trails,
//                         and field-based explorations that take history beyond textbooks.
//                     </p>
//                     <div className="flex flex-col md:flex-row gap-4 justify-center">
//                         <button className="px-8 py-3 rounded bg-[var(--accent)] text-[var(--primary)] font-bold shadow-lg hover:bg-white transition">
//                             See Upcoming Walks
//                         </button>
//                         <button className="px-8 py-3 rounded border border-white text-white hover:bg-white hover:text-[var(--primary)] transition">
//                             Library & Resources
//                         </button>
//                     </div>
//                 </div>
//             </section>

//             {/* --- 2. UPCOMING TOURS (New Section) --- */}
//             <section id="upcoming" className="py-20 px-6 max-w-7xl mx-auto">
//                 <div className="text-center mb-12" data-aos="fade-up">
//                     <h2 className="text-3xl font-bold text-[var(--primary)]">Upcoming Heritage Walks</h2>
//                     <p className="text-gray-600 mt-2">Book your spot for this month's explorations.</p>
//                 </div>
//                 {/* Placeholder Grid for Tour Cards */}
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//                      {/* We will build a <TourCard /> component for these later */}
//                     {[1, 2, 3].map((i) => (
//                         <div key={i} data-aos="fade-up" className="bg-white rounded-lg shadow-md h-80 flex items-center justify-center border border-gray-200">
//                             <span className="text-gray-400">Tour Card {i} Placeholder</span>
//                         </div>
//                     ))}
//                 </div>
//             </section>

//             {/* --- 3. ABOUT SECTION --- */}
//             {/* Keeping your existing component import */}
//             <div id="about">
//                 <AboutSection /> 
//             </div>

//             {/* --- 4. PREVIOUS TOURS / GALLERY --- */}
//             <section id="gallery" className="py-20 bg-[var(--primary)] text-white">
//                 <div className="max-w-7xl mx-auto px-6">
//                     <div className="flex justify-between items-end mb-10">
//                         <div>
//                             <h2 className="text-3xl font-bold">Past Trails</h2>
//                             <p className="opacity-80 mt-2">Glimpses from our recent heritage explorations.</p>
//                         </div>
//                         <button className="text-[var(--accent)] underline hover:text-white transition">View All Gallery</button>
//                     </div>
//                     {/* Placeholder for Gallery Grid */}
//                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-96 bg-white/10 rounded-xl items-center justify-center">
//                         <span className="opacity-50">Gallery Grid Component Placeholder</span>
//                     </div>
//                 </div>
//             </section>

//             {/* --- 5. SERVICES / SEMINARS --- */}
//             <section id="services" className="py-20 px-6 max-w-7xl mx-auto">
//                 <h2 className="text-3xl font-bold text-center mb-12 text-[var(--primary)]">Seminars & Workshops</h2>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
//                     <div data-aos="fade-right" className="bg-[#e8e4dc] p-8 rounded-xl">
//                         <h3 className="text-2xl font-bold mb-4">Archaeology Seminars</h3>
//                         <p className="mb-6">Deep dive into inscription reading, temple architecture, and excavation techniques with experts.</p>
//                         <button className="font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]">View Schedule</button>
//                     </div>
//                     <div data-aos="fade-left" className="bg-[#e8e4dc] p-8 rounded-xl">
//                         <h3 className="text-2xl font-bold mb-4">Educational Walks</h3>
//                         <p className="mb-6">Special curated walks for schools and colleges to bring history textbooks to life on the field.</p>
//                         <button className="font-bold text-[var(--primary)] border-b-2 border-[var(--primary)]">For Schools</button>
//                     </div>
//                 </div>
//             </section>

//             {/* --- 6. STORE & LIBRARY (New Idea) --- */}
//             <section id="store" className="py-20 bg-white border-t border-gray-200">
//                 <div className="max-w-7xl mx-auto px-6 text-center">
//                     <h2 className="text-3xl font-bold text-[var(--primary)] mb-8">The Heritage Store & Library</h2>
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                          {/* Library */}
//                          <div className="p-6 border rounded-lg hover:shadow-lg transition">
//                             <h3 className="text-xl font-bold">Digital Library</h3>
//                             <p className="text-sm text-gray-600 mt-2 mb-4">Access free research papers and heritage maps.</p>
//                             <button className="px-4 py-2 bg-[var(--primary)] text-white rounded">Browse Docs</button>
//                          </div>
//                          {/* Store */}
//                          <div className="p-6 border rounded-lg hover:shadow-lg transition">
//                             <h3 className="text-xl font-bold">Souvenirs & Books</h3>
//                             <p className="text-sm text-gray-600 mt-2 mb-4">Get exclusive guidebooks and heritage merchandise.</p>
//                             <button className="px-4 py-2 bg-[var(--primary)] text-white rounded">Visit Store</button>
//                          </div>
//                     </div>
//                 </div>
//             </section>

//             {/* --- 7. CONTACT / TESTIMONIALS --- */}
//             <section id="contact" className="py-20 bg-[var(--primary)] text-white text-center">
//                 <h2 className="text-3xl font-bold mb-6">Join Our Community</h2>
//                 <p className="max-w-xl mx-auto mb-8 opacity-80">
//                     Subscribe to our newsletter to get notified about upcoming walks and seminars.
//                 </p>
//                 <div className="flex max-w-md mx-auto gap-2">
//                     <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-3 rounded text-black" />
//                     <button className="bg-[var(--accent)] text-[var(--primary)] font-bold px-6 py-3 rounded">Subscribe</button>
//                 </div>
//             </section>

//         </div>
//     );
// }