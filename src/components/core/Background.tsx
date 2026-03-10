"use client";

import React from 'react';
import { motion } from 'framer-motion';

export function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Base Deep Space Color */}
      <div className="absolute inset-0 bg-[#020617]" />
      
      {/* Particle Grain Texture */}
      <div className="absolute inset-0 bg-grain" />

      {/* Floating Animated Orbs with GPU acceleration */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-cyan-500 blur-[120px] gpu-accelerated"
      />

      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.05, 0.1, 0.05],
          x: [0, -30, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[20%] -right-[5%] w-[50%] h-[50%] rounded-full bg-blue-600 blur-[100px] gpu-accelerated"
      />

      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.03, 0.08, 0.03],
          x: [0, 40, 0],
          y: [0, -40, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-teal-500 blur-[110px] gpu-accelerated"
      />

      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px]" />
    </div>
  );
}
