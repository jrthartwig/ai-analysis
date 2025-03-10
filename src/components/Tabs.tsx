import { useState, ReactNode } from 'react';

interface TabProps {
  label: string;
  value: string;
  children: ReactNode;
}

export const Tab = ({ children }: TabProps) => {
  return <>{children}</>;
};

interface TabsProps {
  defaultValue: string;
  children: ReactNode[];
}

export const Tabs = ({ defaultValue, children }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  // Filter out only Tab components
  const tabs = Array.isArray(children) 
    ? children.filter((child: any) => child?.type === Tab) 
    : [children].filter((child: any) => child?.type === Tab);
  
  return (
    <div className="w-full">
      <div className="flex border-b">
        {tabs.map((tab: any, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab.props.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600 hover:text-primary'
            }`}
            onClick={() => setActiveTab(tab.props.value)}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs.map((tab: any, index) => (
          <div
            key={index}
            className={`${activeTab === tab.props.value ? 'block' : 'hidden'}`}
          >
            {tab.props.children}
          </div>
        ))}
      </div>
    </div>
  );
};
