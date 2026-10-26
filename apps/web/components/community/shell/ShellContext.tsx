"use client";
import { createContext, useContext } from "react";

interface ShellValue { openSidebar: () => void }
const ShellContext = createContext<ShellValue>({ openSidebar: () => undefined });

export const ShellProvider = ShellContext.Provider;
export const useShell = (): ShellValue => useContext(ShellContext);
