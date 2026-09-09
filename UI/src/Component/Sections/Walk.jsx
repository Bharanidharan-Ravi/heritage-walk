import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // <-- 1. Import useNavigate
import { client, urlFor } from "/src/sanityClient"; 
import { walkConfig } from "../Config/walk.config";

export default function Walks() {
  const [walks, setWalks] = useState([]);
  const [contactInfo, setContactInfo] = useState(null); 
  const navigate = useNavigate(); // <-- 2. Initialize navigate

  const { theme, content } = walkConfig;

  useEffect(() => {
    // 3. Ensure we are fetching the slug!
    const query = `{
      "walks": *[_type == "walk"] | order(date asc) { 
        ..., 
        "slug": slug.current 
      },
      "settings": *[_type == "contact"][0]
    }`;

    client.fetch(query).then((data) => {
        setWalks(data.walks);
        setContactInfo(data.settings);
      }).catch(console.error);
  }, []);

  const getDateParts = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
    };
  };

  // 4. New navigation function
  const handleWalkClick = (slug) => {
    if (slug) {
      navigate(`/walks/${slug}`);
      // Scroll to top when navigating to the new page
      window.scrollTo(0, 0); 
    } else {
      console.error("No slug found for this walk!");
    }
  };

  return (
    <section 
      className="relative z-10 py-24 min-h-screen border-t border-[#C19D60]/20"
      style={{ backgroundColor: theme.sectionBackground }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        {/* --- HEADER --- */}
        <div className="text-center mb-20">
          <span className="font-sans font-bold tracking-[0.25em] uppercase text-xs block mb-4" 
                style={{ color: theme.accentColor }}>
            {content.sectionBadge}
          </span>
          <h2 className="text-4xl md:text-6xl font-serif font-medium drop-shadow-xl" 
              style={{ color: theme.headerTextColor }}>
            {content.sectionTitle}
          </h2>
          <p className="mt-6 max-w-2xl mx-auto font-light opacity-80" 
             style={{ color: theme.headerTextColor }}>
             {content.sectionSubtitle}
          </p>
        </div>

        {/* --- GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {walks.map((walk) => {
            const { day, month } = walk.date ? getDateParts(walk.date) : { day: "TBA", month: "" };

            return (
              <div 
                key={walk._id} 
                className="group rounded-[2rem] overflow-hidden shadow-lg hover:-translate-y-2 transition-all duration-500 flex flex-col h-full"
                style={{ backgroundColor: theme.cardBackground }}
              >
                
                {/* Image Area - Updated onClick */}
                <div 
                  className="h-72 overflow-hidden relative cursor-pointer" 
                  onClick={() => handleWalkClick(walk.slug)}
                >
                  {walk.mainImage ? (
                    <img 
                      src={urlFor(walk.mainImage).width(600).height(400).url()} 
                      alt={walk.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">No Image</div>
                  )}
                  
                  {/* Date Badge */}
                  <div className="absolute top-4 left-4 rounded-2xl shadow-lg overflow-hidden flex flex-col items-center w-16 py-3 text-center"
                       style={{ backgroundColor: theme.sectionBackground }}>
                    <span className="text-[10px] font-bold uppercase w-full tracking-widest" style={{ color: theme.accentColor }}>{month}</span>
                    <span className="text-2xl font-serif font-bold text-white">{day}</span>
                  </div>
                </div>
                
                {/* Content Area */}
                <div className="p-8 flex flex-col flex-grow relative">
                  
                  {/* Location Tag */}
                  <div className="absolute -top-4 right-8 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md"
                       style={{ backgroundColor: theme.accentColor, color: theme.sectionBackground }}>
                     {walk.location || 'Tamil Nadu'}
                  </div>

                  {/* Title - Updated onClick */}
                  <h3 className="text-3xl font-serif font-medium mb-4 leading-tight cursor-pointer transition-colors group-hover:opacity-70 mt-2" 
                      style={{ color: theme.cardTextColor }}
                      onClick={() => handleWalkClick(walk.slug)}>
                    {walk.title}
                  </h3>
                  
                  <p className="text-sm leading-relaxed mb-8 line-clamp-3 font-sans flex-grow font-light"
                     style={{ color: theme.cardSecondaryText }}>
                    {walk.description}
                  </p>
                  
                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-200">
                    <div>
                      <span className="text-xs uppercase tracking-wider block opacity-50" style={{ color: theme.cardSecondaryText }}>Price</span>
                      <span className="text-xl font-bold" style={{ color: theme.cardTextColor }}>{content.currencySymbol}{walk.price}</span>
                    </div>
                    
                    {/* Button - Updated onClick */}
                    <button 
                      onClick={() => handleWalkClick(walk.slug)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg text-white"
                      style={{ backgroundColor: theme.sectionBackground }}
                    >
                      <svg className="w-5 h-5" style={{ color: theme.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}





// import React, { useEffect, useState } from "react";
// import { client, urlFor } from "/src/sanityClient"; 
// import { walkConfig } from "../Config/walk.config";

// export default function Walks() {
//   const [walks, setWalks] = useState([]);
//   const [contactInfo, setContactInfo] = useState(null); 
//   const [selectedWalk, setSelectedWalk] = useState(null);
//   const [showQR, setShowQR] = useState(false);
//   const [fullScreenImage, setFullScreenImage] = useState(null);
// console.log("selectedWalk :", selectedWalk);

//   const { theme, content } = walkConfig;
// useEffect(() => {
//     const query = `{
//       "walks": *[_type == "walk"] | order(date asc) { 
//         ..., 
//         "slug": slug.current, // Fetch the actual slug string
//         qrCode,
//         registrationType,
//         formUrl
//       },
//       "settings": *[_type == "contact"][0]
//     }`;

//     client.fetch(query).then((data) => {
//         setWalks(data.walks);
//         setContactInfo(data.settings);
//       }).catch(console.error);
//   }, []);
//   const getDateParts = (dateString) => {
//     const date = new Date(dateString);
//     return {
//       day: date.getDate(),
//       month: date.toLocaleString('default', { month: 'short' }).toUpperCase(),
//     };
//   };

//  const openWalkModal = (walk) => {
//     setSelectedWalk(walk);
//     // Appends ?walk=tanjore-big-temple (or whatever the slug is) to the URL
//     if (walk.slug) {
//       window.history.pushState(null, '', `?walk=${walk.slug}`);
//     }
//   };

//   // 2. Update your close function to clean up the URL
//   const closeModal = () => { 
//     setSelectedWalk(null); 
//     setShowQR(false); 
//     // Reverts the URL back to the standard path without refreshing
//     window.history.pushState(null, '', window.location.pathname);
//   };
//   return (
//     // NORMAL VIEW:
//     // Removed: rounded-t-[...], -mt-20, shadows
//     // Added: Standard py-24, border-t for separation
//     <section 
//       className="relative z-10 py-24 min-h-screen border-t border-[#C19D60]/20"
//       style={{ backgroundColor: theme.sectionBackground }}
//     >
      
//       <div className="max-w-7xl mx-auto px-6">
        
//         {/* --- HEADER --- */}
//         <div className="text-center mb-20">
//           <span className="font-sans font-bold tracking-[0.25em] uppercase text-xs block mb-4" 
//                 style={{ color: theme.accentColor }}>
//             {content.sectionBadge}
//           </span>
//           <h2 className="text-4xl md:text-6xl font-serif font-medium drop-shadow-xl" 
//               style={{ color: theme.headerTextColor }}>
//             {content.sectionTitle}
//           </h2>
//           <p className="mt-6 max-w-2xl mx-auto font-light opacity-80" 
//              style={{ color: theme.headerTextColor }}>
//              {content.sectionSubtitle}
//           </p>
//         </div>

//         {/* --- GRID --- */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//           {walks.map((walk) => {
//             const { day, month } = walk.date ? getDateParts(walk.date) : { day: "TBA", month: "" };

//             return (
//               // Standard Card Layout
//               <div 
//                 key={walk._id} 
//                 className="group rounded-[2rem] overflow-hidden shadow-lg hover:-translate-y-2 transition-all duration-500 flex flex-col h-full"
//                 style={{ backgroundColor: theme.cardBackground }}
//               >
                
//                 {/* Image Area */}
//                 <div className="h-72 overflow-hidden relative cursor-pointer" onClick={() => openWalkModal(walk)}>
//                   {walk.mainImage ? (
//                     <img 
//                       src={urlFor(walk.mainImage).width(600).height(400).url()} 
//                       alt={walk.title}
//                       className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
//                     />
//                   ) : (
//                     <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">No Image</div>
//                   )}
                  
//                   {/* Date Badge */}
//                   <div className="absolute top-4 left-4 rounded-2xl shadow-lg overflow-hidden flex flex-col items-center w-16 py-3 text-center"
//                        style={{ backgroundColor: theme.sectionBackground }}>
//                     <span className="text-[10px] font-bold uppercase w-full tracking-widest" style={{ color: theme.accentColor }}>{month}</span>
//                     <span className="text-2xl font-serif font-bold text-white">{day}</span>
//                   </div>
//                 </div>
                
//                 {/* Content Area */}
//                 <div className="p-8 flex flex-col flex-grow relative">
                  
//                   {/* Location Tag */}
//                   <div className="absolute -top-4 right-8 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md"
//                        style={{ backgroundColor: theme.accentColor, color: theme.sectionBackground }}>
//                      {walk.location || 'Tamil Nadu'}
//                   </div>

//                   <h3 className="text-3xl font-serif font-medium mb-4 leading-tight cursor-pointer transition-colors group-hover:opacity-70 mt-2" 
//                       style={{ color: theme.cardTextColor }}
//                       onClick={() => openWalkModal(walk)}>
//                     {walk.title}
//                   </h3>
                  
//                   <p className="text-sm leading-relaxed mb-8 line-clamp-3 font-sans flex-grow font-light"
//                      style={{ color: theme.cardSecondaryText }}>
//                     {walk.description}
//                   </p>
                  
//                   <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-200">
//                     <div>
//                       <span className="text-xs uppercase tracking-wider block opacity-50" style={{ color: theme.cardSecondaryText }}>Price</span>
//                       <span className="text-xl font-bold" style={{ color: theme.cardTextColor }}>{content.currencySymbol}{walk.price}</span>
//                     </div>
                    
//                     <button 
//                       onClick={() => openWalkModal(walk)}
//                       className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg text-white"
//                       style={{ backgroundColor: theme.sectionBackground }}
//                     >
//                       <svg className="w-5 h-5" style={{ color: theme.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       {/* --- MODAL (Standard) --- */}
//       {selectedWalk && (
//         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity" onClick={() => openWalkModal(walk)}></div>
          
//           <div className="relative w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] animate-fadeInUp"
//                style={{ backgroundColor: theme.modalBackground }}>
            
//             <button onClick={closeModal} className="absolute top-4 right-4 z-20 bg-black/10 hover:bg-black hover:text-white text-black rounded-full p-2 backdrop-blur-md md:hidden">
//                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
//             </button>

//             <div className="w-full md:w-1/2 h-64 md:h-auto relative">
//                {selectedWalk.mainImage && (
//                  <img src={urlFor(selectedWalk.mainImage).width(800).url()} className="w-full h-full object-cover" />
//                )}
//             </div>

//             <div className="w-full md:w-1/2 p-10 md:p-14 overflow-y-auto" style={{ backgroundColor: theme.modalBackground }}>
//                 {!showQR ? (
//                   <>
//                     <h2 className="text-4xl font-serif font-medium mb-6" style={{ color: theme.cardTextColor }}>{selectedWalk.title}</h2>
//                     <div className="grid grid-cols-2 gap-6 mb-8 py-6 border-y border-gray-200">
//                         <div>
//                             <span className="text-xs uppercase tracking-wider block mb-1 opacity-60">Date</span>
//                             <span className="font-bold">{selectedWalk.date ? getDateParts(selectedWalk.date).day + " " + getDateParts(selectedWalk.date).month : "TBA"}</span>
//                         </div>
//                         <div>
//                             <span className="text-xs uppercase tracking-wider block mb-1 opacity-60">Ticket</span>
//                             <span className="font-bold text-lg" style={{ color: theme.accentColor }}>{content.currencySymbol}{selectedWalk.price}</span>
//                         </div>
//                     </div>
//                     <p className="mb-8 leading-relaxed font-light text-lg opacity-80" style={{ color: theme.cardSecondaryText }}>
//                       {selectedWalk.description}
//                     </p>
//                     {/* <button onClick={() => setShowQR(true)} className="w-full py-4 font-bold uppercase tracking-widest transition-colors rounded-xl shadow-lg text-white hover:opacity-90"
//                       style={{ backgroundColor: theme.sectionBackground }}>
//                       <span style={{ color: theme.accentColor }}>{content.confirmButton}</span>
//                     </button> */}
//                     <div className="flex flex-col sm:flex-row gap-4 mt-8">
  
//   {/* Show QR Button (Renders if 'qr' or 'both' or if undefined for backwards compatibility) */}
//   {(!selectedWalk.registrationType || selectedWalk.registrationType === 'qr_only' || selectedWalk.registrationType === 'both') && (
//     <button 
//       onClick={() => setShowQR(true)} 
//       className="flex-1 py-4 font-bold uppercase tracking-widest transition-colors rounded-xl shadow-lg text-white hover:opacity-90"
//       style={{ backgroundColor: theme.sectionBackground }}
//     >
//       <span style={{ color: theme.accentColor }}>{content.confirmButton || 'Scan to Pay'}</span>
//     </button>
//   )}

//   {/* Show Form Button (Renders if 'form' or 'both') */}
//   {(selectedWalk.registrationType === 'form_only' || selectedWalk.registrationType === 'both') && selectedWalk.formUrl && (
//     <a 
//       href={selectedWalk.formUrl} 
//       target="_blank" 
//       rel="noopener noreferrer"
//       className="flex-1 py-4 text-center font-bold uppercase tracking-widest transition-colors rounded-xl shadow-lg text-white hover:opacity-90 flex items-center justify-center gap-2"
//       style={{ backgroundColor: theme.accentColor }} // You can change this to a secondary color if you prefer
//     >
//       <span>Fill Registration Form</span>
//       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
//     </a>
//   )}

// </div>
//                   </>
//                 ) : (
//                   <div className="flex flex-col items-center justify-center h-full text-center">
//                     <button onClick={() => setShowQR(false)} className="self-start mb-4 text-xs font-bold uppercase opacity-50 hover:opacity-100">{content.backText}</button>
//                     <h3 className="text-2xl font-serif font-bold mb-2" style={{ color: theme.cardTextColor }}>{content.scanTitle}</h3>
//                     <div className="p-4 bg-white rounded-xl shadow-inner border mb-6">
//                       {selectedWalk.qrCode && <img src={urlFor(selectedWalk.qrCode).width(300).url()} className="w-48 h-48 object-contain" />}
//                     </div>
//                     {contactInfo?.whatsappNumber && (
//                       <a href={`https://wa.me/${contactInfo.whatsappNumber}?text=Payment done for ${selectedWalk.title}`} target="_blank" rel="noreferrer"
//                          className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold shadow-lg transition-transform hover:scale-105"
//                          style={{ backgroundColor: "#25D366" }}>
//                          {content.whatsappButton}
//                       </a>
//                     )}
//                   </div>
//                 )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Full Screen Image */}
//       {fullScreenImage && (
//         <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn" onClick={() => setFullScreenImage(null)}>
//           <img src={urlFor(fullScreenImage).width(1200).url()} className="max-w-full max-h-full object-contain shadow-2xl" />
//         </div>
//       )}

//       <style>{`
//         @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
//         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
//         .animate-fadeInUp { animation: fadeInUp 0.3s ease-out forwards; }
//         .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
//       `}</style>
//     </section>
//   );
// }
