import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthModalProps {
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg('O Supabase ainda não foi configurado no arquivo .env.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        setSuccessMsg('Conta criada com sucesso! Você já pode fazer login.');
        setIsRegistering(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101010] border border-[#222222] rounded-3xl w-full max-w-md p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-950/40">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-white tracking-wide pt-1">
            Demands Cloud
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {isRegistering ? 'Crie sua conta para acessar seu ambiente' : 'Entre com seu e-mail para acessar seus escritórios'}
          </p>
        </div>

        {/* Supabase Not Configured Notice */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Configuração Pendente (.env)</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Cole sua <b>VITE_SUPABASE_URL</b> e <b>VITE_SUPABASE_ANON_KEY</b> no arquivo <code>.env</code> para ativar a autenticação na nuvem.
            </p>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>E-mail</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full px-4 py-3 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Senha</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 mt-2 cursor-pointer active:scale-95"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Criar Nova Conta</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="pt-2 text-center border-t border-[#222222]">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-xs text-slate-400 hover:text-amber-400 font-bold transition-colors"
          >
            {isRegistering 
              ? 'Já tem uma conta? Clique para entrar' 
              : 'Ainda não tem conta? Cadastre-se gratuitamente'}
          </button>
        </div>
      </div>
    </div>
  );
};
