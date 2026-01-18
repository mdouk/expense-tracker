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
  FolderPlus,
  LayoutDashboard,
  Wallet
} from 'lucide-react';

// --- Firebase Configuration ---
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function ExpenseTracker() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');

  // Data State
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const initAuth = async () => {
      try {
        //
      } catch (error) {
        console.error("Auth Initialization Error:", error);
      }
    };
    initAuth();

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
    }, (err) => console.error("Projects Sync Error:", err));

    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
    const expensesQuery = query(expensesRef, orderBy('timestamp', 'desc'));

    const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => console.error("Expenses Sync Error:", err));

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
  const formatDate = (ts) => ts ? new Date(ts.seconds * 1000).toLocaleDateString('de-DE') : 'Syncing...';

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

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Sign in</h2>
          <button
            onClick={signInWithGoogle}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <TrendingUp className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
        <p className="text-slate-500 font-medium">Loading Workspace...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          {view === 'project' ? (
            <button onClick={() => setView('dashboard')} className="flex items-center text-slate-600 hover:text-indigo-600 font-medium transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-800">Dashboard</span>
            </div>
          )}

          <div className="flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-slate-200">
            <User className="w-3.5 h-3.5 text-slate-400 mr-2" />
            <input
              className="bg-transparent text-xs text-slate-700 w-24 outline-none focus:w-32 transition-all"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={handleUpdateName}
            />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {view === 'dashboard' ? (
          <>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">Total Portfolio Spend</p>
                <h2 className="text-2xl font-black text-slate-800">{formatEuro(grandTotal)}</h2>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl">
                <Wallet className="w-6 h-6 text-indigo-600" />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Folder className="w-4 h-4 text-slate-400" />
                Active Sheets
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 rounded-lg shadow-md shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4" /> New Sheet
              </button>
            </div>

            <div className="grid gap-3">
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setCurrentProject(p); setView('project'); }}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer group hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-lg group-hover:bg-indigo-50 transition-colors">
                      <Receipt className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">By {p.creatorName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-slate-700">{formatEuro(projectTotalsMap[p.id] || 0)}</span>
                    <button
                      onClick={(e) => handleDeleteProject(p.id, e)}
                      className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Sheet Context</span>
                <h2 className="text-xl font-black">{currentProject?.name}</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Sub-total</span>
                <p className="text-xl font-black">{formatEuro(projectTotalsMap[currentProject?.id] || 0)}</p>
              </div>
            </div>

            <div className="flex bg-slate-200/50 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Entries
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                User Split
              </button>
            </div>

            {activeTab === 'list' ? (
              <div className="space-y-3 pb-24">
                {projectExpenses.map(ex => (
                  <div key={ex.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800">{ex.item}</h4>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase font-bold text-[9px]">{ex.quantity} Units</span>
                        <span className="flex items-center gap-1">@ {formatEuro(ex.unitPrice)}</span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1 font-medium">{ex.userName}</span>
                      </div>
                      {ex.comments && <p className="text-xs italic text-slate-400 bg-slate-50 p-2 rounded-lg mt-2 border-l-2 border-slate-200">"{ex.comments}"</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-slate-800">{formatEuro(ex.totalPrice)}</span>
                      <button onClick={() => handleDeleteExpense(ex.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h4 className="font-bold text-slate-800 border-b pb-3 text-sm uppercase tracking-wider">Spend Distribution</h4>
                {Object.entries(statsByUser).map(([name, total]) => (
                  <div key={name} className="flex justify-between items-center py-1">
                    <span className="text-slate-600 text-sm font-medium">{name}</span>
                    <span className="font-bold text-slate-800">{formatEuro(total)}</span>
                  </div>
                ))}
                {Object.keys(statsByUser).length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-4">No data to display yet.</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {view === 'project' && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-bold py-3.5 px-8 rounded-full shadow-xl shadow-indigo-200 flex items-center gap-2 active:scale-95 transition-all hover:bg-indigo-700 z-40"
        >
          <Plus className="w-5 h-5" /> Add Expense
        </button>
      )}

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setIsProjectModalOpen(false)} />
          <form onSubmit={handleCreateProject} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-800 mb-4">Initialize Sheet</h3>
            <input
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 mb-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
              placeholder="e.g. Living Room Renovation"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
            />
            <button className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">Create</button>
          </form>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setIsFormOpen(false)} />
          <form onSubmit={handleAddExpense} className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative z-10 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800">New Entry</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} className="p-2 bg-slate-100 rounded-full transition-colors hover:bg-slate-200"><X className="w-4 h-4 text-slate-500" /></button>
            </div>

            <div className="space-y-4">
              <input
                required autoFocus
                placeholder="What was purchased?"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 font-medium text-sm"
                value={formData.item}
                onChange={e => setFormData({ ...formData, item: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number" required step="0.01"
                  placeholder="Qty"
                  className="bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 font-medium text-sm"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                />
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button type="button" onClick={() => setFormData({ ...formData, priceMode: 'total' })} className={`flex-1 text-[9px] font-black uppercase rounded-lg ${formData.priceMode === 'total' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Total €</button>
                  <button type="button" onClick={() => setFormData({ ...formData, priceMode: 'unit' })} className={`flex-1 text-[9px] font-black uppercase rounded-lg ${formData.priceMode === 'unit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Unit €</button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">€</div>
                <input
                  type="number" required step="0.01"
                  placeholder="0,00"
                  className="w-full bg-indigo-50 border border-indigo-100 rounded-xl py-4 pl-10 pr-4 font-black text-xl text-indigo-900"
                  value={formData.priceInput}
                  onChange={e => setFormData({ ...formData, priceInput: e.target.value })}
                />
              </div>

              <textarea
                placeholder="Notes (Brand, Store, etc.)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm"
                rows="2"
                value={formData.comments}
                onChange={e => setFormData({ ...formData, comments: e.target.value })}
              />
            </div>

            <button className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex justify-center items-center gap-2">
              <Check className="w-5 h-5" /> Confirm Entry
            </button>
          </form>
        </div>
      )}
    </div>
  );
}