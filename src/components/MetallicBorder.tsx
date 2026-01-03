import React from 'react';

interface MetallicBorderProps {
    children: React.ReactNode;
    className?: string;
}

export const MetallicBorder: React.FC<MetallicBorderProps> = ({ children, className = '' }) => {
    return (
        <div className={`relative p-[1px] rounded-xl overflow-hidden group ${className}`}>
            <style>{`
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes metallic-spin {
          from { --angle: 0deg; }
          to { --angle: 360deg; }
        }
        .metallic-border-gradient {
          background: conic-gradient(from var(--angle), 
            #52525b 0%, 
            #ffffff 10%, 
            #52525b 20%, 
            #d4d4d8 30%, 
            #52525b 40%, 
            #ffffff 50%, 
            #52525b 60%, 
            #d4d4d8 70%, 
            #52525b 80%, 
            #ffffff 90%, 
            #52525b 100%
          );
          animation: metallic-spin 3s linear infinite;
        }
      `}</style>

            {/* 
        Metallic Silver Gradient Border 
        Using explicit CSS class with @property for smooth rotation if supported, 
        fallback to simple rotation if not.
      */}
            <div
                className="absolute inset-0 rounded-xl metallic-border-gradient opacity-100"
                style={{
                    '--angle': '0deg',
                } as React.CSSProperties}
            />

            {/* Inner Content with Background */}
            <div className="relative bg-zinc-950 rounded-[11px] h-full overflow-hidden">
                {children}
            </div>
        </div>
    );
};
