// ============================================================================
// Keyboard Hotkeys Hook (useHotkeys)
// Follows: fixing-accessibility, emil-design-eng, react-patterns
// ============================================================================

import { useEffect, useRef } from 'react';

export interface HotkeyBinding {
  combo: string; // e.g. 'mod+b', 'mod+j', 'escape'
  handler: (e: KeyboardEvent) => void;
  description?: string;
  allowInInputs?: boolean;
}

/**
 * Normalizes keyboard event into canonical modifier combo string
 */
export function getEventCombo(e: KeyboardEvent): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modPressed = isMac ? e.metaKey : e.ctrlKey;

  const parts: string[] = [];
  if (modPressed) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey && e.key.length > 1) parts.push('shift');

  const key = e.key.toLowerCase();
  parts.push(key);

  return parts.join('+');
}

/**
 * Checks if target element is an interactive text input
 */
function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'input') {
    const inputType = (el as HTMLInputElement).type.toLowerCase();
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'].includes(inputType);
  }
  return (
    tagName === 'textarea' ||
    tagName === 'select' ||
    el.isContentEditable ||
    el.getAttribute('role') === 'textbox'
  );
}

export function useHotkeys(bindings: HotkeyBinding[], enabled = true): void {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Check if a modal is currently trapping focus and suppressing global shortcuts
      const activeModal = document.querySelector('[data-modal-open="true"]');
      const isTargetInsideModal = activeModal && activeModal.contains(e.target as Node);

      const combo = getEventCombo(e);
      const isEditable = isEditableElement(e.target);

      for (const binding of bindingsRef.current) {
        const normalizedBinding = binding.combo.toLowerCase();
        if (combo === normalizedBinding) {
          // If a modal is open and this key is not escape, don't trigger global panel shortcuts
          if (activeModal && !isTargetInsideModal && normalizedBinding !== 'escape') {
            continue;
          }

          // If inside text input and shortcut doesn't allow inputs or doesn't have modifier
          if (isEditable && !binding.allowInInputs && !normalizedBinding.includes('mod')) {
            continue;
          }

          e.preventDefault();
          binding.handler(e);
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
}
