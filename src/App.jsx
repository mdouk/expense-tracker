import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  deleteDoc, doc, serverTimestamp, writeBatch, updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import {
  Plus, Trash2, ArrowLeft, Folder, ChevronRight,
  CreditCard, LogOut, LayoutGrid, Star
} from 'lucide-react';

import { auth, db, signInWithGoogle, logOut } from './config/firebase';
import Card from './components/ui/Card';
import Modal from './components/ui/Modal';
import ConfirmModal from './components/ui/ConfirmModal';
import EmojiPicker from './components/ui/EmojiPicker';

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
            <button onClick={logOut} className="text-zinc-400 hover:text-zinc-900 transition-colors">
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
              <button onClick={() => openProjectModal()} className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-zinc-800 transition-transform active:scale-95">
                <Plus className="h-4 w-4" /> New Project
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projects.map(p => (
                <Card key={p.id} onClick={() => openProjectModal(p)} className="group relative p-5">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-xl group-hover:scale-110 group-hover:bg-zinc-100 transition-all duration-300">
                        {p.emoji || <Folder className="h-5 w-5 text-zinc-400" />}
                      </div>
                      <button
                        onClick={(e) => toggleProjectFavorite(p, e)}
                        className={`p-1.5 rounded-full transition-all ${p.favorite ? 'text-yellow-500' : 'text-zinc-300 hover:text-yellow-500'}`}
                      >
                        <Star className={`h-4 w-4 ${p.favorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <button
                      onClick={(e) => confirmDeleteProject(p.id, p.name, e)}
                      className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    {p.category && <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{p.category}</span>}
                    <h4 className="font-bold text-zinc-900 mb-1">{p.name}</h4>
                    <p className="text-2xl font-bold tracking-tight text-zinc-900">{formatMoney(projectTotal(p.id))}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentProjectId(p.id); setView('project'); }}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                    >
                      View Expenses <ChevronRight className="h-3 w-3" />
                    </button>
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
                  <div
                    key={ex.id}
                    onClick={() => openExpenseModal(ex)}
                    className="group relative flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-zinc-100 transition-all hover:border-zinc-300 cursor-pointer"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 font-bold text-xs shrink-0">
                        {ex.item.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 truncate">{ex.item}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="font-medium text-zinc-500">{ex.userName}</span>
                          {ex.quantity > 1 && <span className="bg-zinc-100 px-1.5 rounded text-zinc-600">{ex.quantity}x</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-zinc-900">{formatMoney(ex.totalPrice)}</p>
                        {ex.quantity > 1 && <p className="text-[10px] text-zinc-400">{formatMoney(ex.unitPrice)} /unit</p>}
                      </div>
                      <button
                        onClick={(e) => confirmDeleteExpense(ex.id, ex.item, e)}
                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
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
          <button onClick={() => openExpenseModal()} className="flex items-center gap-2 rounded-full bg-zinc-900 pl-4 pr-6 py-3.5 font-semibold text-white shadow-xl hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all ring-4 ring-white">
            <div className="rounded-full bg-zinc-700 p-1"><Plus className="h-4 w-4" /></div>
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
              className="h-14 w-14 rounded-2xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex items-center justify-center text-2xl hover:bg-zinc-100 hover:border-zinc-300 transition-all"
            >
              {projectEmoji || <Folder className="h-6 w-6 text-zinc-400" />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-700">Project Icon</p>
              <p className="text-xs text-zinc-400">Tap to choose an icon</p>
            </div>
          </div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Project Name</label>
          <input autoFocus className="mb-4 w-full border-b-2 border-zinc-100 bg-transparent py-2 text-lg font-semibold outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-300" placeholder="e.g. Q4 Marketing" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">Category (optional)</label>
          <input className="mb-4 w-full border-b-2 border-zinc-100 bg-transparent py-2 text-sm font-medium outline-none focus:border-zinc-900 transition-colors placeholder:text-zinc-300" placeholder="e.g. Travel, Food, Business" value={projectCategory} onChange={e => setProjectCategory(e.target.value)} />

          <label className="mb-4 flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setProjectFavorite(!projectFavorite)}
              className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${projectFavorite ? 'bg-yellow-100 text-yellow-500' : 'bg-zinc-100 text-zinc-400'}`}
            >
              <Star className={`h-4 w-4 ${projectFavorite ? 'fill-current' : ''}`} />
            </button>
            <span className="text-sm font-medium text-zinc-700">Mark as favorite</span>
          </label>

          <button className="w-full rounded-xl bg-zinc-900 py-3.5 font-bold text-white shadow-lg hover:bg-zinc-800 active:scale-95 transition-all">{editingProject ? "Save Changes" : "Create Project"}</button>
        </form>
      </Modal>

      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingExpense(null); }} title={editingExpense ? "Edit Entry" : "New Entry"}>
        <form onSubmit={handleSaveExpense}>
          <div className="mb-8 text-center">
            <div className="inline-flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-zinc-300">€</span>
              <input type="number" inputMode="decimal" step="0.01" autoFocus required placeholder="0.00" className="w-40 bg-transparent text-center text-5xl font-bold tracking-tighter outline-none placeholder:text-zinc-200" value={formData.priceInput} onChange={e => setFormData({ ...formData, priceInput: e.target.value })} />
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

          <button className="mt-8 w-full rounded-xl bg-zinc-900 py-4 font-bold text-white shadow-xl hover:bg-zinc-800 active:scale-95 transition-all">{editingExpense ? "Save Changes" : "Add Transaction"}</button>
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