/**
 * Tabs Component
 * 
 * Reusable tab navigation component for consistent tab UI across the app.
 */

interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
  title?: string;
}

interface TabsProps {
  /**
   * Array of tab definitions
   */
  tabs: Tab[];
  
  /**
   * Currently active tab ID
   */
  activeTab: string;
  
  /**
   * Callback when a tab is clicked
   */
  onTabChange: (tabId: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export default function Tabs({ tabs, activeTab, onTabChange, className = '' }: TabsProps) {
  return (
    <div className={`overflow-x-auto -mx-1 px-1 pb-1 mb-6 ${className}`}>
      <div className="tabs tabs-boxed w-max min-w-full sm:w-auto sm:min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab whitespace-nowrap text-sm sm:text-base ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            title={tab.title ?? tab.label}
          >
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </button>
        ))}
      </div>
    </div>
  );
}
