import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Layout, 
  User, 
  Link as LinkIcon, 
  ExternalLink,
  ChevronRight,
  LogOut,
  Palette,
  Check,
  Save,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { UserProfile, Link, THEMES, ThemeType } from '../types';
import { useNavigate } from 'react-router-dom';
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

export default function Dashboard() {
  console.log("Dashboard component render start");
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'success' | 'error', message?: string }>({ type: 'idle' });
  const [activeTab, setActiveTab] = useState<'links' | 'appearance' | 'profile'>('profile');
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    console.log("Dashboard: initiating data load...");
    
    const loadData = async () => {
      if (!mounted) return;
      setIsLoading(true);
      
      try {
        if (supabase) {
          console.log("Dashboard: fetching user...");
          const { data, error: userError } = await supabase.auth.getUser();
          const user = data?.user;
          
          if (userError) console.error("Dashboard: getUser error:", userError);
          
          if (mounted) {
            setCurrentUser(user);
          }
          
          if (user) {
            console.log("Dashboard: user found", user.email);
            const { data: profileData, error: profileError } = await supabase
              .from('wc_profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            if (profileError) console.error("Dashboard: profile fetch error:", profileError);

            if (profileData && !profileError) {
              console.log("Dashboard: profile record found", Object.keys(profileData));
              const { data: linksData, error: linksError } = await supabase
                .from('wc_links')
                .select('*')
                .eq('profile_id', user.id)
                .order('position', { ascending: true });

              if (linksError) console.error("Dashboard: links fetch error:", linksError);

              if (mounted && !linksError) {
                const fetchedProfile: UserProfile = {
                  name: profileData.full_name || profileData.name || '',
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
                };
                setProfile(fetchedProfile);
                localStorage.setItem('womenCardsProfile', JSON.stringify(fetchedProfile));
                console.log("Dashboard: profile state updated from DB successfully");
              }
            } else if (mounted) {
              console.log("Dashboard: no profile in DB, initializing new user session");
              const saved = localStorage.getItem('womenCardsProfile');
              if (saved) {
                const parsed = JSON.parse(saved);
                // If it's not the default Jenkins name, it might be their local unsaved work
                if (parsed.name !== DEFAULT_PROFILE.name) {
                  setProfile(parsed);
                  console.log("Dashboard: restored profile from local storage");
                }
              } else {
                // For a completely new user, generate a unique username suggestion
                if (user.email) {
                  const suggestedUsername = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                  setProfile(prev => ({ ...prev, username: suggestedUsername }));
                }
              }
            }
          }
        } else {
          console.log("Dashboard: Supabase missing, using local storage");
          const saved = localStorage.getItem('womenCardsProfile');
          if (saved && mounted) {
            setProfile(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error("Dashboard: critical load error:", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
          console.log("Dashboard: loading finished");
        }
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  // Handle session sync
  useEffect(() => {
    if (!supabase) return;
    
    // Safety check for onAuthStateChanged
    if (!supabase.auth || typeof supabase.auth.onAuthStateChanged !== 'function') {
      console.warn("Dashboard: Supabase Auth not fully initialized or functional.");
      return;
    }

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChanged((_event, session) => {
        setCurrentUser(session?.user ?? null);
      });

      return () => {
        if (subscription) subscription.unsubscribe();
      };
    } catch (err) {
      console.error("Dashboard: Auth sync setup error:", err);
    }
  }, []);

  const saveToSupabase = useCallback(async (currentProfile: UserProfile) => {
    if (!supabase) {
      localStorage.setItem('womenCardsProfile', JSON.stringify(currentProfile));
      alert("Note: Supabase n'est pas configuré. Sauvegarde locale uniquement.");
      return;
    }

    if (!currentProfile.username) {
      alert("Le nom d'utilisateur est obligatoire pour enregistrer votre profil.");
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: 'idle' });
    console.log("--- SAVE PROCESS START ---");
    console.log("User Profile to save:", currentProfile);

    try {
      // Small delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: { user: fetchUser } } = await supabase.auth.getUser();
        user = fetchUser;
      }

      if (!user) {
         setSaveStatus({ type: 'error', message: 'Session expirée' });
         console.error("SAVE ABORTED: No user found");
         alert("Session expirée. Veuillez vous reconnecter.");
         navigate('/login');
         return;
      }

      console.log("Saving for UID:", user.id);

      // 1. Prepare profile data
      const profileToUpsert: any = {
        id: user.id,
        username: currentProfile.username.trim().toLowerCase(),
        full_name: currentProfile.name.trim(),
        name: currentProfile.name.trim(), // Send both for compatibility
        bio: currentProfile.bio || '',
        avatar_url: currentProfile.avatar || '',
        theme: currentProfile.theme || 'elegant-gold',
        updated_at: new Date().toISOString()
      };

      // Add socials only if it exists in schema (or we'll catch the error and retry)
      profileToUpsert.socials = currentProfile.socials || {};

      console.log("Payload sent to Supabase (wc_profiles):", profileToUpsert);

      let { error: profileError } = await supabase
        .from('wc_profiles')
        .upsert(profileToUpsert, { onConflict: 'id' });

      // Robust schema mismatch handling
      if (profileError && (
        profileError.message.includes("'socials'") || 
        profileError.message.includes("'full_name'") || 
        profileError.message.includes("column") ||
        profileError.message.includes("schema cache")
      )) {
        console.warn("Schema mismatch detected, retrying with minimal payload...", profileError.message);
        
        const minimalPayload: any = {
          id: user.id,
          username: currentProfile.username.trim().toLowerCase(),
          bio: currentProfile.bio || '',
          avatar_url: currentProfile.avatar || '',
          theme: currentProfile.theme || 'elegant-gold',
          updated_at: new Date().toISOString()
        };

        // Try primary name column
        if (!profileError.message.includes("'name'")) {
          minimalPayload.name = currentProfile.name.trim();
        }

        const { error: retryError } = await supabase
          .from('wc_profiles')
          .upsert(minimalPayload, { onConflict: 'id' });
        
        profileError = retryError;
      }

      if (profileError) {
        console.error("SUPABASE PROFILE ERROR:", profileError.code, profileError.message);
        
        // Detailed handling for RLS or Schema errors
        if (profileError.code === '42501' || profileError.message.includes('permission') || profileError.message.includes('column')) {
          const sqlFix = `
-- COPIEZ CECI DANS LE SQL EDITOR DE SUPABASE :

-- 1. Réparer les colonnes
ALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}'::jsonb;

-- 2. Activer RLS
ALTER TABLE wc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wc_links ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes politiques (nettoyage)
DROP POLICY IF EXISTS "Allow individual upsert" ON wc_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON wc_profiles;
DROP POLICY IF EXISTS "Allow individual links access" ON wc_links;
DROP POLICY IF EXISTS "Public links are viewable by everyone" ON wc_links;

-- 4. Créer les nouvelles politiques
CREATE POLICY "Allow individual upsert" ON wc_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable by everyone" ON wc_profiles FOR SELECT USING (true);
CREATE POLICY "Allow individual links access" ON wc_links FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public links are viewable by everyone" ON wc_links FOR SELECT USING (true);
`;
          console.error("CRITICAL: RLS Policy or Schema Missing. Run this in Supabase SQL Editor:", sqlFix);
          throw new Error("Erreur de base de données : L'accès est refusé ou une colonne est manquante. Cliquez sur 'RÉPARER LA BASE DE DONNÉES' en bas à gauche.");
        }
        throw profileError;
      }

      console.log("✓ Profile record saved successfully");

      // 2. Sync links
      console.log("Syncing links...", currentProfile.links.length, "links to save");
      
      const { error: deleteError } = await supabase
        .from('wc_links')
        .delete()
        .eq('profile_id', user.id);

      if (deleteError) {
        console.warn("Links Delete Warning:", deleteError);
      }

      if (currentProfile.links.length > 0) {
        const linksToInsert = currentProfile.links.map((link, index) => ({
          profile_id: user.id,
          title: link.title.trim() || 'Lien',
          url: (link.url.trim().startsWith('http') ? link.url.trim() : `https://${link.url.trim()}`),
          is_active: link.isActive,
          position: index
        }));

        const { error: insertError } = await supabase
          .from('wc_links')
          .insert(linksToInsert);

        if (insertError) {
          console.error("LINKS INSERT ERROR:", insertError);
          throw new Error(`Erreur Liens: ${insertError.message}`);
        }
      }

      console.log("✓ Links synced successfully");
      console.log("--- SAVE PROCESS COMPLETE ---");
      
      localStorage.setItem('womenCardsProfile', JSON.stringify(currentProfile));
      setLastSync(new Date().toLocaleTimeString());
      setSaveStatus({ type: 'success' });
      
      // Visual feedback: brief success alert
      // Using a short timeout to let the UI update first
      setTimeout(() => {
        alert("✨ Félicitations ! Votre carte est maintenant en ligne.");
      }, 100);
      
      // Keep success status for 5 seconds
      setTimeout(() => setSaveStatus({ type: 'idle' }), 5000);
    } catch (err: any) {
      console.error("--- SAVE CRITICAL ERROR ---", err);
      setSaveStatus({ type: 'error', message: err.message });
      alert(`Erreur d'enregistrement : ${err.message || 'Problème de connexion'}`);
    } finally {
      setIsSaving(false);
    }
  }, [supabase, navigate, currentUser]);

  // Sync profile to local storage on every change
  useEffect(() => {
    localStorage.setItem('womenCardsProfile', JSON.stringify(profile));
  }, [profile]);

  const addLink = () => {
    const newLink: Link = {
      id: Date.now().toString(),
      title: 'New Link',
      url: 'https://',
      isActive: true
    };
    setProfile(prev => ({ ...prev, links: [newLink, ...prev.links] }));
  };

  const updateLink = (id: string, updates: Partial<Link>) => {
    setProfile(prev => ({
      ...prev,
      links: prev.links.map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const deleteLink = (id: string) => {
    setProfile(prev => ({ ...prev, links: prev.links.filter(l => l.id !== id) }));
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const currentTheme = THEMES[profile.theme as ThemeType] || THEMES['elegant-gold'];

  // Redirect to login if not authenticated after loading
  useEffect(() => {
    if (!isLoading && supabase && !currentUser) {
      console.log("Dashboard: No user authenticated, redirecting to login...");
      navigate('/login');
    }
  }, [isLoading, currentUser, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#fcfcfb]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#c5a059]" size={40} />
          <p className="text-sm font-medium text-black/40 animate-pulse uppercase tracking-widest">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isLoading && supabase) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#fcfcfb]">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#c5a059] mx-auto mb-4" size={32} />
          <p className="text-sm text-black/40">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#fcfcfb] font-sans overflow-hidden">
      {/* Sidebar navigation */}
      <aside className="w-20 md:w-64 border-r border-black/5 bg-white flex flex-col items-center md:items-stretch py-8">
        <div className="px-6 mb-12 flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#c5a059] rounded-lg rotate-12 flex items-center justify-center text-white font-bold text-xl">w</div>
          <span className="hidden md:block font-bold text-lg tracking-tight">women.cards</span>
        </div>

        <nav className="flex-grow space-y-2 px-3">
          {[
            { id: 'profile', icon: <User size={20} />, label: 'Profile' },
            { id: 'appearance', icon: <Palette size={20} />, label: 'Appearance' },
            { id: 'links', icon: <LinkIcon size={20} />, label: 'Links' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-black text-white shadow-lg shadow-black/10' 
                  : 'text-black/60 hover:bg-black/5'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-white' : 'text-black/40'}>{tab.icon}</span>
              <span className="hidden md:block font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 pt-6 border-t border-black/5">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3 text-black/40 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden md:block font-medium">Logout</span>
          </button>
        </div>

        {/* User Status Tag */}
        <div className="px-6 py-4 mt-2">
          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${currentUser ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className={`w-2 h-2 rounded-full ${currentUser ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Connecté en tant que</p>
              <p className="text-xs font-bold truncate text-black/70">
                {currentUser?.email || 'Mode Démo / Local'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-grow overflow-y-auto px-6 md:px-12 py-12 flex flex-col md:flex-row gap-12">
        <div className="flex-grow max-w-2xl">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold">Profile Details</h1>
                  <div className="flex items-center gap-4">
                    {saveStatus.type === 'success' && <span className="text-xs font-bold text-green-500 uppercase tracking-widest animate-pulse">Saved Successfully!</span>}
                    {saveStatus.type === 'error' && <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Error Saving</span>}
                    <button 
                      onClick={() => saveToSupabase(profile)}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold shadow-lg transition-all ${
                        isSaving ? 'bg-stone-400' : 'bg-black text-white hover:bg-stone-800'
                      } disabled:opacity-50`}
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                  <div className="relative group">
                    <img 
                      src={profile.avatar || undefined} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full object-cover shadow-lg group-hover:opacity-80 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <User size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-4 flex-grow">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-1">Avatar URL</label>
                      <input 
                        type="text" 
                        value={profile.avatar}
                        onChange={(e) => setProfile(prev => ({ ...prev, avatar: e.target.value }))}
                        className="w-full bg-[#fcfcfb] border-none rounded-lg text-sm focus:ring-[#c5a059]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Username (www.women.cards/your-pseudo)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-30 font-medium">women.cards/</span>
                      <input 
                        type="text" 
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                        className="w-full bg-white border border-black/5 py-4 pl-[124px] pr-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                        placeholder="pseudo"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Display Name</label>
                    <input 
                      type="text" 
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Short Bio</label>
                    <textarea 
                      value={profile.bio}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      className="w-full bg-white border border-black/5 py-4 px-6 rounded-2xl opacity-70 focus:ring-[#c5a059] shadow-sm resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Instagram Username</label>
                      <input 
                        type="text" 
                        value={profile.socials?.instagram || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, instagram: e.target.value } }))}
                        className="w-full bg-white border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                        placeholder="@username"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">LinkedIn Username</label>
                      <input 
                        type="text" 
                        value={profile.socials?.linkedin || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, linkedin: e.target.value } }))}
                        className="w-full bg-white border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                        placeholder="your-profile"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'appearance' && (
              <motion.div 
                key="appearance"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold">Theme Selection</h1>
                  <button 
                    onClick={() => saveToSupabase(profile)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full font-bold shadow-lg hover:bg-stone-800 disabled:opacity-50 transition-all"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {(Object.keys(THEMES) as ThemeType[]).map(themeKey => (
                    <button
                      key={themeKey}
                      onClick={() => setProfile(prev => ({ ...prev, theme: themeKey }))}
                      className={`relative aspect-[16/9] rounded-2xl overflow-hidden border-2 transition-all p-4 flex items-center justify-center ${
                        profile.theme === themeKey ? 'border-[#c5a059]' : 'border-black/5 hover:border-black/20'
                      } ${THEMES[themeKey].bg}`}
                    >
                      <div className={`${THEMES[themeKey].text} font-bold`}>
                        {themeKey.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}
                      </div>
                      {profile.theme === themeKey && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-[#c5a059] rounded-full flex items-center justify-center text-white">
                          <Check size={14} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'links' && (
              <motion.div 
                key="links"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold">Your Links</h1>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => saveToSupabase(profile)}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-2 border-2 border-black text-black rounded-full font-bold hover:bg-black hover:text-white disabled:opacity-50 transition-all"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      onClick={addLink}
                      className="bg-[#c5a059] text-white px-6 py-2 rounded-full font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Plus size={20} /> Add New Link
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {profile.links.map((link) => (
                    <div key={link.id} className="bg-white border border-black/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                      <div className="flex gap-4">
                        <div className="cursor-grab opacity-20 hover:opacity-50 transition-opacity">
                          <GripVertical size={24} />
                        </div>
                        <div className="flex-grow space-y-4">
                          <div className="flex items-center gap-4">
                            <input 
                              type="text" 
                              value={link.title}
                              onChange={(e) => updateLink(link.id, { title: e.target.value })}
                              placeholder="Title"
                              className="w-full font-bold text-lg bg-transparent border-none p-0 focus:ring-0 placeholder:opacity-30"
                            />
                            <div className="flex items-center gap-2">
                              {/* Toggle */}
                              <button 
                                onClick={() => updateLink(link.id, { isActive: !link.isActive })}
                                className={`w-10 h-5 rounded-full transition-colors relative ${link.isActive ? 'bg-[#c5a059]' : 'bg-black/10'}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${link.isActive ? 'left-6' : 'left-1'}`} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <LinkIcon size={16} className="text-black/30" />
                            <input 
                              type="text" 
                              value={link.url}
                              onChange={(e) => updateLink(link.id, { url: e.target.value })}
                              placeholder="URL"
                              className="w-full text-sm opacity-60 bg-transparent border-none p-0 focus:ring-0 placeholder:opacity-30"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteLink(link.id)}
                          className="text-black/10 hover:text-red-500 transition-colors p-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {profile.links.length === 0 && (
                    <div className="text-center py-20 bg-black/5 rounded-3xl border-2 border-dashed border-black/10">
                      <p className="opacity-40 font-medium">No links yet. Start by adding one!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live Mobile Preview */}
        <div className="hidden lg:flex flex-col items-center sticky top-12 h-fit">
          <div className="relative p-4 bg-[#2a2a2a] rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-[#333]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#2a2a2a] rounded-b-2xl z-20" />
            
            {/* The actual preview window */}
            <div className={`w-[320px] h-[640px] rounded-[2rem] overflow-y-auto no-scrollbar relative z-10 transition-colors duration-500 ${currentTheme.bg}`}>
              <div className="p-8 pt-16 flex flex-col items-center">
                <img 
                  src={profile.avatar || undefined} 
                  alt="Preview Avatar" 
                  className="w-24 h-24 rounded-full object-cover shadow-xl mb-6 ring-4 ring-white/10"
                />
                <h2 className={`text-2xl font-bold text-center mb-2 ${currentTheme.text}`}>
                  {profile.name}
                </h2>
                <p className={`text-sm text-center mb-10 opacity-70 px-4 ${currentTheme.text}`}>
                  {profile.bio}
                </p>


                <div className="w-full space-y-4">
                  {profile.links.filter(l => l.isActive).map(link => (
                    <div 
                      key={link.id}
                      className={`w-full py-4 text-center rounded-xl font-bold shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] ${currentTheme.button} ${currentTheme.buttonText}`}
                    >
                      {link.title}
                    </div>
                  ))}
                </div>
 
                <div className="mt-auto pt-20 pb-4">
                   <div className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 text-center ${currentTheme.text}`}>
                      Powered by women.cards
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col gap-4 w-full">
            <a 
              href={`/${profile.username}`} 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3 bg-white border border-black/10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black hover:text-white transition-all shadow-md group w-full"
            >
              View live page <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>

            <div className="bg-black/5 rounded-2xl p-4 w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-black/30">Diagnostic Système</h3>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[10px] font-bold text-[#c5a059] hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={10} /> Sync
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-black/40 truncate" title={currentUser?.id}>UID: {currentUser?.id || 'NO_USER'}</p>
                <p className="text-[9px] font-mono text-black/40 truncate" title={currentUser?.email || ''}>Email: {currentUser?.email || 'N/A'}</p>
                <p className="text-[9px] font-mono text-black/40">Status: {currentUser ? 'Authenticated' : 'Not Logged In'}</p>
                <p className="text-[9px] font-mono text-black/40">DB: {supabase ? 'Connected' : 'Offline'}</p>
                {saveStatus.type === 'error' && (saveStatus.message?.includes('base de données') || saveStatus.message?.includes('RLS')) && (
                  <button 
                    onClick={() => alert(`COPIEZ CE CODE DANS LE SQL EDITOR DE SUPABASE :\n\n-- 1. Ajouter les colonnes manquantes\nALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;\nALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}'::jsonb;\n\n-- 2. Activer la sécurité (RLS)\nALTER TABLE wc_profiles ENABLE ROW LEVEL SECURITY;\nALTER TABLE wc_links ENABLE ROW LEVEL SECURITY;\n\n-- 3. ACCÈS PUBLIC (TRÈS IMPORTANT)\nCREATE POLICY "Public profiles are viewable by everyone" ON wc_profiles FOR SELECT USING (true);\nCREATE POLICY "Public links are viewable by everyone" ON wc_links FOR SELECT USING (true);\n\n-- 4. ACCÈS PROPRIÉTAIRE\nCREATE POLICY "Allow individual upsert" ON wc_profiles FOR ALL USING (auth.uid() = id);\nCREATE POLICY "Allow individual links access" ON wc_links FOR ALL USING (auth.uid() = profile_id);`)}
                    className="mt-2 text-[8px] bg-red-100 text-red-600 p-1 rounded font-bold hover:bg-red-200 uppercase"
                  >
                    Réparer la Base de Données
                  </button>
                )}
                {lastSync && <p className="text-[9px] font-mono text-green-600 font-bold">Dernière Sync: {lastSync}</p>}
                {saveStatus.type === 'error' && <p className="text-[9px] font-mono text-red-500">Erreur: {saveStatus.message?.slice(0, 50)}...</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
