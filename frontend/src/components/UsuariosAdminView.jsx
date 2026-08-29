import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Key, Check, X, RefreshCw, Trash2, Edit2, Lock } from 'lucide-react';

export default function UsuariosAdminView({ currentUser }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);

  // Form nuevo usuario
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('campo');
  const [puedeCerrar, setPuedeCerrar] = useState(false);
  const [puedeMedir, setPuedeMedir] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      if (data.success) {
        setUsuarios(data.usuarios || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password || !nombre.trim()) return;

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          nombre: nombre.trim(),
          rol,
          puede_cerrar_incidencias: puedeCerrar,
          puede_registrar_medicion: puedeMedir
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsNewUserOpen(false);
        setUsername('');
        setPassword('');
        setNombre('');
        setRol('campo');
        fetchUsuarios();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleActivo = async (user) => {
    try {
      await fetch(`/api/usuarios/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: user.activo ? 0 : 1 })
      });
      fetchUsuarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'it':
        return <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-[10px]">💻 ADMIN / IT</span>;
      case 'direccion':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px]">📊 DIRECCIÓN</span>;
      case 'supervisor':
        return <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 font-bold text-[10px]">👷 SUPERVISOR</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px]">🛠️ CAMPO</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 text-xs text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-extrabold">Gestión de Usuarios, Roles y Contraseñas</h2>
          </div>
          <p className="text-xs text-slate-300">
            Administración de cuentas con control estricto de accesos a pantallas.
          </p>
        </div>
        <button
          onClick={fetchUsuarios}
          className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-slate-900">Usuarios Registrados ({usuarios.length})</h3>
        <button
          onClick={() => setIsNewUserOpen(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition"
        >
          <UserPlus className="w-3.5 h-3.5" /> Nuevo Usuario
        </button>
      </div>

      {/* Lista de Usuarios */}
      <div className="space-y-2.5">
        {usuarios.map((u) => (
          <div key={u.id} className={`p-4 bg-white rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            u.activo ? 'border-slate-200' : 'border-rose-200 bg-rose-50/30 opacity-70'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-slate-900">{u.nombre}</span>
                <span className="font-mono text-[10px] text-slate-400 font-bold">@{u.username}</span>
                {getRoleBadge(u.rol)}
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span>Cerrar incidencias: <strong>{u.puede_cerrar_incidencias ? 'Sí' : 'No'}</strong></span>
                <span>•</span>
                <span>Registrar mediciones dron: <strong>{u.puede_registrar_medicion ? 'Sí' : 'No'}</strong></span>
                <span>•</span>
                <span>Estado: <strong className={u.activo ? 'text-emerald-700' : 'text-rose-700'}>{u.activo ? 'Activo' : 'Inactivo'}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleActivo(u)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition ${
                  u.activo ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {u.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nuevo Usuario */}
      {isNewUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Alta de Usuario con Rol
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
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
                    placeholder="ej: juan_campo"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Contraseña:</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Rol / Nivel de Acceso:</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                >
                  <option value="campo">🛠️ Campo (Solo Reporte Diario y Horómetros)</option>
                  <option value="supervisor">👷 Supervisor (Tablero 4 Widgets, Incidencias, Obras)</option>
                  <option value="direccion">📊 Dirección (Dashboard Ejecutivo, KPIs, Catálogos)</option>
                  <option value="it">💻 Administrador / IT (Acceso Total y Usuarios)</option>
                </select>
              </div>

              <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[9px] font-bold uppercase text-slate-400 block">Permisos adicionales:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={puedeCerrar}
                    onChange={(e) => setPuedeCerrar(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Permiso para cerrar incidencias (con causa raíz)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={puedeMedir}
                    onChange={(e) => setPuedeMedir(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Permiso para registrar mediciones oficiales de dron</span>
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
    </div>
  );
}
