import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  KeyRound, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('A chave do Supabase não está configurada no arquivo .env.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Preencha seu e-mail e sua senha para continuar.');
      return;
    }

    if (activeTab === 'register') {
      if (password.length < 6) {
        setErrorMsg('A senha precisa ter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem.');
        return;
      }
    }

    setLoading(true);

    try {
      if (activeTab === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg('Conta criada com sucesso! Redirecionando...');
          setTimeout(() => {
            onLoginSuccess();
          }, 1000);
        } else {
          setSuccessMsg('Conta cadastrada com sucesso! Verifique seu e-mail para confirmar ou faça login.');
          setActiveTab('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (data.session) {
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      let translatedMsg = err.message || 'Ocorreu um erro durante a autenticação.';
      
      if (translatedMsg.includes('Invalid login credentials')) {
        translatedMsg = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (translatedMsg.includes('User already registered')) {
        translatedMsg = 'Este e-mail já está cadastrado. Tente fazer o login.';
      } else if (translatedMsg.includes('Email not confirmed')) {
        translatedMsg = 'E-mail ainda não confirmado. Por favor, verifique sua caixa de entrada.';
      }

      setErrorMsg(translatedMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 left-10 w-[350px] h-[350px] bg-amber-400/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-[#101010]/90 backdrop-blur-xl border border-[#222222] rounded-3xl p-8 shadow-2xl shadow-black/80 space-y-7 relative z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#161616] border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-xl shadow-amber-950/40 transform hover:scale-105 transition-transform duration-300">
            <svg className="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M8.5 12.5L11 15L15.5 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wider flex items-center justify-center gap-2">
              DEMANDS <span className="text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">CLOUD</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Painel Corporativo de Gestão de Escritórios & Operações
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 p-1 bg-[#161616] rounded-2xl border border-[#222222]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Conta</span>
          </button>
        </div>

        {/* Supabase Not Configured Notice */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4.5 h-4.5 text-amber-400 flex-shrink-0" />
              <span>Supabase Não Configurado</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Adicione suas variáveis de ambiente no arquivo <code>.env</code> para habilitar o login:
            </p>
            <div className="bg-black/50 p-2.5 rounded-xl text-[10px] font-mono text-slate-300 space-y-1 border border-amber-500/20 select-all">
              <div>VITE_SUPABASE_URL=https://seu-projeto.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=sua-chave-anon</div>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>E-mail Corporativo</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu.email@demands.com"
              className="w-full px-4 py-3 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Senha</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-10 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors p-1"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {activeTab === 'register' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Confirmar Senha</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 mt-4 cursor-pointer active:scale-95"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : activeTab === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Criar Conta no Supabase</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Acessar Painel Demands</span>
              </>
            )}
          </button>
        </form>

        {/* Security Footer Info */}
        <div className="pt-4 border-t border-[#222222] text-center flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Autenticação Segura via Supabase Auth (TLS 1.3)</span>
        </div>
      </div>
    </div>
  );
};
