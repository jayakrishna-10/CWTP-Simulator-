import { useSimulationStore } from '../../store/simulationStore';
import Header from './Header';
import MobileNavTabs from './MobileNavTabs';
import OverviewPanel from './OverviewPanel';
import TankLevelPanel from './TankLevelPanel';
import ExchangerLoadPanel from './ExchangerLoadPanel';
import TrendChart from './TrendChart';
import TimelineControl from './TimelineControl';
import EventLog from './EventLog';

export default function Dashboard() {
  const { activeTab, result } = useSimulationStore();

  if (!result) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Mobile Nav Tabs */}
      <div className="md:hidden">
        <MobileNavTabs />
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-40 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          {/* Mobile: Tab Content */}
          <div className="md:hidden">
            {activeTab === 'overview' && <OverviewPanel />}
            {activeTab === 'tanks' && <TankLevelPanel />}
            {activeTab === 'loads' && <ExchangerLoadPanel />}
            {activeTab === 'trends' && <TrendChart />}
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden md:grid md:grid-cols-2 gap-4">
            <OverviewPanel />
            <TankLevelPanel />
          </div>
          <div className="hidden md:block">
            <ExchangerLoadPanel />
          </div>
          <div className="hidden md:block">
            <TrendChart />
          </div>

          {/* Event Log - Always visible on desktop, optional on mobile */}
          <div className="hidden md:block">
            <EventLog />
          </div>
        </div>
      </main>

      {/* Timeline Control - Fixed at bottom */}
      <TimelineControl />
    </div>
  );
}
