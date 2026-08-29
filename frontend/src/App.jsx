import React, { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Shield,
  BarChart2,
  Bot,
  Wifi,
  WifiOff,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import OperatorView from './components/OperatorView';
import SupervisorView from './components/SupervisorView';
import LeaderView from './components/LeaderView';
import OfflineQueueModal from './components/OfflineQueueModal';
import TelegramConfigModal from './components/TelegramConfigModal';

import {
  getLocalProjects,
  getOfflineReportsQueue,
  getPendingReports,
  markAllAsSynced,
  deleteReportFromQueue,
  clearSyncedReportsFromQueue,
  getOfflineSimulationMode,
  setOfflineSimulationMode,
  formatLocalTimestamp,
  saveOperatorName
} from './services/storage';

import {
  fetchProjectsOnline,
  syncReportsBatch,
  fetchDashboardStatsApi,
  fetchBotStatusApi
} from './services/api';

export default function App() {
  // Navigation role: 'operator' | 'supervisor' | 'leader'
  const [activeRole, setActiveRole] = useState('operator');

  // Telegram WebApp Context
  const [tgUser, setTgUser] = useState(null);
  const [isInsideTelegram, setIsInsideTelegram] = useState(false);

  // Network & Sync State
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(getOfflineSimulationMode());
  const isEffectiveOnline = isBrowserOnline && !isSimulatedOffline;

  const [projects, setProjects] = useState([]);
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  // Stats & Bot Status
  const [stats, setStats] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [botStatus, setBotStatus] = useState(null);

  // Modals
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);

  // 0. Inicialización de Telegram WebApp
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const wa = window.Telegram.WebApp;
      wa.ready();
      wa.expand();
      setIsInsideTelegram(true);

      const user = wa.initDataUnsafe?.user;
      if (user) {
        setTgUser(user);
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
        if (fullName) {
          saveOperatorName(fullName);
        }
      }
    }
  }, []);

  // 1. Cargar datos iniciales
  const refreshProjectsAndQueue = useCallback(async () => {
    const localQueue = getOfflineReportsQueue();
    setQueue(localQueue);

    if (isEffectiveOnline) {
      try {
        const projRes = await fetchProjectsOnline();
        if (projRes.projects) {
          setProjects(projRes.projects);
        }
        const statsRes = await fetchDashboardStatsApi();
        if (statsRes.success) {
          setStats(statsRes.stats);
          setRecentReports(statsRes.recentReports || []);
        }
      } catch (e) {
        console.warn('Error cargando online:', e);
        setProjects(getLocalProjects());
      }
    } else {
      setProjects(getLocalProjects());
    }
  }, [isEffectiveOnline]);

  const loadBotStatus = useCallback(async () => {
    try {
      const res = await fetchBotStatusApi();
      if (res.success) {
        setBotStatus(res.bot);
      }
    } catch (e) {
      // Ignorar si offline
    }
  }, []);

  // 2. Escuchar cambios de conectividad de red real
  useEffect(() => {
    const handleOnline = () => {
      setIsBrowserOnline(true);
      console.log('📡 Red reestablecida: ONLINE');
    };
    const handleOffline = () => {
      setIsBrowserOnline(false);
      console.log('📡 Red perdida: OFFLINE');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Efecto inicial
  useEffect(() => {
    refreshProjectsAndQueue();
    loadBotStatus();
  }, [refreshProjectsAndQueue, loadBotStatus]);

  // 4. Auto-sincronización cuando se recupera la conexión
  const triggerSync = useCallback(async () => {
    if (!isEffectiveOnline || isSyncing) return;

    const pending = getPendingReports();
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      const res = await syncReportsBatch(pending);
      if (res.success && res.results) {
        markAllAsSynced(res.results);
        setQueue(getOfflineReportsQueue());
        
        // Haptic feedback en Telegram
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        // Feedback
        setSyncToast({
          type: 'success',
          title: '¡Sincronización Exitosa!',
          msg: `${res.synced_count} reporte(s) offline enviados a la base de datos y al Bot de Telegram.`
        });

        // Recargar datos
        refreshProjectsAndQueue();
      }
    } catch (err) {
      console.error('Error durante la sincronización:', err);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
      setSyncToast({
        type: 'error',
        title: 'Error de Sincronización',
        msg: err.message || 'No se pudo contactar al servidor.'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 6000);
    }
  }, [isEffectiveOnline, isSyncing, refreshProjectsAndQueue]);

  // Auto-disparar sincronización al cambiar a online o cuando hay nuevos pendientes
  useEffect(() => {
    if (isEffectiveOnline) {
      const pending = getPendingReports();
      if (pending.length > 0) {
        triggerSync();
      }
    }
  }, [isEffectiveOnline, triggerSync]);

  // Manejar toggle de simulación offline
  const handleToggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);
    setOfflineSimulationMode(nextState);
  };

  // Cuando un operador guarda un nuevo reporte
  const handleReportSaved = () => {
    const updatedQueue = getOfflineReportsQueue();
    setQueue(updatedQueue);

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }

    // Si está online, sincronizar inmediatamente en segundo plano
    if (isEffectiveOnline) {
      setTimeout(() => {
        triggerSync();
      }, 800);
    }
  };

  const pendingCount = queue.filter(r => r.status === 'PENDING_SYNC' || r.status === 'ERROR').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm leading-tight tracking-tight">
                  Reportes de Campo
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  MINI APP
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {tgUser ? `Usuario Telegram: @${tgUser.username || tgUser.first_name}` : 'Offline-First + Telegram'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Botón de configuración de Telegram */}
            <button
              onClick={() => setIsBotModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition ${
                botStatus?.hasActiveBot
                  ? 'bg-sky-950/80 border-sky-500 text-sky-300 hover:bg-sky-900'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Configuración de Telegram"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {botStatus?.hasActiveBot ? `@${botStatus?.botInfo?.username || 'Bot'}` : 'Bot'}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Bar de Navegación de Roles */}
        <div className="bg-slate-950/80 border-t border-slate-800">
          <div className="max-w-4xl mx-auto px-2 flex">
            <button
              onClick={() => setActiveRole('operator')}
              className={`flex-1 py-2 px-2 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeRole === 'operator'
                  ? 'border-sky-500 text-sky-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Operador</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveRole('supervisor')}
              className={`flex-1 py-2 px-2 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeRole === 'supervisor'
                  ? 'border-amber-500 text-amber-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Supervisor</span>
            </button>

            <button
              onClick={() => setActiveRole('leader')}
              className={`flex-1 py-2 px-2 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeRole === 'leader'
                  ? 'border-purple-500 text-purple-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Líder</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="fixed top-16 right-3 left-3 sm:left-auto sm:w-96 z-50 animate-bounce">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border flex items-start gap-2.5 ${
              syncToast.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500'
                : 'bg-rose-900 text-white border-rose-500'
            }`}
          >
            {syncToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <h4 className="font-bold text-xs">{syncToast.title}</h4>
              <p className="opacity-90 mt-0.5 text-[11px]">{syncToast.msg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-3 py-4 flex-1 w-full">
        {activeRole === 'operator' && (
          <OperatorView
            projects={projects}
            isOnline={isEffectiveOnline}
            isSimulatedOffline={isSimulatedOffline}
            onToggleSimulatedOffline={handleToggleSimulatedOffline}
            onOpenQueue={() => setIsQueueModalOpen(true)}
            pendingCount={pendingCount}
            onReportSaved={handleReportSaved}
            onManualSync={triggerSync}
            isSyncing={isSyncing}
            tgUser={tgUser}
          />
        )}

        {activeRole === 'supervisor' && (
          <SupervisorView
            projects={projects}
            recentReports={recentReports}
            onRefreshData={refreshProjectsAndQueue}
            onOpenBotModal={() => setIsBotModalOpen(true)}
            botStatus={botStatus}
          />
        )}

        {activeRole === 'leader' && (
          <LeaderView
            projects={projects}
            stats={stats}
            botStatus={botStatus}
            onOpenBotModal={() => setIsBotModalOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <OfflineQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        queue={queue}
        isOnline={isEffectiveOnline}
        isSyncing={isSyncing}
        onSyncAll={triggerSync}
        onClearSynced={() => {
          clearSyncedReportsFromQueue();
          setQueue(getOfflineReportsQueue());
        }}
        onDeleteReport={(uuid) => {
          deleteReportFromQueue(uuid);
          setQueue(getOfflineReportsQueue());
        }}
      />

      <TelegramConfigModal
        isOpen={isBotModalOpen}
        onClose={() => setIsBotModalOpen(false)}
        botStatus={botStatus}
        onRefreshStatus={loadBotStatus}
      />
    </div>
  );
}
