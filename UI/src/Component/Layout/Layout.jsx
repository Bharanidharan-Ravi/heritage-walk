import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { heroConfig } from "../Config/heroConfig";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { assets } = heroConfig;

  const THEME_ACCENT = "#FFD050"; 

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);

    // --- NEW: Route directly to the Blogs page ---
    if (sectionId === "blogs") {
      navigate("/blog");
      window.scrollTo(0, 0);
      return;
    }

    // --- Original Scroll Logic for Home Page Sections ---
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => scrollToSection(sectionId), 100);
    } else {
      scrollToSection(sectionId);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col font-serif bg-[#0b1720]">
      
      <header 
         className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out border-b ${
          isScrolled 
            ? "h-20 bg-[#0b1720]/90 backdrop-blur-md shadow-xl border-white/5" 
            : "h-28 bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          
          <button onClick={() => handleNavClick("home")} className="group flex items-center gap-3">
            <div className="site-logo">
              <img
                src={assets.logo}
                alt="Archaeo Trails Logo" 
                className="w-14 h-14 object-contain drop-shadow-lg" 
              />
            </div>
            <div className="text-left flex flex-col">
              <h1 className="text-2xl font-bold tracking-wide text-white drop-shadow-md leading-none">
                Archaeo Trails
              </h1>
              <span className={`text-[10px] tracking-[0.2em] uppercase font-medium mt-1 ${isScrolled ? 'text-[#FFD050]' : 'text-gray-300'}`}>
                Center for Heritage Learning
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {['About', 'walks', 'Discover', 'Contact', 'Blogs'].map((item) => (
              <button 
                key={item}
                onClick={() => handleNavClick(item.toLowerCase())} 
                className="text-sm font-bold uppercase tracking-[0.15em] text-white hover:text-[#FFD050] transition-colors duration-300 relative group"
              >
                {item}
                <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-[#FFD050] transition-all duration-300 group-hover:w-full"></span>
              </button>
            ))}
            <button className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-[#FFD050] text-[#0b1720] hover:bg-white hover:text-[#0b1720] transition-all duration-300 shadow-[0_0_20px_rgba(255,208,80,0.3)]">
              Book A Trail
            </button>
          </nav>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
        </div>

        <div className={`md:hidden absolute top-full left-0 w-full bg-[#0b1720] border-t border-white/10 overflow-hidden transition-all duration-300 ${mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
           <div className="flex flex-col p-6 gap-4 text-white text-center">
              {['About', 'walks', 'Discover', 'Contact', 'Blogs'].map((item) => (
                <button key={item} onClick={() => handleNavClick(item.toLowerCase())} className="py-2 hover:text-[#FFD050] uppercase tracking-widest font-bold">{item}</button>
              ))}
           </div>
        </div>
      </header>

      <main className="flex-grow">
         <div className={isHomePage ? "" : "pt-28"}> 
            <Outlet /> 
         </div>
      </main>

      <footer className="bg-[#0b1720] text-white/60 py-8 text-center text-xs tracking-widest border-t border-white/10">
        © {new Date().getFullYear()} ARCHAEO TRAILS. UNCOVERING HISTORY.
      </footer>
    </div>
  );
}