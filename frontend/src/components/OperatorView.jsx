import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Clock,
  HardDrive,
  Send,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  User,
  Layers,
  ChevronRight,
  ListFilter,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  queueOfflineReport,
  getOperatorName,
  saveOperatorName,
  formatLocalTimestamp
} from '../services/storage';

export default function OperatorView({
  projects,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onOpenQueue,
  pendingCount,
  onReportSaved,
  onManualSync,
  isSyncing
}) {
  // Form State
  const [operatorName, setOperatorName] = useState(getOperatorName());
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [advancePercent, setAdvancePercent] = useState(10);
  const [notes, setNotes] = useState('');
  const [currentLiveTime, setCurrentLiveTime] = useState(formatLocalTimestamp());
  const [notification, setNotification] = useState(null);

  // Live timer for exact field clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLiveTime(formatLocalTimestamp());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-select first project if available
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects.find((p) => String(p.id) === String(selectedProjectId));
  const availableTasks = selectedProject?.tasks || [];

  // Update selected task when project changes
  useEffect(() => {
    if (availableTasks.length > 0) {
      setSelectedTaskId(String(availableTasks[0].id));
    } else {
      setSelectedTaskId('');
    }
  }, [selectedProjectId, projects]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedProjectId) {
      alert('Por favor selecciona un proyecto.');
      return;
    }

    if (!operatorName.trim()) {
      alert('Por favor escribe tu nombre de operador.');
      return;
    }

    const taskObj = availableTasks.find((t) => String(t.id) === String(selectedTaskId));

    const queuedReport = queueOfflineReport({
      projectId: selectedProjectId,
      projectName: selectedProject ? `[${selectedProject.code}] ${selectedProject.name}` : 'Proyecto',
      taskId: selectedTaskId || null,
      taskName: taskObj ? taskObj.name : 'General',
      operatorName: operatorName.trim(),
      advancePercent: Number(advancePercent),
      notes: notes.trim()
    });

    // Guardar nombre
    saveOperatorName(operatorName);

    // Feedback visual
    setNotification({
      type: 'success',
      title: '¡Reporte Guardado en Dispositivo (Offline)!',
      time: queuedReport.offline_created_at,
      msg: `Avance de +${advancePercent}% registrado con fecha/hora inmutable.`
    });

    // Reset campos
    setNotes('');

    if (onReportSaved) {
      onReportSaved(queuedReport);
    }

    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const advanceOptions = [5, 10, 15, 25, 50, 100];

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* Barra de Estado de Conexión & Botón de Modo Offline */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                isOnline ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-xs">
              {isOnline ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> En Línea (Sincronización activa)
                </span>
              ) : (
                <span className="text-rose-700 flex items-center gap-1">
                  <WifiOff className="w-3.5 h-3.5" /> Modo Sin Señal / Offline
                </span>
              )}
            </span>
          </div>

          {/* Switch de Simulación Offline */}
          <button
            type="button"
            onClick={onToggleSimulatedOffline}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
              isSimulatedOffline
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
            title="Simular pérdida de cobertura para pruebas"
          >
            {isSimulatedOffline ? '🔴 Forzado Offline' : '📡 Red Normal'}
          </button>
        </div>

        {/* Acceso a bandeja de salida */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onOpenQueue}
            className="text-sky-700 font-semibold flex items-center gap-1.5 hover:underline"
          >
            <HardDrive className="w-3.5 h-3.5" />
            Bandeja Local:
            <span
              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                pendingCount > 0
                  ? 'bg-amber-500 text-white animate-bounce'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {pendingCount} pendientes
            </span>
          </button>

          {pendingCount > 0 && isOnline && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Subiendo...' : 'Sincronizar Ya'}
            </button>
          )}
        </div>
      </div>

      {/* Notificación de guardado */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 shadow-md animate-slideDown flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-emerald-950">{notification.title}</p>
            <p className="text-[11px] text-emerald-800">{notification.msg}</p>
            <p className="font-mono text-[10px] text-emerald-700 font-bold mt-1">
              ⏱️ Marca de tiempo guardada: {notification.time}
            </p>
          </div>
        </div>
      )}

      {/* Formulario Principal de Reporte de Operador */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 shadow-md border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600" />
              Nuevo Reporte de Avance
            </h2>
            <p className="text-xs text-slate-500">Guardado local inmediato sin requerir internet</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 uppercase">
            Operador
          </span>
        </div>

        {/* Campo: Operador */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            Nombre del Operador
          </label>
          <input
            type="text"
            required
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium transition"
          />
        </div>

        {/* Campo: Selección de Proyecto */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Proyecto Descargado en Local
          </label>
          {projects.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              ⚠️ No hay proyectos en el almacenamiento local. Conéctate a internet una vez para descargarlos.
            </div>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold text-slate-800 transition"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name} ({p.progress_percent || 0}% avance)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Campo: Tarea / Hito */}
        {availableTasks.length > 0 && (
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5 text-slate-500" />
              Actividad / Tarea Específica
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700 transition font-medium"
            >
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Campo: Porcentaje de Avance */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              Porcentaje de Avance a Reportar
            </label>
            <span className="font-extrabold text-base text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
              +{advancePercent}%
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={advancePercent}
            onChange={(e) => setAdvancePercent(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />

          {/* Botones rápidos */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {advanceOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAdvancePercent(opt)}
                className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                  advancePercent === opt
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                +{opt}%
              </button>
            ))}
          </div>
        </div>

        {/* Campo: Observaciones / Notas de campo */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Observaciones / Novedades de Campo
          </label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalles de la labor ejecutada, problemas encontrados, materiales usados..."
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition resize-none"
          />
        </div>

        {/* Visualización de la Hora Real de Registro */}
        <div className="bg-slate-900 text-slate-100 p-3 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                Hora de Registro Inmutable
              </span>
              <span className="font-mono font-bold text-xs text-sky-300">{currentLiveTime}</span>
            </div>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700">
            Offline Timestamp
          </span>
        </div>

        {/* Botón Principal de Envío */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2"
        >
          <HardDrive className="w-4 h-4" />
          GUARDAR REPORTE EN DISPOSITIVO (OFFLINE)
        </button>

        <p className="text-center text-[11px] text-slate-400">
          🔒 El reporte se almacena localmente y se enviará al bot de Telegram tan pronto haya internet.
        </p>
      </form>
    </div>
  );
}
