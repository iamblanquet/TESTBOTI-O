import React, { useState, useEffect } from 'react';
import { Lock, User, Shield, Compass, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Bot } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tgUser, setTgUser] = useState(null);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const wa = window.Telegram.WebApp;
      wa.ready();
      wa.expand();
      try {
        if (wa.setHeaderColor) wa.setHeaderColor('#064e3b');
        if (wa.setBackgroundColor) wa.setBackgroundColor('#0f172a');
      } catch (e) {}

      const user = wa.initDataUnsafe?.user;
      if (user) {
        setTgUser(user);
      }
    }
  }, []);

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

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (user, pass) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.user, data.token);
      } else {
        throw new Error(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-xs select-none antialiased">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 pb-2 border-b border-slate-100">
          <div className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-teal-800 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-700/20 text-white mb-2">
            <Compass className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">AGROK · Acceso al Sistema</h2>
          <p className="text-[11px] text-slate-400">
            {tgUser
              ? `Conectado desde Telegram Mini App como @${tgUser.username || tgUser.first_name}`
              : 'Inicia sesión con tu perfil asignado para entrar a tu módulo operativo.'}
          </p>
        </div>

        {/* Banner de Telegram si se detecta */}
        {tgUser && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-950">
            <Bot className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold block">Telegram Mini App Activa</span>
              <span className="text-slate-500 text-[10px]">Toca tu perfil abajo para ingresar directamente:</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="text-[11px] font-bold">{error}</span>
          </div>
        )}

        {/* Acceso Rápido por Perfil (1-Tap para Telegram y Móvil) */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
            Selecciona tu Perfil de Acceso:
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('operador', 'campo123')}
              className="p-3 bg-emerald-50/80 hover:bg-emerald-100 active:scale-98 border border-emerald-300 rounded-2xl text-left transition shadow-xs"
            >
              <strong className="block text-emerald-950 font-black text-xs">🛠️ CAMPO</strong>
              <span className="text-emerald-700 text-[10px]">Reportes Offline</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('supervisor', 'super123')}
              className="p-3 bg-teal-50/80 hover:bg-teal-100 active:scale-98 border border-teal-300 rounded-2xl text-left transition shadow-xs"
            >
              <strong className="block text-teal-950 font-black text-xs">👷 GERENCIA</strong>
              <span className="text-teal-700 text-[10px]">Tablero 4 Widgets</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('direccion', 'lider123')}
              className="p-3 bg-purple-50/80 hover:bg-purple-100 active:scale-98 border border-purple-300 rounded-2xl text-left transition shadow-xs"
            >
              <strong className="block text-purple-950 font-black text-xs">📊 DIRECCIÓN</strong>
              <span className="text-purple-700 text-[10px]">KPIs de Ciclo</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickDemo('admin', 'admin123')}
              className="p-3 bg-slate-100 hover:bg-slate-200 active:scale-98 border border-slate-300 rounded-2xl text-left transition shadow-xs"
            >
              <strong className="block text-slate-900 font-black text-xs">💻 ADMIN IT</strong>
              <span className="text-slate-600 text-[10px]">Gestión & Bot</span>
            </button>
          </div>
        </div>

        {/* Formulario Manual de Contraseña */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> O ingresa con tu usuario
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
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
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
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-extrabold rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Verificando...' : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
    </div>
  );
}
