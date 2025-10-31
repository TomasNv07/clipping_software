import { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ClipGallery from './components/ClipGallery';
import SettingsPanel from './components/SettingsPanel';

type View = 'clips' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<View>('clips');

  return (
    <div className="flex h-screen w-screen bg-app-bg overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <TopBar />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {currentView === 'clips' ? <ClipGallery /> : <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}

export default App;
