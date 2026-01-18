import React, { useState, useEffect, useMemo } from 'react';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  Plus,
  Trash2,
  Receipt,
  User,
  ArrowLeft,
  Check,
  X,
  TrendingUp,
  Folder,
  LayoutDashboard,
  Wallet,
  LogOut,
  ChevronRight,
  CreditCard
} from 'lucide-react';

// --- Firebase Configuration ---
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAhnhaae7BUPcho7VWOOFtZgXI41Js293I",
  authDomain: "expense-tracker-54bda.firebaseapp.com",
  projectId: "expense-tracker-54bda",
  storageBucket: "expense-tracker-54bda.firebasestorage.app",
  messagingSenderId: "911750100410",
  appId: "1:911750100410:web:14ecae5a3120293c621983",
  measurementId: "G-K5JNZH1G3L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app);
const db = getFirestore(app);
const appId = "default-app-id";

export default function ExpenseTracker() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');

  // Data State
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [syncError, setSyncError] = useState(null);

  const loading = loadingProjects || loadingExpenses;

  // UI State
  const [view, setView] = useState('dashboard');
  const [currentProject, setCurrentProject] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Form State
  const [formData, setFormData] = useState({
    item: '',
    quantity: '1',
    priceMode: 'total',
    priceInput: '',
    comments: ''
  });

  const [newProjectName, setNewProjectName] = useState('');

  const provider = new GoogleAuthProvider();

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // --- Auth & Data Subscription ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser?.displayName) {
        setDisplayName(currentUser.displayName);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const projectsQuery = query(projectsRef, orderBy('timestamp', 'desc'));

    const unsubProjects = onSnapshot(projectsQuery, (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingProjects(false);
    }, (err) => {
      console.error("Projects Sync Error:", err);
      setSyncError("Failed to sync projects. Please check your connection or permissions.");
      setLoadingProjects(false);
    });

    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
    const expensesQuery = query(expensesRef, orderBy('timestamp', 'desc'));

    const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingExpenses(false);
    }, (err) => {
      console.error("Expenses Sync Error:", err);
      setSyncError("Failed to sync expenses. Please check your connection or permissions.");
      setLoadingExpenses(false);
    });

    return () => {
      unsubProjects();
      unsubExpenses();
    };
  }, [user]);

  // --- Handlers ---
  const handleUpdateName = async () => {
    if (!user || !displayName.trim()) return;
    try {
      await updateProfile(user, { displayName: displayName });
    } catch (error) {
      console.error("Profile Update Error:", error);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), {
        name: newProjectName,
        createdBy: user.uid,
        creatorName: displayName || 'Anonymous',
        timestamp: serverTimestamp()
      });
      setNewProjectName('');
      setIsProjectModalOpen(false);
    } catch (error) {
      console.error("Create Project Error:", error);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    const confirmMessage = "HARD DELETE PROJECT?\n\nThis will permanently delete the project AND ALL its expenses.\n\nThis cannot be undone. Continue?";
    if (window.confirm(confirmMessage)) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'projects', projectId));
        const relatedExpenses = expenses.filter(ex => ex.projectId === projectId);
        relatedExpenses.forEach(ex => {
          batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', ex.id));
        });
        await batch.commit();
        if (currentProject?.id === projectId) {
          setView('dashboard');
          setCurrentProject(null);
        }
      } catch (error) {
        console.error("Delete Project Error:", error);
      }
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!formData.item || !formData.priceInput || !currentProject) return;

    const qty = parseFloat(formData.quantity) || 0;
    const inputPrice = parseFloat(formData.priceInput) || 0;
    let total = formData.priceMode === 'total' ? inputPrice : inputPrice * qty;
    let unit = formData.priceMode === 'total' ? (qty > 0 ? inputPrice / qty : 0) : inputPrice;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), {
        projectId: currentProject.id,
        item: formData.item,
        quantity: qty,
        unitPrice: unit,
        totalPrice: total,
        userId: user.uid,
        userName: displayName || 'Anonymous',
        comments: formData.comments,
        timestamp: serverTimestamp()
      });
      setFormData({ item: '', quantity: '1', priceMode: 'total', priceInput: '', comments: '' });
      setIsFormOpen(false);
    } catch (error) {
      console.error("Add Expense Error:", error);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id));
      } catch (error) {
        console.error("Delete Expense Error:", error);
      }
    }
  };

  // --- Formatting Helpers ---
  const formatEuro = (val) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);

  // --- Memoized Calcs ---
  const projectExpenses = useMemo(() =>
    expenses.filter(e => e.projectId === currentProject?.id),
    [expenses, currentProject]
  );

  const projectTotalsMap = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      map[e.projectId] = (map[e.projectId] || 0) + (e.totalPrice || 0);
    });
    return map;
  }, [expenses]);

  const grandTotal = useMemo(() =>
    expenses.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0),
    [expenses]
  );

  const statsByUser = useMemo(() => {
    const stats = {};
    projectExpenses.forEach(e => {
      const name = e.userName || 'Anonymous';
      stats[name] = (stats[name] || 0) + e.totalPrice;
    });
    return stats;
  }, [projectExpenses]);

  // --- Login View ---
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4 font-sans text-zinc-900">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 mb-6">
            <CreditCard className="h-6 w-6 text-zinc-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Finance</h1>
          <p className="text-zinc-500 mb-8">Sign in to manage your portfolio.</p>

          <button
            onClick={signInWithGoogle}
            className="w-full rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 transition-all"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // --- Loading View ---
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white font-sans">
      <div className="text-center">
        <div className="mb-4 inline-flex">
          <div className={`h-8 w-8 rounded-full border-2 border-zinc-200 border-t-zinc-900 ${!syncError ? 'animate-spin' : ''}`} />
        </div>
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
          {syncError ? "Sync Error" : "Loading"}
        </p>

        {syncError && (
          <div className="mt-6 max-w-xs rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            <p className="mb-3 font-medium">{syncError}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-md bg-white px-3 py-2 text-xs font-bold shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // --- Main App ---
  return (
    <div className="min-h-screen bg-white pb-32 font-sans text-zinc-900 antialiased selection:bg-zinc-100 selection:text-zinc-900">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          {view === 'project' ? (
            <button
              onClick={() => setView('dashboard')}
              className="group flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-zinc-900" />
              <span className="text-sm font-bold tracking-tight">Dashboard</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="group relative flex items-center gap-2 rounded-full border border-zinc-200 bg-transparent px-3 py-1.5 transition-colors hover:border-zinc-300 focus-within:border-zinc-400 focus-within:ring-1 focus-within:ring-zinc-400">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <input
                className="w-20 bg-transparent text-xs font-medium outline-none placeholder:text-zinc-400"
                placeholder="Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={handleUpdateName}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {view === 'dashboard' ? (
          <>
            {/* Minimal Metric */}
            <div className="mb-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Total Balance</p>
              <div className="flex items-baseline gap-1">
                <h2 className="text-5xl font-bold tracking-tighter text-zinc-900">{formatEuro(grandTotal)}</h2>
              </div>
            </div>

            {/* Projects List Header */}
            <div className="mb-4 flex items-end justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-sm font-semibold text-zinc-900">Projects <span className="ml-2 text-xs text-zinc-400 font-normal">{projects.length} sheets</span></h3>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-md bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>

            {/* Linear-Style List */}
            <div className="flex flex-col gap-1">
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setCurrentProject(p); setView('project'); }}
                  className="group relative flex cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-3 transition-all hover:bg-zinc-50 hover:border-zinc-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-zinc-100 bg-white text-zinc-400 shadow-sm">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-zinc-900">{p.name}</h4>
                      <p className="text-[10px] text-zinc-400">{p.creatorName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-zinc-900 tabular-nums">{formatEuro(projectTotalsMap[p.id] || 0)}</span>
                    <button
                      onClick={(e) => handleDeleteProject(p.id, e)}
                      className="invisible flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-red-600 group-hover:visible transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-zinc-300" />
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50">
                  <p className="text-xs font-medium text-zinc-400">No active sheets</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-8">
            {/* Project Header */}
            <div>
              <div className="mb-6 flex items-baseline justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{currentProject?.name}</h1>
                  <p className="text-xs text-zinc-400 mt-1">Managed by {currentProject?.creatorName}</p>
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-bold tracking-tight tabular-nums">{formatEuro(projectTotalsMap[currentProject?.id] || 0)}</span>
                </div>
              </div>

              {/* Segmented Controls */}
              <div className="inline-flex rounded-lg bg-zinc-100 p-1">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${activeTab === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${activeTab === 'stats' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Distribution
                </button>
              </div>
            </div>

            {activeTab === 'list' ? (
              <div className="min-h-[200px]">
                {/* Table Header */}
                <div className="mb-2 grid grid-cols-12 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  <div className="col-span-6">Item</div>
                  <div className="col-span-3 text-right">Cost</div>
                  <div className="col-span-3 text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-zinc-50">
                  {projectExpenses.map(ex => (
                    <div key={ex.id} className="group grid grid-cols-12 items-center py-3 px-3 transition-colors hover:bg-zinc-50 rounded-md">
                      <div className="col-span-6 pr-4">
                        <p className="text-sm font-medium text-zinc-900 truncate">{ex.item}</p>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                          <span className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600 font-medium">{ex.quantity}x</span>
                          <span>{formatEuro(ex.unitPrice)}</span>
                          <span>•</span>
                          <span>{ex.userName}</span>
                        </div>

                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-sm font-medium tabular-nums text-zinc-900">{formatEuro(ex.totalPrice)}</span>
                      </div>
                      <div className="col-span-3 flex justify-end">
                        <button
                          onClick={() => handleDeleteExpense(ex.id)}
                          className="invisible rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 group-hover:visible transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {ex.comments && (
                        <div className="col-span-12 mt-2 pl-2 border-l-2 border-zinc-100 text-xs text-zinc-500 italic">
                          {ex.comments}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {projectExpenses.length === 0 && (
                  <div className="py-12 text-center text-sm text-zinc-400 italic">
                    No entries yet. Add one to get started.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
                <h3 className="mb-6 text-xs font-semibold uppercase tracking-wider text-zinc-900">Cost Breakdown</h3>
                <div className="space-y-4">
                  {Object.entries(statsByUser).map(([name, total]) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="text-sm font-medium text-zinc-600">{name}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-zinc-900">{formatEuro(total)}</span>
                    </div>
                  ))}
                  {Object.keys(statsByUser).length === 0 && (
                    <p className="text-center text-sm text-zinc-400">No data available.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {view === 'project' && (
        <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <button
            onClick={() => setIsFormOpen(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white shadow-xl shadow-zinc-200 ring-1 ring-zinc-900 transition-transform active:scale-95 hover:bg-zinc-800"
          >
            <Plus className="h-5 w-5" />
            <span>Add Entry</span>
          </button>
        </div>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsProjectModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="mb-1 text-lg font-bold text-zinc-900">New Sheet</h3>
            <p className="mb-6 text-sm text-zinc-500">Create a new collection for expenses.</p>

            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-zinc-900 mb-1.5">Name</label>
                <input
                  autoFocus
                  className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm font-medium placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-0 transition-colors"
                  placeholder="e.g. Q4 Marketing"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                />
              </div>
              <button className="w-full rounded-md bg-zinc-900 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-colors shadow-sm">
                Create Sheet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between border-b border-zinc-50 px-6 py-4">
              <h3 className="font-bold text-zinc-900">Add Entry</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6">
              <div className="mb-6">
                <div className="relative">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-medium text-zinc-300">€</span>
                  <input
                    type="number" required step="0.01"
                    placeholder="0,00"
                    className="w-full bg-transparent p-0 pl-6 text-4xl font-bold tracking-tight text-zinc-900 placeholder:text-zinc-200 border-none focus:ring-0 outline-none"
                    value={formData.priceInput}
                    onChange={e => setFormData({ ...formData, priceInput: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Item Name</label>
                  <input
                    required autoFocus
                    placeholder="e.g. Uber Ride"
                    className="w-full border-b border-zinc-100 bg-transparent py-2 text-sm font-medium placeholder:text-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors"
                    value={formData.item}
                    onChange={e => setFormData({ ...formData, item: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Quantity</label>
                    <input
                      type="number" required step="0.01"
                      className="w-full border-b border-zinc-100 bg-transparent py-2 text-sm font-medium focus:border-zinc-900 focus:outline-none transition-colors"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Pricing Logic</label>
                    <div className="flex bg-zinc-50 rounded-md p-1">
                      <button type="button" onClick={() => setFormData({ ...formData, priceMode: 'total' })} className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wide rounded ${formData.priceMode === 'total' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}>Total</button>
                      <button type="button" onClick={() => setFormData({ ...formData, priceMode: 'unit' })} className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wide rounded ${formData.priceMode === 'unit' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400'}`}>Unit</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Comments</label>
                  <textarea
                    placeholder="Optional notes..."
                    rows="2"
                    className="w-full rounded-md bg-zinc-50 border-none py-2 px-3 text-sm text-zinc-600 placeholder:text-zinc-300 focus:ring-1 focus:ring-zinc-200 resize-none transition-all"
                    value={formData.comments}
                    onChange={e => setFormData({ ...formData, comments: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-8">
                <button className="w-full rounded-md bg-zinc-900 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200">
                  Convert to Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}