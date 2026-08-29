import React from 'react';
import {
  TrendingUp,
  BarChart3,
  Layers,
  FileCheck,
  Bot,
  Compass,
  AlertTriangle,
  Package,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function LeaderView({
  tableroData,
  botStatus,
  onOpenBotModal
}) {
  const widgets = tableroData?.widgets || {
    sin_reporte: [],
    avance_obras: [],
    incidencias_abiertas: [],
    bloqueado_material: []
  };

  const totalObras = widgets.avance_obras.length;
  const totalHaCampo = widgets.avance_obras.reduce((acc, o) => acc + (o.total_campo_ha || 0), 0);
  const totalMetaHa = widgets.avance_obras.reduce((acc, o) => acc + (o.meta_ha || 0), 0);
  const pctGlobal = totalMetaHa > 0 ? Math.round((totalHaCampo / totalMetaHa) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 text-slate-800 text-xs">
      {/* Header Líder */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 rounded-3xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-extrabold">AGROK · Dirección y Gerencia</h2>
          </div>
          <p className="text-xs text-purple-200">
            Consolidado operativo de proyectos, ciclo agrícola y canal de consulta ejecutiva en Telegram.
          </p>
        </div>

        <button
          onClick={onOpenBotModal}
          className="bg-white text-purple-950 hover:bg-purple-50 px-4 py-2 rounded-2xl font-bold text-xs shadow-md transition flex items-center gap-2"
        >
          <Bot className="w-4 h-4 text-purple-700" />
          {botStatus?.hasActiveBot ? `Bot Activo (@${botStatus?.botInfo?.username || 'Bot'})` : 'Conectar Telegram'}
        </button>
      </div>

      {/* Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Obras Activas</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalObras}</p>
          <p className="text-[10px] text-slate-500 font-medium">En operación agrícola</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avance Campo</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{Math.round(totalHaCampo * 10) / 10} <span className="text-sm">ha</span></p>
          <p className="text-[10px] text-slate-500 font-medium">Meta: {totalMetaHa} ha ({pctGlobal}%)</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Incidencias</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700">{widgets.incidencias_abiertas.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Abiertas en campo</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Materiales</span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700">{widgets.bloqueado_material.length}</p>
          <p className="text-[10px] text-slate-500 font-medium">Faltantes en sitio</p>
        </div>
      </div>

      {/* Consolidado por Proyecto / Obra */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-600" />
              Consolidado de Obras y Predios · Ciclo 2026
            </h3>
            <p className="text-[11px] text-slate-400">Comparativa de Hectáreas reportadas en campo vs oficiales</p>
          </div>
          <span className="text-[10px] font-mono bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-md">
            Maíz 2026
          </span>
        </div>

        <div className="space-y-3">
          {widgets.avance_obras.map((o) => {
            const pct = o.meta_ha > 0 ? Math.min(100, Math.round((o.total_campo_ha / o.meta_ha) * 100)) : 0;
            return (
              <div key={o.obra_id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-900">{o.obra_nombre}</span>
                  <span className="font-extrabold text-xs text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    {o.total_campo_ha} ha ejecutadas ({pct}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] text-slate-600 pt-1">
                  {o.predios.map(p => (
                    <span key={p.predio_id} className="bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      📍 {p.predio_nombre}: <strong>{p.campo_ha} ha</strong> (Oficial: {p.oficial_ha} ha)
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comandos Ejecutivos de Telegram para Dirección */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-purple-400">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold text-sm text-white">Consultas del Líder en Telegram</h3>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Comandos clave para monitorear el estado diario directamente en el chat con el bot:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-purple-300 font-bold block">/tablero</span>
            <p className="text-slate-300 font-sans text-[10px]">
              Emite el mensaje fijado oficial con los 4 widgets del día.
            </p>
          </div>

          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-sky-300 font-bold block">/avance [obra]</span>
            <p className="text-slate-300 font-sans text-[10px]">
              Desglose de hectáreas por predio y mediciones oficiales de dron.
            </p>
          </div>

          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-emerald-300 font-bold block">/hoy</span>
            <p className="text-slate-300 font-sans text-[10px]">
              Lista de obras que reportaron hoy y cuáles faltan por reportar.
            </p>
          </div>

          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-amber-300 font-bold block">/pendientes</span>
            <p className="text-slate-300 font-sans text-[10px]">
              Lista de folios de incidencias abiertas con días transcurridos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
