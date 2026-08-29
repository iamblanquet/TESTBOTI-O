import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Layers,
  MapPin,
  Users,
  Tractor,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  CloudRain,
  FolderPlus,
  CheckSquare
} from 'lucide-react';
import {
  queueAgrokOfflineReport,
  getOperatorName,
  saveOperatorName,
  formatLocalTimestamp,
  formatYMD
} from '../services/storage';
import { testParserApi, fetchProyectosEstructura } from '../services/api';

const ACTIVIDADES_CATALOG = [
  'siembra',
  'rastreo_1',
  'rastreo_2',
  'despalme',
  'desmonte',
  'destronque',
  'desenraizado',
  'fumigacion',
  'fertilizacion',
  'monitoreo',
  'posteo',
  'cercado',
  'chapeo',
  'acarreo',
  'mantenimiento_maquinaria',
  'limpieza',
  'obra_civil',
  'otro'
];

const ROLES_CATALOG = [
  { id: 'operador_tractor', label: 'Operador de tractor' },
  { id: 'operador_retro', label: 'Operador de retroexcavadora' },
  { id: 'operador_bulldozer', label: 'Operador de bulldozer' },
  { id: 'tecnico', label: 'Técnico / Ing' },
  { id: 'auxiliar', label: 'Auxiliar / Peón' },
  { id: 'lider_posteo', label: 'Líder de posteo' },
  { id: 'encargada', label: 'Encargada' }
];

