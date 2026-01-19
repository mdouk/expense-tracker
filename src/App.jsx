import React, { useState, useEffect, useMemo } from 'react';
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut, updateProfile
} from 'firebase/auth';
import {
  Plus, Trash2, ArrowLeft, X, Folder, ChevronRight,
  CreditCard, LogOut, MoreVertical, LayoutGrid, List as ListIcon
} from 'lucide-react';
import { initializeApp } from "firebase/app";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyAhnhaae7BUPcho7VWOOFtZgXI41Js293I",
  authDomain: "expense-tracker-54bda.firebaseapp.com",
  projectId: "expense-tracker-54bda",
  storageBucket: "expense-tracker-54bda.firebasestorage.app",
  messagingSenderId: "911750100410",
  appId: "1:911750100410:web:14ecae5a3120293c621983",
  measurementId: "G-K5JNZH1G3L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "default-app-id";

// --- Components ---

// 1. Modern Card Component
const Card = ({ children, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all duration-200 cursor-pointer ${className}`}
  >
    {children}
  </div>
);

// 2. Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-zinc-50 px-6 py-5">
          <h3 className="font-semibold text-zinc-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default function ExpenseTracker() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');

  // Data
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [view, setView] = useState('dashboard');
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Form Inputs
  const [formData, setFormData] = useState({ item: '', quantity: '1', priceMode: 'total', priceInput: '', comments: '' });
  const [newProjectName, setNewProjectName] = useState('');

  // --- Auth & Sync ---
  const signInWithGoogle = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { console.error(e); }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.displayName) setDisplayName(u.displayName);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');

    // Robust sort function that handles missing/pending timestamps safely
    const sortByTime = (a, b) => {
      const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
      const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
      return tB - tA; // Newest first
    };

    const unsubP = onSnapshot(
      query(projectsRef, orderBy("timestamp", "desc")),
      (s) => {
        setProjects(s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
        setLoading(false);
      }
    );

    const unsubE = onSnapshot(
      query(expensesRef, orderBy("timestamp", "desc")),
      (s) => {
        setExpenses(s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })));
      }
    );

    return () => { unsubP(); unsubE(); };
  }, [user, db, appId]);

  // --- Actions ---
  const handleUpdateName = async () => {
    if (user && displayName.trim()) await updateProfile(user, { displayName });
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), {
      name: newProjectName, createdBy: user.uid, creatorName: displayName, timestamp: serverTimestamp()
    });
    setNewProjectName(''); setIsProjectModalOpen(false);
  };

  const deleteProject = async (pid, e) => {
    e.stopPropagation();
    if (window.confirm("Delete project and all expenses?")) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'projects', pid));
      expenses.filter(ex => ex.projectId === pid).forEach(ex =>
        batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', ex.id)));
      await batch.commit();
      if (currentProjectId === pid) {
        setView('dashboard');
        setCurrentProjectId(null);
      }
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!formData.item || !formData.priceInput) return;
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.priceInput) || 0;
    const total = formData.priceMode === 'total' ? price : price * qty;
    const unit = formData.priceMode === 'total' ? (qty > 0 ? price / qty : 0) : price;

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), {
      projectId: currentProjectId, item: formData.item, quantity: qty, unitPrice: unit, totalPrice: total,
      userId: user.uid, userName: displayName, comments: formData.comments, timestamp: serverTimestamp()
    });
    setFormData({ item: '', quantity: '1', priceMode: 'total', priceInput: '', comments: '' });
    setIsFormOpen(false);
  };

  const deleteExpense = async (id) => {
    if (window.confirm("Delete expense?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id));
  };

  // --- Helpers ---
  const formatMoney = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  const projectTotal = (pid) => expenses.filter(e => e.projectId === pid).reduce((sum, e) => sum + (e.totalPrice || 0), 0);
  const grandTotal = expenses.reduce((sum, e) => sum + (e.totalPrice || 0), 0);

  const currentProject = useMemo(
    () => projects.find(p => p.id === currentProjectId),
    [projects, currentProjectId]
  );

  const currentExpenses = useMemo(
    () => expenses.filter(e => e.projectId === currentProjectId),
    [expenses, currentProjectId]
  );

  // --- Render ---
  if (!user) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl shadow-zinc-200 ring-1 ring-zinc-100">
        <CreditCard className="h-8 w-8 text-zinc-900" />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tighter text-zinc-900">Expense Tracker</h1>
      <p className="mb-8 max-w-xs text-sm text-zinc-500 font-medium leading-relaxed">Simple, elegant expense tracking for your personal portfolio.</p>
      <button onClick={signInWithGoogle} className="group relative flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-zinc-900 px-6 py-4 font-semibold text-white transition-all hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 shadow-lg shadow-zinc-200">
        <span>Continue with Google</span>
        <ChevronRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-32 text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-zinc-200/50 bg-white/80 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {view === 'project' ? (
            <button onClick={() => setView('dashboard')} className="group flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 group-hover:bg-zinc-200 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-200">
                <LayoutGrid className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight">Dashboard</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-zinc-200 focus-within:bg-white">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <input
                className="w-24 bg-transparent text-xs font-semibold outline-none placeholder:text-zinc-400"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={handleUpdateName}
              />
            </div>
            <button onClick={() => signOut(auth)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {view === 'dashboard' ? (
          <>
            <div className="mb-12">
              <h2 className="text-sm font-medium text-zinc-500 mb-1">Total Expenses</h2>
              <div className="text-5xl font-bold tracking-tighter text-zinc-900">{formatMoney(grandTotal)}</div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">Your Projects</h3>
              <button onClick={() => setIsProjectModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-zinc-800 transition-transform active:scale-95">
                <Plus className="h-4 w-4" /> New Project
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projects.map(p => (
                <Card key={p.id} onClick={() => { setCurrentProjectId(p.id); setView('project'); }} className="group relative p-5">
                  <div className="flex items-start justify-between mb-8">
                    <div className="h-10 w-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:scale-110 group-hover:bg-zinc-100 group-hover:text-zinc-900 transition-all duration-300">
                      <Folder className="h-5 w-5" />
                    </div>
                    <button onClick={(e) => deleteProject(p.id, e)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:text-red-500 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 mb-1">{p.name}</h4>
                    <p className="text-2xl font-bold tracking-tight text-zinc-900">{formatMoney(projectTotal(p.id))}</p>
                  </div>
                </Card>
              ))}
              {projects.length === 0 && !loading && (
                <div className="col-span-full py-16 text-center rounded-3xl border-2 border-dashed border-zinc-200 bg-zinc-50/50">
                  <p className="text-zinc-400 font-medium">No projects yet. Create one to start.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8">
            <header className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-1">{currentProject?.name}</h1>
                <p className="text-sm font-medium text-zinc-400">Created by {currentProject?.creatorName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Total</p>
                <div className="text-2xl font-bold tracking-tight tabular-nums">{formatMoney(projectTotal(currentProject.id))}</div>
              </div>
            </header>

            <div className="flex gap-2 border-b border-zinc-100 pb-1">
              {['list', 'stats'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-1.5 ${activeTab === tab ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
                >
                  {tab === 'list' ? 'Transactions' : 'Analysis'}
                </button>
              ))}
            </div>

            {activeTab === 'list' ? (
              <div className="space-y-3">
                {currentExpenses.map(ex => (
                  <div key={ex.id} className="group relative flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-zinc-100 transition-all hover:border-zinc-300">
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 font-bold text-xs">
                        {ex.item.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900">{ex.item}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="font-medium text-zinc-500">{ex.userName}</span>
                          {ex.quantity > 1 && <span className="bg-zinc-100 px-1.5 rounded text-zinc-600">{ex.quantity}x</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-zinc-900">{formatMoney(ex.totalPrice)}</p>
                        {ex.quantity > 1 && <p className="text-[10px] text-zinc-400">{formatMoney(ex.unitPrice)} /unit</p>}
                      </div>
                      <button onClick={() => deleteExpense(ex.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 hover:bg-red-50 hover:text-red-500 rounded-full transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {currentExpenses.length === 0 && <div className="py-12 text-center text-zinc-400 italic">No transactions yet.</div>}
              </div>
            ) : (
              <div className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl">
                <h3 className="mb-6 font-bold">Spending Distribution</h3>
                {/* Logic for stats would go here, simplified for display */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center opacity-80">
                    <span>{displayName}</span>
                    <span className="font-mono">{formatMoney(projectTotal(currentProject.id))}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-white w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {view === 'project' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 rounded-full bg-zinc-900 pl-4 pr-6 py-3.5 font-semibold text-white shadow-xl hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all ring-4 ring-white">
            <div className="rounded-full bg-zinc-700 p-1"><Plus className="h-4 w-4" /></div>
            <span>Add Expense</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="New Project">
        <form onSubmit={createProject}>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Project Name</label>
          <input autoFocus className="mb-6 w-full border-b-2 border-zinc-100 bg-transparent py-2 text-lg font-semibold outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-300" placeholder="e.g. Q4 Marketing" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
          <button className="w-full rounded-xl bg-zinc-900 py-3.5 font-bold text-white shadow-lg hover:bg-zinc-800 active:scale-95 transition-all">Create Project</button>
        </form>
      </Modal>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Entry">
        <form onSubmit={addExpense}>
          <div className="mb-8 text-center">
            <div className="inline-flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-zinc-300">€</span>
              <input type="number" step="0.01" required placeholder="0.00" className="w-40 bg-transparent text-center text-5xl font-bold tracking-tighter outline-none placeholder:text-zinc-200" value={formData.priceInput} onChange={e => setFormData({ ...formData, priceInput: e.target.value })} />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Description</label>
              <input required className="w-full rounded-xl bg-zinc-50 border-none px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all" placeholder="What is it?" value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Quantity</label>
                <input type="number" className="w-full rounded-xl bg-zinc-50 border-none px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-zinc-900/10" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Type</label>
                <div className="flex rounded-xl bg-zinc-100 p-1">
                  {['total', 'unit'].map(m => (
                    <button key={m} type="button" onClick={() => setFormData({ ...formData, priceMode: m })} className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase transition-all ${formData.priceMode === m ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button className="mt-8 w-full rounded-xl bg-zinc-900 py-4 font-bold text-white shadow-xl hover:bg-zinc-800 active:scale-95 transition-all">Add Transaction</button>
        </form>
      </Modal>
    </div>
  );
}