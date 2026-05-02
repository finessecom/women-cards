import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserProfile, THEMES, ThemeType } from '../types';
import { Share2, ArrowUpRight, Loader2, Instagram, Linkedin, Mail, Phone, Twitter, Facebook, Youtube, Music } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_PROFILE: UserProfile = {
  name: "Sarah Jenkins",
  username: "sarah",
  bio: "Founder at Bloom Growth | Strategic Advisor | Speaker",
  avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
  theme: 'elegant-gold',
  links: [
    { id: '1', title: 'Schedule a Call', url: 'https://calendly.com', isActive: true },
    { id: '2', title: 'My New Course: Leading for Impact', url: 'https://course.com', isActive: true },
    { id: '3', title: 'Read my latest article in Forbes', url: 'https://forbes.com', isActive: true }
  ],
  socials: {
    instagram: '@sarahj_leads',
    linkedin: 'sarahjenkins',
    email: 'sarah@bloom.com',
    phone: '+33 6 12 34 56 78'
  }
};

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isPreview, setIsPreview] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      console.log("Profile: Fetching data for username:", username);
      setDebugInfo(`Username: ${username} | `);
      setError(null);
      
      // Local fallback logic
      const saved = localStorage.getItem('womenCardsProfile');
      let localProfile: UserProfile | null = null;
      if (saved) {
        try {
          const p = JSON.parse(saved);
          console.log("Profile: Local storage found username:", p.username);
          if (p.username === username || (username === 'sarah' && !p.username)) {
            localProfile = p;
            console.log("Profile: Local storage matches current URL");
          }
        } catch(e) {
          console.error("Profile: Error parsing local storage", e);
        }
      }

      if (supabase && username) {
        try {
          const targetUsername = username.toLowerCase();
          
          // Try to fetch with specific columns to avoid schema cache issues with '*'
          const { data: profileData, error: profileError } = await supabase
            .from('wc_profiles')
            .select('id, username, full_name, name, bio, avatar_url, theme, socials')
            .eq('username', targetUsername)
            .maybeSingle();

          if (profileError) {
            console.error("Profile: Supabase fetch error:", profileError);
            setDebugInfo(prev => prev + `DB Error: ${profileError.message} | `);
            
            // If it's a column error, try a fallback fetch with safer columns
            if (profileError.message.includes('column') || profileError.message.includes('socials') || profileError.message.includes('full_name')) {
              console.warn("Profile: Schema mismatch detected, retrying with safe columns...");
              const { data: retryData, error: retryError } = await supabase
                .from('wc_profiles')
                .select('id, username, bio, avatar_url, theme')
                .eq('username', targetUsername)
                .maybeSingle();
              
              if (!retryError && retryData) {
                 // Success with retry!
                 const { data: linksData } = await supabase
                   .from('wc_links')
                   .select('*')
                   .eq('profile_id', retryData.id)
                   .order('position', { ascending: true });

                 setProfile({
                   name: retryData.username || 'User',
                   username: retryData.username || '',
                   bio: retryData.bio || '',
                   avatar: retryData.avatar_url || '',
                   theme: retryData.theme || 'elegant-gold',
                   links: (linksData || []).map((l: any) => ({
                    id: l.id.toString(),
                    title: l.title || '',
                    url: l.url || '',
                    isActive: l.is_active
                   })),
                   socials: {}
                 });
                 setIsLoading(false);
                 return;
              }
            }
          }

          if (profileData) {
            console.log("Profile: Data found in DB:", profileData.id);
            setDebugInfo(prev => prev + "Loaded from DB | ");
            
            // We need the links too
            const { data: linksData } = await supabase
              .from('wc_links')
              .select('*')
              .eq('profile_id', profileData.id)
              .order('position', { ascending: true });
            
            setProfile({
              name: profileData.full_name || profileData.name || 'Anonymous',
              username: profileData.username || '',
              bio: profileData.bio || '',
              avatar: profileData.avatar_url || '',
              theme: profileData.theme || 'elegant-gold',
              links: (linksData || []).map((l: any) => ({
                id: l.id.toString(),
                title: l.title || '',
                url: l.url || '',
                isActive: l.is_active
              })),
              socials: typeof profileData.socials === 'string' 
                ? JSON.parse(profileData.socials) 
                : (profileData.socials || {})
            });

            setIsPreview(false);
            setIsLoading(false);
            return;
          } else {
            console.warn("Profile: No record in DB for", targetUsername);
            setDebugInfo(prev => prev + "No DB record found | ");
          }
        } catch (err: any) {
          console.error("Profile: Critical fetch error:", err);
          setError(err.message);
        }
      }

      // Fallback logic
      if (localProfile) {
        console.log("Profile: Using Local Storage Fallback");
        setProfile(localProfile);
        setIsPreview(true);
        setDebugInfo(prev => prev + "Found in LocalStorage");
      } else if (username === 'sarah') {
        console.log("Profile: Using Default Sarah Profile");
        setProfile(DEFAULT_PROFILE);
        setDebugInfo(prev => prev + "Using defaults");
      } else {
        console.log("Profile: Truly NOT FOUND");
        setProfile(null);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [username]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#c5a059]" size={40} />
          <p className="text-sm font-medium text-black/40 uppercase tracking-widest">Recherche de la carte...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f6] p-6 text-center">
        <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-6">
          <Share2 className="text-black/20" size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Profil non trouvé</h1>
        <p className="text-black/40 max-w-xs mb-8">
          La carte pour "@ {username}" n'existe pas encore ou n'a pas été publiée sur cette plateforme.
        </p>
        <div className="flex flex-col gap-3">
          <a href="/" className="px-8 py-3 bg-black text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
            Créer ma propre carte
          </a>
          {(debugInfo.includes('DB Error') || !profile) && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl mt-4">
              <p className="text-[10px] text-red-500 font-mono mb-2">DIAGNOSTIC DU PROFIL</p>
              <p className="text-[10px] text-red-400 font-mono block mb-2">
                {debugInfo.includes('DB Error') ? 'Erreur de base de données détectée.' : 'Pseudo introuvable dans notre base de données.'}
              </p>
              <div className="text-[9px] text-red-400 font-mono space-y-1 text-left bg-white/50 p-2 rounded border border-red-100">
                <p>Si vous êtes le propriétaire :</p>
                <p>• Allez sur votre <a href="/dashboard" className="underline font-bold">Dashboard</a></p>
                <p>• Vérifiez que votre Pseudo est bien : <strong>{username}</strong></p>
                <p>• Cliquez sur "Save Changes"</p>
                <p>• Si ça échoue, utilisez "Réparer la Base de Données"</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Transparent Debug Footer */}
        <div className="fixed bottom-4 left-0 right-0 opacity-20 hover:opacity-100 transition-opacity">
           <p className="text-[8px] font-mono text-black">URL Param: {username} | Debug: {debugInfo}</p>
        </div>
      </div>
    );
  }

  const themeConfig = THEMES[profile.theme as ThemeType] || THEMES['elegant-gold'];

  return (
    <div className={`min-h-screen ${themeConfig.bg} ${themeConfig.text} font-sans selection:bg-[#c5a059] selection:text-white pb-20 relative`}>
      {/* Dynamic Status / Debug Tooltip */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md text-[9px] font-mono p-1 text-white/40 text-center flex items-center justify-center gap-4">
        <span>{debugInfo}</span>
        {error && <span className="text-red-400">Error: {error}</span>}
      </div>

      {isPreview && (
        <div className="bg-orange-500 text-white py-2 px-4 text-center text-xs font-bold uppercase tracking-widest sticky top-0 z-40 shadow-lg">
          Attention : Ceci est un aperçu (données locales). Vos modifications n'ont pas encore été synchronisées avec la base de données.
        </div>
      )}

      {/* Action Buttons */}
      <div className="max-w-xl mx-auto flex justify-end px-6 pt-6">
        <button 
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            alert("Lien copié !");
          }}
          className="p-3 bg-white/10 backdrop-blur-md rounded-full shadow-lg hover:bg-white/20 transition-all border border-white/10"
        >
          <Share2 size={20} />
        </button>
      </div>

      <main className="max-w-xl mx-auto px-6 flex flex-col items-center">
        {/* Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mt-12 mb-12 text-center"
        >
          <div className="relative mb-6">
            <img 
              src={profile.avatar || undefined} 
              alt={profile.name} 
              className="w-28 h-28 rounded-full object-cover shadow-2xl ring-4 ring-black/5"
            />
            <div className="absolute -bottom-2 -right-2 bg-white text-black p-1.5 rounded-full shadow-lg">
              <Share2 size={12} fill="currentColor" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            {profile.name}
          </h1>
          <p className="opacity-70 text-base max-w-sm font-medium leading-relaxed">
            {profile.bio}
          </p>

          {/* Contact & Social Icons */}
          <div className="mt-8 space-y-6">
            {/* Contact Line */}
            {(profile.socials?.email || profile.socials?.phone) && (
              <div className="flex justify-center gap-6">
                {profile.socials?.email && (
                  <a 
                    href={`mailto:${profile.socials.email}`}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="Email"
                  >
                    <Mail size={24} />
                  </a>
                )}
                {profile.socials?.phone && (
                  <a 
                    href={`tel:${profile.socials.phone}`}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="Phone"
                  >
                    <Phone size={24} />
                  </a>
                )}
              </div>
            )}

            {/* Social Media Line */}
            {(profile.socials?.instagram || profile.socials?.linkedin || profile.socials?.twitter || profile.socials?.facebook || profile.socials?.tiktok || profile.socials?.youtube) && (
              <div className="flex flex-wrap justify-center gap-6">
                {profile.socials?.instagram && (
                  <a 
                    href={`https://instagram.com/${profile.socials.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="Instagram"
                  >
                    <Instagram size={24} />
                  </a>
                )}
                {profile.socials?.linkedin && (
                  <a 
                    href={`https://linkedin.com/in/${profile.socials.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="LinkedIn"
                  >
                    <Linkedin size={24} />
                  </a>
                )}
                {profile.socials?.twitter && (
                  <a 
                    href={`https://twitter.com/${profile.socials.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="X (Twitter)"
                  >
                    <Twitter size={24} />
                  </a>
                )}
                {profile.socials?.facebook && (
                  <a 
                    href={`https://facebook.com/${profile.socials.facebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="Facebook"
                  >
                    <Facebook size={24} />
                  </a>
                )}
                {profile.socials?.tiktok && (
                  <a 
                    href={`https://tiktok.com/@${profile.socials.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="TikTok"
                  >
                    <Music size={24} />
                  </a>
                )}
                {profile.socials?.youtube && (
                  <a 
                    href={`https://youtube.com/@${profile.socials.youtube.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-50 hover:opacity-100 transition-opacity"
                    title="YouTube"
                  >
                    <Youtube size={24} />
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Links List */}
        <div className="w-full space-y-4">
          {profile.links.filter(l => l.isActive).map((link, i) => (
            <motion.a 
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`group w-full py-5 px-6 rounded-2xl font-bold flex items-center justify-between transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow-xl ${themeConfig.button} ${themeConfig.buttonText}`}
            >
              <div className="flex-grow text-center">{link.title}</div>
              <ArrowUpRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.a>
          ))}
        </div>

        {/* Branding */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-24 text-center"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">
            Create your own at
          </div>
          <div className="text-xl font-bold mt-2 opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
            women.cards
          </div>
        </motion.div>
      </main>
    </div>
  );
}