export default function OperatorView({
  obras = [],
  predios = [],
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onOpenQueue,
  pendingCount,
  onReportSaved,
  onManualSync,
  isSyncing,
  tgUser
}) {
  const [tabMode, setTabMode] = useState('form'); // 'form' | 'paste'

  // Proyectos -> Hitos -> Tareas
  const [proyectosEstructura, setProyectosEstructura] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedHitoId, setSelectedHitoId] = useState('');
  const [selectedTareaId, setSelectedTareaId] = useState('');

  // Form State
  const defaultName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username
    : getOperatorName();

  const [autorNombre, setAutorNombre] = useState(defaultName);
  const [selectedObraId, setSelectedObraId] = useState('guayeme');
  const [isSinActividad, setIsSinActividad] = useState(false);
  const [motivoSinActividad, setMotivoSinActividad] = useState('lluvia');

  // Cuadrilla
  const [cuadrilla, setCuadrilla] = useState([
    { rol_id: 'operador_tractor', headcount: 1 },
    { rol_id: 'auxiliar', headcount: 2 }
  ]);

  // Líneas de Avance
  const [avances, setAvances] = useState([
    { predio_id: 'guayeme', actividad_id: 'siembra', cantidad: 5.0, unidad: 'ha' }
  ]);

  const [notas, setNotas] = useState('');
  const [currentLiveTime, setCurrentLiveTime] = useState(formatLocalTimestamp());
  const [notification, setNotification] = useState(null);

  // Paste Mode State
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentLiveTime(formatLocalTimestamp()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tgUser) {
      const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username;
      if (name) setAutorNombre(name);
    }
  }, [tgUser]);

  // Cargar estructura jerárquica de proyectos, hitos y tareas
  const loadEstructura = async () => {
    try {
      const res = await fetchProyectosEstructura();
      if (res.proyectos && res.proyectos.length > 0) {
        setProyectosEstructura(res.proyectos);
        if (!selectedProjectId) {
          const firstProj = res.proyectos[0];
          setSelectedProjectId(firstProj.id);
          if (firstProj.hitos && firstProj.hitos.length > 0) {
            const firstHito = firstProj.hitos[0];
            setSelectedHitoId(firstHito.id);
            if (firstHito.tareas && firstHito.tareas.length > 0) {
              setSelectedTareaId(firstHito.tareas[0].id);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadEstructura();
  }, []);

  // Cascading updates
  const currentProject = proyectosEstructura.find(p => p.id === selectedProjectId) || proyectosEstructura[0] || null;
  const availableHitos = currentProject?.hitos || [];
  const currentHito = availableHitos.find(h => h.id === selectedHitoId) || availableHitos[0] || null;
  const availableTareas = currentHito?.tareas || [];
  const currentTarea = availableTareas.find(t => t.id === selectedTareaId) || availableTareas[0] || null;

  // Cuando cambia la tarea, actualizar predio y actividad por defecto
  const handleTareaChange = (tId) => {
    setSelectedTareaId(tId);
    const tar = availableTareas.find(t => t.id === tId);
    if (tar) {
      if (tar.predio_id) {
        setAvances([{
          predio_id: tar.predio_id,
          actividad_id: tar.actividad_id || 'siembra',
          cantidad: 1.0,
          unidad: tar.unidad || 'ha',
          tarea_id: tar.id,
          hito_id: tar.hito_id
        }]);
      }
    }
  };

  const handleHitoChange = (hId) => {
    setSelectedHitoId(hId);
    const h = availableHitos.find(item => item.id === hId);
    if (h && h.tareas && h.tareas.length > 0) {
      handleTareaChange(h.tareas[0].id);
    } else {
      setSelectedTareaId('');
    }
  };

  const handleProjectChange = (pId) => {
    setSelectedProjectId(pId);
    const p = proyectosEstructura.find(item => item.id === pId);
    if (p && p.hitos && p.hitos.length > 0) {
      setSelectedHitoId(p.hitos[0].id);
      if (p.hitos[0].tareas && p.hitos[0].tareas.length > 0) {
        handleTareaChange(p.hitos[0].tareas[0].id);
      } else {
        setSelectedTareaId('');
      }
    } else {
      setSelectedHitoId('');
      setSelectedTareaId('');
    }
  };

  // Obra y predios
  const selectedObra = obras.find(o => o.id === selectedObraId) || obras[0] || { id: 'guayeme', nombre: 'Guayeme', predios: [] };
  const availablePredios = selectedObra.predios && selectedObra.predios.length > 0
    ? selectedObra.predios
    : predios.filter(p => p.id === selectedObraId || p.id === 'guayeme');

  // Cuadrilla handlers
  const handleAddCuadrilla = () => {
    setCuadrilla([...cuadrilla, { rol_id: 'auxiliar', headcount: 1 }]);
  };

  const handleRemoveCuadrilla = (index) => {
    setCuadrilla(cuadrilla.filter((_, i) => i !== index));
  };

  const handleCuadrillaChange = (index, field, value) => {
    const next = [...cuadrilla];
    next[index][field] = field === 'headcount' ? Math.max(1, parseInt(value, 10) || 1) : value;
    setCuadrilla(next);
  };

  // Avances handlers
  const handleAddAvance = () => {
    const defaultPred = availablePredios[0] ? availablePredios[0].id : 'guayeme';
    setAvances([...avances, {
      predio_id: defaultPred,
      actividad_id: currentTarea?.actividad_id || 'siembra',
      cantidad: 1.0,
      unidad: 'ha',
      tarea_id: currentTarea?.id || null,
      hito_id: currentHito?.id || null
    }]);
  };

  const handleRemoveAvance = (index) => {
    setAvances(avances.filter((_, i) => i !== index));
  };

  const handleAvanceChange = (index, field, value) => {
    const next = [...avances];
    next[index][field] = field === 'cantidad' ? parseFloat(value) || 0 : value;
    setAvances(next);
  };

  // Enviar Reporte Formulario
  const handleSubmitForm = (e) => {
    e.preventDefault();

    if (!autorNombre.trim()) {
      alert('Por favor indica tu nombre de operador.');
      return;
    }

    const queued = queueAgrokOfflineReport({
      proyecto_id: currentProject?.id || 'PRJ-MAIZ-2026',
      proyecto_nombre: currentProject?.nombre || 'Proyecto Maíz 2026',
      hito_id: currentHito?.id || null,
      hito_nombre: currentHito?.nombre || '',
      tarea_id: currentTarea?.id || null,
      tarea_nombre: currentTarea?.nombre || '',
      obra_id: selectedObra.id,
      obra_nombre: selectedObra.nombre,
      fecha_operativa: formatYMD(new Date()),
      autor_nombre: autorNombre.trim(),
      es_sin_actividad: isSinActividad,
      motivo_sin_actividad: isSinActividad ? motivoSinActividad : null,
      cuadrilla: isSinActividad ? [] : cuadrilla,
      avances: isSinActividad ? [] : avances.map(a => ({
        ...a,
        tarea_id: currentTarea?.id || null,
        hito_id: currentHito?.id || null,
        cantidad_ha: a.unidad === 'ha' ? a.cantidad : (a.unidad === 'm2' ? a.cantidad / 10000 : null)
      })),
      notas: notas.trim(),
      texto_original: `Reporte AGROK ${currentProject?.nombre || ''} - ${currentTarea?.nombre || selectedObra.nombre} (${formatYMD(new Date())})`
    });

    saveOperatorName(autorNombre);

    setNotification({
      title: isSinActividad ? '¡Día Sin Actividad Guardado (Offline)!' : '¡Reporte AGROK Guardado (Offline)!',
      time: queued.offline_created_at,
      msg: `Tarea: ${currentTarea?.nombre || selectedObra.nombre} · Registrado con marca inmutable.`
    });

    setNotas('');
    if (onReportSaved) onReportSaved(queued);
    setTimeout(() => setNotification(null), 5000);
  };

  // Parser de Texto Pegado (Paste Mode)
  const handleParseAndSubmit = async (e) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setIsParsing(true);
    try {
      const res = await testParserApi(pastedText, selectedObraId);
      const parsed = res.parsed;

      const queued = queueAgrokOfflineReport({
        proyecto_id: currentProject?.id || 'PRJ-MAIZ-2026',
        proyecto_nombre: currentProject?.nombre || 'Proyecto Maíz 2026',
        hito_id: currentHito?.id || null,
        hito_nombre: currentHito?.nombre || '',
        tarea_id: currentTarea?.id || null,
        tarea_nombre: currentTarea?.nombre || '',
        obra_id: parsed.obra_id || selectedObraId,
        obra_nombre: selectedObra.nombre,
        fecha_operativa: parsed.fecha_operativa || formatYMD(new Date()),
        autor_nombre: autorNombre.trim(),
        cuadrilla: parsed.cuadrilla || [],
        avances: parsed.avances || [],
        notas: (parsed.notas || []).join(' '),
        texto_original: pastedText
      });

      setNotification({
        title: '¡Reporte Parseado y Guardado (Offline)!',
        time: queued.offline_created_at,
        msg: `Se extrajeron ${parsed.cuadrilla.length} roles y ${parsed.avances.length} avances de predio.`
      });

      setPastedText('');
      setTabMode('form');
      if (onReportSaved) onReportSaved(queued);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      alert('Error parseando reporte: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-3.5 pb-20">
      {/* Barra de Conectividad & Simulación Offline */}
      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="font-bold text-xs">
              {isOnline ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> Conexión Activa (Auto-sync)
                </span>
              ) : (
                <span className="text-rose-700 flex items-center gap-1">
                  <WifiOff className="w-3.5 h-3.5" /> Sin Señal (Modo Campo Offline)
                </span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleSimulatedOffline}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition ${
              isSimulatedOffline ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            {isSimulatedOffline ? '🔴 Forzado Offline' : '📡 Red Normal'}
          </button>
        </div>

        {/* Acceso a bandeja de salida */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onOpenQueue}
            className="text-sky-700 font-semibold flex items-center gap-1 hover:underline"
          >
            <HardDrive className="w-3.5 h-3.5" />
            Cola Local:
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
              pendingCount > 0 ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingCount} pendientes
            </span>
          </button>

          {pendingCount > 0 && isOnline && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-sm transition"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Enviando...' : 'Sincronizar Ya'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Formulario Táctil vs Pegar Texto */}
      <div className="flex bg-slate-200 p-1 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setTabMode('form')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
            tabMode === 'form' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📝 Captura Guiada (Hitos & Tareas)
        </button>
        <button
          type="button"
          onClick={() => setTabMode('paste')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            tabMode === 'paste' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pegar Texto
        </button>
      </div>

      {/* Feedback Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 shadow-md flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">{notification.title}</p>
            <p className="text-[11px] opacity-90">{notification.msg}</p>
            <p className="font-mono text-[10px] text-emerald-700 font-bold mt-1">
              ⏱️ {notification.time}
            </p>
          </div>
        </div>
      )}

      {/* MODO 1: Formulario Guiado con Proyecto -> Hito -> Tarea */}
      {tabMode === 'form' && (
        <form onSubmit={handleSubmitForm} className="bg-white rounded-3xl p-4 shadow-md border border-slate-200 space-y-3.5 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Reporte Diario por Tarea
              </h2>
              <p className="text-[10px] text-slate-400">Guarda en local sin requerir señal de internet</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
              AGROK Campo
            </span>
          </div>

          {/* Operador */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" /> Responsable / Operador
              </label>
              {tgUser && (
                <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded-md">
                  @{tgUser.username || tgUser.first_name}
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={autorNombre}
              onChange={(e) => setAutorNombre(e.target.value)}
              placeholder="Ej: Abner / Armando"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* SELECCIÓN JERÁRQUICA: PROYECTO -> HITO -> TAREA */}
          <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2.5">
            <span className="text-[10px] font-extrabold text-emerald-900 uppercase flex items-center gap-1">
              <FolderPlus className="w-3.5 h-3.5 text-emerald-600" /> 1. Proyecto, Hito y Tarea Asignada
            </span>

            {/* 1. Proyecto */}
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-0.5">Proyecto:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              >
                {proyectosEstructura.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.ciclo})</option>
                ))}
              </select>
            </div>

            {/* 2. Hito */}
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-0.5">Hito / Fase:</label>
              <select
                value={selectedHitoId}
                onChange={(e) => handleHitoChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 text-[11px]"
              >
                {availableHitos.map(h => (
                  <option key={h.id} value={h.id}>{h.nombre}</option>
                ))}
              </select>
            </div>

            {/* 3. Tarea */}
            <div>
              <label className="block text-[9px] font-bold uppercase text-slate-500 mb-0.5">Tarea en la que trabajas hoy:</label>
              <select
                value={selectedTareaId}
                onChange={(e) => handleTareaChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border-2 border-emerald-500 rounded-xl font-bold text-emerald-950 text-[11px]"
              >
                {availableTareas.map(t => (
                  <option key={t.id} value={t.id}>
                    🎯 {t.nombre} ({t.cantidad_acumulada}/{t.cantidad_meta} {t.unidad})
                  </option>
                ))}
              </select>

              {/* Progress bar de la tarea seleccionada */}
              {currentTarea && (
                <div className="mt-2 bg-white p-2 rounded-xl border border-emerald-200 flex items-center justify-between text-[10px]">
                  <div>
                    <span className="text-slate-500 font-medium">Meta: {currentTarea.cantidad_meta} {currentTarea.unidad}</span>
                    <span className="font-bold text-emerald-800 ml-2">Acumulado: {currentTarea.cantidad_acumulada} {currentTarea.unidad}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                    currentTarea.estado === 'completada' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentTarea.estado}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Obra de Campo */}
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" /> Obra / Frente
            </label>
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre} ({o.fase_actual})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle: Sin Actividad */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-600" />
              <div>
                <span className="font-bold text-slate-800 text-[11px] block">¿Día sin labores / Sin actividad?</span>
                <span className="text-[9px] text-slate-400">Por lluvia, descanso o falta de insumos</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isSinActividad}
              onChange={(e) => setIsSinActividad(e.target.checked)}
              className="w-4 h-4 accent-sky-600 rounded"
            />
          </div>

          {isSinActividad ? (
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                Motivo de Sin Actividad:
              </label>
              <select
                value={motivoSinActividad}
                onChange={(e) => setMotivoSinActividad(e.target.value)}
                className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl font-bold text-amber-900"
              >
                <option value="lluvia">🌧️ Lluvia</option>
                <option value="sin_material">📦 Sin Material</option>
                <option value="sin_cuadrilla">👥 Sin Cuadrilla</option>
                <option value="sin_maquina">🚜 Sin Máquina / En reparación</option>
                <option value="descanso">🏖️ Descanso programado</option>
              </select>
            </div>
          ) : (
            <>
              {/* Sección Cuadrilla */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-500" /> Fuerza de Trabajo / Cuadrilla
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCuadrilla}
                    className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Añadir Rol
                  </button>
                </div>

                <div className="space-y-1.5">
                  {cuadrilla.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <select
                        value={c.rol_id}
                        onChange={(e) => handleCuadrillaChange(idx, 'rol_id', e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800"
                      >
                        {ROLES_CATALOG.map(r => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={c.headcount}
                        onChange={(e) => handleCuadrillaChange(idx, 'headcount', e.target.value)}
                        className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCuadrilla(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección Avance en Tarea / Predio */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" /> Avance de Hoy en la Tarea
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAvance}
                    className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Añadir Predio
                  </button>
                </div>

                <div className="space-y-2">
                  {avances.map((a, idx) => (
                    <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <select
                          value={a.predio_id}
                          onChange={(e) => handleAvanceChange(idx, 'predio_id', e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800"
                        >
                          {availablePredios.map(p => (
                            <option key={p.id} value={p.id}>📍 {p.nombre}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveAvance(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={a.actividad_id}
                          onChange={(e) => handleAvanceChange(idx, 'actividad_id', e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-700"
                        >
                          {ACTIVIDADES_CATALOG.map(act => (
                            <option key={act} value={act}>{act}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={a.cantidad}
                            onChange={(e) => handleAvanceChange(idx, 'cantidad', e.target.value)}
                            placeholder="0.0"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-extrabold text-xs text-emerald-800"
                          />
                          <span className="font-bold text-[10px] text-slate-500">ha</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notas */}
          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
              Observaciones / Novedades
            </label>
            <textarea
              rows="2"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles de la labor, clima, estado de caminos..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Timestamp Inmutable */}
          <div className="bg-slate-900 text-slate-100 p-2.5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase font-bold">Fecha / Hora de Campo</span>
                <span className="font-mono font-bold text-xs text-emerald-300">{currentLiveTime}</span>
              </div>
            </div>
            <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
              Offline Timestamp
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-1.5"
          >
            <HardDrive className="w-4 h-4" />
            GUARDAR REPORTE DE TAREA (OFFLINE)
          </button>
        </form>
      )}

      {/* MODO 2: Pegar Texto Diario */}
      {tabMode === 'paste' && (
        <form onSubmit={handleParseAndSubmit} className="bg-white rounded-3xl p-4 shadow-md border border-slate-200 space-y-3 text-xs">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Pegar Texto del Formato Diario
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              El parser oficial de AGROK clasificará automáticamente cuadrillas, actividades y hectáreas por predio.
            </p>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
              Seleccionar Obra:
            </label>
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
            >
              {obras.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>

          <textarea
            rows="8"
            required
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`*Obra:* Cristina, Rach, los mangos\n*Fecha:* ${formatYMD(new Date())}\n\n*Fuerza de trabajo :*\n- Operador de tractor\n- Técnico\n- 2 auxiliares\n\n*Operacion actual:*\n- Carga de fertilizante\n- Siembra del predio\n\nSe han sembrado un aproximado de 6.5 ha del predio cristina y 7 ha del predio rach.`}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />

          <button
            type="submit"
            disabled={isParsing}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
          >
            {isParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isParsing ? 'Procesando con Parser AGROK...' : 'Parsear y Guardar Reporte Offline'}
          </button>
        </form>
      )}
    </div>
  );
}
