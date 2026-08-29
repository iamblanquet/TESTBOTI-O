import React, { useState } from 'react';
import { X, Send, Bot, CheckCircle2, AlertTriangle, Key, Users, RefreshCw } from 'lucide-react';
import { saveBotTokenApi } from '../services/api';

export default function TelegramConfigModal({
  isOpen,
  onClose,
  botStatus,
  onRefreshStatus
}) {
  if (!isOpen) return null;

  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Por favor ingresa un token válido');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await saveBotTokenApi(tokenInput.trim());
      setMessage(`✅ Bot conectado exitosamente como @${res.botInfo?.username || 'Bot'}`);
      setTokenInput('');
      onRefreshStatus();
    } catch (err) {
      setError(err.message || 'Error al conectar el bot de Telegram');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = botStatus?.hasActiveBot;
  const botInfo = botStatus?.botInfo;
  const subscribers = botStatus?.subscribers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Configuración de Telegram Bot</h3>
              <p className="text-xs text-sky-100">Integración en tiempo real con Supervisores y Líderes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-sky-100 hover:text-white rounded-lg hover:bg-sky-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs">
          {/* Estado de conexión actual */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-bold text-xs">
                  {isConnected
                    ? `Bot Activo: @${botInfo?.username || 'Conectado'}`
                    : 'Bot de Telegram Desconectado'}
                </p>
                <p className="text-[11px] opacity-80">
                  {isConnected
                    ? `Nombre: ${botInfo?.first_name || 'Bot'} • ${subscribers.length} chat(s) suscritos`
                    : 'Ingresa tu Token de Telegram abajo para activar las notificaciones'}
                </p>
              </div>
            </div>

            <button
              onClick={onRefreshStatus}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-lg transition"
              title="Actualizar estado"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Formulario de Token */}
          <form onSubmit={handleSave} className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-600" />
                Telegram Bot Token (BotFather)
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Ej: 7123456789:AAHKl9-..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Obtenido creando un bot en Telegram con @BotFather
              </span>
            </div>

            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                ❌ {error}
              </div>
            )}

            {message && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Conectando con Telegram...' : 'Guardar y Activar Bot'}
            </button>
          </form>

          {/* Guía rápida de uso */}
          <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-200/60 space-y-2">
            <h4 className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
              📱 Pasos para conectar a Supervisores y Líderes:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-sky-950 font-medium">
              <li>
                Abre Telegram y busca tu bot creado en @BotFather.
              </li>
              <li>
                Presiona <span className="font-mono bg-sky-100 px-1 rounded font-bold">/start</span>.
              </li>
              <li>
                Escribe <span className="font-mono bg-sky-100 px-1 rounded font-bold">/rol supervisor</span> para recibir alertas de reportes con la hora de captura offline.
              </li>
              <li>
                Escribe <span className="font-mono bg-sky-100 px-1 rounded font-bold">/rol lider</span> para consultar avances con <span className="font-mono bg-sky-100 px-1 rounded font-bold">/proyectos</span> o <span className="font-mono bg-sky-100 px-1 rounded font-bold">/avance [COD]</span>.
              </li>
            </ol>
          </div>

          {/* Suscriptores activos */}
          {subscribers.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                Usuarios de Telegram Registrados ({subscribers.length}):
              </h4>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {subscribers.map((sub, idx) => (
                  <div key={idx} className="p-2 bg-slate-100 rounded-lg flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">
                        {sub.first_name || sub.username || 'Usuario'}
                      </span>
                      {sub.username && <span className="text-slate-400">(@{sub.username})</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sub.role === 'supervisor' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {sub.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
