'use client';

type DiffToken = { text: string; kind: 'same' | 'del' | 'add' };

function computeWordDiff(a: string, b: string): { left: DiffToken[]; right: DiffToken[] } {
  const aw = a.split(/(\s+)/);
  const bw = b.split(/(\s+)/);
  const m = aw.length;
  const n = bw.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aw[i - 1] === bw[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const left: DiffToken[] = [];
  const right: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aw[i - 1] === bw[j - 1]) {
      left.unshift({ text: aw[i - 1], kind: 'same' });
      right.unshift({ text: bw[j - 1], kind: 'same' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      right.unshift({ text: bw[j - 1], kind: 'add' });
      j--;
    } else {
      left.unshift({ text: aw[i - 1], kind: 'del' });
      i--;
    }
  }
  return { left, right };
}

function renderTokens(tokens: DiffToken[]) {
  return tokens.map((t, idx) => {
    if (t.kind === 'del') {
      return (
        <span key={idx} className="bg-red-500/20 text-red-300 line-through">
          {t.text}
        </span>
      );
    }
    if (t.kind === 'add') {
      return (
        <span key={idx} className="bg-emerald-500/20 text-emerald-300">
          {t.text}
        </span>
      );
    }
    return <span key={idx}>{t.text}</span>;
  });
}

interface ClauseDiffProps {
  original: string;
  proposed: string;
  explanation?: string;
}

export function ClauseDiff({ original, proposed, explanation }: ClauseDiffProps) {
  const { left, right } = computeWordDiff(original, proposed);

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">Original</p>
          <div className="min-h-[60px] rounded-lg border border-red-900/30 bg-red-950/10 px-3 py-2.5 font-mono text-xs leading-relaxed text-zinc-300">
            {renderTokens(left)}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">Proposed</p>
          <div className="min-h-[60px] rounded-lg border border-emerald-900/30 bg-emerald-950/10 px-3 py-2.5 font-mono text-xs leading-relaxed text-zinc-100">
            {renderTokens(right)}
          </div>
        </div>
      </div>
      {explanation && (
        <p className="text-xs text-zinc-400 italic">{explanation}</p>
      )}
    </div>
  );
}
