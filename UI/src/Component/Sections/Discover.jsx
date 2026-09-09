import React, { useState, useEffect } from "react";
// 1. IMPORT SANITY CLIENT
import { client, urlFor } from "/src/sanityClient";
import { discoverConfig } from "../Config/discoverConfig";

export default function Discover() {
    const [activeTab, setActiveTab] = useState("gallery");

    // 2. STATE FOR DYNAMIC DATA
    const [galleryData, setGalleryData] = useState([]);
    const [storiesData, setStoriesData] = useState([]);
    const [shopData, setShopData] = useState([]);

    // LIGHTBOX STATE
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // We only pull theme/content from config now, NOT data
    const { theme, content } = discoverConfig;

    // 3. FETCH DATA FROM SANITY
    useEffect(() => {
        // This query assumes you have schemas named 'gallery', 'story', and 'shop'
        // You can adjust the _type names to match your actual Sanity schema
        const query = `{
      "gallery": *[_type == "galleryItem"] | order(_createdAt desc) { 
        _id, 
        title, 
        image 
      },
      "stories": *[_type == "story"] | order(_createdAt desc) { 
        _id, 
        name, 
        rating, 
        text, 
        avatar 
      },
      "shop": *[_type == "shopItem"] | order(_createdAt desc) { 
        _id, 
        name, 
        price, 
        image 
      }
    }`;

        client.fetch(query)
            .then((result) => {
                if (result.gallery) setGalleryData(result.gallery);
                if (result.stories) setStoriesData(result.stories);
                if (result.shop) setShopData(result.shop);
            })
            .catch(console.error);
    }, []);

    // --- LIGHTBOX HANDLERS ---
    const openLightbox = (index) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
        document.body.style.overflow = "hidden";
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
        document.body.style.overflow = "unset";
    };

    const nextImage = (e) => {
        e.stopPropagation();
        // Using galleryData.length instead of config data
        setCurrentIndex((prev) => (prev + 1) % galleryData.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + galleryData.length) % galleryData.length);
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!lightboxOpen) return;
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowRight") setCurrentIndex((prev) => (prev + 1) % galleryData.length);
            if (e.key === "ArrowLeft") setCurrentIndex((prev) => (prev - 1 + galleryData.length) % galleryData.length);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxOpen, galleryData.length]);

    return (
        <section
            className="py-32 relative border-t min-h-screen"
            style={{
                backgroundColor: theme.sectionBackground,
                color: theme.textColor,
                borderColor: theme.borderColor
            }}
        >

            {/* HEADER */}
            <div className="max-w-7xl mx-auto px-6 text-center mb-16">
                <span className="font-sans font-bold tracking-[0.25em] uppercase text-xs block mb-4 border-b w-fit mx-auto pb-1"
                    style={{ color: theme.accentColor, borderColor: theme.accentColor }}>
                    {content.badge}
                </span>
                <h2 className="text-4xl md:text-6xl font-serif font-medium drop-shadow-sm"
                    style={{ color: theme.textColor }}>
                    {content.title}
                </h2>

                {/* TABS */}
                <div className="flex flex-wrap justify-center gap-4 mt-10">
                    {content.tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-8 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 border ${activeTab === tab.id
                                    ? "shadow-md"
                                    : "bg-transparent border-gray-300 hover:border-[#C19D60]"
                                }`}
                            style={{
                                backgroundColor: activeTab === tab.id ? theme.accentColor : "transparent",
                                color: activeTab === tab.id ? "#0F161E" : theme.inactiveTabColor,
                                borderColor: activeTab === tab.id ? theme.accentColor : "rgba(0,0,0,0.1)"
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="max-w-7xl mx-auto px-6 min-h-[400px]">

                {/* --- VIEW: GALLERY --- */}
                {activeTab === "gallery" && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in-up">
                        {galleryData.length > 0 ? (
                            galleryData.map((item, index) => (
                                <div
                                    key={item._id}
                                    className="group relative overflow-hidden rounded-xl aspect-[4/5] cursor-pointer shadow-sm hover:shadow-xl transition-all"
                                    onClick={() => openLightbox(index)}
                                >
                                    {item.image && (
                                        <img
                                            // 4. USE URLFOR
                                            src={urlFor(item.image).width(600).url()}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            <p className="text-[#C19D60] text-xs font-bold uppercase tracking-widest mb-1">View</p>
                                            <p className="text-white font-serif font-bold text-lg">{item.title}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center w-full col-span-full opacity-50">Loading gallery...</p>
                        )}

                        {/* Upload Placeholder */}
                        {/* <div className="flex items-center justify-center border-2 border-dashed border-[#C19D60]/20 rounded-xl aspect-[4/5] hover:bg-[#C19D60]/5 cursor-pointer transition-colors group">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-[#C19D60]/10 text-[#C19D60] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#C19D60]">Upload Yours</span>
                </div>
            </div> */}
                    </div>
                )}

                {/* --- VIEW: STORIES --- */}
                {activeTab === "stories" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                        {storiesData.length > 0 ? (
                            storiesData.map((story) => (
                                <div 
                                    key={story._id} 
                                    className="p-8 rounded-[2rem] shadow-lg transition-transform hover:-translate-y-1"
                                    style={{ 
                                        backgroundColor: theme.storyCardBackground || "#0F161E", 
                                        color: theme.storyCardText || "#F4F1EA" 
                                    }}
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        {/* Avatar from Sanity */}
                                        {story.avatar ? (
                                            <img 
                                                src={urlFor(story.avatar).width(100).url()} 
                                                alt={story.name} 
                                                className="w-12 h-12 rounded-full object-cover border-2" 
                                                style={{ borderColor: theme.accentColor }} 
                                            />
                                        ) : (
                                            // Fallback if no avatar
                                            <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold" style={{ borderColor: theme.accentColor, color: theme.accentColor }}>
                                                {story.name.charAt(0)}
                                            </div>
                                        )}
                                        
                                        <div>
                                            <h4 className="font-bold">{story.name}</h4>
                                            {/* Star Rating */}
                                            <div className="text-[#C19D60] text-xs">
                                                {"⭐".repeat(story.rating || 5)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p className="italic leading-relaxed mb-6 font-light opacity-90">
                                        "{story.text}"
                                    </p>
                                    
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#C19D60] opacity-80">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#C19D60]"></span> Verified Walker
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center w-full col-span-full opacity-50 text-[#0F161E]">Loading stories...</p>
                        )}
                    </div>
                )}
                {activeTab === "shop" && (
                    shopData.length > 0 ? (
                        // 1. IF DATA EXISTS: SHOW GRID
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up">
                            {shopData.map((item) => (
                                <div key={item._id} className="rounded-xl overflow-hidden group shadow-md hover:shadow-xl transition-all" style={{ backgroundColor: theme.shopCardBackground }}>
                                    <div className="h-56 overflow-hidden bg-gray-100">
                                        {item.image && (
                                            <img src={urlFor(item.image).width(400).url()} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        )}
                                    </div>
                                    <div className="p-6 text-center">
                                        <h4 className="font-bold font-serif text-lg mb-1" style={{ color: theme.shopCardText }}>{item.name}</h4>
                                        <p className="text-[#C19D60] font-bold mb-4">₹{item.price}</p>
                                        <button className="w-full py-3 text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity rounded-lg"
                                            style={{ backgroundColor: "#0F161E" }}>
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // 2. IF NO DATA: SHOW "COMING SOON" ANIMATION
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up min-h-[400px]">

                            {/* Animated Icon */}
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-[#C19D60]/20 blur-xl rounded-full animate-pulse"></div>
                                <div className="relative z-10 w-24 h-24 bg-[#1A202C] rounded-full flex items-center justify-center border border-[#C19D60]/30 shadow-2xl animate-bounce">
                                    <svg className="w-10 h-10 text-[#C19D60]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                                    </svg>
                                </div>
                            </div>

                            {/* UPDATED: Text Color changed to Dark Charcoal (#0F161E) for visibility */}
                            <h3 className="text-3xl md:text-4xl font-serif mb-4 drop-shadow-sm"
                                style={{ color: "#0F161E" }}>
                                Curating the Collection
                            </h3>

                            <p className="max-w-md mx-auto leading-relaxed mb-8 opacity-70"
                                style={{ color: "#0F161E" }}>
                                Our historians are busy gathering exclusive artifacts and souvenirs for you.
                                <br />The shop will be opening soon.
                            </p>

                            {/* REMOVED: "Notify Me" Button block deleted here */}

                        </div>
                    )
                )}
            </div>

            {/* --- LIGHTBOX --- */}
            {lightboxOpen && galleryData[currentIndex] && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-fade-in">

                    <button onClick={closeLightbox} className="absolute top-6 right-6 z-20 p-3 rounded-full bg-white/10 text-white hover:bg-white hover:text-black transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>

                    <button onClick={prevImage} className="absolute left-6 z-20 p-4 rounded-full bg-white/5 text-white hover:bg-[#C19D60] hover:text-black transition-all hidden md:block">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>

                    <div className="relative w-full h-full max-w-6xl max-h-screen p-4 md:p-10 flex flex-col items-center justify-center">
                        {galleryData[currentIndex].image && (
                            <img
                                src={urlFor(galleryData[currentIndex].image).width(1200).url()}
                                alt={galleryData[currentIndex].title}
                                className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
                            />
                        )}
                        <div className="mt-6 text-center">
                            <h3 className="text-2xl font-serif text-[#F4F1EA]">{galleryData[currentIndex].title}</h3>
                            <p className="text-[#C19D60] text-xs font-bold uppercase tracking-widest mt-2">
                                Image {currentIndex + 1} of {galleryData.length}
                            </p>
                        </div>
                    </div>

                    <button onClick={nextImage} className="absolute right-6 z-20 p-4 rounded-full bg-white/5 text-white hover:bg-[#C19D60] hover:text-black transition-all hidden md:block">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>

                </div>
            )}

            <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
        </section>
    );
}