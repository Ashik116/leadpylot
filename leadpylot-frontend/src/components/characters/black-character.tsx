'use client';
import React, { useRef } from "react";
import { EyeBall } from "./eyeball";

interface BlackCharacterProps {
    mouseX: number;
    mouseY: number;
    isTyping: boolean;
    password?: string;
    showPassword: boolean;
    isBlackBlinking: boolean;
    isLookingAtEachOther: boolean;
    onError: boolean;
}

export const BlackCharacter = ({
    mouseX,
    mouseY,
    isTyping,
    password,
    showPassword,
    isBlackBlinking,
    isLookingAtEachOther,
    onError,
}: BlackCharacterProps) => {
    const blackRef = useRef<HTMLDivElement>(null);

    const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 3; // Focus on head area

        const deltaX = mouseX - centerX;
        const deltaY = mouseY - centerY;

        // Face movement (limited range)
        const faceX = Math.max(-15, Math.min(15, deltaX / 20));
        const faceY = Math.max(-10, Math.min(10, deltaY / 30));

        // Body lean (skew for lean while keeping bottom straight) - negative to lean towards mouse
        const bodySkew = Math.max(-6, Math.min(6, -deltaX / 100));

        return { faceX, faceY, bodySkew };
    };

    const blackPos = calculatePosition(blackRef);

    // Ensure password is always a string to avoid undefined errors
    const passwordValue = password || '';
    const hasPassword = passwordValue.length > 0;

    const transform = (hasPassword && showPassword)
        ? `skewX(0deg)`
        : isLookingAtEachOther
            ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translate-X-[20px]`
            : (isTyping || (hasPassword && !showPassword))
                ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                : `skewX(${blackPos.bodySkew || 0}deg)`;

    const eyeLeft = (hasPassword && showPassword) ? `${10}px` :
        isLookingAtEachOther ? `${32}px` : `${26 + blackPos.faceX}px`;
    const eyeTop = (hasPassword && showPassword) ? `${28}px` :
        isLookingAtEachOther ? `${12}px` : `${32 + blackPos.faceY}px`;

    const forceLookX = (hasPassword && showPassword) ? -4 :
        isLookingAtEachOther ? 0 : undefined;
    const forceLookY = (hasPassword && showPassword) ? -4 :
        isLookingAtEachOther ? -4 : undefined;

    return (
        <div
            ref={blackRef}
            className="absolute bottom-0 transition-all duration-700"
            style={{
                left: '240px',
                width: '120px',
                height: '310px',
                backgroundColor: '#2D2D2D',
                borderRadius: '8px 8px 0 0',
                zIndex: 2,
                transform,
                transformOrigin: 'bottom center',
            }}
        >

            <div
                className="absolute flex gap-6 transition-all duration-700"
                style={{ left: eyeLeft, top: eyeTop }}
            >

                <EyeBall
                    size={16}
                    pupilSize={6}
                    maxDistance={4}
                    eyeColor="white"
                    pupilColor="#2D2D2D"
                    isBlinking={isBlackBlinking}
                    forceLookX={forceLookX}
                    forceLookY={forceLookY}
                    eyebrowClass="-left-2"
                />
                <EyeBall
                    size={16}
                    pupilSize={6}
                    maxDistance={4}
                    eyeColor="white"
                    pupilColor="#2D2D2D"
                    isBlinking={isBlackBlinking}
                    forceLookX={forceLookX}
                    forceLookY={forceLookY}
                    eyebrowClass="-right-2"
                />
            </div>
        </div>
    );
};
