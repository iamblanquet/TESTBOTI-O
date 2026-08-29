import React, { useState, useEffect } from 'react';
import {
  Users,
  FolderPlus,
  Layers,
  MapPin,
  FileText,
  Bot,
  Shield,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Lock,
  Key,
  Compass
} from 'lucide-react';

export default function AdminWebConsole({ currentUser, onRefreshData }) {
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'proyectos' | 'obras' | 'reportes' | 'bot'
  const [loading, setLoading] = useState(false);

  // Estados de datos
  const [usuarios, setUsuarios] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [obras, setObras] = useState([]);
  const [predios, setPredios] = useState([]);
  const [reportes, setReportes] = useState([]);
  const [botStatus, setBotStatus] = useState(null);

  // Modales
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewObraOpen, setIsNewObraOpen] = useState(false);

  // Form Usuario
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uNombre, setUNombre] = useState('');
  const [uRol, setURol] = useState('campo');
  const [uCrearProj, setUCrearProj] = useState(false);
  const [uCerrarInc, setUCerrarInc] = useState(false);
  const [uRegMed, setURegMed] = useState(false);
  const [uGestMat, setUGestMat] = useState(false);

  // Form Proyecto
  const [pNombre, setPNombre] = useState('');
  const [pTipo, setPTipo] = useState('maiz');
  const [pCiclo, setPCiclo] = useState('Maíz 2026');
  const [pMetaHa, setPMetaHa] = useState('120');
  const [pGerente, setPGerente] = useState('');
  const [pFase, setPFase] = useState('V0_V2');

  // Form Obra
  const [oNombre, setONombre] = useState('');
  const [oProjId, setOProjId] = useState('');
  const [oFase, setOFase] = useState('operacion');
  const [oResp, setOResp] = useState('');
  const [oPredios, setOPredios] = useState([]);

  // Cargar todos los datos para la consola de administración
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, pRes, oRes, rRes, bRes] = await Promise.all([
        fetch('/api/usuarios').then(r => r.json()),
        fetch('/api/proyectos').then(r => r.json()),
        fetch('/api/obras').then(r => r.json()),
        fetch('/api/reportes').then(r => r.json()),
        fetch('/api/bot/status').then(r => r.json())
      ]);

      if (uRes.success) setUsuarios(uRes.usuarios || []);
      if (pRes.success) setProyectos(pRes.proyectos || []);
      if (oRes.success) {
        setObras(oRes.obras || []);
        setPredios(oRes.predios || []);
      }
      if (rRes.success) setReportes(rRes.reportes || []);
      if (bRes.success) setBotStatus(bRes.bot || null);
    } catch (err) {
      console.error('Error cargando datos de admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Handlers de creación
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: uUsername.trim(),
          password: uPassword,
          nombre: uNombre.trim(),
          rol: uRol,
          puede_crear_proyectos: uCrearProj,
          puede_cerrar_incidencias: uCerrarInc,
          puede_registrar_medicion: uRegMed,
          puede_gestionar_materiales: uGestMat
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsNewUserOpen(false);
        setUUsername('');
        setUPassword('');
        setUNombre('');
        loadAdminData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/proyectos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: pNombre.trim(),
          tipo: pTipo,
          ciclo: pCiclo,
          superficie_meta_ha: parseFloat(pMetaHa) || 0,
          fase_catalogo: pFase,
          gerente_id: pGerente || 'Gerente Asignado'
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsNewProjectOpen(false);
        setPNombre('');
        loadAdminData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateObra = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/obras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: oNombre.trim(),
          proyecto_id: oProjId || (proyectos[0] ? proyectos[0].id : 'PRJ-MAIZ-2026'),
          fase_actual: oFase,
          responsable_id: oResp || 'Campo',
          predio_ids: oPredios
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsNewObraOpen(false);
        setONombre('');
        setOPredios([]);
        loadAdminData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const togglePredioSelection = (pid) => {
    if (oPredios.includes(pid)) {
      setOPredios(oPredios.filter(p => p !== pid));
    } else {
      setOPredios([...oPredios, pid]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-20 text-xs text-slate-800">
      {/* Header Consola Administrador */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="w-7 h-7 text-indigo-400" />
            <h2 className="text-xl font-black tracking-tight">Consola Web de Administración AGROK</h2>
            <span className="bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded text-[10px] border border-indigo-400/30">
              PORTAL ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Control de usuarios y funciones (recuerda: los Gerentes reciben reportes y crean proyectos/tareas).
          </p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={loading}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refrescar Todo</span>
        </button>
      </div>

      {/* Navegación por Módulos de Administración */}
      <div className="flex bg-slate-200 p-1 rounded-2xl gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'usuarios' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>1. Usuarios & Funciones ({usuarios.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('proyectos')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'proyectos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderPlus className="w-4 h-4 text-emerald-600" />
          <span>2. Proyectos & Gerencias ({proyectos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('obras')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'obras' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-sky-600" />
          <span>3. Obras & 17 Predios ({obras.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reportes')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'reportes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          <span>4. Auditoría de Reportes ({reportes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bot')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'bot' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bot className="w-4 h-4 text-amber-600" />
          <span>5. Bot & Telegram</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* PESTAÑA 1: GESTIÓN DE USUARIOS Y FUNCIONES          */}
      {/* ==================================================== */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Usuarios del Sistema y Permisos de Pantalla</h3>
              <p className="text-[11px] text-slate-400">Asigna roles específicos (Operador, Gerente/Supervisor, Dirección o Administrador IT).</p>
            </div>
            <button
              onClick={() => setIsNewUserOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <UserPlus className="w-4 h-4" /> Alta de Usuario
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-extrabold">
                    <th className="p-3.5">Nombre & Usuario</th>
                    <th className="p-3.5">Rol en AGROK</th>
                    <th className="p-3.5">Crear Proyectos/Tareas</th>
                    <th className="p-3.5">Cerrar Incidencias</th>
                    <th className="p-3.5">Mediciones Dron</th>
                    <th className="p-3.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{u.nombre}</span>
                        <span className="font-mono text-slate-400 text-[10px]">@{u.username}</span>
                      </td>
                      <td className="p-3.5">
                        {u.rol === 'it' && <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px]">💻 ADMIN / IT</span>}
                        {u.rol === 'direccion' && <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px]">📊 DIRECCIÓN</span>}
                        {u.rol === 'supervisor' && <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 font-bold text-[10px]">👷 GERENTE / SUPERVISOR</span>}
                        {u.rol === 'campo' && <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px]">🛠️ OPERADOR CAMPO</span>}
                      </td>
                      <td className="p-3.5 font-bold">
                        {u.puede_crear_proyectos ? <span className="text-emerald-700">✅ Sí (Crea tareas)</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3.5 font-bold">
                        {u.puede_cerrar_incidencias ? <span className="text-emerald-700">✅ Sí (Con Causa Raíz)</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3.5 font-bold">
                        {u.puede_registrar_medicion ? <span className="text-purple-700">🛰️ Dron Oficial</span> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${u.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PESTAÑA 2: PROYECTOS & GERENCIAS (Creación de Tareas)*/}
      {/* ==================================================== */}
      {activeTab === 'proyectos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Proyectos Agrícolas y Gerencias Asignadas</h3>
              <p className="text-[11px] text-slate-400">Los Gerentes supervisan estos proyectos y reciben los reportes de campo diarios.</p>
            </div>
            <button
              onClick={() => setIsNewProjectOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Nuevo Proyecto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {proyectos.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[9px] uppercase font-bold text-slate-400">{p.id}</span>
                    <h4 className="font-extrabold text-sm text-slate-900">{p.nombre}</h4>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] uppercase">
                    {p.tipo}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <p>👤 <strong>Gerente Responsable:</strong> <span className="text-slate-900 font-bold">{p.gerente_id || 'Por asignar'}</span></p>
                  <p>🎯 <strong>Superficie Meta:</strong> <span className="text-emerald-700 font-bold">{p.superficie_meta_ha} ha</span></p>
                  <p>📅 <strong>Ciclo:</strong> {p.ciclo}</p>
                  <p>📍 <strong>Fase Catálogo:</strong> {p.fase_catalogo || 'General'}</p>
                </div>

                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Obras vinculadas: <strong>{p.obras_count || 0}</strong></span>
                  <span className="text-emerald-600 font-bold">Estado: {p.estado || 'Activo'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PESTAÑA 3: OBRAS & 17 PREDIOS                       */}
      {/* ==================================================== */}
      {activeTab === 'obras' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Obras Operativas y los 17 Predios</h3>
              <p className="text-[11px] text-slate-400">Asignación de frentes de trabajo y predios vinculados.</p>
            </div>
            <button
              onClick={() => setIsNewObraOpen(true)}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Nueva Obra
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {obras.map((o) => (
              <div key={o.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[9px] uppercase font-bold text-slate-400">{o.id}</span>
                    <h4 className="font-extrabold text-sm text-slate-900">{o.nombre}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 uppercase">
                    {o.estado}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p>📍 Fase actual: <strong className="text-slate-800">{o.fase_actual}</strong></p>
                  <p>👤 Responsable de campo: <strong className="text-slate-800">{o.responsable_id || 'Campo'}</strong></p>
                  <p>📁 Proyecto padre: <strong className="text-slate-800">{o.proyecto_id}</strong></p>
                </div>

                {o.predios && o.predios.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase mb-1">Predios Asignados:</span>
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

      {/* ==================================================== */}
      {/* PESTAÑA 4: AUDITORÍA DE REPORTES                    */}
      {/* ==================================================== */}
      {activeTab === 'reportes' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Auditoría de Reportes Recibidos desde Campo</h3>
            <p className="text-[11px] text-slate-400">Desglose de marcas de tiempo de captura offline y avances registrados.</p>
          </div>

          <div className="space-y-2.5">
            {reportes.map((r) => (
              <div key={r.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 mr-2">{r.obra_nombre}</span>
                    <span className="text-[10px] text-slate-500 font-mono">📅 Operativa: {r.fecha_operativa}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                    {r.estado}
                  </span>
                </div>

                <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1">
                  <p className="font-bold text-slate-800">👤 Reportó: {r.autor_nombre}</p>
                  {r.es_sin_actividad ? (
                    <p className="text-sky-800 font-bold">🌧️ Día Sin Actividad: {r.motivo_sin_actividad}</p>
                  ) : (
                    <>
                      <p className="text-[10px] text-slate-500">
                        👥 Cuadrilla: {r.cuadrilla?.map(c => `${c.rol_id} (${c.headcount})`).join(', ') || 'N/A'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.lineas?.map((l, i) => (
                          <span key={i} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold text-emerald-900">
                            📍 {l.predio_nombre}: +{l.cantidad} {l.unidad} ({l.actividad_id})
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <p className="text-[9px] font-mono text-slate-400">
                  ⏱️ Capturado en campo (Offline): {r.recibido_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* PESTAÑA 5: BOT & TELEGRAM                           */}
      {/* ==================================================== */}
      {activeTab === 'bot' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-amber-500" />
              Estado del Bot de Telegram AGROK
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Bot Activo</span>
                <span className="font-bold text-slate-900 text-xs">
                  {botStatus?.hasActiveBot ? `Conectado (@${botStatus?.botInfo?.username || 'Bot'})` : 'Sin conexión'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">URL de la Mini App</span>
                <span className="font-mono text-slate-800 text-[10px] truncate block">
                  {botStatus?.webAppUrl || 'https://testboti-o.onrender.com'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ALTA DE USUARIO CON FUNCIONES Y CONTRASEÑA */}
      {isNewUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Crear Nuevo Usuario y Asignar Funciones
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Lic. Fernando Gerente"
                  value={uNombre}
                  onChange={(e) => setUNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Usuario:</label>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    placeholder="ej: fernando"
                    value={uUsername}
                    onChange={(e) => setUUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Contraseña:</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={uPassword}
                    onChange={(e) => setUPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Rol en el Sistema:</label>
                <select
                  value={uRol}
                  onChange={(e) => {
                    const r = e.target.value;
                    setURol(r);
                    if (r === 'supervisor' || r === 'direccion' || r === 'it') {
                      setUCrearProj(true);
                      setUCerrarInc(true);
                      setUGestMat(true);
                    } else {
                      setUCrearProj(false);
                      setUCerrarInc(false);
                      setUGestMat(false);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="campo">🛠️ Operador de Campo (Solo captura de reportes)</option>
                  <option value="supervisor">👷 Gerente / Supervisor (Recibe reportes y crea tareas/proyectos)</option>
                  <option value="direccion">📊 Dirección General (Consulta de avance y KPIs)</option>
                  <option value="it">💻 Administrador / IT (Acceso total)</option>
                </select>
              </div>

              <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">Funciones habilitadas:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={uCrearProj}
                    onChange={(e) => setUCrearProj(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Crear proyectos, tareas y asignar obras</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={uCerrarInc}
                    onChange={(e) => setUCerrarInc(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Cerrar incidencias (con Causa Raíz)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={uRegMed}
                    onChange={(e) => setURegMed(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Registrar mediciones oficiales de Dron</span>
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewUserOpen(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ALTA DE PROYECTO & ASIGNACIÓN DE GERENTE */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-600" />
              Crear Nuevo Proyecto Agrícola
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nombre del Proyecto:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Proyecto Sorgo y Maíz 2026"
                  value={pNombre}
                  onChange={(e) => setPNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Tipo:</label>
                  <select
                    value={pTipo}
                    onChange={(e) => setPTipo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="maiz">🌽 Maíz</option>
                    <option value="papaya">🥭 Papaya / Frutales</option>
                    <option value="ganaderia">🐄 Ganadería / Pastos</option>
                    <option value="reforestacion">🌳 Reforestación</option>
                    <option value="infraestructura">🏗️ Infraestructura</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Meta en Hectáreas:</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="120.0"
                    value={pMetaHa}
                    onChange={(e) => setPMetaHa(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Gerente / Supervisor Asignado:</label>
                <input
                  type="text"
                  placeholder="ej: Ing. Carlos / Karen"
                  value={pGerente}
                  onChange={(e) => setPGerente(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewProjectOpen(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md"
                >
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ALTA DE OBRA / TAREA */}
      {isNewObraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Alta de Obra / Tarea Operativa
            </h3>

            <form onSubmit={handleCreateObra} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nombre de la Obra:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Siembra Guayeme Lote 3"
                  value={oNombre}
                  onChange={(e) => setONombre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Proyecto:</label>
                  <select
                    value={oProjId}
                    onChange={(e) => setOProjId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-[11px]"
                  >
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Fase:</label>
                  <input
                    type="text"
                    value={oFase}
                    onChange={(e) => setOFase(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Responsable en Campo:</label>
                <input
                  type="text"
                  placeholder="ej: Abner / Armando"
                  value={oResp}
                  onChange={(e) => setOResp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Predios Asignados:</label>
                <div className="max-h-28 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {predios.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={oPredios.includes(p.id)}
                        onChange={() => togglePredioSelection(p.id)}
                        className="accent-sky-600 rounded"
                      />
                      <span>📍 {p.nombre} ({p.superficie_legal_ha} ha)</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewObraOpen(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs shadow-md"
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
