import React, { useState, useMemo, useRef } from 'react';
import { Search, X, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Curated emoji list with relevant categories
const EMOJI_DATA = [
    // ... same as before
    { emoji: '🏠', keywords: ['home', 'house', 'improvement'] },
    { emoji: '🔧', keywords: ['tools', 'repair', 'fix', 'improvement'] },
    { emoji: '🔨', keywords: ['hammer', 'build', 'construction'] },
    { emoji: '🪴', keywords: ['plant', 'garden', 'nature'] },
    { emoji: '🌿', keywords: ['garden', 'plants', 'outdoor'] },
    { emoji: '🌻', keywords: ['flower', 'garden'] },
    { emoji: '🚗', keywords: ['car', 'auto', 'vehicle'] },
    { emoji: '⛽', keywords: ['gas', 'fuel', 'car'] },
    { emoji: '🔩', keywords: ['parts', 'auto', 'repair'] },
    { emoji: '👶', keywords: ['baby', 'kids', 'child'] },
    { emoji: '🧒', keywords: ['kids', 'children', 'family'] },
    { emoji: '🎈', keywords: ['party', 'kids', 'birthday'] },
    { emoji: '🧸', keywords: ['toys', 'kids', 'play'] },
    { emoji: '🏋️', keywords: ['gym', 'fitness', 'training', 'workout'] },
    { emoji: '💪', keywords: ['strength', 'training', 'fitness'] },
    { emoji: '🧘', keywords: ['yoga', 'home', 'training', 'wellness'] },
    { emoji: '🏃', keywords: ['running', 'fitness', 'sports'] },
    { emoji: '🧗', keywords: ['climbing', 'bouldering', 'sports'] },
    { emoji: '⛰️', keywords: ['mountain', 'climbing', 'outdoor'] },
    { emoji: '🥾', keywords: ['hiking', 'outdoor', 'boots'] },
    { emoji: '⚽', keywords: ['football', 'soccer', 'sports'] },
    { emoji: '🏀', keywords: ['basketball', 'sports'] },
    { emoji: '🎾', keywords: ['tennis', 'sports'] },
    { emoji: '🚴', keywords: ['cycling', 'bike', 'sports'] },
    { emoji: '🏊', keywords: ['swimming', 'pool', 'sports'] },
    { emoji: '🏗️', keywords: ['construction', 'building', 'work'] },
    { emoji: '🪜', keywords: ['ladder', 'construction', 'tools'] },
    { emoji: '🪵', keywords: ['wood', 'construction', 'material'] },
    { emoji: '🧱', keywords: ['brick', 'construction', 'building'] },
    { emoji: '🎮', keywords: ['game', 'gaming', 'console'] },
    { emoji: '🎲', keywords: ['board', 'game', 'dice'] },
    { emoji: '🃏', keywords: ['cards', 'game', 'play'] },
    { emoji: '♟️', keywords: ['chess', 'game', 'board'] },
    { emoji: '📁', keywords: ['folder', 'general', 'default'] },
    { emoji: '💰', keywords: ['money', 'finance', 'budget'] },
    { emoji: '🛒', keywords: ['shopping', 'groceries'] },
    { emoji: '✨', keywords: ['other', 'misc', 'special'] },
];

const EmojiPicker = ({ isOpen, onClose, onSelect, currentEmoji }) => {
    const [search, setSearch] = useState('');
    const [nativeInput, setNativeInput] = useState('');
    const nativeInputRef = useRef(null);

    const filteredEmojis = useMemo(() => {
        if (!search.trim()) return EMOJI_DATA;
        const query = search.toLowerCase();
        return EMOJI_DATA.filter(item => 
            item.keywords.some(kw => kw.includes(query)) ||
            item.emoji === query
        );
    }, [search]);

    const handleNativeEmojiInput = (e) => {
        const value = e.target.value;
        const emojiRegex = /\p{Extended_Pictographic}/u;
        const match = value.match(emojiRegex);
        if (match) {
            onSelect(match[0]);
            onClose();
            setNativeInput('');
        } else {
            setNativeInput(value);
        }
    };

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
                        className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl bg-white dark:bg-zinc-800 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700 px-4 py-3">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Choose Icon</h3>
                            <button onClick={onClose} className="rounded-full p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-3 border-b border-zinc-100 dark:border-zinc-700">
                            <div onClick={() => nativeInputRef.current?.focus()} className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-700 px-3 py-2 cursor-text">
                                <Keyboard className="h-4 w-4 text-zinc-400" />
                                <input
                                    ref={nativeInputRef}
                                    type="text"
                                    placeholder="Type any emoji..."
                                    value={nativeInput}
                                    onChange={handleNativeEmojiInput}
                                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                        </div>

                        <div className="p-3 border-b border-zinc-100 dark:border-zinc-700">
                            <div className="flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-700 px-3 py-2">
                                <Search className="h-4 w-4 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Search icons..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                        </div>

                        <div className="max-h-52 overflow-y-auto p-3">
                            <div className="grid grid-cols-6 gap-1">
                                {filteredEmojis.map(({ emoji }) => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            onSelect(emoji);
                                            onClose();
                                        }}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700 active:scale-90 ${
                                            currentEmoji === emoji ? 'bg-zinc-900 dark:bg-zinc-600 ring-2 ring-zinc-900 dark:ring-zinc-500' : ''
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {currentEmoji && (
                            <div className="border-t border-zinc-100 dark:border-zinc-700 p-3">
                                <button
                                    onClick={() => {
                                        onSelect(null);
                                        onClose();
                                    }}
                                    className="w-full rounded-xl bg-zinc-100 dark:bg-zinc-700 py-2.5 min-h-[44px] text-sm font-medium text-zinc-600 dark:text-zinc-300 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-600"
                                >
                                    Remove Icon
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EmojiPicker;

