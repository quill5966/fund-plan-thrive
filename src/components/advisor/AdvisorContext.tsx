"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AdvisorContextType {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
}

const AdvisorContext = createContext<AdvisorContextType>({
    isOpen: false,
    open: () => {},
    close: () => {},
    toggle: () => {},
});

export function useAdvisor() {
    return useContext(AdvisorContext);
}

export function AdvisorProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    return (
        <AdvisorContext.Provider value={{ isOpen, open, close, toggle }}>
            {children}
        </AdvisorContext.Provider>
    );
}
