import React, { useState, useRef } from "react";
import { contactConfig } from "../Config/contact.config";

export default function Contact() {
  const form = useRef();
  const [status, setStatus] = useState(""); // 'success', 'error', or ''
  const { theme, content } = contactConfig;

  // Notice: The function is now async to handle the await fetch call
  const sendEmail = async (e) => {
    e.preventDefault();
    setStatus("sending");

    // 1. Extract the data from the form
    const formData = new FormData(form.current);
    const payload = {
      userName: formData.get("user_name"),
      userEmail: formData.get("user_email"),
      message: formData.get("message")
    };

    // LOG: Check what data is being sent
    console.log("--- API Request Started ---");
    console.log("1. Payload prepared:", payload);

    try {
      // Use the environment variable you set up for Azure
      const apiUrl = `${import.meta.env.VITE_API_URL}/api/contact/send`;
      
      // LOG: Verify the correct URL is being hit
      console.log("2. Hitting API Endpoint:", apiUrl);

      // 2. Make the POST request to your .NET 8 API
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      // LOG: Check the raw response status from Azure
      console.log("3. API Response Status:", response.status);

      // 3. Handle the result
      if (response.ok) {
        console.log("4. Success! Email delivered via Azure backend.");
        setStatus("success");
        form.current.reset(); // Clear form
      } else {
        // If it's a 400 or 500 error, try to read the error message from the API
        const errorData = await response.json();
        console.error("4. API Error Details:", errorData);
        setStatus("error");
      }
    } catch (error) {
      // This catches network errors (e.g., CORS issues, or if the server is down)
      console.error("Network or Fetch Error:", error);
      setStatus("error");
    }
    console.log("--- API Request Finished ---");
  };

  return (
    <section 
      className="py-24 relative border-t"
      style={{ 
        backgroundColor: theme.sectionBackground, 
        color: theme.textColor,
        borderColor: theme.inputBorder 
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          
          {/* --- LEFT: INFO & SOCIALS --- */}
          <div>
            <span className="font-sans font-bold tracking-[0.25em] uppercase text-xs block mb-4 border-b w-fit pb-1" 
                  style={{ color: theme.accentColor, borderColor: theme.accentColor }}>
              {content.badge}
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-medium mb-6 leading-tight">
              {content.title}
            </h2>
            <p className="opacity-70 leading-relaxed mb-10 font-light text-lg">
              {content.subtitle}
            </p>

            {/* Contact Details */}
            <div className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10" style={{ color: theme.accentColor }}>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                 </div>
                 <div>
                   <h5 className="font-bold text-sm uppercase tracking-wider opacity-50 mb-1">Email</h5>
                   <p className="text-lg">{content.email}</p>
                 </div>
              </div>
              
              <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10" style={{ color: theme.accentColor }}>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                 </div>
                 <div>
                   <h5 className="font-bold text-sm uppercase tracking-wider opacity-50 mb-1">Phone</h5>
                   <p className="text-lg">{content.phone}</p>
                 </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
               <h5 className="font-bold text-sm uppercase tracking-wider opacity-50 mb-6">Follow Us</h5>
               <div className="flex gap-4">
                 {content.socials.map((social) => (
                   <a 
                     key={social.name} 
                     href={social.url} 
                     target="_blank" 
                     rel="noreferrer"
                     className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#C19D60] hover:border-[#C19D60] hover:text-[#0F161E] transition-all duration-300"
                   >
                      {/* Simple Icons based on name */}
                      {social.icon === "instagram" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 011.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 01-1.153 1.772 4.915 4.915 0 01-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 01-1.772-1.153 4.904 4.904 0 01-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 011.153-1.772A4.897 4.897 0 016.465 2.465C7.103 2.217 7.828 2.05 8.894 2.002 9.96 1.954 10.299 1.942 12 1.942zm0 4.865a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 8.468a3.333 3.333 0 110-6.666 3.333 3.333 0 010 6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"></path></svg>}
                      {social.icon === "whatsapp" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21l1.65-3.8a9 9 0 113.4 2.9L3 21"></path></svg>}
                      {social.icon === "facebook" && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>}
                   </a>
                 ))}
               </div>
            </div>
          </div>

          {/* --- RIGHT: FORM --- */}
          <div className="bg-[#1A202C] p-8 md:p-12 rounded-[2rem] shadow-2xl border border-white/5">
            <form ref={form} onSubmit={sendEmail} className="space-y-6">
              
              {/* Name */}
              <div>
                <label className="block text-xs uppercase font-bold tracking-widest mb-2 opacity-70">{content.form.nameLabel}</label>
                <input 
                  type="text" 
                  name="user_name" 
                  required
                  className="w-full bg-[#0F161E] border border-white/10 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C19D60] transition-colors"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs uppercase font-bold tracking-widest mb-2 opacity-70">{content.form.emailLabel}</label>
                <input 
                  type="email" 
                  name="user_email" 
                  required
                  className="w-full bg-[#0F161E] border border-white/10 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C19D60] transition-colors"
                  placeholder="john@example.com"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs uppercase font-bold tracking-widest mb-2 opacity-70">{content.form.messageLabel}</label>
                <textarea 
                  name="message" 
                  required
                  rows="4"
                  className="w-full bg-[#0F161E] border border-white/10 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-[#C19D60] transition-colors"
                  placeholder="Tell us about your interest..."
                ></textarea>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full py-4 font-bold uppercase tracking-widest rounded-lg transition-all hover:opacity-90 shadow-lg mt-4"
                style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
              >
                {status === "sending" ? "Sending..." : content.form.buttonText}
              </button>

              {/* Status Messages */}
              {status === "success" && (
                <p className="text-green-400 text-center text-sm mt-4 font-medium animate-pulse">{content.form.successMessage}</p>
              )}
              {status === "error" && (
                <p className="text-red-400 text-center text-sm mt-4 font-medium">{content.form.errorMessage}</p>
              )}

            </form>
          </div>

        </div>
      </div>
    </section>
  );
}