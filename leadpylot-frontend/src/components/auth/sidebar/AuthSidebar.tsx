'use client';
import React, { useState, useEffect } from 'react';
import { PurpleCharacter } from '../../characters/purple-character';
import { BlackCharacter } from '../../characters/black-character';
import { OrangeCharacter } from '../../characters/orange-character';
import { YellowCharacter } from '../../characters/yellow-character';
import { useAuthSidebar } from '@/contexts/AuthSidebarContext';

export const AuthSidebar = ({ }) => {
  const {
    mouseX,
    mouseY,
    isTyping,
    password,
    showPassword,
    onError = false,
    setOnError = () => { },
  } = useAuthSidebar();
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  // Blinking effects
  useEffect(() => {
    const blink = (setBlinking: (value: boolean) => void) => {
      const timeout = setTimeout(
        () => {
          setBlinking(true);
          setTimeout(() => setBlinking(false), 150);
          blink(setBlinking);
        },
        Math.random() * 4000 + 3000
      );
      return timeout;
    };

    const purpleTimeout = blink(setIsPurpleBlinking);
    const blackTimeout = blink(setIsBlackBlinking);

    return () => {
      clearTimeout(purpleTimeout);
      clearTimeout(blackTimeout);
    };
  }, []);

  // Looking at each other when typing
  useEffect(() => {
    if (isTyping) {
      setTimeout(() => setIsLookingAtEachOther(true), 0);
      setTimeout(() => setOnError(false), 0);
      setTimeout(() => setIsLookingAtEachOther(false), 800);
    }
  }, [isTyping, setOnError]);

  // Auto-clear error state after a few seconds so shake/error face doesn't persist
  useEffect(() => {
    if (!onError) return;
    const timer = setTimeout(() => setOnError(false), 2500);
    return () => clearTimeout(timer);
  }, [onError, setOnError]);

  // Purple peeking when password is visible
  useEffect(() => {
    const passwordValue = password || '';
    if (passwordValue.length > 0 && showPassword) {
      const peek = () => {
        const timeout = setTimeout(
          () => {
            setIsPurplePeeking(true);
            setTimeout(() => setIsPurplePeeking(false), 800);
            peek();
          },
          Math.random() * 3000 + 2000
        );
        return timeout;
      };
      const timeout = peek();
      return () => clearTimeout(timeout);
    }
  }, [password, showPassword]);

  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-r from-green-50 to-gray-50 p-8 text-black">
      <div className="text-lg font-semibold"></div>

      <div className="flex h-96 items-end justify-center">
        <div className="relative" style={{ width: '550px', height: '400px' }}>
          <PurpleCharacter
            mouseX={mouseX}
            mouseY={mouseY}
            isTyping={isTyping}
            password={password}
            showPassword={showPassword}
            isPurpleBlinking={isPurpleBlinking}
            isLookingAtEachOther={isLookingAtEachOther}
            isPurplePeeking={isPurplePeeking}
            onError={onError}
          />
          <BlackCharacter
            mouseX={mouseX}
            mouseY={mouseY}
            isTyping={isTyping}
            password={password}
            showPassword={showPassword}
            isBlackBlinking={isBlackBlinking}
            isLookingAtEachOther={isLookingAtEachOther}
            onError={onError}
          />
          <OrangeCharacter
            mouseX={mouseX}
            mouseY={mouseY}
            password={password}
            isPurpleBlinking={isPurpleBlinking}
            showPassword={showPassword}
            onError={onError}
          />
          <YellowCharacter
            mouseX={mouseX}
            mouseY={mouseY}
            password={password}
            showPassword={showPassword}
            onError={onError}
          />
        </div>
      </div>

      <div className="flex gap-8 text-sm">
        <a href="#" className="transition-colors hover:text-gray-500">
          Privacy Policy
        </a>
        <a href="#" className="transition-colors hover:text-gray-500">
          Terms of Service
        </a>
        <a href="#" className="transition-colors hover:text-gray-500">
          Contact
        </a>
      </div>
    </div>
  );
};
