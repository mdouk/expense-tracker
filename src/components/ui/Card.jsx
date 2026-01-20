import React from 'react';

const Card = ({ children, className = "", onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200 transition-all duration-200 cursor-pointer ${className}`}
    >
        {children}
    </div>
);

export default Card;
