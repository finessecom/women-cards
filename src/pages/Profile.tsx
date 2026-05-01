import { useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { UserProfile, THEMES, ThemeType } from '../types';
import { Share2, ArrowUpRight, Loader2 } from 'lucide-react';
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
    linkedin: 'sarahjenkins'
  }
};

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchProfile = async () => {
      // Local fallback logic
      const saved = localStorage.getItem('womenCardsProfile');
      let localProfile: UserProfile | null = null;
      if (saved) {
        const p = JSON.parse(saved);
        if (p.username === username || username === 'sarah') {
          localProfile = p;
        }
      }

      if (supabase && username) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('wc_profiles')
            .select('*')
            .eq('username', username)
            .maybeSingle();

          if (profileData && !profileError) {
            const { data: linksData, error: linksError } = await supabase
              .from('wc_links')
              .select('*')
              .eq('profile_id', profileData.id)
              .order('position', { ascending: true });

            if (!linksError) {
              setProfile({
                name: profileData.name || '',
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
                socials: profileData.socials || {}
              });
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Supabase profile fetch error:", err);
        }
      }

      // If we got here, use local or default
      if (localProfile) {
        setProfile(localProfile);
      } else if (username !== 'sarah') {
        // Handle not found?
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [username]);

  const themeConfig = THEMES[profile.theme as ThemeType] || THEMES['elegant-gold'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f6]">
        <Loader2 className="animate-spin text-[#c5a059]" size={40} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeConfig.bg} ${themeConfig.text} font-sans selection:bg-[#c5a059] selection:text-white pb-20`}>
      {/* Action Buttons */}
      <div className="max-w-xl mx-auto flex justify-end px-6 pt-6">
        <button className="p-3 bg-white/10 backdrop-blur-md rounded-full shadow-lg hover:bg-white/20 transition-all border border-white/10">
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
              src={profile.avatar} 
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
