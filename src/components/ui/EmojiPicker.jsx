import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

// Curated emoji list with categories
const EMOJI_DATA = [
    // Money & Finance
    { emoji: '💰', keywords: ['money', 'bag', 'dollar', 'finance'] },
    { emoji: '💵', keywords: ['money', 'dollar', 'cash', 'bill'] },
    { emoji: '💳', keywords: ['card', 'credit', 'payment'] },
    { emoji: '🏦', keywords: ['bank', 'finance', 'building'] },
    { emoji: '📈', keywords: ['chart', 'growth', 'increase', 'profit'] },
    { emoji: '📊', keywords: ['chart', 'bar', 'statistics', 'data'] },
    { emoji: '🧾', keywords: ['receipt', 'bill', 'invoice'] },
    { emoji: '💎', keywords: ['gem', 'diamond', 'value', 'luxury'] },
    // Shopping & Business
    { emoji: '🛒', keywords: ['cart', 'shopping', 'groceries'] },
    { emoji: '🛍️', keywords: ['bags', 'shopping', 'retail'] },
    { emoji: '🏪', keywords: ['store', 'shop', 'convenience'] },
    { emoji: '🏢', keywords: ['building', 'office', 'business'] },
    { emoji: '💼', keywords: ['briefcase', 'work', 'business'] },
    // Food & Drink
    { emoji: '🍔', keywords: ['food', 'burger', 'fast', 'restaurant'] },
    { emoji: '🍕', keywords: ['food', 'pizza', 'restaurant'] },
    { emoji: '☕', keywords: ['coffee', 'drink', 'cafe'] },
    { emoji: '🍺', keywords: ['beer', 'drink', 'bar', 'alcohol'] },
    { emoji: '🥗', keywords: ['food', 'salad', 'healthy', 'groceries'] },
    // Transport
    { emoji: '🚗', keywords: ['car', 'transport', 'vehicle', 'auto'] },
    { emoji: '⛽', keywords: ['gas', 'fuel', 'petrol', 'car'] },
    { emoji: '✈️', keywords: ['plane', 'travel', 'flight', 'vacation'] },
    { emoji: '🚌', keywords: ['bus', 'transport', 'public'] },
    { emoji: '🚇', keywords: ['metro', 'subway', 'train', 'transport'] },
    // Home & Utilities
    { emoji: '🏠', keywords: ['home', 'house', 'rent', 'mortgage'] },
    { emoji: '💡', keywords: ['light', 'electricity', 'utilities', 'idea'] },
    { emoji: '📱', keywords: ['phone', 'mobile', 'tech', 'bills'] },
    { emoji: '💻', keywords: ['laptop', 'computer', 'tech', 'work'] },
    { emoji: '📺', keywords: ['tv', 'television', 'entertainment'] },
    // Health & Wellness
    { emoji: '💊', keywords: ['medicine', 'health', 'pharmacy'] },
    { emoji: '🏥', keywords: ['hospital', 'health', 'medical'] },
    { emoji: '🏋️', keywords: ['gym', 'fitness', 'exercise', 'health'] },
    // Entertainment & Leisure
    { emoji: '🎬', keywords: ['movie', 'cinema', 'film', 'entertainment'] },
    { emoji: '🎮', keywords: ['game', 'gaming', 'entertainment'] },
    { emoji: '🎵', keywords: ['music', 'spotify', 'entertainment'] },
    { emoji: '📚', keywords: ['books', 'education', 'reading'] },
    { emoji: '🎁', keywords: ['gift', 'present', 'birthday'] },
    // Nature & Pets
    { emoji: '🐕', keywords: ['dog', 'pet', 'animal'] },
    { emoji: '🐱', keywords: ['cat', 'pet', 'animal'] },
    { emoji: '🌿', keywords: ['plant', 'nature', 'garden'] },
    // General
    { emoji: '📁', keywords: ['folder', 'files', 'documents', 'default'] },
    { emoji: '⭐', keywords: ['star', 'favorite', 'important'] },
    { emoji: '🔧', keywords: ['tools', 'repair', 'maintenance'] },
    { emoji: '🎯', keywords: ['target', 'goal', 'focus'] },
    { emoji: '📅', keywords: ['calendar', 'schedule', 'date'] },
    { emoji: '✨', keywords: ['sparkles', 'new', 'special'] },
];

const EmojiPicker = ({ isOpen, onClose, onSelect, currentEmoji }) => {
    const [search, setSearch] = useState('');

    const filteredEmojis = useMemo(() => {
        if (!search.trim()) return EMOJI_DATA;
        const query = search.toLowerCase();
        return EMOJI_DATA.filter(item => 
            item.keywords.some(kw => kw.includes(query)) ||
            item.emoji === query
        );
    }, [search]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm" 
                onClick={onClose} 
            />
            <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                    <h3 className="font-semibold text-zinc-900">Choose Icon</h3>
                    <button 
                        onClick={onClose} 
                        className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2">
                        <Search className="h-4 w-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search icons..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="max-h-64 overflow-y-auto p-3">
                    <div className="grid grid-cols-6 gap-1">
                        {filteredEmojis.map(({ emoji }) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onSelect(emoji);
                                    onClose();
                                }}
                                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all hover:bg-zinc-100 active:scale-90 ${
                                    currentEmoji === emoji ? 'bg-zinc-900 ring-2 ring-zinc-900' : ''
                                }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    {filteredEmojis.length === 0 && (
                        <p className="py-8 text-center text-sm text-zinc-400">No icons found</p>
                    )}
                </div>

                {currentEmoji && (
                    <div className="border-t border-zinc-100 p-3">
                        <button
                            onClick={() => {
                                onSelect(null);
                                onClose();
                            }}
                            className="w-full rounded-xl bg-zinc-100 py-2 text-sm font-medium text-zinc-600 transition-all hover:bg-zinc-200"
                        >
                            Remove Icon
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmojiPicker;
