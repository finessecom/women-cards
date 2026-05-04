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
  RefreshCw,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Twitter,
  Facebook,
  Youtube,
  Music
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
    linkedin: 'sarahjenkins',
    email: 'sarah@bloom.com',
    phone: '+33 6 12 34 56 78'
  }
};

export default function Dashboard() {
  console.log("Dashboard component render start");
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'success' | 'error', message?: string }>({ type: 'idle' });
  const [activeTab, setActiveTab] = useState<'profile' | 'contact' | 'appearance' | 'links'>('profile');
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [showSqlRepair, setShowSqlRepair] = useState(false);
  const [dbDiagnostic, setDbDiagnostic] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let mounted = true;
    console.log("Dashboard: initiating data load...");
    
    const loadData = async () => {
      if (!mounted) return;
      setIsLoading(true);
      setDbDiagnostic(null);
      
      try {
        if (supabase) {
          console.log("Dashboard: fetching user...");
          const { data, error: userError } = await supabase.auth.getUser();
          const user = data?.user;
          
          if (userError) {
            console.error("Dashboard: getUser error:", userError);
            setDbDiagnostic(`Auth Error: ${userError.message}`);
          }
          
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
        console.warn("Schema mismatch detected, retrying with optimized payload...", profileError.message);
        
        const retryPayload: any = {
          id: user.id,
          username: currentProfile.username.trim().toLowerCase(),
          bio: currentProfile.bio || '',
          avatar_url: currentProfile.avatar || '',
          theme: currentProfile.theme || 'elegant-gold',
          updated_at: new Date().toISOString()
        };

        // Only include socials if they weren't explicitly called out as missing
        if (!profileError.message.includes("'socials'")) {
          retryPayload.socials = currentProfile.socials || {};
        }

        // Only include name if it isn't causing issues (compatibility check)
        if (!profileError.message.includes("'full_name'")) {
          retryPayload.full_name = currentProfile.name.trim();
        }
        if (!profileError.message.includes("'name'")) {
          retryPayload.name = currentProfile.name.trim();
        }

        const { error: retryError } = await supabase
          .from('wc_profiles')
          .upsert(retryPayload, { onConflict: 'id' });
        
        profileError = retryError;
      }

      if (profileError) {
        console.error("SUPABASE PROFILE ERROR:", profileError.code, profileError.message);
        
        let customMessage = profileError.message;
        if (profileError.code === '42501') customMessage = "Erreur de Permission (RLS). Assurez-vous d'avoir exécuté le script SQL dans Supabase.";
        if (profileError.code === '23505') customMessage = "Ce pseudo est déjà utilisé par un autre utilisateur.";
        if (profileError.message.includes('column')) customMessage = "La structure de la base est incomplète. Utilisez le code SQL de réparation.";

        setSaveStatus({ type: 'error', message: customMessage });
        setDbDiagnostic(`Save Error: ${profileError.code} - ${profileError.message}`);
        return;
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
      const publicUrl = `${window.location.origin}/${currentProfile.username.toLowerCase()}`;
      setTimeout(() => {
        alert(`✅ PROFIL ENREGISTRÉ AVEC SUCCÈS !\n\nVotre page est maintenant active à cette adresse :\n${publicUrl}\n\n(Note : Si vous voyez encore 'Profil non trouvé', attendez 5 secondes et rafraîchissez la page)`);
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
    <div className="flex flex-col md:flex-row h-screen bg-[#fcfcfb] font-sans overflow-hidden">
      {/* Sidebar navigation */}
      <aside className="fixed bottom-0 left-0 right-0 h-16 md:relative md:h-screen md:w-64 border-t md:border-t-0 md:border-r border-black/5 bg-white flex flex-row md:flex-col items-center md:items-stretch px-2 md:px-0 py-0 md:py-8 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] md:shadow-none">
        <div className="hidden md:flex px-6 mb-12 items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#c5a059] rounded-lg rotate-12 flex items-center justify-center text-white font-bold text-xl">w</div>
          <span className="hidden md:block font-bold text-lg tracking-tight">women.cards</span>
        </div>

        <nav className="flex flex-row md:flex-col flex-grow items-center md:items-stretch justify-around md:justify-start gap-1 md:gap-2 px-1 md:px-3 w-full">
          {[
            { id: 'profile', icon: <User size={20} />, label: 'Profil' },
            { id: 'contact', icon: <Layout size={20} />, label: 'Contact' },
            { id: 'appearance', icon: <Palette size={20} />, label: 'Look' },
            { id: 'links', icon: <LinkIcon size={20} />, label: 'Liens' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex md:w-full items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-black text-white shadow-lg shadow-black/10' 
                  : 'text-black/60 hover:bg-black/5'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-white' : 'text-black/40'}>{tab.icon}</span>
              <span className="hidden md:block font-medium">{tab.label}</span>
            </button>
          ))}
          
          <button 
            onClick={logout}
            className="flex md:w-full items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2 md:py-3 text-black/40 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden md:block text-sm font-medium">Logout</span>
          </button>
        </nav>

        <div className="hidden md:block px-3 py-4 mt-auto border-t border-black/5 space-y-4">
          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${currentUser ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className={`w-2 h-2 rounded-full ${currentUser ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`} />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">Compte</p>
              <p className="text-[10px] font-bold truncate text-black/70">
                {currentUser?.email || 'Mode Démo'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Editor Area */}
      <main className="flex-grow overflow-y-auto px-4 md:px-12 py-6 md:py-12 pb-24 md:pb-12 flex flex-col lg:flex-row gap-8 md:gap-12">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold">Profile Details</h1>
                    <p className="text-[9px] md:text-[10px] text-black/30 font-mono">ID: {currentUser?.id}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => setShowSqlRepair(!showSqlRepair)}
                      className={`text-[10px] px-3 md:px-4 py-2 rounded-full font-bold transition-all uppercase flex items-center gap-2 border ${
                        showSqlRepair ? 'bg-black text-white' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      <RefreshCw size={12} /> 
                      <span className="hidden sm:inline">{showSqlRepair ? 'Masquer le code SQL' : 'Réparer la base (SQL)'}</span>
                      <span className="sm:hidden">{showSqlRepair ? 'Masquer SQL' : 'Réparer'}</span>
                    </button>
                    {saveStatus.type === 'success' && <span className="text-xs font-bold text-green-500 uppercase tracking-widest animate-pulse">Enregistré !</span>}
                    <button 
                      onClick={() => saveToSupabase(profile)}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full font-bold shadow-lg transition-all ${
                        isSaving ? 'bg-stone-400' : 'bg-black text-white hover:bg-stone-800'
                      } disabled:opacity-50 text-sm md:text-base`}
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      <span>{isSaving ? 'Enregistrement...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>

                {/* Diagnostic Box */}
                <div className="bg-white border border-black/5 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lastSync ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {lastSync ? <Check size={24} /> : <RefreshCw size={24} className={isSaving ? 'animate-spin' : ''} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm">État de votre lien public</h3>
                      <p className="text-xs text-black/40">
                        {profile.username ? `Lien configuré : women.cards/${profile.username.toLowerCase()}` : "⚠️ Pseudo non défini dans l'onglet Profil"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {profile.username && (
                      <a 
                        href={`/${profile.username.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-grow sm:flex-grow-0 px-6 py-3 bg-black text-white rounded-full text-xs font-bold transition-all hover:scale-105 text-center"
                      >
                        Voir ma page en ligne
                      </a>
                    )}
                  </div>
                </div>

                {showSqlRepair && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-red-50 border border-red-100 rounded-3xl p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-red-800 font-bold text-sm uppercase tracking-wider">🛠 SQL de Réparation</h3>
                      <button 
                        onClick={() => {
                          const code = (document.getElementById('sql-code') as HTMLTextAreaElement).value;
                          navigator.clipboard.writeText(code);
                          alert('Code copié !');
                        }}
                        className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full font-bold hover:bg-red-700"
                      >
                        Copier le code
                      </button>
                    </div>
                    <p className="text-xs text-red-700/70">
                      Copiez ce code et collez-le dans le <b>SQL Editor</b> de votre projet Supabase, puis cliquez sur <b>RUN</b>.
                    </p>
                    <textarea 
                      id="sql-code"
                      readOnly
                      rows={12}
                      className="w-full bg-white/50 border border-red-200 rounded-xl p-4 font-mono text-[10px] text-red-900 focus:ring-0"
                      value={`-- 1. TABLES ET COLONNES (Lancer tout le bloc)
CREATE TABLE IF NOT EXISTS wc_profiles (id UUID PRIMARY KEY REFERENCES auth.users(id), username TEXT UNIQUE, full_name TEXT, name TEXT, bio TEXT, avatar_url TEXT, theme TEXT, socials JSONB DEFAULT '{}'::jsonb, updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
ALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}'::jsonb;
ALTER TABLE wc_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. SÉCURITÉ RLS
ALTER TABLE wc_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON wc_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON wc_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow individual upsert" ON wc_profiles;
CREATE POLICY "Allow individual upsert" ON wc_profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. LINKS
CREATE TABLE IF NOT EXISTS wc_links (id BIGSERIAL PRIMARY KEY, profile_id UUID REFERENCES wc_profiles(id) ON DELETE CASCADE, title TEXT, url TEXT, is_active BOOLEAN DEFAULT TRUE, position INTEGER, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
ALTER TABLE wc_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public links are viewable by everyone" ON wc_links;
CREATE POLICY "Public links are viewable by everyone" ON wc_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow individual links access" ON wc_links;
CREATE POLICY "Allow individual links access" ON wc_links FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);`}
                    />
                  </motion.div>
                )}

                {dbDiagnostic && (
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-3 text-orange-800 text-xs font-mono">
                    <span className="font-bold">DIAGNOSTIC:</span> {dbDiagnostic}
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 md:p-8 rounded-3xl border border-black/5 shadow-sm">
                  <div className="relative group">
                    <img 
                      src={profile.avatar || undefined} 
                      alt="Avatar" 
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-lg group-hover:opacity-80 transition-opacity border-4 border-white"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <User size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="space-y-4 w-full flex-grow">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 block mb-1">Avatar URL</label>
                      <input 
                        type="text" 
                        value={profile.avatar}
                        onChange={(e) => setProfile(prev => ({ ...prev, avatar: e.target.value }))}
                        className="w-full bg-[#fcfcfb] border-2 border-black/5 rounded-xl py-2 px-4 text-sm focus:ring-[#c5a059] focus:border-[#c5a059]"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Username ({window.location.host}/{profile.username || 'pseudo'})</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 opacity-30 font-medium text-xs">{window.location.host}/</span>
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
                </div>
              </motion.div>
            )}

            {activeTab === 'contact' && (
              <motion.div 
                key="contact"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-10"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold">Contact & Réseaux</h1>
                  <button 
                    onClick={() => saveToSupabase(profile)}
                    disabled={isSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-black text-white rounded-full font-bold shadow-lg hover:bg-stone-800 disabled:opacity-50 transition-all"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                <div className="space-y-10">
                  {/* Section 1: Contact Direct */}
                  <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#c5a059]">Contact Direct</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Email de contact</label>
                        <input 
                          type="email" 
                          value={profile.socials?.email || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, email: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="exemple@mail.com"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Téléphone</label>
                        <input 
                          type="tel" 
                          value={profile.socials?.phone || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, phone: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="+33 6 00 00 00 00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Réseaux Sociaux */}
                  <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm space-y-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-[#c5a059]">Réseaux Sociaux</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Instagram</label>
                        <input 
                          type="text" 
                          value={profile.socials?.instagram || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, instagram: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="@username"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">LinkedIn</label>
                        <input 
                          type="text" 
                          value={profile.socials?.linkedin || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, linkedin: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="your-profile"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">X (Twitter)</label>
                        <input 
                          type="text" 
                          value={profile.socials?.twitter || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, twitter: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="@username"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">Facebook</label>
                        <input 
                          type="text" 
                          value={profile.socials?.facebook || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, facebook: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="votre.page"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">TikTok</label>
                        <input 
                          type="text" 
                          value={profile.socials?.tiktok || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, tiktok: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="@username"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-black/40 block mb-2">YouTube</label>
                        <input 
                          type="text" 
                          value={profile.socials?.youtube || ''}
                          onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, youtube: e.target.value } }))}
                          className="w-full bg-[#fcfcfb] border border-black/5 py-4 px-6 rounded-2xl font-bold focus:ring-[#c5a059] shadow-sm"
                          placeholder="@chaine"
                        />
                      </div>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold">Theme Selection</h1>
                  <button 
                    onClick={() => saveToSupabase(profile)}
                    disabled={isSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-black text-white rounded-full font-bold shadow-lg hover:bg-stone-800 disabled:opacity-50 transition-all"
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold">Your Links</h1>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => saveToSupabase(profile)}
                      disabled={isSaving}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 border-2 border-black text-black rounded-full font-bold hover:bg-black hover:text-white disabled:opacity-50 transition-all"
                    >
                      {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button 
                      onClick={addLink}
                      className="w-full sm:w-auto bg-[#c5a059] text-white px-6 py-2 rounded-full font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
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

                {/* Preview Socials & Contact */}
                <div className="space-y-4 mb-8">
                  {/* Contact Line */}
                  <div className="flex justify-center gap-4">
                    {profile.socials?.email && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Mail size={16} />
                      </div>
                    )}
                    {profile.socials?.phone && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Phone size={16} />
                      </div>
                    )}
                  </div>

                  {/* Social Media Line */}
                  <div className="flex flex-wrap justify-center gap-4">
                    {profile.socials?.instagram && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Instagram size={20} />
                      </div>
                    )}
                    {profile.socials?.linkedin && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Linkedin size={20} />
                      </div>
                    )}
                    {profile.socials?.twitter && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Twitter size={20} />
                      </div>
                    )}
                    {profile.socials?.facebook && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Facebook size={20} />
                      </div>
                    )}
                    {profile.socials?.tiktok && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Music size={20} />
                      </div>
                    )}
                    {profile.socials?.youtube && (
                      <div className={`opacity-40 hover:opacity-100 transition-opacity ${currentTheme.text}`}>
                        <Youtube size={20} />
                      </div>
                    )}
                  </div>
                </div>


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
                      Powered by {window.location.host}
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col gap-4 w-full">
            <a 
              href={`${window.location.origin}/${profile.username}`} 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3 bg-[#c5a059] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg group w-full"
            >
              Voir ma page en ligne <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
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
                
                {lastSync && <p className="text-[9px] font-mono text-green-600 font-bold">Dernière Sync: {lastSync}</p>}
                {saveStatus.type === 'error' && <p className="text-[9px] font-mono text-red-500 font-bold">⚠️ Erreur: {saveStatus.message}</p>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
