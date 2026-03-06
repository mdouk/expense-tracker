import React from 'react';
import { motion } from 'framer-motion';

const Skeleton = ({ className, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className={`relative overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`}
      {...props}
    >
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent"
      />
    </motion.div>
  );
};

export default Skeleton;
