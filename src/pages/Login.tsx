import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Mail, ArrowRight, Loader2, UserPlus, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!supabase) {
      setError("Le service d'authentification n'est pas disponible.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setSuccess('Compte créé ! Vérifiez vos emails pour confirmer.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Detailed Login Error:", err);
      const host = import.meta.env.VITE_SUPABASE_URL;
      const isHttps = window.location.protocol === 'https:';
      const supabaseIsHttps = host?.startsWith('https:');

      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        if (isHttps && !supabaseIsHttps) {
          setError(`Erreur Sécurité (Mixed Content) : Votre app est en HTTPS mais Supabase est en HTTP. Utilisez une URL en HTTPS pour Supabase.`);
        } else {
          setError(`Connexion échouée à ${host}. Vérifiez : 1. L'URL est correcte. 2. Le CORS est configuré. 3. Le serveur est en ligne.`);
        }
      } else if (err.message?.includes('database')) {
        setError("Erreur de base de données. Vérifiez l'existence des tables wc_profiles et wc_links.");
      } else {
        setError(err.message || "Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4 font-sans selection:bg-[#c5a059] selection:text-white">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-black/5"
      >
        <div className="mb-10 text-center">
          <div className="w-12 h-12 bg-[#c5a059] rounded-2xl rotate-12 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 shadow-lg">w</div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {isSignUp ? 'Join women.cards' : 'Welcome back'}
          </h1>
          <p className="text-sm text-black/40">
            {isSignUp ? 'Create your professional digital presence' : 'Manage your digital business card'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-red-500 text-sm font-medium bg-red-50 p-4 rounded-2xl border border-red-100"
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-green-600 text-sm font-bold bg-green-50 p-4 rounded-2xl border border-green-100"
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block px-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full pl-12 pr-4 py-4 bg-[#fcfcfb] border border-black/5 rounded-2xl focus:ring-2 focus:ring-[#c5a059] focus:bg-white transition-all outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-2 block px-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-12 pr-4 py-4 bg-[#fcfcfb] border border-black/5 rounded-2xl focus:ring-2 focus:ring-[#c5a059] focus:bg-white transition-all outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#2a2a2a] text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isSignUp ? 'Create account' : 'Sign in'} 
                  {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-black/40 mb-2">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            className="text-sm font-bold text-[#c5a059] hover:text-[#b08d4a] transition-all flex items-center justify-center gap-1 mx-auto"
          >
            {isSignUp ? (
              <><LogIn size={14} /> Back to login</>
            ) : (
              <><UserPlus size={14} /> Create a new account</>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
}

