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
  Compass,
  Tractor,
  Database,
  Users,
  LogOut,
  UserCheck
} from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import OperatorView from './components/OperatorView';
import SupervisorView from './components/SupervisorView';
import LeaderView from './components/LeaderView';
import MaquinariaActivosView from './components/MaquinariaActivosView';
import CatalogosDbView from './components/CatalogosDbView';
import UsuariosAdminView from './components/UsuariosAdminView';
import OfflineQueueModal from './components/OfflineQueueModal';
import TelegramConfigModal from './components/TelegramConfigModal';

import {
  getLocalObras,
  getLocalPredios,
  getOfflineReportsQueue,
  getPendingReports,
  markAllAsSynced,
  deleteReportFromQueue,
  clearSyncedReportsFromQueue,
  getOfflineSimulationMode,
  setOfflineSimulationMode,
  saveOperatorName
} from './services/storage';

import {
  fetchObrasOnline,
  fetchTableroHoy,
  syncAgrokReportsBatch,
  fetchBotStatusApi
} from './services/api';

const AUTH_STORAGE_KEY = 'agrok_auth_user_session';

export default function App() {
  // 1. Estado de Sesión y Usuario Autenticado
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('campo');

  // Telegram Context
  const [tgUser, setTgUser] = useState(null);

  // Red & Sincronización
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(getOfflineSimulationMode());
  const isEffectiveOnline = isBrowserOnline && !isSimulatedOffline;

  const [obras, setObras] = useState([]);
  const [predios, setPredios] = useState([]);
  const [tableroData, setTableroData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  const [botStatus, setBotStatus] = useState(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);

  // Inicialización Telegram WebApp
  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      const wa = window.Telegram.WebApp;
      wa.ready();
      wa.expand();

      const user = wa.initDataUnsafe?.user;
      if (user) {
        setTgUser(user);
      }
    }
  }, []);

  // Ajustar tab inicial según rol
  useEffect(() => {
    if (currentUser) {
      if (currentUser.rol === 'direccion') setActiveTab('direccion');
      else if (currentUser.rol === 'supervisor') setActiveTab('tablero');
      else setActiveTab('campo');
    }
  }, [currentUser]);

  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    saveOperatorName(user.nombre);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Cargar datos
  const refreshData = useCallback(async () => {
    const localQueue = getOfflineReportsQueue();
    setQueue(localQueue);

    if (isEffectiveOnline) {
      try {
        const obrasRes = await fetchObrasOnline();
        if (obrasRes.obras) {
          setObras(obrasRes.obras);
          setPredios(obrasRes.predios || []);
        }

        const tabRes = await fetchTableroHoy();
        if (tabRes.success) {
          setTableroData(tabRes);
        }
      } catch (e) {
        setObras(getLocalObras());
        setPredios(getLocalPredios());
      }
    } else {
      setObras(getLocalObras());
      setPredios(getLocalPredios());
    }
  }, [isEffectiveOnline]);

  const loadBotStatus = useCallback(async () => {
    try {
      const res = await fetchBotStatusApi();
      if (res.success) setBotStatus(res.bot);
    } catch (e) {}
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    refreshData();
    loadBotStatus();
  }, [refreshData, loadBotStatus]);

  // Sincronización automática de reportes offline
  const triggerSync = useCallback(async () => {
    if (!isEffectiveOnline || isSyncing) return;

    const pending = getPendingReports();
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      const res = await syncAgrokReportsBatch(pending);
      if (res.success && res.results) {
        markAllAsSynced(res.results);
        setQueue(getOfflineReportsQueue());

        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        setSyncToast({
          type: 'success',
          title: '¡Sincronización Exitosa!',
          msg: `${res.synced_count} reporte(s) guardados en la base central.`
        });

        refreshData();
      }
    } catch (err) {
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
      setTimeout(() => setSyncToast(null), 5000);
    }
  }, [isEffectiveOnline, isSyncing, refreshData]);

  useEffect(() => {
    if (isEffectiveOnline) {
      const pending = getPendingReports();
      if (pending.length > 0) triggerSync();
    }
  }, [isEffectiveOnline, triggerSync]);

  const handleToggleSimulatedOffline = () => {
    const next = !isSimulatedOffline;
    setIsSimulatedOffline(next);
    setOfflineSimulationMode(next);
  };

  const handleReportSaved = () => {
    setQueue(getOfflineReportsQueue());
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    if (isEffectiveOnline) {
      setTimeout(() => triggerSync(), 800);
    }
  };

  // Si no hay usuario logueado, mostrar pantalla de Login con Roles y Contraseñas
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const userRole = currentUser.rol || 'campo';
  const pendingCount = queue.filter(r => r.status === 'PENDING_SYNC' || r.status === 'ERROR').length;

  // REGLAS ESTRICTAS DE ACCESO A PANTALLAS POR ROL:
  const canAccessCampo = userRole === 'campo' || userRole === 'supervisor' || userRole === 'it';
  const canAccessTablero = userRole === 'supervisor' || userRole === 'direccion' || userRole === 'it';
  const canAccessMaquinaria = userRole === 'supervisor' || userRole === 'direccion' || userRole === 'it';
  const canAccessCatalogos = userRole === 'supervisor' || userRole === 'direccion' || userRole === 'it';
  const canAccessDireccion = userRole === 'direccion' || userRole === 'it';
  const canAccessUsuarios = userRole === 'it' || userRole === 'supervisor';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased select-none font-sans text-slate-900">
      {/* Header Principal */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center shadow-md">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm leading-tight tracking-tight">AGROK</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {userRole}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                👤 {currentUser.nombre} (@{currentUser.username})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {canAccessUsuarios && (
              <button
                onClick={() => setIsBotModalOpen(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                title="Configuración Bot Telegram"
              >
                <Bot className="w-4 h-4 text-emerald-400" />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="px-2 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-xl text-[11px] font-bold flex items-center gap-1 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Barra de Navegación Segmentada según Permisos del Rol */}
        <div className="bg-slate-950/90 border-t border-slate-800 overflow-x-auto no-scrollbar">
          <div className="max-w-4xl mx-auto px-2 flex min-w-max">
            {/* Pantalla 1: Campo (Visible para Campo, Supervisor e IT) */}
            {canAccessCampo && (
              <button
                onClick={() => setActiveTab('campo')}
                className={`py-2 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'campo'
                    ? 'border-emerald-500 text-emerald-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Reporte Campo</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {/* Pantalla 2: Tablero (Visible para Supervisor, Dirección e IT) */}
            {canAccessTablero && (
              <button
                onClick={() => setActiveTab('tablero')}
                className={`py-2 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'tablero'
                    ? 'border-teal-500 text-teal-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Tablero Operativo</span>
              </button>
            )}

            {/* Pantalla 3: Maquinaria (Visible para Supervisor, Dirección e IT) */}
            {canAccessMaquinaria && (
              <button
                onClick={() => setActiveTab('maquinaria')}
                className={`py-2 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'maquinaria'
                    ? 'border-amber-500 text-amber-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tractor className="w-3.5 h-3.5" />
                <span>Maquinaria & Activos</span>
              </button>
            )}

            {/* Pantalla 4: Catálogos (Visible para Supervisor, Dirección e IT) */}
            {canAccessCatalogos && (
              <button
                onClick={() => setActiveTab('catalogos')}
                className={`py-2 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'catalogos'
                    ? 'border-sky-500 text-sky-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Base de Datos</span>
              </button>
            )}

            {/* Pantalla 5: Dirección (EXCLUSIVO para Dirección e IT - El Operador NO lo ve) */}
            {canAccessDireccion && (
              <button
                onClick={() => setActiveTab('direccion')}
                className={`py-2 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'direccion'
                    ? 'border-purple-500 text-purple-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Dirección & KPIs</span>
              </button>
            )}

            {/* Pantalla 6: Usuarios & Roles (Visible para IT y Supervisor) */}
            {canAccessUsuarios && (
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`py-2 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition ${
                  activeTab === 'usuarios'
                    ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Usuarios & Roles</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sync Toast Notification */}
      {syncToast && (
        <div className="fixed top-16 right-3 left-3 sm:left-auto sm:w-96 z-50 animate-bounce">
          <div className={`p-3.5 rounded-2xl shadow-xl border flex items-start gap-2.5 ${
            syncToast.type === 'success' ? 'bg-slate-900 text-white border-emerald-500' : 'bg-rose-900 text-white border-rose-500'
          }`}>
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

      {/* Contenido Principal con Guardias de Seguridad */}
      <main className="max-w-4xl mx-auto px-3 py-4 flex-1 w-full">
        {activeTab === 'campo' && canAccessCampo && (
          <OperatorView
            obras={obras}
            predios={predios}
            isOnline={isEffectiveOnline}
            isSimulatedOffline={isSimulatedOffline}
            onToggleSimulatedOffline={handleToggleSimulatedOffline}
            onOpenQueue={() => setIsQueueModalOpen(true)}
            pendingCount={pendingCount}
            onReportSaved={handleReportSaved}
            onManualSync={triggerSync}
            isSyncing={isSyncing}
            tgUser={tgUser || { username: currentUser.username, first_name: currentUser.nombre }}
          />
        )}

        {activeTab === 'tablero' && canAccessTablero && (
          <SupervisorView
            tableroData={tableroData}
            onRefreshData={refreshData}
            onOpenBotModal={() => setIsBotModalOpen(true)}
            botStatus={botStatus}
          />
        )}

        {activeTab === 'maquinaria' && canAccessMaquinaria && (
          <MaquinariaActivosView
            maquinaria={tableroData?.maquinaria || []}
            activos={tableroData?.activos || []}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'catalogos' && canAccessCatalogos && (
          <CatalogosDbView
            obras={obras}
            predios={predios}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'direccion' && canAccessDireccion && (
          <LeaderView
            tableroData={tableroData}
            botStatus={botStatus}
            onOpenBotModal={() => setIsBotModalOpen(true)}
          />
        )}

        {activeTab === 'usuarios' && canAccessUsuarios && (
          <UsuariosAdminView
            currentUser={currentUser}
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
