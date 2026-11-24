import { useEffect } from 'react';

interface UseKeyboardNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: string[];
  isEnabled?: boolean;
}

export function useKeyboardNavigation({
  activeTab,
  setActiveTab,
  tabs,
  isEnabled = true
}: UseKeyboardNavigationProps) {
  
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if user is not typing in an input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      const currentIndex = tabs.indexOf(activeTab);

      // Arrow key navigation
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        setActiveTab(tabs[currentIndex - 1]);
      } else if (event.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
        event.preventDefault();
        setActiveTab(tabs[currentIndex + 1]);
      }

      // Number key navigation (1-8 for tabs)
      const numberKey = parseInt(event.key);
      if (numberKey >= 1 && numberKey <= tabs.length) {
        event.preventDefault();
        setActiveTab(tabs[numberKey - 1]);
      }

      // First/Last tab shortcuts
      if (event.key === 'Home') {
        event.preventDefault();
        setActiveTab(tabs[0]);
      } else if (event.key === 'End') {
        event.preventDefault();
        setActiveTab(tabs[tabs.length - 1]);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [activeTab, setActiveTab, tabs, isEnabled]);

  return {
    shortcuts: [
      { key: '← →', description: 'Navegar entre abas' },
      { key: '1-8', description: 'Ir para aba específica' },
      { key: 'Home/End', description: 'Primeira/última aba' }
    ]
  };
}