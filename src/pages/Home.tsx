import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Layout, Smartphone } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2a2a2a] font-sans selection:bg-[#c5a059] selection:text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 md:px-12">
        <div className="text-2xl font-bold tracking-tight">women.cards</div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="px-5 py-2 text-sm font-medium hover:bg-black/5 rounded-full transition-colors"
          >
            Log in
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="px-5 py-2 text-sm font-medium bg-[#2a2a2a] text-white rounded-full hover:bg-black transition-colors"
          >
            Sign up free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid md:grid-cols-2 gap-12 items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl md:text-7xl font-bold leading-[0.9] tracking-tighter mb-8">
            Your professional <br />
            <span className="text-[#c5a059]">digital presence</span> <br />
            in one link.
          </h1>
          <p className="text-xl opacity-60 mb-10 max-w-md leading-relaxed">
            Create an elegant digital business card tailored for modern women leaders, entrepreneurs, and creators.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="relative flex-grow max-w-sm">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-40 font-medium">{window.location.host}/</span>
              <input 
                type="text" 
                placeholder="votre-nom"
                className="w-full pl-[135px] pr-4 py-4 bg-white border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition-all shadow-sm"
              />
            </div>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-[#c5a059] text-white font-bold rounded-xl hover:bg-[#b08d4a] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
            >
              Get started for free <ArrowRight size={20} />
            </button>
          </div>
          
          <div className="mt-8 flex items-center gap-6 text-xs font-bold uppercase tracking-widest opacity-30">
            <div className="flex items-center gap-2 tracking-normal"><CheckCircle2 size={14} /> No card required</div>
            <div className="flex items-center gap-2 tracking-normal"><CheckCircle2 size={14} /> Setup in 2 mins</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative z-10">
            <img 
              src="professional_woman_hero.png" 
              alt="Professional Woman" 
              className="w-full h-full object-cover"
              onError={(e) => e.currentTarget.src = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"}
            />
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#c5a059]/20 rounded-full blur-3xl z-0" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/5 rounded-full blur-2xl z-0" />
          
          {/* Floating tags */}
          <div className="absolute top-1/4 -right-6 bg-white px-4 py-2 rounded-lg shadow-lg z-20 flex items-center gap-2 animate-bounce">
             <Layout size={16} className="text-[#c5a059]" />
             <span className="text-sm font-bold">Elegant Layouts</span>
          </div>
          <div className="absolute bottom-1/4 -left-6 bg-white px-4 py-2 rounded-lg shadow-lg z-20 flex items-center gap-2 animate-pulse">
             <Smartphone size={16} className="text-[#c5a059]" />
             <span className="text-sm font-bold">Mobile First</span>
          </div>
        </motion.div>
      </main>

    </div>
  );
}
