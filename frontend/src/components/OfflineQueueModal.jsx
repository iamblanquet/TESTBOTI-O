import React from 'react';
import { X, Wifi, WifiOff, CheckCircle2, Clock, Trash2, RefreshCw, CloudRain } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn text-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm leading-tight">Bandeja de Salida Offline AGROK</h3>
              <p className="text-[11px] text-slate-400">
                {pendingCount} pendiente(s) de sincronizar • {syncedCount} sincronizado(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Acciones */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={onSyncAll}
            disabled={!isOnline || isSyncing || pendingCount === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-extrabold text-xs shadow-sm transition ${
              !isOnline || pendingCount === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : `Sincronizar Pendientes (${pendingCount})`}
          </button>

          {syncedCount > 0 && (
            <button
              onClick={onClearSynced}
              className="py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs transition"
            >
              Limpiar Sincronizados
            </button>
          )}
        </div>

        {/* Lista de reportes */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {queue.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-bold text-xs">No hay reportes en la cola local</p>
              <p className="text-[11px]">Los reportes capturados en campo sin señal aparecerán aquí.</p>
            </div>
          ) : (
            queue.map((report) => {
              const isPending = report.status === 'PENDING_SYNC' || report.status === 'ERROR';
              return (
                <div
                  key={report.client_uuid}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isPending ? 'bg-amber-50/60 border-amber-200 shadow-sm' : 'bg-emerald-50/50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="font-extrabold text-xs px-2 py-0.5 rounded-lg bg-slate-900 text-white mr-1.5">
                        {report.obra_nombre}
                      </span>
                      <span className="text-[11px] text-slate-600 font-bold">{report.fecha_operativa}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          <WifiOff className="w-3 h-3" /> Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Sincronizado
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteReport(report.client_uuid)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Eliminar de la cola local"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {report.es_sin_actividad ? (
                    <div className="p-2 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-[11px] font-bold flex items-center gap-1.5 my-1.5">
                      <CloudRain className="w-4 h-4 text-sky-600" />
                      Día sin actividad: {report.motivo_sin_actividad}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 my-2 bg-white/80 p-2 rounded-xl border border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Cuadrilla</span>
                        <span className="font-bold text-slate-800">
                          {report.cuadrilla && report.cuadrilla.length > 0
                            ? report.cuadrilla.map(c => `${c.rol_id} ${c.headcount}`).join(', ')
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Responsable</span>
                        <span className="font-bold text-slate-800 truncate block">{report.autor_nombre}</span>
                      </div>

                      {report.avances && report.avances.length > 0 && (
                        <div className="col-span-2 border-t border-slate-100 pt-1">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Avances</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {report.avances.map((a, idx) => (
                              <span key={idx} className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                                {a.predio_id}: {a.cantidad} {a.unidad} ({a.actividad_id})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <p>⏱️ <strong className="text-amber-800">Hora de Campo (Offline):</strong> <span className="font-mono font-bold text-slate-800">{report.offline_created_at}</span></p>
                    {report.synced_at && (
                      <p>🔄 <strong className="text-emerald-800">Sincronizado:</strong> <span className="font-mono text-slate-700">{report.synced_at}</span></p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-2xl text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
