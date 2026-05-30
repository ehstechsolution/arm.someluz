import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Users, FileText, UserCheck, 
  Package, Settings, Menu, Sparkles 
} from 'lucide-react';
import { Theme } from './types';
import { 
  getFirebaseAuth, 
  getFirebaseDb, 
  onAuthStateChanged, 
  doc, 
  getDoc 
} from './firebase';

// Import Modular Components
import AuthScreen from './components/AuthScreen';
import HomeScreen from './components/HomeScreen';
import ClientsScreen from './components/ClientsScreen';
import DocumentsScreen from './components/DocumentsScreen';
import TeamScreen from './components/TeamScreen';
import EquipmentScreen from './components/EquipmentScreen';
import PackagesScreen from './components/PackagesScreen';
import SettingsScreen from './components/SettingsScreen';

// Active Screens enum for navigation switching
type Tab = 'home' | 'clientes' | 'documentos' | 'equipe' | 'equipamentos' | 'pacotes' | 'configuracoes';

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('als_is_auth') === 'true';
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('als_user_email');
  });
  const [userPhoto, setUserPhoto] = useState<string | null>(() => {
    return localStorage.getItem('als_user_photo');
  });
  const [userId, setUserId] = useState<string | null>(() => {
    return localStorage.getItem('als_user_id');
  });
  const [userProfile, setUserProfile] = useState<{
    nome: string;
    avatar: string;
    telefone: string;
    email: string;
    termoUso: boolean;
    nivelAcesso: string;
    cpf?: string;
    endereco?: string;
  }>(() => {
    const cached = localStorage.getItem('als_user_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return {
          nome: parsed.nome || '',
          avatar: parsed.avatar || '',
          telefone: parsed.telefone || '',
          email: parsed.email || '',
          termoUso: parsed.termoUso || false,
          nivelAcesso: parsed.nivelAcesso || 'Equipe',
          cpf: parsed.cpf || '',
          endereco: parsed.endereco || ''
        };
      } catch (e) {}
    }
    return {
      nome: localStorage.getItem('als_user_nome') || 'Operador Arthur',
      avatar: localStorage.getItem('als_user_photo') || 'https://cdn-icons-png.freepik.com/512/10100/10100139.png',
      telefone: localStorage.getItem('als_user_telefone') || '',
      email: localStorage.getItem('als_user_email') || 'arm.someluz@gmail.com',
      termoUso: false,
      nivelAcesso: 'Equipe',
      cpf: '',
      endereco: ''
    };
  });

  // Global company configuration
  const [companyConfig, setCompanyConfig] = useState<{
    nomeFantasia: string;
    razaoSocial: string;
    cnpj: string;
    logo: string;
    cep: string;
    endereco: string;
    linkInstagram: string;
    linkYoutube: string;
    linkFacebook: string;
  }>(() => {
    const cached = localStorage.getItem('als_company_config');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return {
      nomeFantasia: 'Arthur Luz e Som',
      razaoSocial: 'Arthur Empreendimentos LTDA',
      cnpj: '45.123.888/0001-90',
      logo: 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
      cep: '',
      endereco: '',
      linkInstagram: '',
      linkYoutube: '',
      linkFacebook: ''
    };
  });

  // Load company config from Firestore database on mount
  useEffect(() => {
    const loadCompanySettings = async () => {
      const db = getFirebaseDb();
      if (!db) return;
      try {
        const docRef = doc(db, 'config', 'empresa');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const config = {
            nomeFantasia: data.nomeFantasia || 'Arthur Luz e Som',
            razaoSocial: data.razaoSocial || '',
            cnpj: data.cnpj || '',
            logo: data.logo || 'https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg',
            cep: data.cep || '',
            endereco: data.endereco || '',
            linkInstagram: data.linkInstagram || '',
            linkYoutube: data.linkYoutube || '',
            linkFacebook: data.linkFacebook || ''
          };
          setCompanyConfig(config);
          localStorage.setItem('als_company_config', JSON.stringify(config));
          if (config.cnpj) {
            localStorage.setItem('als_company_details', `${config.nomeFantasia} | CNPJ: ${config.cnpj}`);
          }
        }
      } catch (err) {
        console.warn("Failed to load company config on mount:", err);
      }
    };
    loadCompanySettings();

    // Listen to real-time custom settings adjustments saved from settings screen
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setCompanyConfig(e.detail);
      }
    };
    window.addEventListener('company_config_updated', handleUpdate);
    return () => window.removeEventListener('company_config_updated', handleUpdate);
  }, []);

  // Navigation state
  const [activeTab, setActiveTab] = useState<Tab>('home');

  // Theme support: Defaults to High-Fidelity DARK MODE
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('als_theme');
    return (saved as Theme) || 'dark';
  });

  // Apply class 'dark' to HTML document elements based on theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('als_theme', theme);
  }, [theme]);

  // Real-time auth status sync with Firestore structure
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
        if (user) {
          setIsAuthenticated(true);
          setUserId(user.uid);
          setUserEmail(user.email);
          localStorage.setItem('als_is_auth', 'true');
          localStorage.setItem('als_user_id', user.uid);
          localStorage.setItem('als_user_email', user.email || '');

          const db = getFirebaseDb();
          if (db) {
            const docRef = doc(db, 'usuarios', user.uid);
            try {
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                const data = snap.data();
                const profile = {
                  nome: data.nome || user.displayName || user.email?.split('@')[0] || 'Operador Arthur',
                  avatar: data.avatar || user.photoURL || 'https://cdn-icons-png.freepik.com/512/10100/10100139.png',
                  telefone: data.telefone || '',
                  email: data.email || user.email || '',
                  termoUso: data.termoUso || false,
                  nivelAcesso: data.nivelAcesso || 'Equipe',
                  cpf: data.cpf || '',
                  endereco: data.endereco || ''
                };
                setUserProfile(profile);
                setUserPhoto(profile.avatar);
                localStorage.setItem('als_user_profile', JSON.stringify(profile));
                localStorage.setItem('als_user_photo', profile.avatar);
              }
            } catch (err) {
              console.warn("Failed to load user profile in background:", err);
            }
          }
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleAuthSuccess = (
    email: string, 
    photoURL: string | null, 
    uid?: string, 
    nome?: string, 
    telefone?: string,
    nivelAcesso?: string,
    cpf?: string,
    endereco?: string
  ) => {
    setIsAuthenticated(true);
    setUserEmail(email);
    const resolvedUid = uid || 'sandbox_user_id';
    setUserId(resolvedUid);
    
    const finalAvatar = photoURL || 'https://cdn-icons-png.freepik.com/512/10100/10100139.png';
    setUserPhoto(finalAvatar);

    const initialProfile = {
      nome: nome || email.split('@')[0] || 'Operador Arthur',
      avatar: finalAvatar,
      telefone: telefone || '',
      email: email,
      termoUso: false,
      nivelAcesso: nivelAcesso || 'Equipe',
      cpf: cpf || '',
      endereco: endereco || ''
    };

    setUserProfile(initialProfile);
    localStorage.setItem('als_is_auth', 'true');
    localStorage.setItem('als_user_email', email);
    localStorage.setItem('als_user_id', resolvedUid);
    localStorage.setItem('als_user_photo', finalAvatar);
    localStorage.setItem('als_user_profile', JSON.stringify(initialProfile));
  };

  const handleLogout = () => {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        auth.signOut();
      } catch (e) {}
    }
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserPhoto(null);
    setUserId(null);
    setUserProfile({
      nome: 'Operador Arthur',
      avatar: 'https://cdn-icons-png.freepik.com/512/10100/10100139.png',
      telefone: '',
      email: '',
      termoUso: false,
      nivelAcesso: 'Equipe',
      cpf: '',
      endereco: ''
    });
    localStorage.removeItem('als_is_auth');
    localStorage.removeItem('als_user_email');
    localStorage.removeItem('als_user_photo');
    localStorage.removeItem('als_user_id');
    localStorage.removeItem('als_user_profile');
  };

  // Switch screen content dynamically with animations
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'clientes':
        return <ClientsScreen />;
      case 'documentos':
        return <DocumentsScreen company={companyConfig} />;
      case 'equipe':
        return <TeamScreen />;
      case 'equipamentos':
        return <EquipmentScreen />;
      case 'pacotes':
        return <PackagesScreen />;
      case 'configuracoes':
        return (
          <SettingsScreen 
            userId={userId}
            userProfile={userProfile}
            onProfileUpdate={(updated) => {
              setUserProfile(updated);
              setUserPhoto(updated.avatar);
              localStorage.setItem('als_user_profile', JSON.stringify(updated));
              localStorage.setItem('als_user_photo', updated.avatar);
            }}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            onLogout={handleLogout}
          />
        );
      default:
        return <HomeScreen />;
    }
  };

  // If not logged-in, show the beautiful login auth screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50/50 transition-colors duration-300 dark:bg-zinc-950">
        <AuthScreen onAuthSuccess={handleAuthSuccess} companyConfig={companyConfig} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 text-gray-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-gray-100">
      {/* Native App Top Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-100 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="flex items-center gap-2">
          <img 
            src={companyConfig.logo || "https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg"} 
            alt="Logo" 
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-lg object-contain border border-gray-100 dark:border-zinc-800 bg-white"
          />
          <div>
            <h1 className="text-xs font-black tracking-tight text-gray-950 dark:text-white uppercase leading-none">
              {companyConfig.nomeFantasia}
            </h1>
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium">Painel Corporativo</span>
          </div>
        </div>

        {/* Small theme active display icon */}
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-[#749b25] dark:text-primary font-mono select-none">
            Online
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-lg px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.99, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -5 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FIXED Bottom Navigation Bar (App native styling) */}
      <nav className="nav-shadow fixed right-0 bottom-0 left-0 z-40 border-t border-gray-100 bg-white/95 pb-safe backdrop-blur-lg dark:border-zinc-900 dark:bg-zinc-950/95">
        <div className="mx-auto grid max-w-lg grid-cols-7 items-center justify-center px-1 py-2 h-16">
          {/* TAB 1: HOME */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-all focus:outline-none ${
              activeTab === 'home'
                ? 'text-primary'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Home</span>
          </button>

          {/* TAB 2: DOCUMENTOS */}
          <button
            onClick={() => setActiveTab('documentos')}
            className={`flex flex-col items-center justify-center gap-1 transition-all focus:outline-none ${
              activeTab === 'documentos'
                ? 'text-primary'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Docs</span>
          </button>

          {/* TAB 3: PACOTES */}
          <button
            onClick={() => setActiveTab('pacotes')}
            className={`flex flex-col items-center justify-center gap-1 transition-all focus:outline-none ${
              activeTab === 'pacotes'
                ? 'text-[#7CFF01]'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Pacotes</span>
          </button>

          {/* TAB 4: CLIENTES */}
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex flex-col items-center justify-center gap-1 transition-all focus:outline-none ${
              activeTab === 'clientes'
                ? 'text-primary'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Clientes</span>
          </button>

          {/* TAB 5: EQUIPE */}
          <button
            onClick={() => setActiveTab('equipe')}
            className={`flex flex-col items-center justify-center gap-1 transition-all focus:outline-none ${
              activeTab === 'equipe'
                ? 'text-primary'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <UserCheck className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Equipe</span>
          </button>

          {/* TAB 6: EQUIPAMENTOS */}
          <button
            onClick={() => setActiveTab('equipamentos')}
            className={`flex flex-col items-center justify-center gap-1 transition-all focus:outline-none ${
              activeTab === 'equipamentos'
                ? 'text-primary'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <Package className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Acervo</span>
          </button>

          {/* TAB 7: CONFIGURAÇÕES */}
          <button
            onClick={() => setActiveTab('configuracoes')}
            className={`flex flex-col items-center justify-center gap-1 transition-all focus:outline-none ${
              activeTab === 'configuracoes'
                ? 'text-primary'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[8px] font-bold tracking-tight">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
