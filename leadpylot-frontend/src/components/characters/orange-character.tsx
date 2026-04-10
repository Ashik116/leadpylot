'use client';
import React, { useRef } from "react";

interface OrangeCharacterProps {
    mouseX: number;
    mouseY: number;
    password?: string;
    showPassword: boolean;
    isPurpleBlinking: boolean;
    onError: boolean;
}

export const OrangeCharacter = ({ mouseX, mouseY, password, showPassword, isPurpleBlinking, onError }: OrangeCharacterProps) => {
    const orangeRef = useRef<HTMLDivElement>(null);

    const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = mouseX - centerX;
        const deltaY = mouseY - centerY;
        const faceX = Math.max(-15, Math.min(55, deltaX / 2));
        const faceY = Math.max(-10, Math.min(50, deltaY / 1));
        const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));
        return { faceX, faceY, bodySkew };
    };

    const orangePos = calculatePosition(orangeRef);
    
    // Ensure password is always a string to avoid undefined errors
    const passwordValue = password || '';
    const hasPassword = passwordValue.length > 0;
    
    const transform = (hasPassword && showPassword) ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`;
    const eyeLeft = (hasPassword && showPassword) ? `${50}px` : `${82 + (orangePos.faceX || 0)}px`;
    const eyeTop = (hasPassword && showPassword) ? `${85}px` : `${50 + (orangePos.faceY || 0)}px`;
    const forceLookX = (hasPassword && showPassword) ? -5 : undefined;
    const forceLookY = (hasPassword && showPassword) ? -4 : undefined;

    return (
        <div
            ref={orangeRef}
            className="absolute bottom-0 transition-all duration-700"
            style={{
                left: '0px',
                width: '240px',
                height: '200px',
                zIndex: 3,
                backgroundColor: '#FF9B6B',
                borderRadius: '140px 140px 0 0',
                transform,
                transformOrigin: 'bottom center',
            }}
        >
            <div className="absolute flex gap-8 transition-all duration-200" style={{ left: eyeLeft, top: eyeTop }}>
                <div
                    className="rounded-full"
                    style={{
                        width: '12px',
                        height: isPurpleBlinking ? '16px' : '12px',
                        backgroundColor: '#2D2D2D',
                        transform: `translate(${forceLookX || 0}px, ${forceLookY || 0}px)`,
                        transition: 'transform 0.1s ease-out',
                    }}
                />
                <div
                    className="rounded-full"
                    style={{
                        width: isPurpleBlinking ? '16px' : '12px',
                        height: isPurpleBlinking ? '16px' : '12px',
                        backgroundColor: '#2D2D2D',
                        transform: `translate(${forceLookX || 0}px, ${forceLookY || 0}px)`,
                        transition: 'transform 0.1s ease-out',
                    }}
                />
                <svg
                    className="absolute bottom-0 left-0 top-10 w-full h-8 text-pink-900"
                    viewBox="0 0 1440 320"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                >
                    {showPassword || onError ? <path d="M0,160 Q460,40 720,60 T1440,160" /> : <path
                        d="M0,120 Q720,260 1440,120"
                        strokeLinecap="round"
                    />}
                </svg>
            </div>
        </div>
    );
};
