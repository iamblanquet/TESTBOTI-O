import React from 'react';
import { X, Wifi, WifiOff, CheckCircle2, Clock, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

export default function OfflineQueueModal({
  isOpen,
  onClose,
  queue,
  isOnline,
  isSyncing,
  onSyncAll,
  onClearSynced,
  onDeleteReport
}) {
  if (!isOpen) return null;

  const pendingCount = queue.filter(r => r.status === 'PENDING_SYNC' || r.status === 'ERROR').length;
  const syncedCount = queue.filter(r => r.status === 'SYNCED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Bandeja de Salida Offline</h3>
              <p className="text-xs text-slate-400">
                {pendingCount} pendiente(s) • {syncedCount} sincronizado(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Acciones de la cola */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={onSyncAll}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-medium text-xs shadow-sm transition ${
              !isOnline || pendingCount === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 hover:bg-sky-700 text-white active:scale-98'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : `Sincronizar Pendientes (${pendingCount})`}
          </button>

          {syncedCount > 0 && (
            <button
              onClick={onClearSynced}
              className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl font-medium text-xs transition"
            >
              Limpiar Sincronizados
            </button>
          )}
        </div>

        {/* Lista de reportes */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {queue.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No hay reportes en la cola local</p>
              <p className="text-xs">Los reportes creados en campo aparecerán aquí.</p>
            </div>
          ) : (
            queue.map((report) => {
              const isPending = report.status === 'PENDING_SYNC' || report.status === 'ERROR';
              return (
                <div
                  key={report.client_uuid}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isPending
                      ? 'bg-amber-50/60 border-amber-200 shadow-sm'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-slate-800 text-white mr-1.5">
                        {report.project_name}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">{report.task_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <WifiOff className="w-3 h-3" /> Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Sincronizado
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteReport(report.client_uuid)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition"
                        title="Eliminar de la cola local"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Avance reportado</span>
                      <span className="font-bold text-slate-800">+{report.advance_percent}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Operador</span>
                      <span className="font-medium text-slate-800 truncate block">{report.operator_name}</span>
                    </div>
                    <div className="col-span-2 border-t border-slate-100 pt-1.5">
                      <span className="text-amber-800 font-semibold block text-[10px] uppercase flex items-center gap-1">
                        ⏱️ Hora de Captura (Offline):
                      </span>
                      <span className="font-mono text-slate-900 font-bold text-[11px]">
                        {report.offline_created_at}
                      </span>
                    </div>
                    {report.synced_at && (
                      <div className="col-span-2 border-t border-slate-100 pt-1.5">
                        <span className="text-emerald-800 font-semibold block text-[10px] uppercase flex items-center gap-1">
                          🔄 Sincronizado en Servidor:
                        </span>
                        <span className="font-mono text-slate-700 text-[11px]">
                          {report.synced_at}
                        </span>
                      </div>
                    )}
                  </div>

                  {report.notes && (
                    <p className="mt-2 text-xs text-slate-600 italic bg-white/50 p-1.5 rounded border border-slate-200/40">
                      "{report.notes}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
