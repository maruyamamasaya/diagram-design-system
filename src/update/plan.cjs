'use strict';
const crypto = require('node:crypto');
const { validatePresentation } = require('../presentation/validate.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const lines = text => text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
// Bounded LCS: changes retain old coordinates so later insertions do not shift references.
function diffSource(sourceId, before, after) {
  if (before === after) return [];
  if (before === undefined || after === undefined) return [{ sourceId, type: before === undefined ? 'added' : 'deleted', oldStart: 1, oldEnd: before === undefined ? 0 : lines(before).length, newStart: 1, newEnd: after === undefined ? 0 : lines(after).length, before: before || '', after: after || '' }];
  const a = lines(before), b = lines(after);
  if (a.length * b.length > 1000000) return [{ sourceId, type: 'unknown', reason: '行比較上限超過', beforeHash: hash(before), afterHash: hash(after) }];
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const changes = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; continue; }
    const x = i, y = j;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) break;
      if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) j++; else i++;
    }
    const change = { sourceId, type: i === x ? 'added' : j === y ? 'deleted' : 'modified', oldStart: x + 1, oldEnd: i, newStart: y + 1, newEnd: j, before: a.slice(x, i).join('\n'), after: b.slice(y, j).join('\n') };
    // A pure insertion inside an existing Markdown section belongs to that section.
    if (change.type === 'added' && !b.slice(y, j).some(line => /^#{1,6} /.test(line))) {
      let start = x - 1;
      while (start >= 0 && !/^#{1,6} /.test(a[start])) start--;
      if (start >= 0) {
        let end = start + 1;
        while (end < a.length && !/^#{1,6} /.test(a[end])) end++;
        change.sectionRange = [start + 1, end];
      }
    }
    changes.push(change);
  }
  if (!changes.length) changes.push({ sourceId, type: 'unknown', reason: '改行形式・末尾改行のみの変更' });
  return changes;
}
function createUpdatePlan(presentation, beforeSources, afterSources) {
  validatePresentation(presentation);
  for (const [id, value] of [...Object.entries(beforeSources), ...Object.entries(afterSources)]) if (typeof value !== 'string') throw Error('Source must be text: ' + id);
  for (const slide of presentation.slides) for (const ref of slide.sourceReferences || []) {
    if (!(ref.sourceId in beforeSources)) throw Error('Missing baseline source: ' + ref.sourceId);
    if (hash(beforeSources[ref.sourceId]) !== ref.sourceVersion) throw Error('Baseline source hash mismatch: ' + ref.sourceId);
  }
  const changes = [...new Set([...Object.keys(beforeSources), ...Object.keys(afterSources)])].sort().flatMap(id => diffSource(id, beforeSources[id], afterSources[id])).map((c, index) => ({ changeId: 'change-' + (index + 1), ...c, affectedSlideIds: [] }));
  const slides = presentation.slides.map(slide => {
    const refs = slide.sourceReferences || [];
    const relevant = [], uncertain = [];
    for (const change of changes) {
      const matching = refs.filter(r => r.sourceId === change.sourceId);
      if (!matching.length && (!refs.length || slide.references.includes(change.sourceId))) { uncertain.push(change); continue; }
      for (const ref of matching) {
        const match = /^lines:(\d+)-(\d+)$/.exec(ref.locator);
        if (!match || +match[1] < 1 || +match[2] < +match[1] || +match[2] > lines(beforeSources[ref.sourceId]).length || change.type === 'unknown') { uncertain.push(change); continue; }
        const start = +match[1], end = +match[2];
        if (change.oldEnd >= change.oldStart ? start <= change.oldEnd && end >= change.oldStart : change.sectionRange && start <= change.sectionRange[1] && end >= change.sectionRange[0]) relevant.push(change);
        else if (change.type === 'added' && !change.sectionRange && start <= change.oldStart && end >= change.oldStart - 1) uncertain.push(change);
      }
    }
    for (const c of uncertain) c.requiresReview = true;
    const impacted = [...new Set([...relevant, ...uncertain])];
    for (const c of impacted) c.affectedSlideIds.push(slide.slideId);
    const status = uncertain.length ? 'review' : relevant.length ? 'update' : 'keep';
    return { slideId: slide.slideId, title: slide.content.heading, status, changed: status === 'review' ? null : status === 'update', affectedSourceIds: [...new Set(impacted.map(c => c.sourceId))], changeIds: impacted.map(c => c.changeId), changes: impacted.map(c => ({ type: c.type, before: c.before, after: c.after })), reason: status === 'review' ? '参照範囲または変更の帰属を確定できない' : status === 'update' ? '原資料の変更が参照範囲に対応' : '参照範囲に変更なし', recommendedAction: status === 'review' ? '原資料と参照を確認して判断' : status === 'update' ? '構成・図参照を見直し、次版で更新' : '現状維持', regenerationRequired: status === 'review' ? null : status === 'update' };
  });
  const reviewChanges = changes.filter(c => !c.affectedSlideIds.length || c.type === 'unknown' || c.requiresReview).map(c => c.changeId);
  return { schemaVersion: 'presentation-update-plan-1.0', presentationId: presentation.presentationId, baselineVersion: presentation.version, sources: [...new Set([...Object.keys(beforeSources), ...Object.keys(afterSources)])].map(sourceId => ({ sourceId, beforeHash: sourceId in beforeSources ? hash(beforeSources[sourceId]) : null, afterHash: sourceId in afterSources ? hash(afterSources[sourceId]) : null })), changes, slides, regenerateSlideIds: slides.filter(s => s.status === 'update').map(s => s.slideId), keepSlideIds: slides.filter(s => s.status === 'keep').map(s => s.slideId), reviewSlideIds: slides.filter(s => s.status === 'review').map(s => s.slideId), reviewChanges };
}
function toMarkdown(plan) {
  const cell = text => String(text).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  return `# スライド更新計画\n\n資料: ${plan.presentationId} / 元版: ${plan.baselineVersion}\n\n更新 ${plan.regenerateSlideIds.length}・維持 ${plan.keepSlideIds.length}・要確認 ${plan.reviewSlideIds.length}。実再生成は未実施。\n\n|slideId|変更有無|sourceId|変更内容|更新理由|推奨アクション|再生成|\n|---|---|---|---|---|---|---|\n` + plan.slides.map(s => [s.slideId, s.status, s.affectedSourceIds.join(', '), s.changes.map(c => `${c.type}: ${c.before || ''} → ${c.after || ''}`).join('\n'), s.reason, s.recommendedAction, String(s.regenerationRequired)].map(cell).join('|')).map(row => '|' + row + '|').join('\n') + '\n\n## 原資料差分\n\n' + plan.changes.map(c => `- ${c.changeId} (${c.sourceId}, ${c.type}): ${cell(c.before || '')} → ${cell(c.after || c.reason || '')}`).join('\n') + `\n\n帰属未確定／要確認差分: ${plan.reviewChanges.join(', ') || 'なし'}\n`;
}
module.exports = { diffSource, createUpdatePlan, toMarkdown };
