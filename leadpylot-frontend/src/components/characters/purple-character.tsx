'use client';
import React, { useEffect, useRef, useState } from 'react';
import { EyeBall } from './eyeball';

interface PurpleCharacterProps {
  mouseX: number;
  mouseY: number;
  isTyping: boolean;
  password?: string;
  showPassword: boolean;
  isPurpleBlinking: boolean;
  isLookingAtEachOther: boolean;
  isPurplePeeking: boolean;
  onError: boolean;
}

export const PurpleCharacter = ({
  mouseX,
  mouseY,
  isTyping,
  password,
  showPassword,
  isPurpleBlinking,
  isLookingAtEachOther,
  isPurplePeeking,
  onError,
}: PurpleCharacterProps) => {
  const purpleRef = useRef<HTMLDivElement>(null);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (!onError) {
      setIsShaking(false);
      return;
    }
    setIsShaking(true);
    const timer = setTimeout(() => setIsShaking(false), 1000);
    return () => clearTimeout(timer);
  }, [onError]);

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
    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 10));

    return { faceX, faceY, bodySkew };
  };

  // eslint-disable-next-line react-hooks/refs
  const purplePos = calculatePosition(purpleRef);

  // Ensure password is always a string to avoid undefined errors
  const passwordValue = password || '';
  const hasPassword = passwordValue.length > 0;

  const height = isTyping || (hasPassword && !showPassword) ? '440px' : '400px';
  const transform =
    hasPassword && showPassword
      ? `skewX(0deg)`
      : isTyping || (hasPassword && !showPassword)
        ? `skewX(${(purplePos.bodySkew || 0) - 2}deg) translateX(40px)`
        : `skewX(${purplePos.bodySkew || 0}deg)`;

  const eyeLeft =
    hasPassword && showPassword
      ? `${20}px`
      : isLookingAtEachOther
        ? `${55}px`
        : `${45 + purplePos.faceX}px`;
  const eyeTop =
    hasPassword && showPassword
      ? `${35}px`
      : isLookingAtEachOther
        ? `${65}px`
        : `${40 + purplePos.faceY}px`;

  const forceLookX =
    hasPassword && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined;
  const forceLookY =
    hasPassword && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined;

  return (
    <>
      <div
        ref={purpleRef}
        className="absolute bottom-0 transition-all duration-700"
        style={{
          left: '70px',
          width: '180px',
          height,
          backgroundColor: '#6C3FF5',
          borderRadius: '5px 5px 0 0',
          zIndex: 1,
          transform,
          transformOrigin: 'bottom center',
          animation: isShaking ? ('shakeX 0.15s linear infinite' as any) : undefined,
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-700"
          style={{ left: eyeLeft, top: eyeTop }}
        >
          <EyeBall
            size={18}
            pupilSize={7}
            maxDistance={5}
            eyeColor="white"
            pupilColor="#2D2D2D"
            isBlinking={isPurpleBlinking}
            forceLookX={forceLookX}
            forceLookY={forceLookY}
          />

          <EyeBall
            size={18}
            pupilSize={7}
            maxDistance={5}
            eyeColor="white"
            pupilColor="#2D2D2D"
            isBlinking={isPurpleBlinking}
            forceLookX={forceLookX}
            forceLookY={forceLookY}
            eyebrowClass="-right-2"
          />
          {/* Nose */}
          <div
            className="absolute h-2 w-2 rounded-full bg-red-300"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translateX(-50%)',
              marginTop: '20px',
            }}
          />

          <svg
            className="absolute top-10 bottom-0 left-0 h-8 w-full text-red-300"
            viewBox="0 0 1440 320"
            fill="none"
            stroke="currentColor"
            strokeWidth="9"
            strokeLinecap="round"
          >
            {showPassword || onError ? (
              <path d="M0,0 Q460,40 720,60 T1440,160" />
            ) : (
              <path d="M0,120 Q720,260 1440,120" />
            )}
          </svg>
        </div>
      </div>
      <style jsx>{`
        @keyframes shakeX {
          0%,
          100% {
            margin-left: 0;
          }
          20% {
            margin-left: -10px;
          }
          40% {
            margin-left: 10px;
          }
          60% {
            margin-left: -6px;
          }
          80% {
            margin-left: 2px;
          }
          100% {
            margin-left: 0;
          }
        }
      `}</style>
    </>
  );
};
