import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Modal = ({ isOpen, onClose, title, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-zinc-900/20 dark:bg-black/50 backdrop-blur-sm" 
                        onClick={onClose} 
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ 
                            type: "spring", 
                            duration: 0.4, 
                            bounce: 0.3 
                        }}
                        className="relative z-10 w-full max-w-sm max-h-[90vh] overflow-y-auto overflow-hidden rounded-3xl bg-white dark:bg-zinc-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-50 dark:border-zinc-700 px-6 py-5">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h3>
                            <button onClick={onClose} className="rounded-full p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Modal;
