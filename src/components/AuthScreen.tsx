import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Shield, Info, Database } from 'lucide-react';
import { 
  getFirebaseAuth, 
  googleAuthProvider, 
  signInWithPopup, 
  hasRealFirebaseConfig,
  getFirebaseDb,
  doc,
  setDoc,
  getDoc,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface AuthScreenProps {
  onAuthSuccess: (
    email: string, 
    photoURL: string | null, 
    userId?: string, 
    nome?: string, 
    telefone?: string,
    nivelAcesso?: string
  ) => void;
  companyConfig?: {
    nomeFantasia: string;
    logo: string;
  };
}

export default function AuthScreen({ onAuthSuccess, companyConfig }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Checks if the user has added a custom firebase config
  const isFirebaseBound = hasRealFirebaseConfig();

  // Dynamic formatting phone number mask (xx) xxxxx-xxxx
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const auth = getFirebaseAuth();

    if (auth) {
      try {
        let userCredential;
        if (isSignUp) {
          // Perform validations before creating account
          if (!nome.trim()) {
            setErrorMsg('Por favor, digite seu nome completo.');
            setIsLoading(false);
            return;
          }
          if (telefone && telefone.length < 14) {
            setErrorMsg('Por favor, informe um telefone válido no formato (xx) xxxxx-xxxx.');
            setIsLoading(false);
            return;
          }

          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Write user document to Firestore
          const db = getFirebaseDb();
          if (db && userCredential.user) {
            const userDocRef = doc(db, 'usuarios', userCredential.user.uid);
            try {
              await setDoc(userDocRef, {
                avatar: userCredential.user.photoURL || "https://cdn-icons-png.freepik.com/512/10100/10100139.png",
                nome: nome.trim(),
                telefone: telefone || "",
                email: userCredential.user.email || email,
                termoUso: false,
                nivelAcesso: "Equipe"
              });
            } catch (fsErr) {
              handleFirestoreError(fsErr, OperationType.WRITE, `usuarios/${userCredential.user.uid}`);
            }
          }
        } else {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        }
        
        if (userCredential && userCredential.user) {
          let finalNome = nome.trim();
          let finalTelefone = telefone;
          let finalAvatar = userCredential.user.photoURL || "https://cdn-icons-png.freepik.com/512/10100/10100139.png";
          let finalNivelAcesso = "Equipe";
          
          if (!isSignUp) {
            const db = getFirebaseDb();
            if (db) {
              try {
                const snap = await getDoc(doc(db, 'usuarios', userCredential.user.uid));
                if (snap.exists()) {
                  const data = snap.data();
                  finalNome = data.nome || finalNome;
                  finalTelefone = data.telefone || finalTelefone;
                  finalAvatar = data.avatar || finalAvatar;
                  finalNivelAcesso = data.nivelAcesso || "Equipe";
                }
              } catch (e) {}
            }
          }

          onAuthSuccess(
            userCredential.user.email || email,
            finalAvatar,
            userCredential.user.uid,
            finalNome || userCredential.user.email?.split('@')[0] || "Operador Arthur",
            finalTelefone,
            finalNivelAcesso
          );
        }
      } catch (err: any) {
        console.error("Firebase auth error:", err);
        setErrorMsg(translateAuthError(err.code || err.message));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Graceful local simulated login for prompt testing without crash
      setTimeout(() => {
        setIsLoading(false);
        if (isSignUp && !nome.trim()) {
          setErrorMsg('Por favor, informe seu nome completo.');
          return;
        }
        if (password.length < 6) {
          setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
          return;
        }
        onAuthSuccess(
          email, 
          "https://cdn-icons-png.freepik.com/512/10100/10100139.png", 
          "sandbox_user_id", 
          nome || "Operador Arthur", 
          telefone,
          "Equipe"
        );
      }, 800);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    const auth = getFirebaseAuth();

    if (auth) {
      setIsLoading(true);
      try {
        const result = await signInWithPopup(auth, googleAuthProvider);
        if (result.user) {
          let userNome = result.user.displayName || result.user.email?.split('@')[0] || "Operador Google";
          let userTelefone = "";
          let userAvatar = result.user.photoURL || "https://cdn-icons-png.freepik.com/512/10100/10100139.png";

          let userNivelAcesso = "Equipe";

          // Check if user document already exists in Firestore 'usuarios' collection
          const db = getFirebaseDb();
          if (db) {
            const userDocRef = doc(db, 'usuarios', result.user.uid);
            try {
              const userSnap = await getDoc(userDocRef);
              if (!userSnap.exists()) {
                // Instantly create the user document in the database
                await setDoc(userDocRef, {
                  avatar: userAvatar,
                  nome: userNome,
                  telefone: "",
                  email: result.user.email || "",
                  termoUso: false,
                  nivelAcesso: "Equipe"
                });
              } else {
                const data = userSnap.data();
                userNome = data.nome || userNome;
                userTelefone = data.telefone || userTelefone;
                userAvatar = data.avatar || userAvatar;
                userNivelAcesso = data.nivelAcesso || "Equipe";
              }
            } catch (fsErr) {
              handleFirestoreError(fsErr, OperationType.WRITE, `usuarios/${result.user.uid}`);
            }
          }

          onAuthSuccess(
            result.user.email || 'Operador Google',
            userAvatar,
            result.user.uid,
            userNome,
            userTelefone,
            userNivelAcesso
          );
        }
      } catch (err: any) {
        console.error("Google sign in error:", err);
        setErrorMsg(translateAuthError(err.code || err.message));
      } finally {
        setIsLoading(false);
      }
    } else {
      // Simulator quick login
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onAuthSuccess(
          'arm.someluz@gmail.com',
          'https://cdn-icons-png.freepik.com/512/10100/10100139.png',
          'sandbox_user_id',
          'Arthur Operator',
          '(11) 98888-7777',
          'Equipe'
        );
      }, 500);
    }
  };

  const translateAuthError = (code: string) => {
    switch (code) {
      case 'auth/invalid-email': return 'O endereço de e-mail não é válido.';
      case 'auth/user-disabled': return 'Esta conta foi desativada.';
      case 'auth/user-not-found': return 'Nenhum usuário encontrado com este e-mail.';
      case 'auth/wrong-password': return 'Senha incorreta. Tente novamente.';
      case 'auth/email-already-in-use': return 'Este e-mail já está sendo utilizado por outra conta.';
      case 'auth/weak-password': return 'A senha deve conter pelo menos 6 caracteres.';
      default: return `Erro na autenticação: ${code}`;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-800/80 dark:bg-zinc-900"
      >
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <img 
            src={companyConfig?.logo || "https://res.cloudinary.com/dnatvwcxy/image/upload/v1779424576/logo_arthur_luz_e_som_lbrpth.jpg"} 
            alt={companyConfig?.nomeFantasia || "Arthur Luz e Som"} 
            referrerPolicy="no-referrer"
            className="mx-auto h-20 w-auto rounded-xl object-contain shadow-sm border border-gray-150 dark:border-zinc-800 bg-white"
          />
          <h1 className="text-xl font-black tracking-tight text-gray-950 dark:text-white uppercase">
            {companyConfig?.nomeFantasia || "Arthur Luz e Som"}
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Painel Geral de Gestão de Eventos
          </p>
        </div>

        {/* Error reporting */}
        {errorMsg && (
          <div className="mt-3 rounded-lg bg-red-500/10 p-2 text-[11px] text-red-500 text-center border border-red-500/20 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleAuthentication} className="mt-5 space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required={isSignUp}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu Nome Completo"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1">
                  Telefone (opcional no cadastro)
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(xx) xxxxx-xxxx"
                  maxLength={15}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-primary"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1">
              E-mail corporativo
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu-nome@gmail.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1">
              Senha (mínimo 6 dígitos)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-primary dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-primary"
            />
          </div>

          {/* Sólido Verde Primary Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="active-click flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-gray-900 shadow-md transition-all hover:bg-primary-dark disabled:opacity-50"
          >
            {isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span>{isLoading ? 'Autenticando...' : isSignUp ? 'Criar Conta' : 'Entrar'}</span>
          </button>
        </form>

        {/* Mode Toggle Switch */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            {isSignUp ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Solicitar Cadastro'}
          </button>
        </div>

        {/* Separator */}
        <div className="my-5 flex items-center justify-between gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800"></div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ou</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800"></div>
        </div>

        {/* Google Authentication - Outline visual */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="active-click flex w-full h-11 items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-xs transition-all hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {/* Official Google Vector logo */}
          <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Entrar com o Google</span>
        </button>
      </motion.div>
    </div>
  );
}
