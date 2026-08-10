/**
 * Client-side relevance search for the resource directory.
 *
 * Kept in its own module (rather than inline in resources.astro) so the
 * matching rules can be exercised directly by a test harness.
 *
 * Design notes, because the naive version of this was subtly wrong:
 *  - Fields are weighted separately. `serves` is an eligibility list ("man
 *    woman couple veteran senior …"), not a description of what an org does,
 *    so it must never outrank a name or category match.
 *  - Matching is OR + ranked, not AND. Requiring every typed word meant
 *    "shelter tonight" returned nothing.
 *  - Short terms match on whole words only, so "car" stops matching "care".
 */

export type SearchFields = {
  name: string;
  catlabels: string;
  desc: string;
  address: string;
  serves: string;
  [key: string]: string;
};

export type SearchDoc<T = unknown> = {
  fields: SearchFields;
  cats: string[];
  auds: string[];
  ref: T;
};

/**
 * `carries: false` means the field can boost a result but never produce one on
 * its own. Eligibility ("who may walk in") is exactly that: nearly every org
 * lists "veteran" and "domestic violence" among the people it accepts, so
 * letting it carry a match made "domestic violence" return 42 of 63 orgs
 * instead of the two shelters that actually specialise in it. Narrowing by
 * eligibility is what the Situation chips are for.
 */
export const FIELDS: { key: keyof SearchFields; weight: number; carries: boolean }[] = [
  { key: 'name', weight: 10, carries: true },
  { key: 'catlabels', weight: 6, carries: true },
  { key: 'desc', weight: 3, carries: true },
  { key: 'address', weight: 2, carries: true },
  { key: 'serves', weight: 0.75, carries: false },
];

/** Filler words. People type sentences; every word here was once required. */
export const STOP = new Set(
  (
    'a an the and or of for to in on at is are am i me my we our you your it that this ' +
    'need needs needed want looking look get find got have has help please someone ' +
    'anyone somewhere near nearby around can could would should how do does did where ' +
    'what who when why with without there here right now today tonight asap urgent ' +
    'free cheap low income any some more most best good new'
  ).split(' ')
);

/** Multi-word phrases people actually type, matched before tokenising. */
export const PHRASES: [RegExp, string[]][] = [
  [/\bfood stamps?\b/, ['snap', 'food', 'benefits']],
  [/\bsoup kitchens?\b/, ['soup', 'kitchen', 'meal']],
  [/\bfood banks?\b/, ['food', 'pantry']],
  [/\bsubstance abuse\b/, ['addiction', 'recovery', 'substance']],
  [/\bdrug (rehab|treatment|problem)\b/, ['addiction', 'recovery', 'detox']],
  [/\bmental health\b/, ['mental', 'counseling']],
  [/\bdomestic violence\b/, ['domestic', 'violence']],
  [/\bplace to (sleep|stay|live)\b/, ['shelter', 'housing']],
  [/\bnowhere to (sleep|stay|go|live)\b/, ['shelter', 'housing']],
  [/\b(power|light|water|electric|gas) bill\b/, ['utility', 'utilities']],
  [/\bbehind on rent\b/, ['rent', 'eviction']],
  [/\bhealth (insurance|coverage)\b/, ['benefits', 'medical']],
  [/\bjob (training|search|help)\b/, ['job', 'employment']],
  [/\bbirth certificate\b/, ['id']],
  [/\bwash (my )?clothes\b/, ['laundry']],
];

/**
 * Everyday words → words that actually appear in the resource data. This is
 * the difference between "hungry" finding a food pantry and finding nothing.
 * Every target below was verified to exist in the corpus — mapping to a word
 * that isn't there is worse than no mapping at all.
 */
