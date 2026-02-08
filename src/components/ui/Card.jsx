import React from 'react';

const Card = ({ children, className = "", onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-600 transition-all duration-200 cursor-pointer ${className}`}
    >
        {children}
    </div>
);

export default Card;
