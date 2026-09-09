import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { client, urlFor } from "/src/sanityClient";

export default function WalkDetail() {
  const { slug } = useParams();
  const [walk, setWalk] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // NEW: Stores the specific image URL to show in the full-screen view
  const [lightboxImage, setLightboxImage] = useState(null); 

  useEffect(() => {
    window.scrollTo(0, 0);

    const query = `*[_type == "walk" && slug.current == $slug][0]{
      ...,
      qrCode,
      registrationType,
      formUrl
    }`;

    client.fetch(query, { slug })
      .then((data) => {
        setWalk(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f2ea] flex items-center justify-center pt-24 text-[#caa863]">
        <div className="animate-pulse text-xl tracking-widest uppercase font-serif">Loading Trail...</div>
      </div>
    );
  }

  if (!walk) {
    return (
      <div className="min-h-screen bg-[#f6f2ea] flex flex-col items-center justify-center pt-24 text-[#0b1720]">
        <h2 className="text-3xl font-serif mb-4">Trail Not Found</h2>
        <Link to="/#walks" className="text-[#caa863] hover:text-[#0b1720] uppercase tracking-widest text-sm transition-colors">
          Return to all walks
        </Link>
      </div>
    );
  }

  return (
    // Changed to warm background and dark text
    <section className="pt-32 pb-24 min-h-screen bg-[#f6f2ea] text-[#0b1720] selection:bg-[#caa863] selection:text-[#0b1720]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Breadcrumb Navigation */}
        <Link to="/#walks" className="group flex items-center gap-2 text-[#caa863] uppercase tracking-widest text-xs font-bold mb-10 transition-all hover:text-[#0b1720] w-max">
          <span className="transform transition-transform group-hover:-translate-x-1">←</span> 
          Back to All Trails
        </Link>

        <div className="flex flex-col lg:flex-row gap-12 xl:gap-20">
          
          {/* LEFT COLUMN: Main Content */}
          <div className="lg:w-2/3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium mb-8 leading-tight drop-shadow-sm text-[#0b1720]">
              {walk.title}
            </h1>
            
            {/* Main Image with Lightbox Trigger */}
            {walk.mainImage && (
              <div 
                className="relative rounded-2xl overflow-hidden shadow-xl mb-12 cursor-zoom-in group"
                // Pass the high-res image URL to the lightbox state
                onClick={() => setLightboxImage(urlFor(walk.mainImage).width(1600).url())}
              >
                <img 
                  src={urlFor(walk.mainImage).width(1200).url()} 
                  alt={walk.title}
                  className="w-full h-[400px] md:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#0b1720]/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                  <span className="bg-white/90 text-[#0b1720] px-6 py-2 rounded-full uppercase tracking-widest text-xs font-bold shadow-lg">
                    View Full Image
                  </span>
                </div>
              </div>
            )}

            {/* Description (Tailwind Prose adapted for light background) */}
            <div className="prose prose-stone max-w-none prose-lg">
              <p className="text-lg md:text-xl leading-relaxed font-light text-gray-800 whitespace-pre-wrap">
                {walk.description}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Booking Card */}
          <div className="lg:w-1/3">
            {/* Changed card to white with a soft shadow for contrast against the cream background */}
            <div className="sticky top-32 bg-white border border-[#0b1720]/10 rounded-3xl p-8 shadow-2xl">
              
              <h3 className="text-2xl font-serif text-[#caa863] mb-6 border-b border-gray-100 pb-4">Trail Details</h3>
              
              <div className="space-y-6 mb-10">
                <div>
                   <span className="text-[10px] uppercase tracking-widest text-gray-500 block mb-1">Location</span>
                   <span className="font-medium text-lg">{walk.location}</span>
                </div>
                <div>
                   <span className="text-[10px] uppercase tracking-widest text-gray-500 block mb-1">Price</span>
                   <span className="font-bold text-3xl text-[#0b1720]">₹{walk.price}</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col gap-6 border-t border-gray-100 pt-6">
                
                {/* Form Button */}
                {(walk.registrationType === 'form_only' || walk.registrationType === 'both') && walk.formUrl && (
                  <a 
                    href={walk.formUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-[#0b1720] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#caa863] hover:text-[#0b1720] hover:-translate-y-1 transition-all flex items-center justify-center shadow-lg"
                  >
                    Register via Form
                  </a>
                )}

                {/* QR Code Reveal & Lightbox Trigger */}
                {(walk.registrationType === 'qr_only' || walk.registrationType === 'both') && walk.qrCode && (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Scan & Pay via UPI</span>
                    
                    <div 
                      className="p-3 bg-gray-50 rounded-xl shadow-inner border border-gray-200 cursor-zoom-in hover:shadow-md transition-all group relative"
                      // Pass the QR code URL to the lightbox state
                      onClick={() => setLightboxImage(urlFor(walk.qrCode).width(800).url())}
                    >
                      <img src={urlFor(walk.qrCode).width(300).url()} className="w-40 h-40 object-contain group-hover:opacity-50 transition-opacity" alt="Payment QR" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-8 h-8 text-[#0b1720]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 mt-2">Click to enlarge</span>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>

      {/* DYNAMIC LIGHTBOX OVERLAY */}
      {/* Renders if lightboxImage has a URL. Clicking background clears the URL, closing it. */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <img 
            src={lightboxImage} 
            alt="Full Screen View"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300"
          />
        </div>
      )}
    </section>
  );
}