'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthSidebarContextType {
    mouseX: number;
    mouseY: number;
    isTyping: boolean;
    password: string;
    setOnError?: (error: boolean) => void;
    onError?: boolean;
    showPassword: boolean;
    setIsTyping: (isTyping: boolean) => void;
    setPassword: (password: string) => void;
    setShowPassword: (showPassword: boolean) => void;
}

const AuthSidebarContext = createContext<AuthSidebarContextType | undefined>(undefined);

export const AuthSidebarProvider = ({ children }: { children: ReactNode }) => {
    const [mouseX, setMouseX] = useState(0);
    const [mouseY, setMouseY] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [onError, setOnError] = useState<boolean>(false);
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMouseX(e.clientX);
            setMouseY(e.clientY);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);
    return (
        <AuthSidebarContext.Provider
            value={{
                mouseX,
                mouseY,
                isTyping,
                password,
                showPassword,
                onError,
                setIsTyping,
                setPassword,
                setShowPassword,
                setOnError: (error: boolean) => setOnError(error)
            }}
        >
            {children}
        </AuthSidebarContext.Provider>
    );
};

export const useAuthSidebar = () => {
    const context = useContext(AuthSidebarContext);
    if (context === undefined) {
        throw new Error('useAuthSidebar must be used within an AuthSidebarProvider');
    }
    return context;
};

