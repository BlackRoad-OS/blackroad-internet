import { TabBar } from "./components/browser/TabBar";
import { AddressBar } from "./components/browser/AddressBar";
import { NavigationControls } from "./components/browser/NavigationControls";
import { BrowserFrame } from "./components/browser/BrowserFrame";
import { VerificationPanel } from "./components/sidebar/VerificationPanel";
import { StatusBar } from "./components/browser/StatusBar";
import { useTabs } from "./hooks/useTabs";
import { useVerification } from "./hooks/useVerification";

function App() {
  const { tabs, activeTab, addTab, closeTab, setActiveTab, navigateTo, updateTabTitle } =
    useTabs();
  const { verification, isVerifying, sidebarOpen, toggleSidebar, onContentReady } =
    useVerification(activeTab?.url);

  return (
    <div className="flex flex-col h-screen bg-black text-white font-mono">
      {/* Tab bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTab?.id ?? ""}
        onTabClick={setActiveTab}
        onTabClose={closeTab}
        onNewTab={addTab}
      />

      {/* Navigation + Address */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border-b border-gray-800">
        <NavigationControls />
        <AddressBar
          url={activeTab?.url ?? ""}
          onNavigate={navigateTo}
          verificationScore={verification?.overall_score}
        />
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-elevated transition-colors"
          title="Toggle verification panel"
        >
          <svg
            className={`w-4 h-4 ${sidebarOpen ? "text-hotpink" : "text-muted"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <BrowserFrame
          url={activeTab?.url ?? "blackroad://newtab"}
          onNavigate={navigateTo}
          onTitleChange={updateTabTitle}
          onContentReady={onContentReady}
        />

        {sidebarOpen && (
          <VerificationPanel
            verification={verification}
            isVerifying={isVerifying}
          />
        )}
      </div>

      {/* Status bar */}
      <StatusBar
        url={activeTab?.url}
        isSecure={activeTab?.url?.startsWith("https") ?? false}
        verificationScore={verification?.overall_score}
      />
    </div>
  );
}

export default App;
