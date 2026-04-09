import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button, Card } from '../components/ui/Common';
import { cn } from '../lib/utils';
import { Plus, Users, Waves, MapPin, Calendar, Trash2, Edit2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Pool {
  id: string;
  name: string;
  address: string;
}

interface Worker {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Route {
  id: string;
  workerId: string;
  date: string;
  poolIds: string[];
  status: 'pending' | 'in-progress' | 'completed';
}

export default function AdminDashboard() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeTab, setActiveTab] = useState<'routes' | 'pools' | 'workers'>('routes');
  
  // Form states
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [newPool, setNewPool] = useState({ name: '', address: '' });
  
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [newRoute, setNewRoute] = useState({ workerId: '', date: format(new Date(), 'yyyy-MM-dd'), poolIds: [] as string[] });

  useEffect(() => {
    const unsubPools = onSnapshot(collection(db, 'pools'), (snap) => {
      setPools(snap.docs.map(d => ({ id: d.id, ...d.data() } as Pool)));
    });
    const unsubWorkers = onSnapshot(query(collection(db, 'users')), (snap) => {
      setWorkers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Worker)).filter(w => w.role === 'worker'));
    });
    const unsubRoutes = onSnapshot(collection(db, 'routes'), (snap) => {
      setRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Route)));
    });

    return () => {
      unsubPools();
      unsubWorkers();
      unsubRoutes();
    };
  }, []);

  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'pools'), newPool);
      setNewPool({ name: '', address: '' });
      setShowPoolForm(false);
      toast.success('Piscina añadida');
    } catch (e) {
      toast.error('Error al añadir piscina');
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoute.workerId || newRoute.poolIds.length === 0) {
      toast.error('Selecciona un trabajador y al menos una piscina');
      return;
    }
    try {
      await addDoc(collection(db, 'routes'), {
        ...newRoute,
        status: 'pending'
      });
      setNewRoute({ workerId: '', date: format(new Date(), 'yyyy-MM-dd'), poolIds: [] });
      setShowRouteForm(false);
      toast.success('Ruta asignada');
    } catch (e) {
      toast.error('Error al asignar ruta');
    }
  };

  const deleteItem = async (coll: string, id: string) => {
    if (confirm('¿Estás seguro?')) {
      await deleteDoc(doc(db, coll, id));
      toast.info('Eliminado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Panel de Control</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('routes')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'routes' ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
          >
            Rutas
          </button>
          <button 
            onClick={() => setActiveTab('pools')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'pools' ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
          >
            Piscinas
          </button>
          <button 
            onClick={() => setActiveTab('workers')}
            className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'workers' ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
          >
            Equipo
          </button>
        </div>
      </div>

      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Rutas Diarias</h3>
            <Button size="sm" onClick={() => setShowRouteForm(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Nueva Ruta
            </Button>
          </div>

          {showRouteForm && (
            <Card className="p-4 border-blue-200 bg-blue-50">
              <form onSubmit={handleAddRoute} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trabajador</label>
                    <select 
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newRoute.workerId}
                      onChange={e => setNewRoute({...newRoute, workerId: e.target.value})}
                    >
                      <option value="">Seleccionar...</option>
                      {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                    <input 
                      type="date" 
                      className="w-full rounded-lg border-slate-200 p-2 text-sm"
                      value={newRoute.date}
                      onChange={e => setNewRoute({...newRoute, date: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Piscinas (Selecciona varias)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {pools.map(p => (
                      <label key={p.id} className="flex items-center gap-2 text-sm p-1 hover:bg-slate-50 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newRoute.poolIds.includes(p.id)}
                          onChange={e => {
                            const ids = e.target.checked 
                              ? [...newRoute.poolIds, p.id]
                              : newRoute.poolIds.filter(id => id !== p.id);
                            setNewRoute({...newRoute, poolIds: ids});
                          }}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Guardar Ruta</Button>
                  <Button variant="outline" onClick={() => setShowRouteForm(false)}>Cancelar</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-4">
            {routes.map(route => {
              const worker = workers.find(w => w.id === route.workerId);
              return (
                <Card key={route.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{worker?.name || 'Desconocido'}</h4>
                        <p className="text-xs text-slate-500">{route.date} • {route.poolIds.length} piscinas</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      route.status === 'completed' ? "bg-emerald-100 text-emerald-700" :
                      route.status === 'in-progress' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {route.status}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'pools' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Registro de Piscinas</h3>
            <Button size="sm" onClick={() => setShowPoolForm(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Nueva Piscina
            </Button>
          </div>

          {showPoolForm && (
            <Card className="p-4 border-blue-200 bg-blue-50">
              <form onSubmit={handleAddPool} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Cliente / Propiedad</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-lg border-slate-200 p-2 text-sm"
                    value={newPool.name}
                    onChange={e => setNewPool({...newPool, name: e.target.value})}
                    placeholder="Ej: Residencia Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección Completa</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-lg border-slate-200 p-2 text-sm"
                    value={newPool.address}
                    onChange={e => setNewPool({...newPool, address: e.target.value})}
                    placeholder="Calle, Ciudad, FL"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Guardar Piscina</Button>
                  <Button variant="outline" onClick={() => setShowPoolForm(false)}>Cancelar</Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-3">
            {pools.map(pool => (
              <Card key={pool.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                    <Waves className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{pool.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {pool.address}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteItem('pools', pool.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'workers' && (
        <div className="space-y-4">
          <h3 className="font-bold text-slate-700">Equipo de Trabajo</h3>
          <div className="grid gap-3">
            {workers.map(worker => (
              <Card key={worker.id} className="p-4 flex items-center gap-4">
                <div className="bg-slate-100 p-3 rounded-full text-slate-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{worker.name}</h4>
                  <p className="text-xs text-slate-500">{worker.email}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
