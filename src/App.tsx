import { useState } from 'react';
import { StudentManagement } from './components/StudentManagement';
import { AttendanceDashboard } from './components/AttendanceDashboard';
import { DailyReport } from './components/DailyReport';
import { MonthlyReport } from './components/MonthlyReport';
import { ApiDocumentation } from './components/ApiDocumentation';
import { Users, Calendar, FileText, Code, BarChart3 } from 'lucide-react';

type Tab = 'dashboard' | 'students' | 'daily' | 'monthly' | 'api';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Attendance', icon: Calendar },
    { id: 'students' as Tab, label: 'Students', icon: Users },
    { id: 'daily' as Tab, label: 'Daily Report', icon: FileText },
    { id: 'monthly' as Tab, label: 'Monthly Report', icon: BarChart3 },
    { id: 'api' as Tab, label: 'Raspberry Pi Setup', icon: Code },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Student Attendance System
                </h1>
                <p className="text-sm text-gray-600">
                  Fingerprint-based attendance tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <AttendanceDashboard />}
        {activeTab === 'students' && <StudentManagement />}
        {activeTab === 'daily' && <DailyReport />}
        {activeTab === 'monthly' && <MonthlyReport />}
        {activeTab === 'api' && <ApiDocumentation />}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            Powered by Supabase & Raspberry Pi
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
