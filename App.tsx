import React, { useState } from 'react';
import VoiceCall from './components/VoiceCall';
import TextChat from './components/TextChat';
import Dashboard from './components/Dashboard';
import { BotMessageSquareIcon, MicIcon, PencilIcon } from './components/icons';

type View = 'voice' | 'text';

// FIX: Moved TabButton outside the App component to prevent re-creation on every render
// and to fix a potential issue with the linter/compiler misinterpreting the component's props.
const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
      active ? 'bg-sky-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
    }`}
  >
    {children}
  </button>
);

const App: React.FC = () => {
  const [view, setView] = useState<View>('voice');

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* Main Interaction Panel */}
        <main className="flex-grow lg:w-2/3 bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700">
          <header className="p-4 border-b border-slate-700 flex items-center gap-3">
             <div className="p-2 bg-sky-500/20 rounded-lg">
                <BotMessageSquareIcon className="w-6 h-6 text-sky-400" />
            </div>
            <h1 className="text-xl font-bold text-white">EngliChat AI Tutor</h1>
          </header>

          <div className="p-4">
            <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
              <TabButton active={view === 'voice'} onClick={() => setView('voice')}>
                <MicIcon className="w-5 h-5" /> Voice Call
              </TabButton>
              <TabButton active={view === 'text'} onClick={() => setView('text')}>
                <PencilIcon className="w-5 h-5" /> Text Chat
              </TabButton>
            </div>
          </div>

          <div className="flex-grow p-4 pt-0 overflow-y-auto">
            {view === 'voice' ? <VoiceCall /> : <TextChat />}
          </div>
        </main>

        {/* Dashboard Panel */}
        <aside className="lg:w-1/3 w-full">
          <Dashboard />
        </aside>
      </div>
       <footer className="text-center text-slate-500 text-xs mt-8">
            <p>Built with Gemini API. For educational purposes.</p>
        </footer>
    </div>
  );
};

export default App;
