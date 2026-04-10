'use client';
import React, { useState, useEffect, useRef } from "react";

interface EyeBallProps {
    size?: number;
    pupilSize?: number;
    maxDistance?: number;
    eyeColor?: string;
    pupilColor?: string;
    isBlinking?: boolean;
    forceLookX?: number;
    forceLookY?: number;
    eyebrowClass?: string;
}

export const EyeBall = ({
    size = 48,
    pupilSize = 16,
    maxDistance = 10,
    eyeColor = "white",
    pupilColor = "black",
    isBlinking = false,
    forceLookX,
    forceLookY,
    eyebrowClass
}: EyeBallProps) => {
    const [mouseX, setMouseX] = useState(0);
    const [mouseY, setMouseY] = useState(0);
    const eyeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMouseX(e.clientX);
            setMouseY(e.clientY);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const calculatePupilPosition = () => {
        if (!eyeRef.current) return { x: 0, y: 0 };
        if (forceLookX !== undefined && forceLookY !== undefined) {
            return { x: forceLookX, y: forceLookY };
        }

        const eye = eyeRef.current.getBoundingClientRect();
        const eyeCenterX = eye.left + eye.width / 2;
        const eyeCenterY = eye.top + eye.height / 2;

        const deltaX = mouseX - eyeCenterX;
        const deltaY = mouseY - eyeCenterY;
        const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

        const angle = Math.atan2(deltaY, deltaX);
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        return { x, y };
    };

    const pupilPosition = calculatePupilPosition();

    return (
        <div
            ref={eyeRef}
            className="rounded-full flex items-center justify-center transition-all duration-150"
            style={{
                width: `${size}px`,
                height: isBlinking ? '2px' : `${size}px`,
                backgroundColor: eyeColor,
                overflow: 'hidden',
            }}
        >
            <svg
                className={`absolute ${isBlinking ? '-top-4' : '-top-2'} ${eyebrowClass || '-left-1'}  h-2 w-8 text-white transition-all duration-200`}
                viewBox="0 0 1440 320"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                strokeLinecap="round"

            >   <path d="M0,150 Q460,40 720,60 T1440,160" />
            </svg>
            {!isBlinking && (
                <div
                    className="rounded-full"
                    style={{
                        width: `${pupilSize}px`,
                        height: `${pupilSize}px`,
                        backgroundColor: pupilColor,
                        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
                        transition: 'transform 0.1s ease-out',
                    }}
                />
            )}
        </div>
    );
};
