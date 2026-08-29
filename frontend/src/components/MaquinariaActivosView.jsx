import React, { useState } from 'react';
import { Tractor, Fuel, Wrench, Shield, CheckCircle2, AlertTriangle, Plus, RefreshCw } from 'lucide-react';
import { saveHorometroApi } from '../services/api';

export default function MaquinariaActivosView({
  maquinaria = [],
  activos = [],
  onRefreshData
}) {
  const [selectedMaquina, setSelectedMaquina] = useState(maquinaria[0]?.id || 'puma');
  const [hInicio, setHInicio] = useState('');
  const [hFin, setHFin] = useState('');
  const [litros, setLitros] = useState('60');
  const [autorNombre, setAutorNombre] = useState('Operador');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmitHorometro = async (e) => {
    e.preventDefault();
    if (!hFin) return;

    setLoading(true);
    setMsg(null);

    try {
      await saveHorometroApi({
        maquina_id: selectedMaquina,
        horometro_inicio: parseFloat(hInicio) || 0,
        horometro_fin: parseFloat(hFin),
        litros: parseFloat(litros) || 0,
        autor_nombre: autorNombre.trim()
      });

      setMsg('✅ Lectura de horómetro registrada correctamente.');
      setHInicio('');
      setHFin('');
      onRefreshData();
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-700 to-orange-800 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Tractor className="w-6 h-6 text-amber-300" />
            <h2 className="text-xl font-extrabold">Maquinaria & Activos AGROK</h2>
          </div>
          <p className="text-xs text-amber-100">
            Control de horómetros, combustible diesel y umbrales de servicio preventivo (300 hrs).
          </p>
        </div>
        <button
          onClick={onRefreshData}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 font-bold">
          {msg}
        </div>
      )}

      {/* Grid: Formulario Rápido + Lista de Máquinas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Formulario de Horómetro */}
        <form onSubmit={handleSubmitHorometro} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Fuel className="w-4 h-4 text-amber-600" />
            <h3 className="font-extrabold text-sm text-slate-900">Registrar Horómetro / Diesel</h3>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Máquina:</label>
            <select
              value={selectedMaquina}
              onChange={(e) => setSelectedMaquina(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            >
              {maquinaria.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">H. Inicio:</label>
              <input
                type="number"
                step="0.1"
                placeholder="1280.0"
                value={hInicio}
                onChange={(e) => setHInicio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">H. Fin:</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="1288.5"
                value={hFin}
                onChange={(e) => setHFin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center font-bold text-amber-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Litros de Diesel:</label>
            <input
              type="number"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
              placeholder="60"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Operador:</label>
            <input
              type="text"
              value={autorNombre}
              onChange={(e) => setAutorNombre(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Guardar Lectura
          </button>
        </form>

        {/* Lista de Máquinas */}
        <div className="md:col-span-2 space-y-3">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Tractor className="w-4 h-4 text-slate-700" />
              Parque de Maquinaria AGROK
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {maquinaria.map((maq) => {
                const umbral = maq.umbral_servicio_hrs || 300;
                const faltaServicio = Math.max(0, Math.round((umbral - (maq.horometro_actual % umbral)) * 10) / 10);
                const isAlerta = faltaServicio <= 20;

                return (
                  <div key={maq.id} className={`p-3 rounded-2xl border ${
                    isAlerta ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{maq.nombre}</span>
                      <span className="text-[10px] font-mono uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                        {maq.tipo}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1">
                      Propietaria: {maq.propietaria_id || 'Aspromex'} · Operador: {maq.operador_habitual || 'General'}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60">
                      <span className="font-mono font-black text-slate-900">{maq.horometro_actual} hrs</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                        isAlerta ? 'bg-amber-200 text-amber-900 font-black animate-pulse' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {faltaServicio} hrs para servicio
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activos Fijos */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Activos Fijos en Predios
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activos.map((act) => (
                <div key={act.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{act.nombre}</span>
                    <span className="text-[10px] text-slate-500">📍 {act.predio_nombre} · Tipo: {act.tipo}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    act.ultimo_estado === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {act.ultimo_estado || 'ok'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
