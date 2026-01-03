
import React from 'react';

interface MetallicBorderProps {
    children: React.ReactNode;
    className?: string;
}

export const MetallicBorder: React.FC<MetallicBorderProps> = ({ children, className = '' }) => {
    return (
        <div className={`relative p-[1px] rounded-xl overflow-hidden group ${className}`}>
            {/* 
        Metallic Silver Gradient Border 
        Using a complex gradient to simulate light reflection on metal
      */}
            <div className="absolute inset-0 rounded-xl bg-[conic-gradient(from_var(--shimmer-angle),theme(colors.zinc.500)_0%,theme(colors.white)_10%,theme(colors.zinc.500)_20%,theme(colors.zinc.300)_30%,theme(colors.zinc.500)_40%,theme(colors.white)_50%,theme(colors.zinc.500)_60%,theme(colors.zinc.300)_70%,theme(colors.zinc.500)_80%,theme(colors.white)_90%,theme(colors.zinc.500)_100%)] animate-[spin_4s_linear_infinite] opacity-50 group-hover:opacity-80 transition-opacity duration-300" />

            {/* Fallback/Static Border for better visibility if animation is subtle */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-zinc-400 via-white/40 to-zinc-600 opacity-30" />

            {/* Inner Content with Background */}
            <div className="relative bg-zinc-900 rounded-[11px] h-full overflow-hidden">
                {/* Subtle inner gloss */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                {children}
            </div>
        </div>
    );
};
