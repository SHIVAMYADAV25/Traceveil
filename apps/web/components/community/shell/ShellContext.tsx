"use client";
import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ShellValue {
  openSidebar: () => void;
  /** The element inside the top header where a screen can put its own buttons. Null until the shell has mounted. */
  actionsSlot: HTMLElement | null;
}
const ShellContext = createContext<ShellValue>({ openSidebar: () => undefined, actionsSlot: null });

export const ShellProvider = ShellContext.Provider;
export const useShell = (): ShellValue => useContext(ShellContext);

/**
 * A screen's own buttons (mute, rules, counts) are drawn inside the shell's top header. The header itself stays
 * mounted while you move around, and only its words and these buttons change.
 */
export function HeaderActions({ children }: { children: ReactNode }) {
  const { actionsSlot } = useShell();
  return actionsSlot ? createPortal(children, actionsSlot) : null;
}
