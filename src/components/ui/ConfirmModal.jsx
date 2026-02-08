import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />
            <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-zinc-900">{title}</h3>
                    <p className="mb-6 text-sm text-zinc-500">{message}</p>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 rounded-xl bg-zinc-100 py-3 font-semibold text-zinc-700 transition-all hover:bg-zinc-200 active:scale-95"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
