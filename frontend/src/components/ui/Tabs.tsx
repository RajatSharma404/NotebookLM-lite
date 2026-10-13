// ============================================================================
// Compound Tabs Component
// Follows: react-patterns, fixing-accessibility, fixing-motion-performance
// ============================================================================

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ReactNode
} from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (val: string) => void;
  registerTrigger: (val: string, el: HTMLButtonElement | null) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs compound components must be rendered inside Tabs.Root');
  return ctx;
}

// ----------------------------------------------------------------------------
// Tabs.Root
// ----------------------------------------------------------------------------
export interface TabsRootProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (val: string) => void;
  children: ReactNode;
  className?: string;
}

export function TabsRoot({
  defaultValue,
  value,
  onValueChange,
  children,
  className = ''
}: TabsRootProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (val: string) => {
    if (value === undefined) setInternalTab(val);
    onValueChange?.(val);
  };

  const registerTrigger = (val: string, el: HTMLButtonElement | null) => {
    if (el) {
      triggerRefs.current.set(val, el);
    } else {
      triggerRefs.current.delete(val);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, registerTrigger }}>
      <div className={`ui-tabs-root ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Tabs.List
// ----------------------------------------------------------------------------
export interface TabsListProps {
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function TabsList({ children, className = '', 'aria-label': ariaLabel = 'Navigation Tabs' }: TabsListProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    transform: 'translateX(0px)',
    width: '0px',
    opacity: 0
  });

  // Calculate indicator position using transform only
  useEffect(() => {
    if (!listRef.current) return;
    const activeBtn = listRef.current.querySelector<HTMLButtonElement>(`[data-tab-value="${activeTab}"]`);
    if (activeBtn) {
      const listRect = listRef.current.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const leftOffset = btnRect.left - listRect.left;
      setIndicatorStyle({
        transform: `translateX(${leftOffset}px)`,
        width: `${btnRect.width}px`,
        opacity: 1
      });
    }
  }, [activeTab, children]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Home, End)
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!listRef.current) return;
    const triggers = Array.from(listRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    if (triggers.length === 0) return;

    const currentIndex = triggers.findIndex((t) => t.getAttribute('data-tab-value') === activeTab);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % triggers.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = triggers.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const targetTrigger = triggers[nextIndex];
    targetTrigger.focus();
    const targetVal = targetTrigger.getAttribute('data-tab-value');
    if (targetVal) setActiveTab(targetVal);
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`ui-tabs-list ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        borderBottom: '1px solid var(--line)',
        padding: '0 var(--space-4)',
        gap: 'var(--space-2)'
      }}
    >
      {children}
      {/* 2px Sliding Accent Underline (transforms only) */}
      <div
        className="ui-tabs-indicator"
        style={{
          position: 'absolute',
          bottom: '-1px',
          left: 0,
          height: '2px',
          backgroundColor: 'var(--accent)',
          transition: 'transform var(--dur-2) var(--ease-out), width var(--dur-2) var(--ease-out), opacity var(--dur-1) var(--ease-out)',
          pointerEvents: 'none',
          ...indicatorStyle
        }}
        aria-hidden="true"
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tabs.Trigger
// ----------------------------------------------------------------------------
export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, badge, className = '' }: TabsTriggerProps) {
  const { activeTab, setActiveTab, registerTrigger } = useTabsContext();
  const isSelected = activeTab === value;
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    registerTrigger(value, btnRef.current);
    return () => registerTrigger(value, null);
  }, [value, registerTrigger]);

  return (
    <button
      ref={btnRef}
      role="tab"
      id={`tab-trigger-${value}`}
      aria-selected={isSelected}
      aria-controls={`tab-panel-${value}`}
      tabIndex={isSelected ? 0 : -1}
      data-tab-value={value}
      onClick={() => setActiveTab(value)}
      className={`ui-tabs-trigger ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: 'var(--space-3) var(--space-2)',
        fontSize: 'var(--text-13)',
        fontWeight: isSelected ? 500 : 400,
        color: isSelected ? 'var(--text-1)' : 'var(--text-2)',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'color var(--dur-1) var(--ease-out)'
      }}
    >
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className="font-mono"
          style={{
            fontSize: 'var(--text-12)',
            color: isSelected ? 'var(--accent-text)' : 'var(--text-3)',
            verticalAlign: 'super'
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ----------------------------------------------------------------------------
// Tabs.Content
// ----------------------------------------------------------------------------
export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { activeTab } = useTabsContext();
  const isSelected = activeTab === value;

  return (
    <div
      role="tabpanel"
      id={`tab-panel-${value}`}
      aria-labelledby={`tab-trigger-${value}`}
      hidden={!isSelected}
      tabIndex={0}
      className={`ui-tabs-content ${className}`}
      style={{
        display: isSelected ? 'flex' : 'none',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        overflowY: 'auto'
      }}
    >
      {isSelected && children}
    </div>
  );
}

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent
};
