import React, { useState } from 'react';
import { Lock, User, Shield, Compass, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-xs select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 pb-2 border-b border-slate-100">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-teal-800 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-700/20 text-white mb-2">
            <Compass className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">AGROK · Acceso al Sistema</h2>
          <p className="text-[11px] text-slate-400">
            Inicia sesión con tu perfil asignado para acceder a tus módulos de campo o supervisión.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="text-[11px] font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> Usuario
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej: operador / supervisor / direccion"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-xs"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Verificando...' : 'INGRESAR A AGROK'}
          </button>
        </form>

        {/* Acceso Rápido por Perfiles */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
            Perfiles de prueba disponibles:
          </span>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button
              type="button"
              onClick={() => handleQuickDemo('operador', 'campo123')}
              className="p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition"
            >
              <strong className="block text-slate-900 font-bold">🛠️ Operador</strong>
              <span className="text-slate-500">Solo Reportes Campo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('supervisor', 'super123')}
              className="p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition"
            >
              <strong className="block text-slate-900 font-bold">👷 Supervisor</strong>
              <span className="text-slate-500">Tablero 4 Widgets</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('direccion', 'lider123')}
              className="p-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition"
            >
              <strong className="block text-slate-900 font-bold">📊 Dirección</strong>
              <span className="text-slate-500">Dashboard & KPIs</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('admin', 'admin123')}
              className="p-2 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded-xl text-left transition"
            >
              <strong className="block text-slate-900 font-bold">💻 Admin / IT</strong>
              <span className="text-slate-500">Control Total</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
