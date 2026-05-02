export interface Link {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
  icon?: string;
}

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  theme: string;
  links: Link[];
  socials: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    facebook?: string;
    tiktok?: string;
    email?: string;
    phone?: string;
  };
}

export type ThemeType = 'minimal-light' | 'minimal-dark' | 'soft-rose' | 'elegant-gold';

export const THEMES: Record<ThemeType, { bg: string; text: string; button: string; buttonText: string }> = {
  'minimal-light': {
    bg: 'bg-stone-50',
    text: 'text-stone-900',
    button: 'bg-stone-900',
    buttonText: 'text-white',
  },
  'minimal-dark': {
    bg: 'bg-stone-900',
    text: 'text-stone-50',
    button: 'bg-stone-50',
    buttonText: 'text-stone-900',
  },
  'soft-rose': {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    button: 'bg-rose-900',
    buttonText: 'text-white',
  },
  'elegant-gold': {
    bg: 'bg-[#faf9f6]',
    text: 'text-[#2a2a2a]',
    button: 'bg-[#c5a059]',
    buttonText: 'text-white',
  },
};
