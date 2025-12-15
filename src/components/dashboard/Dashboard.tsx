import { useSimulationStore } from '../../store/simulationStore';
import Header from './Header';
import MobileNavTabs from './MobileNavTabs';
import OverviewPanel from './OverviewPanel';
import TankLevelPanel from './TankLevelPanel';
import ExchangerLoadPanel from './ExchangerLoadPanel';
import TrendChart from './TrendChart';
import TimelineControl from './TimelineControl';
import EventLog from './EventLog';
import LogsheetPanel from './LogsheetPanel';

export default function Dashboard() {
  const { activeTab, result } = useSimulationStore();

  if (!result) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Header />

      {/* Mobile Nav Tabs */}
      <div className="md:hidden">
        <MobileNavTabs />
      </div>

      {/* Main Content */}
      <main className="flex-1 pb-36 md:pb-28">
        <div className="max-w-7xl mx-auto px-2 py-2 space-y-2">
          {/* Mobile: Tab Content */}
          <div className="md:hidden">
            {activeTab === 'overview' && <OverviewPanel />}
            {activeTab === 'tanks' && <TankLevelPanel />}
            {activeTab === 'loads' && <ExchangerLoadPanel />}
            {activeTab === 'trends' && <TrendChart />}
            {activeTab === 'logsheet' && <LogsheetPanel />}
          </div>

          {/* Desktop: Dense Grid Layout */}
          <div className="hidden md:block space-y-2">
            {/* Top Row: Overview + Tanks + Loads side by side */}
            <div className="grid grid-cols-12 gap-2">
              {/* Overview Panel - narrower */}
              <div className="col-span-3">
                <OverviewPanel />
              </div>
              {/* Tank Levels Panel */}
              <div className="col-span-4">
                <TankLevelPanel />
              </div>
              {/* Exchanger Loads Panel */}
              <div className="col-span-5">
                <ExchangerLoadPanel />
              </div>
            </div>

            {/* Middle Row: Trends + Event Log */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-8">
                <TrendChart />
              </div>
              <div className="col-span-4">
                <EventLog />
              </div>
            </div>

            {/* Bottom Row: Logsheet - Full Width */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12">
                <LogsheetPanel />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Timeline Control - Fixed at bottom */}
      <TimelineControl />
    </div>
  );
}
