// Renders validator results as a small heatmap table (DOM, below the debug pane).
import type { ValidatorResult } from '../logic/validator';

function cellColor(pct: number): string {
  // green (safe) -> red (deadly)
  const h = Math.round(pct * 120);
  return `hsl(${h}, 70%, 42%)`;
}

export function renderValidator(el: HTMLElement, results: ValidatorResult[]): void {
  const airs = results[0]?.rows.map((r) => r.air) ?? [];
  const head = airs.map((a) => `<th>${a}</th>`).join('');
  const body = results
    .map((res) => {
      const cells = res.rows
        .map((r) => `<td style="background:${cellColor(r.pct)}">${Math.round(r.pct * 100)}%</td>`)
        .join('');
      const mark = res.pass ? '✓' : '✗';
      const title = res.reasons.join('\n').replace(/"/g, "'");
      return `<tr title="${title}"><td class="n">${res.id}</td>${cells}<td class="${res.pass ? 'ok' : 'bad'}">${mark}</td></tr>`;
    })
    .join('');
  const fails = results
    .filter((r) => !r.pass)
    .map((r) => `<div class="bad">${r.id}: ${r.reasons.join('; ')}</div>`)
    .join('');
  el.innerHTML = `
    <div class="vt-title">Spike validator — % reaching the ceiling (air × tap point × phase)</div>
    <table><thead><tr><th>pattern</th>${head}<th></th></tr></thead><tbody>${body}</tbody></table>
    ${fails || '<div class="ok">All patterns pass.</div>'}`;
}

export const validatorCss = `
.vt { font: 11px/1.3 ui-monospace, Menlo, monospace; color: #ddd; background: #28292e; padding: 6px 8px 8px; border-radius: 6px; margin-top: 4px; }
.vt table { border-collapse: collapse; width: 100%; margin: 4px 0; }
.vt th { color: #aaa; font-weight: normal; padding: 2px; }
.vt td { text-align: center; padding: 3px 2px; color: #fff; border: 1px solid #222; }
.vt td.n { text-align: left; background: #333; }
.vt .ok { color: #6f6; }
.vt .bad { color: #f77; }
.vt-title { color: #bbb; }
`;
