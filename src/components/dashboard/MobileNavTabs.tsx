import { useSimulationStore } from '../../store/simulationStore';
import { LayoutDashboard, Waves, BarChart3, TrendingUp } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tanks', label: 'Tanks', icon: Waves },
  { id: 'loads', label: 'Loads', icon: BarChart3 },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
] as const;

export default function MobileNavTabs() {
  const { activeTab, setActiveTab } = useSimulationStore();

  return (
    <div className="bg-white border-b border-slate-200 sticky top-[60px] z-40">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
