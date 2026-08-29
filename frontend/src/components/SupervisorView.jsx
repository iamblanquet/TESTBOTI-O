import React, { useState } from 'react';
import {
  FolderPlus,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Send,
  Bot,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { createProjectApi } from '../services/api';

export default function SupervisorView({
  projects,
  recentReports,
  onRefreshData,
  onOpenBotModal,
  botStatus
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [tasks, setTasks] = useState(['Fase 1: Preparación y montaje', 'Fase 2: Ejecución principal']);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAddTask = () => {
    if (newTaskInput.trim()) {
      setTasks([...tasks, newTaskInput.trim()]);
      setNewTaskInput('');
    }
  };

  const handleRemoveTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg('Código y nombre son obligatorios');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await createProjectApi({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        tasks
      });

      setSuccessMsg(`✅ Proyecto ${code.toUpperCase()} creado. Los operadores ya pueden descargarlo.`);
      setCode('');
      setName('');
      setDescription('');
      setLocation('');
      setTasks(['Fase 1: Preparación y montaje']);
      onRefreshData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear el proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header del Supervisor */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-3xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-amber-200" />
            <h2 className="text-xl font-extrabold">Panel del Supervisor</h2>
          </div>
          <p className="text-xs text-amber-100">
            Recepción de reportes en tiempo real y asignación de proyectos para campo.
          </p>
        </div>

        <button
          onClick={onOpenBotModal}
          className="bg-white text-amber-900 hover:bg-amber-50 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition flex items-center gap-2"
        >
          <Bot className="w-4 h-4 text-amber-600" />
          {botStatus?.hasActiveBot ? `Bot Activo (@${botStatus?.botInfo?.username || 'Bot'})` : 'Conectar Telegram'}
        </button>
      </div>

      {/* Grid: Crear Proyecto + Guía Telegram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulario de Creación de Proyecto */}
        <div className="md:col-span-2 bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-600" />
              Crear Nuevo Proyecto / Tarea
            </h3>
            <span className="text-[11px] text-slate-400">Disponible para operadores en offline</span>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
              ❌ {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Código Único
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PRJ-004"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mantenimiento Preventivo Subestación"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Ubicación de Campo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Sector Industrial Km 14"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  placeholder="Alcance general del trabajo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Tareas asociadas */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block font-bold text-slate-700 uppercase">
                Tareas o Hitos a ejecutar:
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Añadir tarea (ej: Revisión de transformadores)"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-4 h-4" /> Añadir
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {tasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-700">
                      {idx + 1}. {task}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl shadow-md transition flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
              {loading ? 'Creando Proyecto...' : 'Crear y Publicar Proyecto'}
            </button>
          </form>
        </div>

        {/* Guía rápida de comandos de Telegram para el Supervisor */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-4 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-400 mb-2">
              <Bot className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Comandos Telegram (Supervisor)</h3>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed mb-3">
              Como supervisor, puedes gestionar y recibir alertas directamente en tu celular con la app de Telegram.
            </p>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-amber-400 font-bold">/rol supervisor</span>
                <p className="text-slate-300 font-sans text-[10px] mt-0.5">
                  Regístrate para recibir la alerta instantánea de cada reporte de campo offline.
                </p>
              </div>

              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-sky-300 font-bold">/nuevo_proyecto COD | NOM | DESC</span>
                <p className="text-slate-300 font-sans text-[10px] mt-0.5">
                  Crea un proyecto desde Telegram sin entrar a la web.
                </p>
              </div>

              <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700">
                <span className="text-emerald-300 font-bold">/proyectos</span>
                <p className="text-slate-300 font-sans text-[10px] mt-0.5">
                  Ver lista consolidada con barras de porcentaje.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-200">
            🔔 <strong>Alerta de Reportes:</strong> El bot te avisará comparando la <strong>hora real de campo</strong> vs la <strong>hora de sincronización</strong>.
          </div>
        </div>
      </div>

      {/* Feed de Reportes Recibidos */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-sky-600" />
              Historial de Reportes de Campo Recibidos
            </h3>
            <p className="text-xs text-slate-400">Auditoría con timestamps offline inmutables</p>
          </div>
          <button
            onClick={onRefreshData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Refrescar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {recentReports.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">Aún no se han recibido reportes sincronizados</p>
            <p className="text-[11px]">Los reportes de los operadores aparecerán aquí en vivo.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentReports.map((r) => (
              <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-bold text-xs font-mono">
                      {r.project_code || 'PRJ'}
                    </span>
                    <span className="font-bold text-xs text-slate-800">{r.project_name}</span>
                    <span className="text-xs text-slate-500">• {r.task_name}</span>
                  </div>

                  <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    +{r.advance_percent}% Avance
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Operador</span>
                    <span className="font-semibold text-slate-800">{r.operator_name}</span>
                  </div>

                  <div>
                    <span className="text-amber-700 block text-[10px] uppercase font-bold">
                      ⏱️ Captura en Campo (Offline):
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">
                      {r.offline_created_at}
                    </span>
                  </div>

                  <div>
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">
                      🔄 Sincronizado en Servidor:
                    </span>
                    <span className="font-mono text-slate-700 text-[11px]">
                      {r.synced_at}
                    </span>
                  </div>
                </div>

                {r.notes && (
                  <p className="text-xs text-slate-600 italic bg-amber-50/40 p-2 rounded-lg border border-amber-100">
                    "{r.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
