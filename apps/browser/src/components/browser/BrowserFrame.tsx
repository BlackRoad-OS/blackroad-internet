import { useCallback } from "react";
import { NewTabPage } from "./NewTabPage";
import { SearchPage } from "../search/SearchPage";

interface BrowserFrameProps {
  url: string;
  onNavigate: (url: string) => void;
  onTitleChange: (title: string) => void;
  onContentReady: (content: string) => void;
}

export function BrowserFrame({ url, onNavigate, onTitleChange, onContentReady }: BrowserFrameProps) {
  const handleIframeLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const frame = e.target as HTMLIFrameElement;
        const doc = frame.contentDocument;
        if (!doc) return;

        const title = doc.title;
        if (title) onTitleChange(title);

        // Extract text content for verification
        const body = doc.body;
        if (body) {
          // Remove script/style elements before extracting text
          const clone = body.cloneNode(true) as HTMLElement;
          clone.querySelectorAll("script, style, nav, footer, header, iframe").forEach((el) => el.remove());
          const text = clone.innerText || clone.textContent || "";
          // Only send if we got meaningful content
          if (text.trim().length > 50) {
            onContentReady(text.trim().slice(0, 10000)); // Cap at 10k chars for LLM context
          }
        }
      } catch {
        // Cross-origin: can't access content directly
        // Send URL-only signal so backend knows to use reputation-only scoring
        onContentReady("");
      }
    },
    [onTitleChange, onContentReady],
  );

  // Internal BlackRoad pages
  if (url === "blackroad://newtab" || url === "") {
    return (
      <div className="flex-1 overflow-auto">
        <NewTabPage onNavigate={onNavigate} />
      </div>
    );
  }

  if (url.startsWith("blackroad://search")) {
    const params = new URLSearchParams(url.split("?")[1] || "");
    return (
      <div className="flex-1 overflow-auto">
        <SearchPage query={params.get("q") || ""} onNavigate={onNavigate} />
      </div>
    );
  }

  // External web pages via iframe
  return (
    <div className="flex-1 relative">
      <iframe
        src={url}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
