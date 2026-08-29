import React from 'react';
import {
  TrendingUp,
  BarChart3,
  Layers,
  FileCheck,
  Bot,
  Users,
  Compass,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function LeaderView({
  projects,
  stats,
  botStatus,
  onOpenBotModal
}) {
  const totalProjects = projects.length;
  const avgProgress = totalProjects > 0
    ? Math.round(projects.reduce((acc, p) => acc + (p.progress_percent || 0), 0) / totalProjects)
    : 0;
  const totalReports = stats?.totalReports || 0;
  const telegramSubscribers = stats?.telegramSubscribers || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Líder */}
      <div className="bg-gradient-to-r from-purple-800 to-indigo-900 rounded-3xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-extrabold">Panel del Líder / Gerencia</h2>
          </div>
          <p className="text-xs text-purple-200">
            Monitoreo consolidado de avances y consulta remota vía Telegram Bot.
          </p>
        </div>

        <button
          onClick={onOpenBotModal}
          className="bg-white text-purple-950 hover:bg-purple-50 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition flex items-center gap-2"
        >
          <Bot className="w-4 h-4 text-purple-700" />
          {botStatus?.hasActiveBot ? `Bot Activo (@${botStatus?.botInfo?.username || 'Bot'})` : 'Conectar Telegram'}
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Proyectos</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-800">{totalProjects}</p>
          <p className="text-[10px] text-slate-500 font-medium">Activos en campo</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avance Global</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">{avgProgress}%</p>
          <p className="text-[10px] text-slate-500 font-medium">Promedio ponderado</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Reportes</span>
            <FileCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700">{totalReports}</p>
          <p className="text-[10px] text-slate-500 font-medium">Capturados y sincronizados</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Telegram</span>
            <Bot className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold text-sky-700">{telegramSubscribers}</p>
          <p className="text-[10px] text-slate-500 font-medium">Usuarios conectados</p>
        </div>
      </div>

      {/* Lista Consolidada de Proyectos y Avance */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-600" />
              Estado y Avance por Proyecto
            </h3>
            <p className="text-xs text-slate-400">Actualizado con los últimos reportes sincronizados</p>
          </div>
        </div>

        <div className="space-y-3">
          {projects.map((project) => {
            const pct = project.progress_percent || 0;
            return (
              <div
                key={project.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs">
                      {project.code}
                    </span>
                    <h4 className="font-bold text-sm text-slate-800">{project.name}</h4>
                  </div>

                  <span className="font-extrabold text-sm text-purple-800 bg-purple-100 px-3 py-0.5 rounded-full">
                    {pct}% Completado
                  </span>
                </div>

                {project.location && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    📍 {project.location}
                  </p>
                )}

                {/* Barra de Progreso */}
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>

                {/* Tareas asociadas */}
                {project.tasks && project.tasks.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                      Hitos / Tareas ({project.tasks.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.tasks.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700"
                        >
                          • {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel de Consultas en Telegram para el Líder */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-4 text-xs">
        <div className="flex items-center gap-2 text-purple-400">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold text-sm text-white">Consultas del Líder en Telegram</h3>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          Como líder, puedes consultar en cualquier momento el estado de la operación directamente desde tu chat con el Bot de Telegram usando estos comandos:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-purple-300 font-mono font-bold text-sm block">/proyectos</span>
            <p className="text-slate-300 text-[11px]">
              Muestra un resumen de todos los proyectos con barras de progreso visuales y total de reportes.
            </p>
          </div>

          <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-sky-300 font-mono font-bold text-sm block">/avance PRJ-001</span>
            <p className="text-slate-300 text-[11px]">
              Muestra la ficha detallada de un proyecto con sus últimos reportes de campo y notas de operadores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