export const SYNONYMS: Record<string, string[]> = {
  hungry: ['food', 'pantry', 'meal'],
  hunger: ['food', 'pantry', 'meal'],
  eat: ['food', 'meal'],
  eating: ['food', 'meal'],
  groceries: ['food', 'pantry'],
  grocery: ['food', 'pantry'],
  ebt: ['snap', 'benefits', 'food'],
  homeless: ['shelter', 'housing'],
  sleep: ['shelter', 'housing'],
  sleeping: ['shelter', 'housing'],
  bed: ['shelter'],
  stay: ['shelter', 'housing'],
  evicted: ['eviction', 'rent', 'housing'],
  apartment: ['housing', 'rent'],
  clothes: ['clothing'],
  shoes: ['clothing'],
  coat: ['clothing'],
  doctor: ['clinic', 'medical'],
  sick: ['clinic', 'medical'],
  ill: ['clinic', 'medical'],
  health: ['medical', 'clinic'],
  healthcare: ['medical', 'clinic'],
  teeth: ['dental'],
  tooth: ['dental'],
  dentist: ['dental'],
  meds: ['prescription'],
  medicine: ['prescription'],
  medication: ['prescription'],
  rehab: ['recovery', 'detox', 'addiction'],
  sober: ['recovery', 'addiction'],
  sobriety: ['recovery', 'addiction'],
  drugs: ['addiction', 'recovery'],
  alcohol: ['addiction', 'recovery'],
  drinking: ['addiction', 'recovery'],
  therapy: ['counseling', 'mental'],
  therapist: ['counseling', 'mental'],
  counselor: ['counseling'],
  depressed: ['mental', 'counseling'],
  depression: ['mental', 'counseling'],
  anxiety: ['mental', 'counseling'],
  suicidal: ['crisis', 'mental', 'hotline'],
  ride: ['bus', 'transit', 'transportation'],
  rides: ['bus', 'transit', 'transportation'],
  car: ['transportation', 'bus'],
  fare: ['bus', 'transit'],
  jobs: ['job', 'employment'],
  work: ['job', 'employment'],
  resume: ['job', 'employment'],
  lawyer: ['legal'],
  attorney: ['legal'],
  court: ['legal'],
  baby: ['pregnancy', 'family'],
  pregnant: ['pregnancy'],
  kids: ['family', 'youth'],
  children: ['family', 'youth'],
  child: ['family', 'youth'],
  teen: ['youth'],
  elderly: ['senior'],
  vet: ['veteran'],
  prison: ['reentry', 're-entry'],
  jail: ['reentry', 're-entry'],
  released: ['reentry', 're-entry'],
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** How well one term matches one field: whole word > prefix > loose. */
export function termScore(field: string, term: string): number {
  if (!field || !term) return 0;
  const e = esc(term);
  if (new RegExp(`\\b${e}\\b`).test(field)) return 1;
  // Short terms match whole words only, so "car" stops matching "care" and
  // "carolina" (which used to return 40 of 63 resources).
  if (term.length >= 4 && new RegExp(`\\b${e}`).test(field)) return 0.6;
  if (term.length >= 6 && field.includes(term)) return 0.3;
  return 0;
}

export type Term = { t: string; boost: number };

/** Query string → weighted search terms (phrases, stopwords, synonyms). */
export function expand(raw: string): Term[] {
  let s = ` ${raw.toLowerCase().replace(/[^a-z0-9+/\s-]/g, ' ').replace(/\s+/g, ' ')} `;
  const out = new Map<string, number>();
  const add = (t: string, boost: number) => out.set(t, Math.max(out.get(t) ?? 0, boost));

  for (const [re, mapped] of PHRASES) {
    if (re.test(s)) {
      s = s.replace(re, ' ');
      mapped.forEach((m) => add(m, 1));
    }
  }
  for (const w of s.split(' ').filter(Boolean)) {
    if (w.length < 2 || STOP.has(w)) continue;
    add(w, 1);
    for (const syn of SYNONYMS[w] || []) add(syn, 0.7);
  }
  return [...out].map(([t, boost]) => ({ t, boost }));
}

export function scoreDoc<T>(doc: SearchDoc<T>, terms: Term[]): number {
  let score = 0;
  let carried = false;
  for (const { t, boost } of terms) {
    let best = 0;
    for (const f of FIELDS) {
      const s = termScore(doc.fields[f.key], t) * f.weight;
      if (s > 0 && f.carries) carried = true;
      if (s > best) best = s;
    }
    score += best * boost;
  }
  // Matched only on eligibility — not a real topical hit.
  return carried ? score : 0;
}

/** Weak matches are dropped once something matches strongly. */
export const FLOOR_RATIO = 0.15;

export type RankOptions = { category?: string; audience?: string };

/**
 * Filter by chips, score by query, return docs best-first. With no query the
 * original authored order is preserved.
 */
export function rank<T>(
  docs: SearchDoc<T>[],
  query: string,
  opts: RankOptions = {}
): { doc: SearchDoc<T>; score: number }[] {
  const { category = '', audience = '' } = opts;
  const terms = expand(query);

  const eligible = docs.filter(
    (d) =>
      (!category || d.cats.includes(category)) && (!audience || d.auds.includes(audience))
  );
  if (!terms.length) return eligible.map((doc) => ({ doc, score: 0 }));

  const scored = eligible.map((doc) => ({ doc, score: scoreDoc(doc, terms) }));
  const top = Math.max(0, ...scored.map((s) => s.score));
  const floor = top * FLOOR_RATIO;
  return scored
    .filter((s) => s.score > 0 && s.score >= floor)
    .sort((a, b) => b.score - a.score);
}
