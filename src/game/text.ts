/** Text helpers for dialogue: wrapping, paging, and turning second-person case text into speech. */

export function upperFirst(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Word-wrap to `cols` characters. Overlong words are hard-broken. */
export function wrapText(text: string, cols: number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (let word of para.split(/\s+/).filter(Boolean)) {
      while (word.length > cols) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(word.slice(0, cols - 1) + '-');
        word = word.slice(cols - 1);
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= cols) line += ' ' + word;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Split into dialogue-box pages of `rows` lines each. */
export function paginate(text: string, cols: number, rows: number): string[] {
  const lines = wrapText(text, cols);
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows).join('\n'));
  return pages.length ? pages : [''];
}

const OBJECT_CUES = '(saw|see|seen|with|told|tell|for|to|asked|about|behind|beside|near|watched|heard|met|left|following|followed|caught|found|hurt|blame|thank|trust)';

/** "You and Ann were in the library" -> "Ann and I were in the library". Best-effort, corpus-tested. */
export function firstPerson(text: string): string {
  let s = text;
  s = s.replace(/\byou and ([A-Z][^,.;:!?]*?) (were|are|was|have|had|did|took|went|spent|stayed|sat|played|rehearsed|watched|talked)\b/g, (_m, name: string, verb: string) => `${name} and I ${verb === 'were' ? 'were' : verb === 'are' ? 'are' : verb}`);
  s = s.replace(/\byou and ([A-Z][\w'"“”. -]*?)(?=[,.;:!?]| were| are)/g, (_m, name: string) => `${name} and I`);
  s = s.replace(/\byou were\b/gi, (m) => (m[0] === 'Y' ? 'I was' : 'I was'));
  s = s.replace(/\byou are\b/gi, 'I am');
  s = s.replace(/\byou're\b/gi, "I'm");
  s = s.replace(/\byou've\b/gi, "I've");
  s = s.replace(/\byou'd\b/gi, "I'd");
  s = s.replace(/\byou'll\b/gi, "I'll");
  s = s.replace(/\byourself\b/gi, 'myself');
  s = s.replace(/\byours\b/gi, 'mine');
  s = s.replace(/\byour\b/gi, 'my');
  s = s.replace(new RegExp(`\\b${OBJECT_CUES} you\\b`, 'gi'), (_m, v: string) => `${v} me`);
  s = s.replace(/\byou\b/gi, 'I');
  // Repair grammar the swap can break.
  s = s.replace(/\bI were\b/g, 'I was').replace(/\bI is\b/g, 'I am');
  s = s.replace(/\b(and|or) I was\b/g, '$1 I were').replace(/ and I was\b/g, ' and I were');
  // "I ... and were" -> "I ... and was" (but leave "Ann and I were ... and were" alone)
  s = s.replace(/(^|[.!?]\s+)([^.!?]*?) and were\b/g, (m, pre: string, body: string) => (/\bI\b/.test(body) && !/ and I\b/.test(body) ? `${pre}${body} and was` : m));
  s = s.replace(/(^|[.!?]\s+)i\b/g, '$1I');
  return s.replace(/(^|[.!?]\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase());
}

/** Pull the spoken part out of "Name says: 'text'". */
export function extractQuote(desc: string): { speaker: string | null; quote: string } {
  const m = /^(.{1,80}?) (?:says|said|whispers|mutters|claims|swears)[:,]?\s*['"‘“](.+?)['"’”]?\s*$/s.exec(desc.trim());
  if (m) return { speaker: m[1]!.trim(), quote: m[2]!.trim() };
  return { speaker: null, quote: desc.trim() };
}

export function titleCase(s: string): string {
  return s.replace(/\b([a-z])([a-z']*)/g, (_m, a: string, b: string) => (['the', 'of', 'and', 'a', 'in'].includes(a + b) ? a + b : a.toUpperCase() + b));
}
