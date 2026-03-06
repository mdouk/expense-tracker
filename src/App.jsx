import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, serverTimestamp, writeBatch, updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  Plus, Trash2, ArrowLeft, Folder, ChevronRight,
  CreditCard, LogOut, LayoutGrid, Star, Sun, Moon, WifiOff,
  ArrowUp, ArrowDown
} from 'lucide-react';

import { auth, db, signInWithGoogle, logOut } from './config/firebase';
import Card from './components/ui/Card';
import Modal from './components/ui/Modal';
import ConfirmModal from './components/ui/ConfirmModal';
import EmojiPicker from './components/ui/EmojiPicker';
import Charts from './components/ui/Charts';

export default function ExpenseTracker() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      return saved === 'true' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Online status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
  const [sortOrder, setSortOrder] = useState('date'); // 'date' | 'alpha'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  // Form Inputs
  const [formData, setFormData] = useState({ item: '', quantity: '1', priceMode: 'total', priceInput: '', comments: '' });
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState(null);

  // New project properties
  const [projectEmoji, setProjectEmoji] = useState(null);
  const [projectCategory, setProjectCategory] = useState('');
  const [projectFavorite, setProjectFavorite] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [editingExpense, setEditingExpense] = useState(null);

  const appId = "default-app-id";

  // --- Auth & Sync ---
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.displayName) setDisplayName(u.displayName);
    });
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Online status effect
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const expensesRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');

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
  }, [user]);

  // --- Actions ---
  const handleUpdateName = async () => {
    if (user && displayName.trim()) await updateProfile(user, { displayName });
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const projectData = {
      name: newProjectName,
      emoji: projectEmoji || null,
      category: projectCategory.trim() || null,
      favorite: projectFavorite
    };

    if (editingProject) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', editingProject.id), projectData);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), {
        ...projectData,
        createdBy: user.uid,
        creatorName: displayName,
        timestamp: serverTimestamp()
      });
    }
    resetProjectForm();
    setIsProjectModalOpen(false);
  };

  const resetProjectForm = () => {
    setNewProjectName('');
    setProjectEmoji(null);
    setProjectCategory('');
    setProjectFavorite(false);
    setEditingProject(null);
  };

  const openProjectModal = (project = null, e = null) => {
    if (e) e.stopPropagation();
    setEditingProject(project);
    setNewProjectName(project ? project.name : '');
    setProjectEmoji(project?.emoji || null);
    setProjectCategory(project?.category || '');
    setProjectFavorite(project?.favorite || false);
    setIsProjectModalOpen(true);
  };

  const toggleProjectFavorite = async (project, e) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', project.id), {
      favorite: !project.favorite
    });
  };

  const confirmDeleteProject = (pid, projectName, e) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Project',
      message: `Delete "${projectName}" and all its expenses?`,
      onConfirm: async () => {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'projects', pid));
        expenses.filter(ex => ex.projectId === pid).forEach(ex =>
          batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', ex.id)));
        await batch.commit();
        if (currentProjectId === pid) {
          setView('dashboard');
          setCurrentProjectId(null);
        }
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formData.item || !formData.priceInput) return;
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.priceInput) || 0;
    const total = formData.priceMode === 'total' ? price : price * qty;
    const unit = formData.priceMode === 'total' ? (qty > 0 ? price / qty : 0) : price;

    const expenseData = {
      projectId: currentProjectId, item: formData.item, quantity: qty, unitPrice: unit, totalPrice: total,
      userId: user.uid, userName: displayName, comments: formData.comments
    };

    if (editingExpense) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', editingExpense.id), expenseData);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'expenses'), {
        ...expenseData,
        timestamp: serverTimestamp()
      });
    }
    setFormData({ item: '', quantity: '1', priceMode: 'total', priceInput: '', comments: '' });
    setEditingExpense(null);
    setIsFormOpen(false);
  };

  const openExpenseModal = (expense = null) => {
    setEditingExpense(expense);
    if (expense) {
      setFormData({
        item: expense.item || '',
        quantity: expense.quantity || 1,
        priceMode: 'total',
        priceInput: expense.totalPrice || '',
        comments: expense.comments || ''
      });
    } else {
      setFormData({ item: '', quantity: '1', priceMode: 'total', priceInput: '', comments: '' });
    }
    setIsFormOpen(true);
  };

  const confirmDeleteExpense = (id, itemName, e) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Expense',
      message: `Delete "${itemName}"?`,
      onConfirm: async () => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id));
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  // --- Helpers ---
  const formatMoney = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  const projectTotal = (pid) => expenses.filter(e => e.projectId === pid).reduce((sum, e) => sum + (e.totalPrice || 0), 0);
  const grandTotal = expenses.reduce((sum, e) => sum + (e.totalPrice || 0), 0);

  const currentProject = useMemo(
    () => projects.find(p => p.id === currentProjectId),
    [projects, currentProjectId]
  );

  const currentExpenses = useMemo(() => {
    const filtered = expenses.filter(e => e.projectId === currentProjectId);
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortOrder === 'alpha') {
      return [...filtered].sort((a, b) => dir * a.item.localeCompare(b.item));
    }
    // 'date': Firestore orders desc; reverse if asc
    return sortDir === 'asc' ? [...filtered].reverse() : filtered;
  }, [expenses, currentProjectId, sortOrder, sortDir]);

  // Sort projects with favorites pinned to top
  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return 0;
    }),
    [projects]
  );


  // --- Render ---
  if (!user) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-6 text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white dark:bg-zinc-800 shadow-xl shadow-zinc-200 dark:shadow-black/20 ring-1 ring-zinc-100 dark:ring-zinc-700">
        <CreditCard className="h-8 w-8 text-zinc-900 dark:text-zinc-100" />
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-100">Expense Tracker</h1>
      <p className="mb-8 max-w-xs text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">Simple, elegant expense tracking for your personal portfolio.</p>
      <button onClick={signInWithGoogle} className="group relative flex w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-zinc-900 dark:bg-zinc-100 px-6 py-4 min-h-[56px] font-semibold text-white dark:text-zinc-900 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-zinc-200 dark:shadow-black/20">
        <span>Continue with Google</span>
        <ChevronRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-900 pb-32 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {view === 'project' ? (
            <button onClick={() => setView('dashboard')} className="group flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 min-h-[44px]">
              <div className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-lg shadow-zinc-200 dark:shadow-black/20">
                <LayoutGrid className="h-4 w-4 text-white dark:text-zinc-900" />
              </div>
              <span className="text-sm font-bold tracking-tight">Dashboard</span>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Offline indicator */}
            {!isOnline && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}
            
            {/* Dark mode toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-zinc-200 dark:focus-within:ring-zinc-600 focus-within:bg-white dark:focus-within:bg-zinc-700">
              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <input
                className="w-20 sm:w-24 bg-transparent text-xs font-semibold outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} onBlur={handleUpdateName}
                enterKeyHint="done"
              />
            </div>
            <button onClick={logOut} className="p-2.5 rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 sm:pt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {view === 'dashboard' ? (
          <>
            <div className="mb-8 sm:mb-12">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Expenses</h2>
              <div className="text-4xl sm:text-5xl font-bold tracking-tighter">{formatMoney(grandTotal)}</div>
            </div>

            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold tracking-tight">Your Projects</h3>
              <button onClick={() => openProjectModal()} className="flex items-center gap-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white dark:text-zinc-900 shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-transform active:scale-95">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span> Project
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sortedProjects.map(p => (
                <Card key={p.id} onClick={() => { setCurrentProjectId(p.id); setView('project'); }} className="group relative p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-50 dark:bg-zinc-700 border border-zinc-100 dark:border-zinc-600 flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
                        {p.emoji || <Folder className="h-5 w-5 text-zinc-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm truncate">{p.name}</h4>
                        <p className="text-lg font-bold tracking-tight tabular-nums">{formatMoney(projectTotal(p.id))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => toggleProjectFavorite(p, e)}
                        className={`p-2 rounded-lg transition-all ${p.favorite ? 'text-yellow-500' : 'text-zinc-300 dark:text-zinc-500 hover:text-yellow-500'}`}
                      >
                        <Star className={`h-4 w-4 ${p.favorite ? 'fill-current' : ''}`} />
                      </button>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </div>
                  </div>
                </Card>
              ))}
              {sortedProjects.length === 0 && !loading && (
                <div className="col-span-full py-12 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50">
                  <p className="text-zinc-400 font-medium">No projects yet. Create one to start.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{currentProject?.name}</h1>
                <p className="text-sm font-medium text-zinc-400">Created by {currentProject?.creatorName}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Total</p>
                  <div className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums">{formatMoney(projectTotal(currentProject.id))}</div>
                </div>
                <button
                  onClick={() => openProjectModal(currentProject)}
                  className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-all"
                  title="Edit project"
                >
                  <Folder className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => confirmDeleteProject(currentProject.id, currentProject.name, e)}
                  className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                  title="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-700 pb-1 overflow-x-auto no-scrollbar">
              <div className="flex flex-1">
                {['list', 'stats'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 min-h-[44px] text-sm font-medium transition-colors border-b-2 -mb-1.5 whitespace-nowrap ${activeTab === tab ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                  >
                    {tab === 'list' ? 'Transactions' : 'Analysis'}
                  </button>
                ))}
              </div>
              {activeTab === 'list' && (
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
                    <button
                      onClick={() => setSortOrder('date')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${sortOrder === 'date' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                      Date
                    </button>
                    <button
                      onClick={() => setSortOrder('alpha')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${sortOrder === 'alpha' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                      A–Z
                    </button>
                  </div>
                  <button
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                    title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {activeTab === 'list' ? (
              <div className="space-y-3">
                {currentExpenses.map(ex => (
                  <div
                    key={ex.id}
                    onClick={() => openExpenseModal(ex)}
                    className="group relative flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-800 p-4 shadow-sm border border-zinc-100 dark:border-zinc-700 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-700 text-zinc-400 font-bold text-xs shrink-0">
                        {ex.item.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{ex.item}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="font-medium text-zinc-500 dark:text-zinc-400">{ex.userName}</span>
                          {ex.quantity > 1 && <span className="bg-zinc-100 dark:bg-zinc-700 px-1.5 rounded text-zinc-600 dark:text-zinc-300">{ex.quantity}x</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold tabular-nums">{formatMoney(ex.totalPrice)}</p>
                        {ex.quantity > 1 && <p className="text-[10px] text-zinc-400">{formatMoney(ex.unitPrice)} /unit</p>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </div>
                  </div>
                ))}
                {currentExpenses.length === 0 && <div className="py-12 text-center text-zinc-400 italic">No transactions yet.</div>}
              </div>
            ) : (
              <Charts 
                expenses={currentExpenses} 
                projects={projects} 
                formatMoney={formatMoney} 
                darkMode={darkMode}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {view === 'project' && (
        <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button onClick={() => openExpenseModal()} className="flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-zinc-100 pl-4 pr-6 py-3.5 min-h-[56px] font-semibold text-white dark:text-zinc-900 shadow-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all ring-4 ring-white dark:ring-zinc-900">
            <div className="rounded-full bg-zinc-700 dark:bg-zinc-300 p-1"><Plus className="h-4 w-4" /></div>
            <span>Add Expense</span>
          </button>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={isProjectModalOpen} onClose={() => { setIsProjectModalOpen(false); resetProjectForm(); }} title={editingProject ? "Edit Project" : "New Project"}>
        <form onSubmit={handleSaveProject}>
          {/* Icon Selector */}
          <div className="mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(true)}
              className="h-14 w-14 min-w-[56px] min-h-[56px] rounded-2xl bg-zinc-50 dark:bg-zinc-700 border-2 border-dashed border-zinc-200 dark:border-zinc-600 flex items-center justify-center text-2xl hover:bg-zinc-100 dark:hover:bg-zinc-600 hover:border-zinc-300 dark:hover:border-zinc-500 transition-all"
            >
              {projectEmoji || <Folder className="h-6 w-6 text-zinc-400" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Project Icon</p>
              <p className="text-xs text-zinc-400">Tap to choose an icon</p>
            </div>
          </div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Project Name</label>
          <input autoFocus enterKeyHint="done" className="mb-6 w-full border-b-2 border-zinc-100 dark:border-zinc-700 bg-transparent py-2 text-lg font-semibold outline-none focus:border-zinc-900 dark:focus:border-zinc-400 transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-600" placeholder="e.g. Home Renovation" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />

          <button className="w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 py-3.5 min-h-[52px] font-bold text-white dark:text-zinc-900 shadow-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all">{editingProject ? "Save Changes" : "Create Project"}</button>
        </form>
      </Modal>

      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingExpense(null); }} title={editingExpense ? "Edit Entry" : "New Entry"}>
        <form onSubmit={handleSaveExpense}>
          <div className="mb-8 text-center">
            <div className="inline-flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-zinc-300 dark:text-zinc-500">€</span>
              <input type="number" inputMode="decimal" step="0.01" autoFocus required placeholder="0.00" className="w-40 bg-transparent text-center text-4xl sm:text-5xl font-bold tracking-tighter outline-none placeholder:text-zinc-200 dark:placeholder:text-zinc-600" value={formData.priceInput} onChange={e => setFormData({ ...formData, priceInput: e.target.value })} />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
              <input required enterKeyHint="next" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-700 border-none px-4 py-3 min-h-[48px] font-medium outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-500/30 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500" placeholder="What is it?" value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Quantity</label>
                <input type="number" inputMode="numeric" className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-700 border-none px-4 py-3 min-h-[48px] font-medium outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-500/30" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Type</label>
                <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-700 p-1">
                  {['total', 'unit'].map(m => (
                    <button key={m} type="button" onClick={() => setFormData({ ...formData, priceMode: m })} className={`flex-1 rounded-lg py-2.5 min-h-[40px] text-xs font-bold uppercase transition-all ${formData.priceMode === m ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button className="mt-8 w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 py-4 min-h-[56px] font-bold text-white dark:text-zinc-900 shadow-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all">{editingExpense ? "Save Changes" : "Add Transaction"}</button>
          
          {editingExpense && (
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                confirmDeleteExpense(editingExpense.id, editingExpense.item, { stopPropagation: () => {} });
              }}
              className="mt-3 w-full rounded-xl bg-red-50 dark:bg-red-900/20 py-3 min-h-[48px] text-sm font-semibold text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all"
            >
              Delete Entry
            </button>
          )}
        </form>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onSelect={setProjectEmoji}
        currentEmoji={projectEmoji}
      />
    </div>
  );
}