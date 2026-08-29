import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Layers,
  TrendingUp,
  Package,
  Tractor,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Check,
  X,
  RefreshCw,
  Plus,
  Compass,
  FolderPlus,
  Target,
  CheckSquare
} from 'lucide-react';
import { updateIncidenciaEstadoApi, createIncidenciaApi, fetchProyectosEstructura, createHitoApi, createTareaApi } from '../services/api';

export default function SupervisorView({
  tableroData,
  onRefreshData,
  onOpenBotModal,
  botStatus
}) {
  const [closingFolio, setClosingFolio] = useState(null);
  const [causaRaiz, setCausaRaiz] = useState('');
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  const [isNewIncidenciaOpen, setIsNewIncidenciaOpen] = useState(false);
  const [newIncTipo, setNewIncTipo] = useState('falla_mecanica');
  const [newIncObra, setNewIncObra] = useState('guayeme');
  const [newIncDesc, setNewIncDesc] = useState('');

  // Hitos & Tareas State
  const [proyectosEstructura, setProyectosEstructura] = useState([]);
  const [isNewHitoOpen, setIsNewHitoOpen] = useState(false);
  const [isNewTareaOpen, setIsNewTareaOpen] = useState(false);

  // Form Hito
  const [hProjId, setHProjId] = useState('');
  const [hNombre, setHNombre] = useState('');
  const [hMetaHa, setHMetaHa] = useState('120');

  // Form Tarea
  const [tHitoId, setTHitoId] = useState('');
  const [tNombre, setTNombre] = useState('');
  const [tPredioId, setTPredioId] = useState('guayeme');
  const [tActividad, setTActividad] = useState('siembra');
  const [tMeta, setTMeta] = useState('10');
  const [tUnidad, setTUnidad] = useState('ha');
  const [tResp, setTResp] = useState('');

  const loadHitosTareas = async () => {
    try {
      const res = await fetchProyectosEstructura();
      if (res.success && res.proyectos) {
        setProyectosEstructura(res.proyectos);
        if (!hProjId && res.proyectos.length > 0) {
          setHProjId(res.proyectos[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHitosTareas();
  }, []);

  const handleCreateHito = async (e) => {
    e.preventDefault();
    if (!hNombre.trim()) return;

    try {
      await createHitoApi({
        proyecto_id: hProjId || 'PRJ-MAIZ-2026',
        nombre: hNombre.trim(),
        superficie_meta_ha: parseFloat(hMetaHa) || 0
      });
      setIsNewHitoOpen(false);
      setHNombre('');
      loadHitosTareas();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTarea = async (e) => {
    e.preventDefault();
    if (!tNombre.trim() || !tHitoId) return;

    try {
      await createTareaApi({
        hito_id: tHitoId,
        nombre: tNombre.trim(),
        predio_id: tPredioId,
        actividad_id: tActividad,
        unidad: tUnidad,
        cantidad_meta: parseFloat(tMeta) || 0,
        responsable: tResp || 'Operador'
      });
      setIsNewTareaOpen(false);
      setTNombre('');
      loadHitosTareas();
    } catch (err) {
      alert(err.message);
    }
  };

  const widgets = tableroData?.widgets || {
    sin_reporte: [],
    avance_obras: [],
    incidencias_abiertas: [],
    bloqueado_material: []
  };

  const maquinaria = tableroData?.maquinaria || [];
  const activos = tableroData?.activos || [];

  const handleCerrarIncidencia = async (e) => {
    e.preventDefault();
    if (!causaRaiz.trim() || causaRaiz.trim().length < 5) {
      alert('La regla de AGROK exige especificar la Causa Raíz para cerrar una incidencia.');
      return;
    }

    setIsSubmittingClose(true);
    try {
      await updateIncidenciaEstadoApi(closingFolio, {
        estado: 'cerrada',
        causa_raiz: causaRaiz.trim(),
        autor_nombre: 'Supervisor'
      });
      setClosingFolio(null);
      setCausaRaiz('');
      onRefreshData();
    } catch (err) {
      alert('Error cerrando incidencia: ' + err.message);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handleCreateIncidencia = async (e) => {
    e.preventDefault();
    if (!newIncDesc.trim()) return;

    try {
      await createIncidenciaApi({
        tipo: newIncTipo,
        obra_id: newIncObra,
        descripcion: newIncDesc.trim(),
        autor_nombre: 'Supervisor'
      });
      setIsNewIncidenciaOpen(false);
      setNewIncDesc('');
      onRefreshData();
    } catch (err) {
      alert('Error al crear incidencia: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 text-slate-800 text-xs">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-6 h-6 text-emerald-300" />
            <h2 className="text-xl font-extrabold">Tablero Operativo & Gestión de Proyectos</h2>
          </div>
          <p className="text-xs text-emerald-200">
            Control de Hitos, Tareas y los 4 widgets canónicos (Obras sin reporte, Avance, Incidencias y Materiales).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { onRefreshData(); loadHitosTareas(); }}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition"
            title="Refrescar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECCIÓN GERENCIAL: HITOS Y TAREAS DEL PROYECTO */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-600" />
              Estructura Operativa: Hitos y Tareas del Proyecto
            </h3>
            <p className="text-[10px] text-slate-400">Los operadores eligen su hito y tarea al enviar su reporte diario.</p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsNewHitoOpen(true)}
              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px] rounded-xl flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" /> Nuevo Hito
            </button>
            <button
              onClick={() => {
                if (proyectosEstructura[0]?.hitos?.[0]) {
                  setTHitoId(proyectosEstructura[0].hitos[0].id);
                }
                setIsNewTareaOpen(true);
              }}
              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] rounded-xl flex items-center gap-1 transition shadow-sm"
            >
              <Plus className="w-3 h-3" /> Nueva Tarea
            </button>
          </div>
        </div>

        {/* Listado de Proyectos con sus Hitos y Tareas */}
        <div className="space-y-3">
          {proyectosEstructura.map((proj) => (
            <div key={proj.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">{proj.nombre}</h4>
                  <span className="text-[10px] text-slate-500 font-medium">Ciclo: {proj.ciclo} · Gerente: {proj.gerente_id}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xs text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {proj.porcentaje_global}% Global
                  </span>
                </div>
              </div>

              {/* Hitos */}
              <div className="space-y-2">
                {proj.hitos?.map((h) => (
                  <div key={h.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">🏁 {h.nombre}</span>
                        <span className="text-[9px] px-2 py-0.2 rounded-full font-bold uppercase bg-slate-100 text-slate-600">
                          {h.estado}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-extrabold text-emerald-700">
                        {h.total_acumulada} / {h.total_meta} ha ({h.porcentaje}%)
                      </span>
                    </div>

                    {/* Barra de progreso del Hito */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, h.porcentaje)}%` }}
                      />
                    </div>

                    {/* Tareas del Hito */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {h.tareas?.map((t) => (
                        <div key={t.id} className="p-2 bg-slate-50 rounded-lg border border-slate-150 flex items-center justify-between text-[10px]">
                          <div>
                            <span className="font-bold text-slate-800 block">🎯 {t.nombre}</span>
                            <span className="text-slate-500">📍 {t.predio_nombre || 'Predio asignado'} · Resp: {t.responsable}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-800 block">
                              {t.cantidad_acumulada}/{t.cantidad_meta} {t.unidad}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase ${
                              t.estado === 'completada' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {t.estado}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de los 4 Widgets Canónicos de AGROK */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* WIDGET 1: Obras Sin Reporte Hoy */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-rose-500" />
              1. Obras Sin Reporte Hoy
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {widgets.sin_reporte.length} obras
            </span>
          </div>

          {widgets.sin_reporte.length === 0 ? (
            <div className="text-center py-6 text-emerald-600 font-bold">
              ✅ ¡Todas las obras en operación han reportado hoy!
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {widgets.sin_reporte.map((o) => (
                <div key={o.id} className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-rose-950 block">{o.nombre}</span>
                    <span className="text-[10px] text-rose-700">Fase: {o.fase_actual} · Resp: {o.responsable_id || 'Campo'}</span>
                  </div>
                  <span className="font-extrabold text-[11px] px-2 py-1 bg-rose-200 text-rose-900 rounded-xl">
                    {o.dias_sin_reporte} día(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WIDGET 3: Incidencias Abiertas */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              3. Incidencias Abiertas
            </h3>
            <button
              onClick={() => setIsNewIncidenciaOpen(true)}
              className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" /> Nueva
            </button>
          </div>

          {widgets.incidencias_abiertas.length === 0 ? (
            <div className="text-center py-6 text-emerald-600 font-bold">
              ✅ Cero incidencias abiertas.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {widgets.incidencias_abiertas.map((inc) => (
                <div key={inc.folio} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-black text-xs text-amber-900 mr-1.5 bg-amber-200 px-1.5 py-0.2 rounded">
                        {inc.folio}
                      </span>
                      <span className="font-bold text-slate-800 text-[11px]">{inc.descripcion}</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
                      {inc.dias_abierta} días ({inc.estado})
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                    <span className="text-[10px] text-slate-500">📁 {inc.obra_nombre}</span>
                    <button
                      onClick={() => setClosingFolio(inc.folio)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[10px] transition"
                    >
                      Cerrar con Causa Raíz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WIDGET 2: Avance Contra Meta */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              2. Avance Contra Meta (Campo vs Oficial Dron)
            </h3>
            <span className="text-[10px] text-slate-400">Normalizado en Hectáreas</span>
          </div>

          <div className="space-y-3">
            {widgets.avance_obras.map((o) => (
              <div key={o.obra_id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{o.obra_nombre}</h4>
                    <span className="text-[10px] text-slate-500">Fase actual: {o.fase_actual}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      🌾 Campo: {o.total_campo_ha} ha
                    </span>
                    <span className="font-extrabold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                      🎯 Meta: {o.meta_ha} ha
                    </span>
                  </div>
                </div>

                {/* Desglose por Predios */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {o.predios.map((p) => (
                    <div key={p.predio_id} className="p-2 bg-white rounded-xl border border-slate-200 text-[11px]">
                      <span className="font-bold text-slate-800 block">📍 {p.predio_nombre}</span>
                      <div className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                        <p>Avance Campo: <strong className="text-emerald-700">{p.campo_ha} ha</strong></p>
                        <p>Oficial Dron: <strong>{p.oficial_ha} ha</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WIDGET 4: Bloqueado por Material */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-purple-600" />
              4. Bloqueado por Material
            </h3>
            <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full">
              {widgets.bloqueado_material.length} insumos pendientes
            </span>
          </div>

          {widgets.bloqueado_material.length === 0 ? (
            <div className="text-center py-4 text-slate-400">
              No hay materiales bloqueantes en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {widgets.bloqueado_material.map((m) => {
                const falta = m.requerido - m.en_sitio;
                return (
                  <div key={m.id} className="p-3 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-950">{m.insumo}</span>
                      <span className="font-extrabold text-xs text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        Faltan {falta} {m.unidad}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600">
                      📁 {m.obra_nombre} • Req: {m.requerido} | En sitio: {m.en_sitio} | Pedido: {m.pedido}
                    </p>
                    <p className="text-[10px] font-mono text-purple-800 font-bold">
                      ETA: {m.eta || 'sin_fecha'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: NUEVO HITO */}
      {isNewHitoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Nuevo Hito / Fase de Proyecto
            </h3>

            <form onSubmit={handleCreateHito} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Proyecto:</label>
                <select
                  value={hProjId}
                  onChange={(e) => setHProjId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {proyectosEstructura.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nombre del Hito:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Hito 3: Control Fitosanitario y Riego"
                  value={hNombre}
                  onChange={(e) => setHNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Superficie Meta (ha):</label>
                <input
                  type="number"
                  step="0.1"
                  value={hMetaHa}
                  onChange={(e) => setHMetaHa(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewHitoOpen(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  Guardar Hito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA TAREA */}
      {isNewTareaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-teal-600" />
              Nueva Tarea Operativa
            </h3>

            <form onSubmit={handleCreateTarea} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Hito Padre:</label>
                <select
                  value={tHitoId}
                  onChange={(e) => setTHitoId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {proyectosEstructura.flatMap(p => p.hitos || []).map(h => (
                    <option key={h.id} value={h.id}>🏁 {h.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nombre de la Tarea:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Siembra mecanizada lote 1"
                  value={tNombre}
                  onChange={(e) => setTNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Predio:</label>
                  <select
                    value={tPredioId}
                    onChange={(e) => setTPredioId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="guayeme">Guayeme</option>
                    <option value="santa_teresita">Santa Teresita</option>
                    <option value="los_mangos">Los Mangos</option>
                    <option value="san_alberto">San Alberto</option>
                    <option value="san_luis">San Luis</option>
                    <option value="rach">Rach</option>
                    <option value="cristina">Cristina</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Cantidad Meta (ha):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={tMeta}
                    onChange={(e) => setTMeta(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Operador / Responsable Asignado:</label>
                <input
                  type="text"
                  placeholder="ej: Armando / Abner"
                  value={tResp}
                  onChange={(e) => setTResp(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewTareaOpen(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cerrar Incidencia con Causa Raíz Obligatoria */}
      {closingFolio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Cerrar Incidencia {closingFolio}
            </h3>

            <p className="text-[11px] text-slate-500">
              📌 <strong>Regla AGROK:</strong> Ninguna incidencia pasa a <code className="bg-slate-100 px-1 rounded">cerrada</code> sin documentar la <strong>Causa Raíz</strong>.
            </p>

            <form onSubmit={handleCerrarIncidencia} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                  Causa Raíz de la Falla / Problema:
                </label>
                <textarea
                  rows="3"
                  required
                  value={causaRaiz}
                  onChange={(e) => setCausaRaiz(e.target.value)}
                  placeholder="Ej: Manguera hidráulica desgastada por fricción con chasis. Se reemplazó por modelo reforzado con malla de acero."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClosingFolio(null)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClose}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  {isSubmittingClose ? 'Cerrando...' : 'Cerrar Incidencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Incidencia Express */}
      {isNewIncidenciaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Nueva Incidencia Operativa
            </h3>

            <form onSubmit={handleCreateIncidencia} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Obra:</label>
                <select
                  value={newIncObra}
                  onChange={(e) => setNewIncObra(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  <option value="guayeme">Maíz Guayeme</option>
                  <option value="sta_teresita">Desmonte Santa Teresita</option>
                  <option value="cluster_mangos">Siembra Clúster Mangos</option>
                  <option value="san_alberto">Maíz San Alberto</option>
                  <option value="potrero_yeguas">Cercado Potrero Yeguas</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Tipo de Incidencia:</label>
                <select
                  value={newIncTipo}
                  onChange={(e) => setNewIncTipo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="falla_mecanica">Falla mecánica</option>
                  <option value="plaga">Plaga</option>
                  <option value="clima">Clima</option>
                  <option value="fuego">Fuego</option>
                  <option value="conflicto_terceros">Conflicto con terceros</option>
                  <option value="desabasto_material">Desabasto de material</option>
                  <option value="seguridad_epp">Seguridad EPP</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Descripción:</label>
                <textarea
                  rows="3"
                  required
                  value={newIncDesc}
                  onChange={(e) => setNewIncDesc(e.target.value)}
                  placeholder="Detalles del problema en campo..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewIncidenciaOpen(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  Registrar Incidencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
