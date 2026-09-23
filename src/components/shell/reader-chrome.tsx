"use client";

import { createContext, useContext } from "react";

type ReaderChrome = {
  openNav: () => void;
  closeNav: () => void;
  openStudy: () => void;
  closeStudy: () => void;
};

const ReaderChromeContext = createContext<ReaderChrome | null>(null);

export function ReaderChromeProvider({
  openNav,
  closeNav,
  openStudy,
  closeStudy,
  children,
}: ReaderChrome & { children: React.ReactNode }) {
  return (
    <ReaderChromeContext.Provider value={{ openNav, closeNav, openStudy, closeStudy }}>
      {children}
    </ReaderChromeContext.Provider>
  );
}

export function useReaderChrome() {
  const value = useContext(ReaderChromeContext);
  if (!value) {
    return {
      openNav: () => {},
      closeNav: () => {},
      openStudy: () => {},
      closeStudy: () => {},
    };
  }
  return value;
}
