interface StatusBarProps {
  url?: string;
  isSecure: boolean;
  verificationScore?: number;
}

export function StatusBar({ url, isSecure, verificationScore }: StatusBarProps) {
  const scoreLabel =
    verificationScore === undefined
      ? ""
      : `Accuracy: ${Math.round(verificationScore * 100)}%`;

  const scoreColor =
    verificationScore === undefined
      ? "text-muted"
      : verificationScore > 0.8
        ? "text-emerald-400"
        : verificationScore > 0.5
          ? "text-amber-400"
          : "text-red-400";

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-surface border-t border-gray-800 text-[10px] select-none">
      <div className="flex items-center gap-3">
        {isSecure && (
          <span className="text-emerald-400 flex items-center gap-1">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure
          </span>
        )}
        <span className="text-muted truncate max-w-md">
          {url?.startsWith("blackroad://") ? "" : url}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {scoreLabel && <span className={scoreColor}>{scoreLabel}</span>}
        <span className="text-gray-700">BlackRoad Internet</span>
      </div>
    </div>
  );
}
