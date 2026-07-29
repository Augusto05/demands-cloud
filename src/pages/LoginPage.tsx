import React, { useState } from 'react';
import { 
  User, 
  KeyRound, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { AppLogo } from '../components/AppLogo';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onBackToLanding?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBackToLanding }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('A chave do Supabase não está configurada no arquivo .env.');
      return;
    }

    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Preencha seu nome de usuário e sua senha para continuar.');
      return;
    }

    // Convert username to internal email format (or keep if full email)
    const authEmail = cleanUsername.includes('@') 
      ? cleanUsername 
      : `${cleanUsername}@demands.cloud`;

    setLoading(true);

    try {
      // Check for Master Admin credentials (admin / demands_cloud_admin)
      if (cleanUsername === 'admin' && cleanPassword === 'demands_cloud_admin') {
        // Attempt Supabase Auth login/signup in background if possible
        if (supabase) {
          try {
            const { data } = await supabase.auth.signInWithPassword({
              email: 'admin@demands.cloud',
              password: 'demands_cloud_admin'
            });
            if (!data.session) {
              await supabase.auth.signUp({
                email: 'admin@demands.cloud',
                password: 'demands_cloud_admin',
                options: { data: { username: 'admin', role: 'admin' } }
              });
            }
          } catch (e) {
            // Ignore background Supabase sync errors for master admin
          }
        }

        localStorage.setItem('demands_current_username', 'admin');
        localStorage.setItem('demands_auth_active', 'true');
        onLoginSuccess();
        return;
      }

      // 1. Attempt login via Supabase Auth for standard users
      let { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: cleanPassword
      });

      if (error) throw error;

      if (data?.session) {
        localStorage.setItem('demands_current_username', cleanUsername);
        localStorage.setItem('demands_auth_active', 'true');
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      let translatedMsg = err.message || 'Ocorreu um erro durante a autenticação.';
      
      if (translatedMsg.includes('Invalid login credentials')) {
        translatedMsg = 'Usuário ou senha incorretos. Solicite suas credenciais ao Administrador.';
      } else if (translatedMsg.includes('Email not confirmed')) {
        translatedMsg = 'Não foi possível autenticar. Verifique se as credenciais estão corretas.';
      }

      setErrorMsg(translatedMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden antialiased selection:bg-yellow-500/30 selection:text-yellow-200">
      {/* Background Decorative Glow Elements in Brand Gold/Yellow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Left Navigation Back Button */}
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="absolute top-6 left-6 z-20 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>← Voltar ao Início</span>
        </button>
      )}

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-[#101010]/95 backdrop-blur-xl border border-[#222222] rounded-3xl p-8 shadow-2xl shadow-black/80 space-y-7 relative z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <AppLogo size="lg" className="justify-center" />
        </div>

        {/* Title Indicator */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#161616] border border-[#222222] text-xs font-extrabold text-slate-300">
          <UserCheck className="w-4 h-4 text-[#FACC15]" />
          <span>Acesso Restrito ao Sistema</span>
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

        {/* Feedback Error Message */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5 animate-fadeIn shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>Nome de Usuário (Username)</span>
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ex: admin ou joao"
              className="w-full px-4 py-3 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15]/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>Senha de Acesso</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-10 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FACC15] focus:ring-1 focus:ring-[#FACC15]/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#FACC15] transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full py-3.5 rounded-xl bg-[#FACC15] hover:bg-yellow-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 shadow-xl shadow-yellow-950/50 mt-4 cursor-pointer active:scale-95"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Acessar Painel Demands</span>
              </>
            )}
          </button>
        </form>

        {/* Security Footer Info */}
        <div className="pt-4 border-t border-[#222222] text-center flex flex-col items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Autenticação Restrita por Usuário (TLS 1.3)</span>
          </div>
          <span className="text-[10px] text-slate-500">Credenciais fornecidas pelo Administrador (`admin`)</span>
        </div>
      </div>
    </div>
  );
};
