import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-900/30 dark:bg-black/50 backdrop-blur-sm" 
                        onClick={onClose} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ 
                            type: "spring", 
                            duration: 0.4, 
                            bounce: 0.4 
                        }}
                        className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl bg-white dark:bg-zinc-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                    >
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                            <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={onClose}
                                    className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-700 py-3 min-h-[44px] font-semibold text-zinc-700 dark:text-zinc-200 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-600 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={onConfirm}
                                    className="flex-1 rounded-xl bg-red-500 py-3 min-h-[44px] font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
