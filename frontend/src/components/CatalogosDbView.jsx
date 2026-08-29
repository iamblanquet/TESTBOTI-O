import React, { useState, useEffect } from 'react';
import { Database, MapPin, Layers, FileText, Compass, Plus, RefreshCw, Radio } from 'lucide-react';
import { createIncidenciaApi } from '../services/api';

export default function CatalogosDbView({
  obras = [],
  predios = [],
  onRefreshData
}) {
  const [subTab, setSubTab] = useState('obras'); // 'obras' | 'predios' | 'reportes'
  const [reportesHistorial, setReportesHistorial] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form nueva obra
  const [isNewObraOpen, setIsNewObraOpen] = useState(false);
  const [newObraId, setNewObraId] = useState('');
  const [newObraNombre, setNewObraNombre] = useState('');
  const [newObraFase, setNewObraFase] = useState('monitoreo y control de plaga');
  const [newObraResp, setNewObraResp] = useState('Campo');
  const [selectedPrediosForObra, setSelectedPrediosForObra] = useState([]);

  useEffect(() => {
    if (subTab === 'reportes') {
      fetch('/api/reportes')
        .then(r => r.json())
        .then(d => {
          if (d.success) setReportesHistorial(d.reportes);
        })
        .catch(console.error);
    }
  }, [subTab]);

  const handleCreateObra = async (e) => {
    e.preventDefault();
    if (!newObraId || !newObraNombre) return;

    try {
      const res = await fetch('/api/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newObraId,
          nombre: newObraNombre,
          fase_actual: newObraFase,
          responsable_id: newObraResp,
          predio_ids: selectedPrediosForObra
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsNewObraOpen(false);
        setNewObraId('');
        setNewObraNombre('');
        setSelectedPrediosForObra([]);
        onRefreshData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const togglePredioSelection = (pid) => {
    if (selectedPrediosForObra.includes(pid)) {
      setSelectedPrediosForObra(selectedPrediosForObra.filter(p => p !== pid));
    } else {
      setSelectedPrediosForObra([...selectedPrediosForObra, pid]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-6 h-6 text-sky-400" />
            <h2 className="text-xl font-extrabold">Base de Datos & Catálogos AGROK</h2>
          </div>
          <p className="text-xs text-slate-300">
            Explorador de Obras, 17 Predios, Historial de Reportes y Mediciones Oficiales.
          </p>
        </div>
        <button
          onClick={onRefreshData}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-200 p-1 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setSubTab('obras')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'obras' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Obras ({obras.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('predios')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'predios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> 17 Predios ({predios.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('reportes')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'reportes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Historial Reportes
        </button>
      </div>

      {/* SUBTAB 1: OBRAS */}
      {subTab === 'obras' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900">Catálogo de Obras Activas</h3>
            <button
              onClick={() => setIsNewObraOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Obra
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {obras.map((o) => (
              <div key={o.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-400 block">{o.id}</span>
                    <h4 className="font-extrabold text-sm text-slate-900">{o.nombre}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    {o.estado}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                  <p>📍 Fase: <strong className="text-slate-800">{o.fase_actual}</strong></p>
                  <p>👤 Responsable: <strong className="text-slate-800">{o.responsable_id || 'Campo'}</strong></p>
                  <p>🏢 Entidad: <strong className="text-slate-800">{o.entidad_id || 'Agrokool'}</strong></p>
                </div>

                {o.predios && o.predios.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Predios Asignados:</span>
                    <div className="flex flex-wrap gap-1">
                      {o.predios.map((p) => (
                        <span key={p.id} className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-semibold">
                          📍 {p.nombre} ({p.superficie_legal_ha} ha)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: PREDIOS */}
      {subTab === 'predios' && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-900">Catálogo de los 17 Predios AGROK</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {predios.map((p) => (
              <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900">📍 {p.nombre}</h4>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                    {p.superficie_legal_ha ? `${p.superficie_legal_ha} ha` : 'S/D'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p>Régimen: <strong className="text-slate-700 uppercase">{p.regimen || 'Propio'}</strong></p>
                  {p.restricciones && (
                    <p className="text-amber-700 font-medium">⚠️ {p.restricciones}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: HISTORIAL REPORTES */}
      {subTab === 'reportes' && (
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-900">Historial de Reportes Sincronizados</h3>

          {reportesHistorial.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-white rounded-3xl border border-slate-200">
              No hay reportes cargados aún.
            </div>
          ) : (
            <div className="space-y-2.5">
              {reportesHistorial.map((r) => (
                <div key={r.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 mr-2">{r.obra_nombre}</span>
                      <span className="text-[10px] text-slate-500">📅 {r.fecha_operativa}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      {r.estado}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-800 mb-0.5">👤 {r.autor_nombre}</p>
                    {r.es_sin_actividad ? (
                      <p className="text-sky-800 font-bold">🌧️ Sin actividad: {r.motivo_sin_actividad}</p>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500">
                          Cuadrilla: {r.cuadrilla?.map(c => `${c.rol_id} (${c.headcount})`).join(', ') || 'N/A'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.lineas?.map((l, i) => (
                            <span key={i} className="bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[10px] font-medium text-emerald-900">
                              📍 {l.predio_nombre}: +{l.cantidad} {l.unidad} ({l.actividad_id})
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva Obra */}
      {isNewObraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Alta de Nueva Obra AGROK
            </h3>

            <form onSubmit={handleCreateObra} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">ID / Código Obra:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: siembra_guayeme_l2"
                  value={newObraId}
                  onChange={(e) => setNewObraId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nombre Canónico:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Siembra Guayeme Lote 2"
                  value={newObraNombre}
                  onChange={(e) => setNewObraNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Fase Inicial:</label>
                <input
                  type="text"
                  value={newObraFase}
                  onChange={(e) => setNewObraFase(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Seleccionar Predios:</label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {predios.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPrediosForObra.includes(p.id)}
                        onChange={() => togglePredioSelection(p.id)}
                        className="accent-slate-900 rounded"
                      />
                      <span>📍 {p.nombre} ({p.superficie_legal_ha} ha)</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewObraOpen(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  Crear Obra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
