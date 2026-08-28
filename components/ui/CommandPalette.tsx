'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/CommandPalette.module.css';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Tools';
  title: string;
  subtext?: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Define commands
  const commands: CommandItem[] = useMemo(() => {
    return [
      // Navigation
      {
        id: 'nav-dashboard',
        category: 'Navigation',
        title: 'Dashboard',
        subtext: 'Performance intelligence & overview',
        icon: '📊',
        shortcut: 'G D',
        action: () => router.push('/dashboard'),
      },
      {
        id: 'nav-campaigns',
        category: 'Navigation',
        title: 'Campaigns',
        subtext: 'Multi-platform distribution & scheduling',
        icon: '🚀',
        shortcut: 'G C',
        action: () => router.push('/campaigns'),
      },
      {
        id: 'nav-content',
        category: 'Navigation',
        title: 'Content Series',
        subtext: 'Topic series and adaptation pipeline',
        icon: '📝',
        shortcut: 'G S',
        action: () => router.push('/series'),
      },
      {
        id: 'nav-creative',
        category: 'Navigation',
        title: 'Creative Studio',
        subtext: 'Template-driven flyer & asset composer',
        icon: '🎨',
        shortcut: 'G A',
        action: () => router.push('/campaigns/camp-coiltrace-q3/creative'),
      },
      {
        id: 'nav-platforms',
        category: 'Navigation',
        title: 'Platform Settings',
        subtext: 'X, Pinterest, LinkedIn connections',
        icon: '⚙️',
        shortcut: 'G P',
        action: () => router.push('/settings/platforms'),
      },
      {
        id: 'nav-tasks',
        category: 'Navigation',
        title: 'Tasks & Schedulers',
        subtext: 'Automated queue jobs & background tasks',
        icon: '⏱️',
        action: () => router.push('/tasks'),
      },

      // Actions
      {
        id: 'action-new-campaign',
        category: 'Actions',
        title: 'Create New Campaign',
        subtext: 'Initialize multi-platform content campaign',
        icon: '✨',
        action: () => router.push('/campaigns'),
      },
      {
        id: 'action-toggle-theme',
        category: 'Actions',
        title: 'Toggle Dark / Light Theme',
        subtext: 'Switch global visual mode',
        icon: '🌓',
        shortcut: 'Shift+T',
        action: () => {
          const current = document.documentElement.dataset.theme;
          const next = current === 'dark' ? 'light' : 'dark';
          document.documentElement.dataset.theme = next;
          localStorage.setItem('omnipost.theme', next);
        },
      },
      {
        id: 'action-open-pilot',
        category: 'Actions',
        title: 'Run CoilTrace Governed Pilot',
        subtext: 'Validate full authoring -> Mill render pipeline',
        icon: '🛡️',
        action: () => router.push('/campaigns/camp-coiltrace-q3/creative'),
      },

      // Tools
      {
        id: 'tool-audit',
        category: 'Tools',
        title: 'Audit & Provenance Proofs',
        subtext: 'Inspect immutable cryptographic ledger',
        icon: '🔒',
        action: () => router.push('/dashboard'),
      },
    ];
  }, [router]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      cmd =>
        cmd.title.toLowerCase().includes(lower) ||
        cmd.subtext?.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSelect = (cmd: CommandItem) => {
    cmd.action();
    setIsOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length)
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={() => setIsOpen(false)}>
      <div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <div className={styles.inputWrapper}>
          <svg
            className={styles.searchIcon}
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="Type a command or search..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          <span className={styles.shortcutHint}>ESC</span>
        </div>

        <ul className={styles.resultsList} role="listbox">
          {filteredCommands.length === 0 ? (
            <li style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No commands matching &quot;{query}&quot;
            </li>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <li
                key={cmd.id}
                role="option"
                aria-selected={idx === selectedIndex}
                className={`${styles.resultItem} ${idx === selectedIndex ? styles.activeItem : ''}`}
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={styles.resultLeft}>
                  <span className={styles.itemIcon}>{cmd.icon}</span>
                  <div>
                    <span>{cmd.title}</span>
                    {cmd.subtext && <span className={styles.itemSubtext}>— {cmd.subtext}</span>}
                  </div>
                </div>
                {cmd.shortcut && <span className={styles.shortcutHint}>{cmd.shortcut}</span>}
              </li>
            ))
          )}
        </ul>

        <div className={styles.footer}>
          <span>OmniPost Studio Command Hub</span>
          <div className={styles.footerShortcuts}>
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
