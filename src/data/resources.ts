/**
 * resources.ts — the single source of truth for the resource directory.
 *
 * Raw contact data lives in the project-root CSV (gvl_homeless_resources.csv)
 * so it stays easy to update. This module reads that CSV at build time and
 * enriches each organization with:
 *   - one or more service CATEGORIES (Food, Housing, Medical, ...)
 *   - a short, human-written description
 *   - normalized AUDIENCE tags parsed from the "Serves" column
 *   - tidy phone / website / address fields
 *
 * Everything the site renders (home, category hubs, intent pages, resource
 * detail pages, the directory) is derived from the exports below.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type CategoryKey =
  | 'food'
  | 'housing'
  | 'medical'
  | 'mental-health'
  | 'financial'
  | 'legal'
  | 'transportation'
  | 'reentry'
  | 'veterans'
  | 'youth'
  | 'family'
  | 'education'
  | 'community';

export type AudienceKey =
  | 'veterans'
  | 'families'
  | 'youth'
  | 'seniors'
  | 'domestic-violence'
  | 'reentry'
  | 'no-id'
  | 'substance-use'
  | 'women'
  | 'men';

export interface Phone {
  label: string; // optional descriptor, e.g. "Intake", "After hours"
  display: string; // human-readable number as written
  tel: string; // digits only, for tel: links
}

export interface Resource {
  name: string;
  slug: string;
  categories: CategoryKey[];
  description: string;
  phones: Phone[];
  email: string | null;
  website: string | null; // raw, e.g. "uws.us"
  websiteUrl: string | null; // with protocol
  address: string | null;
  mapUrl: string | null;
  hours: string | null;
  serves: string[]; // raw tokens from the CSV
  audiences: AudienceKey[]; // normalized audience tags
  servesEveryone: boolean;
  /** Plain-language "who it's for" line, e.g. "Open to everyone". Null if unknown. */
  whoFor: string | null;
  /** Practical caveats shown on action cards ("An appointment is needed."). */
  goodToKnow: string[];
  /** The single clearest thing to do next, plus the button that does it. */
  nextStep: NextStep | null;
}

export interface NextStep {
  /** Sentence shown above the button, e.g. "Call to ask if they have space tonight." */
  text: string;
  /** Button label, e.g. "Call (864) 555-0100". */
  label: string;
  href: string;
  kind: 'call' | 'website' | 'directions';
  /** True when `text` was written for this organization rather than its category. */
  custom: boolean;
}

export interface Category {
  key: CategoryKey;
  slug: string;
  label: string;
  tagline: string;
  intro: string;
  /** Featured on the homepage hero + header nav + footer "browse by need". */
  core: boolean;
  icon: string;
  /** Generate Category × Audience intent pages for this category. */
  intents?: boolean;
  /** If this category IS a population, the audience key it maps to (hub-and-spoke). */
  population?: AudienceKey;
  /** Short label for the header nav; falls back to `label`. */
  nav?: string;
}

export interface Audience {
  key: AudienceKey;
  slug: string;
  label: string; // e.g. "Veterans"
  short: string; // used inside sentences, e.g. "veterans"
  matchers: string[]; // substrings searched within each Serves token
  icon: string;
  blurb: string; // empathetic framing used on intent pages
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Minimal RFC-4180-ish CSV parser (handles quoted fields with commas). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // ignore; handled by \n
    } else {
      field += ch;
    }
  }
  // trailing field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const header = rows.shift();
  if (!header) return [];
  return rows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj: Record<string, string> = {};
      header.forEach((h, idx) => {
        obj[h.trim()] = (r[idx] ?? '').trim();
      });
      return obj;
    });
}

function parsePhones(raw: string): Phone[] {
  if (!raw) return [];
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment) => {
      let label = '';
      let numberPart = segment;
      const colon = segment.indexOf(':');
      if (colon !== -1) {
        label = segment.slice(0, colon).trim();
        numberPart = segment.slice(colon + 1).trim();
      }
      const tel = numberPart.replace(/[^0-9]/g, '');
      return { label, display: numberPart, tel };
    })
    .filter((p) => p.tel.length >= 7);
}

function normalizeWebsite(raw: string): { website: string | null; url: string | null } {
  const v = raw.trim();
  if (!v) return { website: null, url: null };
  const clean = v.replace(/\/+$/, '');
  const url = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
  const website = clean.replace(/^https?:\/\//i, '');
  return { website, url };
}

/* ------------------------------------------------------------------ */
/* Audience taxonomy                                                  */
/* ------------------------------------------------------------------ */

export const AUDIENCES: Audience[] = [
  {
    key: 'veterans',
    slug: 'veterans',
    label: 'Veterans',
    short: 'veterans',
    matchers: ['Veteran'],
    icon: 'veterans',
    blurb:
      'Resources for veterans and their families — including organizations that understand military service and can help with benefits, housing, and care.',
  },
  {
    key: 'families',
    slug: 'families',
    label: 'Families with Children',
    short: 'families with children',
    matchers: ['Family ('],
    icon: 'family',
    blurb:
      'Help for parents and guardians keeping their children safe, fed, and housed — including programs built specifically for families.',
  },
  {
    key: 'youth',
    slug: 'youth',
    label: 'Youth & Young Adults',
    short: 'youth and young adults',
    matchers: ['Youth 18-24'],
    icon: 'youth',
    blurb:
      'Support for young people (roughly 18–24) navigating life without a parent or guardian, including youth-focused shelters and drop-in centers.',
  },
  {
    key: 'seniors',
    slug: 'seniors',
    label: 'Seniors',
    short: 'older adults',
    matchers: ['Senior'],
    icon: 'heart',
    blurb:
      'Resources for older adults who need a hand with food, housing, health, or staying connected.',
  },
  {
    key: 'domestic-violence',
    slug: 'domestic-violence',
    label: 'Survivors of Domestic Violence',
    short: 'survivors of domestic violence',
    matchers: ['Domestic Violence'],
    icon: 'shield',
    blurb:
      'Safe, confidential help for anyone experiencing domestic or intimate-partner violence. If you are in immediate danger, call 911. The 24/7 SC domestic violence line is 1-800-291-2139.',
  },
  {
    key: 'reentry',
    slug: 'reentry',
    label: 'People Returning from Incarceration',
    short: 'people returning from incarceration',
    matchers: ['Re-entry', 'Previously Incarcerated'],
    icon: 'reentry',
    blurb:
      'Re-entry support for people rebuilding after incarceration — including organizations that help with ID, jobs, housing, and a fresh start.',
  },
  {
    key: 'no-id',
    slug: 'no-id',
    label: 'People Without a Photo ID',
    short: 'people without a photo ID',
    matchers: ['No Photo ID'],
    icon: 'info',
    blurb:
      'You can still get help without a photo ID. These organizations serve people who do not currently have identification, and several can help you obtain one.',
  },
  {
    key: 'substance-use',
    slug: 'substance-use',
    label: 'People in Recovery',
    short: 'people in substance-use recovery',
    matchers: ['Substance Use'],
    icon: 'mental-health',
    blurb:
      'Recovery and substance-use support — from peer coaching to detox and residential programs. Recovery is possible, and help is available today.',
  },
  {
    key: 'women',
    slug: 'women',
    label: 'Women',
    short: 'women',
    matchers: ['Woman'],
    icon: 'users',
    blurb: 'Resources that serve women, including women-only shelters and programs.',
  },
  {
    key: 'men',
    slug: 'men',
    label: 'Men',
    short: 'men',
    matchers: ['Man'],
    icon: 'users',
    blurb: 'Resources that serve men, including men-only shelters and programs.',
  },
];

const AUDIENCE_BY_KEY = new Map(AUDIENCES.map((a) => [a.key, a]));
export const getAudience = (key: string): Audience | undefined =>
  AUDIENCE_BY_KEY.get(key as AudienceKey);

function parseAudiences(serves: string[]): { audiences: AudienceKey[]; everyone: boolean } {
  const everyone = serves.some((s) => s.toLowerCase().includes('serves everyone'));
  const audiences: AudienceKey[] = [];
  for (const a of AUDIENCES) {
    const matched = a.matchers.some((m) => serves.some((token) => token.includes(m)));
    if (matched) audiences.push(a.key);
  }
  return { audiences, everyone };
}

/* ------------------------------------------------------------------ */
/* Category taxonomy                                                  */
/* ------------------------------------------------------------------ */

export const CATEGORIES: Category[] = [
  {
    key: 'food',
    slug: 'food-assistance',
    label: 'Food Assistance',
    tagline: 'Free meals, food pantries, and groceries',
    intro:
      'No one in Greenville should go hungry. These food pantries, soup kitchens, hot-meal sites, and food banks provide free food to anyone who needs it — most without paperwork or proof of income.',
    core: true,
    intents: true,
    nav: 'Food',
    icon: 'food',
  },
  {
    key: 'housing',
    slug: 'housing-shelter',
    label: 'Housing & Shelter',
    tagline: 'Emergency shelter and a path to stable housing',
    intro:
      'Whether you need a safe place to sleep tonight or help finding lasting housing, these organizations offer emergency shelter, day shelters, transitional housing, rental assistance, and housing navigation across Greenville County.',
    core: true,
    intents: true,
    nav: 'Housing',
    icon: 'housing',
  },
  {
    key: 'medical',
    slug: 'medical-care',
    label: 'Medical & Health Care',
    tagline: 'Free and low-cost clinics and health care',
    intro:
      'You can get care even without insurance or the ability to pay. These free clinics and community health centers offer primary care, dental, prescriptions, testing, and more on a sliding scale or at no cost.',
    core: true,
    intents: true,
    nav: 'Medical',
    icon: 'medical',
  },
  {
    key: 'mental-health',
    slug: 'mental-health-recovery',
    label: 'Mental Health & Recovery',
    tagline: 'Counseling, crisis support, and addiction recovery',
    intro:
      'Your mental health matters. These organizations provide counseling, support groups, crisis response, and substance-use recovery — from peer coaching to residential treatment. If you are in crisis, call or text 988 any time.',
    core: true,
    intents: true,
    nav: 'Mental Health',
    icon: 'mental-health',
  },
  {
    key: 'financial',
    slug: 'financial-assistance',
    label: 'Financial & Crisis Assistance',
    tagline: 'Help with rent, utilities, and benefits',
    intro:
      'Emergency help to keep the lights on and a roof overhead — assistance with rent, utilities, prescriptions, and applying for benefits like SNAP and Medicaid.',
    core: true,
    intents: true,
    nav: 'Financial',
    icon: 'financial',
  },
  {
    key: 'legal',
    slug: 'legal-aid',
    label: 'Legal Aid',
    tagline: 'Free civil legal help',
    intro:
      'Free civil legal assistance for low-income residents — including eviction defense, benefits appeals, family law, and protection from discrimination.',
    core: false,
    icon: 'legal',
  },
  {
    key: 'transportation',
    slug: 'transportation',
    label: 'Transportation',
    tagline: 'Getting to where you need to go',
    intro:
      'Public transit, reduced fares, and affordable bikes to help you get to work, appointments, and services across Greenville.',
    core: false,
    icon: 'transportation',
  },
  {
    key: 'reentry',
    slug: 'reentry-support',
    label: 'Re-entry Support',
    tagline: 'A fresh start after incarceration',
    intro:
      'Support for people returning to the community after incarceration — help with ID, employment, housing, education, and mentoring for a stable fresh start.',
    core: false,
    population: 'reentry',
    icon: 'reentry',
  },
  {
    key: 'veterans',
    slug: 'veteran-services',
    label: 'Veteran Services',
    tagline: 'Support for those who served',
    intro:
      'Organizations dedicated to veterans and their families — helping with benefits, housing, employment, and connection to care.',
    core: false,
    population: 'veterans',
    icon: 'veterans',
  },
  {
    key: 'youth',
    slug: 'youth-services',
    label: 'Youth Services',
    tagline: 'Help for young people',
    intro:
      'Shelters, drop-in centers, and support for children, teens, and young adults — including youth experiencing homelessness on their own.',
    core: false,
    population: 'youth',
    icon: 'youth',
  },
  {
    key: 'family',
    slug: 'family-services',
    label: 'Family Services',
    tagline: 'Keeping families supported and together',
    intro:
      'Programs that support parents, children, and growing families — from housing for families to pregnancy and parenting help.',
    core: false,
    population: 'families',
    icon: 'family',
  },
  {
    key: 'education',
    slug: 'education',
    label: 'Education',
    tagline: 'School support and workforce training',
    intro:
      'Educational support and workforce training — keeping students enrolled and helping adults build new skills and careers.',
    core: false,
    icon: 'education',
  },
  {
    key: 'community',
    slug: 'community-services',
    label: 'Community Services',
    tagline: 'Libraries, advocacy, and a welcoming space',
    intro:
      'Welcoming community spaces and advocates — free internet and computers, job-search help, civil-rights support, and a place to start.',
    core: false,
    icon: 'community',
  },
];

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));
const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
export const getCategory = (key: string): Category | undefined =>
  CATEGORY_BY_KEY.get(key as CategoryKey);
export const getCategoryBySlug = (slug: string): Category | undefined =>
  CATEGORY_BY_SLUG.get(slug);
export const CORE_CATEGORIES = CATEGORIES.filter((c) => c.core);
/** Service categories that get Category × Audience intent pages. */
export const INTENT_CATEGORIES = CATEGORIES.filter((c) => c.intents);

/* ------------------------------------------------------------------ */
/* Per-organization enrichment (categories + description)             */
/* Keys MUST match the "Organization" column in the CSV exactly.      */
/* ------------------------------------------------------------------ */

interface Meta {
  categories: CategoryKey[];
  description: string;
  /** Override the category's default next-step sentence. */
  nextStep?: string;
  /** Extra caveats specific to this organization. */
  goodToKnow?: string[];
}

/**
 * Default "what to do next" sentence by primary category, used when an
 * organization has no override. Written as the call a stressed person should
 * actually make, not as a description of the service.
 */
export const NEXT_STEP_BY_CATEGORY: Record<CategoryKey, string> = {
  food: 'Call to check when they are serving or open.',
  housing: 'Call to ask if they have space and how to get in.',
  medical: 'Call to ask about an appointment and what to bring.',
  'mental-health': 'Call to ask how to get started.',
  financial: 'Call to ask what help is available and what to bring.',
  legal: 'Call to ask if they can help with your situation.',
  transportation: 'Check routes, fares, or hours before you go.',
  reentry: 'Call to ask how to join their program.',
  veterans: 'Call to ask how they can help you or your family.',
  youth: 'Call to ask how to get help.',
  family: 'Call to ask how they can help your family.',
  education: 'Call to ask how to enroll or get support.',
  community: 'Call or visit to ask how they can help.',
};

/**
 * Organizations in the CSV that the site does not show right now. Their rows
 * stay in the CSV so they are easy to bring back.
 */
const EXCLUDED = new Set(['Hispanic Alliance']);

/**
 * "Serves" tokens for groups the site does not focus on right now. They are
 * left out of each organization's "who they serve" list.
 */
const HIDDEN_SERVES = ['LGBTQ+', 'Transgender', 'Non-Binary', 'Spanish Speaking', 'AIDS/HIV'];

const META: Record<string, Meta> = {
  'Online Food Resource Guide': {
    categories: ['food'],
    description:
      'A directory of food pantries, soup kitchens, and free-meal sites across Greenville County.',
  },
  'Greenville County Human Relations': {
    categories: ['legal', 'housing'],
    description:
      'Investigates housing and employment discrimination complaints and connects residents to community resources.',
  },
  'Infinite Possibilities Inc.': {
    categories: ['reentry'],
    description:
      'Wraparound support, transportation, and re-entry help, with services for people living with HIV.',
  },
  'Upstate Warrior Solution': {
    categories: ['veterans', 'housing', 'financial'],
    description:
      'Helps veterans and their families navigate housing, VA benefits, health care, and employment.',
  },
  'Upstate Food Not Bombs': {
    categories: ['food'],
    description: 'Volunteers sharing free hot vegetarian meals in public spaces, open to all.',
  },
  'Upstate Circle of Friends': {
    categories: ['medical'],
    description: 'Peer support and outreach for people affected by HIV/AIDS.',
  },
  'Unity Health on Main': {
    categories: ['medical'],
    description:
      'Community health clinic offering primary care, HIV testing, and treatment regardless of ability to pay.',
  },
  'United Ministries - Crisis Assistance': {
    categories: ['financial'],
    description:
      'Emergency help with rent, utilities, prescriptions, and other urgent needs (by appointment).',
  },
  'United Ministries - Family Housing Program': {
    categories: ['housing', 'family'],
    description:
      'Transitional housing and case management for families experiencing homelessness.',
  },
  'United Housing Connections': {
    categories: ['housing'],
    description:
      'Emergency shelter plus transitional and permanent supportive housing across the Upstate.',
  },
  'Triune Mercy Center': {
    categories: ['food', 'housing'],
    description:
      'Hot meals, case management, and housing navigation for anyone in need — no questions asked.',
  },
  'The Salvation Army of Greenville': {
    categories: ['housing', 'food', 'financial'],
    description:
      'Emergency shelter, meals, and financial assistance for individuals and families.',
  },
  'The Phoenix Center': {
    categories: ['mental-health'],
    description:
      'Substance-use prevention, detox, and treatment services for adults and youth.',
  },
  'Taylors Free Medical Clinic': {
    categories: ['medical'],
    description: 'Free medical care for uninsured adults in the Taylors area.',
  },
  'Sunday Dinner with a Twist': {
    categories: ['food'],
    description: 'A free, welcoming community dinner served on Sundays.',
  },
  'Step By Step Hope Ministry': {
    categories: ['family', 'housing'],
    description: 'Support and transitional help for women and mothers with children.',
  },
  "St. Anthony's of Padua Catholic Church": {
    categories: ['food', 'financial'],
    description: 'Parish outreach offering food and emergency assistance to neighbors in need.',
  },
  "St. Andrew's Episcopal Church": {
    categories: ['food'],
    description: 'Free Saturday-morning breakfast open to the community.',
  },
  'Soteria Community Development Corporation': {
    categories: ['reentry', 'housing'],
    description: 'Re-entry support and stable housing for people returning from incarceration.',
  },
  'Shepherds Gate - Miracle Hill Ministries': {
    categories: ['housing'],
    description:
      'Emergency shelter for women and children, including those fleeing domestic violence.',
  },
  SHARE: {
    categories: ['financial', 'housing'],
    description:
      'Community-action agency offering energy/utility assistance, Head Start, and housing programs.',
  },
  'South Carolina Legal Services': {
    categories: ['legal'],
    description:
      'Free civil legal help for low-income residents — eviction, benefits, family law, and more.',
  },
  'SC Thrive': {
    categories: ['financial'],
    description:
      'Helps people apply for SNAP, Medicaid, and other benefits, plus financial-wellness tools.',
    nextStep: 'Call for free help applying for SNAP, Medicaid, or other benefits.',
  },
  'Safe Harbor': {
    categories: ['housing'],
    description:
      'Emergency shelter, counseling, and advocacy for survivors of domestic violence (24/7 hotline).',
    nextStep: 'Call the 24/7 hotline. It is free and confidential.',
  },
  'Time Served': {
    categories: ['reentry'],
    description: 'Re-entry navigation and support for people leaving incarceration.',
  },
  'Renewal Center for Women - Miracle Hill Ministries': {
    categories: ['mental-health', 'housing'],
    description: 'Residential recovery program for women overcoming addiction.',
  },
  'Project Host': {
    categories: ['food'],
    description: 'Soup kitchen serving free lunches, plus a culinary job-training program.',
    nextStep: 'Check their website for meal times, then walk in.',
  },
  'Project Care Inc.': {
    categories: ['medical'],
    description: 'Support services for people living with HIV/AIDS.',
  },
  'Place of Hope Day Shelter - United Ministries': {
    categories: ['housing'],
    description:
      'Daytime shelter with showers, laundry, mail, phones, and case management.',
  },
  'Pendleton Place - Emergency Youth Shelter': {
    categories: ['housing', 'youth'],
    description: 'Emergency shelter for children and youth in crisis.',
  },
  'Pendleton Place - Youth Resource Center': {
    categories: ['youth'],
    description: 'Drop-in support, basic needs, and services for youth and young adults.',
  },
  'Overcomers Center for Men - Miracle Hill Ministries': {
    categories: ['housing', 'mental-health'],
    description: 'Shelter and addiction-recovery program for men.',
  },
  'North Greenville Food Crisis Ministry': {
    categories: ['food'],
    description: 'Food pantry serving the northern Greenville County area.',
  },
  'New Horizon Family Health Services Inc.': {
    categories: ['medical'],
    description:
      'Community health center offering medical, dental, and behavioral care on a sliding scale.',
  },
  'NAMI Greenville': {
    categories: ['mental-health'],
    description:
      'Mental-health education, support groups, and advocacy for individuals and families.',
  },
  'Mother Teresa House': {
    categories: ['food', 'financial'],
    description: 'Food, clothing, and basic-needs assistance.',
  },
  'Mill Village Ministries - Village Wrench': {
    categories: ['transportation'],
    description: 'Affordable bikes, repairs, and an earn-a-bike transportation program.',
  },
  'Mental Health America': {
    categories: ['mental-health'],
    description: 'Mental-health screening, education, and connection to local care.',
  },
  'LiveWell Greenville Food Resource Guide': {
    categories: ['food'],
    description: 'A countywide guide to food pantries, meal sites, and SNAP resources.',
  },
  "Lifeline Children's Services": {
    categories: ['family'],
    description: 'Pregnancy, adoption, and family-support services.',
  },
  'Jasmine Road': {
    categories: ['mental-health', 'housing'],
    description:
      'Two-year residential program for women survivors of trafficking, addiction, and exploitation.',
  },
  'Harvest Hope Food Bank': {
    categories: ['food'],
    description: 'Regional food bank distributing groceries to families in need.',
  },
  'Habitat for Humanity of Greenville County': {
    categories: ['housing'],
    description: 'Affordable homeownership through volunteer-built homes and home repair.',
  },
  'Greer STEP': {
    categories: ['housing'],
    description: 'Emergency shelter and support services in the Greer area.',
  },
  'Daily Bread Ministries - Greer Soup Kitchen': {
    categories: ['food', 'housing'],
    description: 'Free hot meals and shelter outreach in Greer.',
  },
  'Greer Relief': {
    categories: ['financial'],
    description:
      'Emergency financial assistance with rent, utilities, and basic needs in the Greer area.',
  },
  'Greenville Tech Upstate Returning Citizens Program': {
    categories: ['reentry', 'education'],
    description: 'Education and workforce training for people returning from incarceration.',
  },
  'Greenville Rescue Mission - Miracle Hill Ministries': {
    categories: ['housing', 'food'],
    description: 'Emergency shelter and meals for men experiencing homelessness.',
  },
  'Greenville Housing Authority': {
    categories: ['housing'],
    description: 'Public housing and Housing Choice Voucher (Section 8) rental assistance.',
  },
  'Greenville Free Clinic': {
    categories: ['medical'],
    description: 'Free primary and specialty medical care for uninsured, low-income adults.',
  },
  'Greenville County School - Homeless Department': {
    categories: ['education', 'youth', 'family'],
    description:
      'McKinney-Vento support that keeps students experiencing homelessness enrolled and supported in school.',
  },
  'Greenville County Library System': {
    categories: ['community'],
    description:
      'Free internet, computers, job-search help, and a warm public space open to everyone.',
  },
  Greenlink: {
    categories: ['transportation'],
    description: "Greenville's public bus system, with route information and reduced-fare options.",
  },
  'Greater Greenville Mental Health Center': {
    categories: ['mental-health'],
    description:
      'Outpatient mental-health treatment with 24/7 mobile crisis response for the Upstate.',
    goodToKnow: ['After hours, call SC Mobile Crisis at 1-833-364-2274.'],
  },
  Gateway: {
    categories: ['mental-health'],
    description: 'A clubhouse community supporting adults living with mental illness.',
  },
  'Foothills Family Resources of Slater-Marietta': {
    categories: ['financial', 'family'],
    description: 'Emergency assistance and family support for the Slater-Marietta area.',
  },
  'First Impression of South Carolina': {
    categories: ['reentry'],
    description: 'Re-entry mentoring and support for returning citizens.',
  },
  'FAVOR Upstate': {
    categories: ['mental-health'],
    description: 'Peer recovery coaching and support for people in substance-use recovery.',
  },
  'Center for Community Services': {
    categories: ['financial', 'food'],
    description: 'Food, financial assistance, and basic-needs help for families.',
  },
  'Alston Wilkes Society': {
    categories: ['reentry', 'housing', 'veterans'],
    description: 'Re-entry, housing, and veteran services across South Carolina.',
  },
  'AID Upstate': {
    categories: ['medical'],
    description: 'HIV/AIDS medical care, testing, and support services.',
  },
  'Catholic Charities Upstate': {
    categories: ['financial', 'food'],
    description: 'Emergency financial help, food, and counseling for anyone in need.',
  },
};

/* ------------------------------------------------------------------ */
/* Build the resource list                                            */
/* ------------------------------------------------------------------ */

const CSV_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../gvl_homeless_resources.csv'
);

function loadResources(): Resource[] {
  const raw = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCsv(raw);

  return rows
    .map((row) => {
      const name = row['Organization'];
      if (!name || EXCLUDED.has(name)) return null;
      const meta = META[name];
      if (!meta) {
        // Surface mapping gaps loudly during build instead of silently dropping data.
        console.warn(`[resources] No category mapping for "${name}" — defaulting to community.`);
      }
      const serves = (row['Serves'] || '')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && !HIDDEN_SERVES.some((h) => s.includes(h)));
      const { audiences, everyone } = parseAudiences(serves);
      const { website, url } = normalizeWebsite(row['Website'] || '');
      const address = row['Address']?.trim() || null;

      const resource: Resource = {
        name,
        slug: slugify(name),
        categories: meta?.categories ?? ['community'],
        description: meta?.description ?? '',
        phones: parsePhones(row['Phone'] || ''),
        email: row['Email']?.trim() || null,
        website,
        websiteUrl: url,
        address,
        mapUrl: address
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
          : null,
        hours: row['Hours']?.trim() || null,
        serves,
        audiences,
        servesEveryone: everyone,
        whoFor: null,
        goodToKnow: [],
        nextStep: null,
      };
      resource.whoFor = describeWhoFor(resource);
      resource.goodToKnow = describeGoodToKnow(resource, meta);
      resource.nextStep = describeNextStep(resource, meta);
      return resource;
    })
    .filter((r): r is Resource => r !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function describeWhoFor(r: Resource): string | null {
  if (r.servesEveryone) return 'Open to everyone';
  const groups = r.audiences
    .map((k) => AUDIENCE_BY_KEY.get(k)?.short)
    .filter((s): s is string => Boolean(s));
  if (groups.length === 0) return null;
  if (groups.length === 1) return `Serves ${groups[0]}`;
  return `Serves ${groups.slice(0, -1).join(', ')} and ${groups[groups.length - 1]}`;
}

function describeGoodToKnow(r: Resource, meta: Meta | undefined): string[] {
  const notes: string[] = [...(meta?.goodToKnow ?? [])];
  if (/appointment/i.test(r.description)) notes.push('An appointment is needed.');
  if (r.audiences.includes('no-id')) notes.push('You can get help without a photo ID.');
  if (!r.hours && (r.phones.length || r.address)) {
    notes.push('Hours are not listed here. Call before you go.');
  }
  return notes;
}

function describeNextStep(r: Resource, meta: Meta | undefined): NextStep | null {
  const phone = r.phones[0];
  if (phone) {
    return {
      text: meta?.nextStep ?? NEXT_STEP_BY_CATEGORY[r.categories[0]],
      label: `Call ${phone.display}`,
      href: `tel:${phone.tel}`,
      kind: 'call',
      custom: Boolean(meta?.nextStep),
    };
  }
  if (r.websiteUrl) {
    return {
      text: meta?.nextStep ?? 'Visit their website to see how to get help.',
      label: 'Visit their website',
      href: r.websiteUrl,
      kind: 'website',
      custom: Boolean(meta?.nextStep),
    };
  }
  if (r.mapUrl) {
    return {
      text: meta?.nextStep ?? 'Go in person. Check the hours first if you can.',
      label: 'Get directions',
      href: r.mapUrl,
      kind: 'directions',
      custom: Boolean(meta?.nextStep),
    };
  }
  return null;
}

export const RESOURCES: Resource[] = loadResources();

const RESOURCE_BY_SLUG = new Map(RESOURCES.map((r) => [r.slug, r]));
export const getResource = (slug: string): Resource | undefined => RESOURCE_BY_SLUG.get(slug);

/* ------------------------------------------------------------------ */
/* Query helpers used by pages                                        */
/* ------------------------------------------------------------------ */

/** How many distinct audiences an org lists — lower means more specialized. */
function specificity(r: Resource): number {
  return r.audiences.length + (r.servesEveryone ? 5 : 0);
}

function sortBySpecificity(a: Resource, b: Resource): number {
  const d = specificity(a) - specificity(b);
  if (d !== 0) return d;
  return a.name.localeCompare(b.name);
}

export function resourcesInCategory(key: CategoryKey): Resource[] {
  return RESOURCES.filter((r) => r.categories.includes(key)).sort(sortBySpecificity);
}

/**
 * Keywords that mark an organization as *topically specialized* for an audience.
 * Used to surface, e.g., Safe Harbor at the top of the domestic-violence page even
 * though it serves many audiences (which would otherwise push it down on specificity).
 */
const AUDIENCE_KEYWORDS: Record<AudienceKey, string[]> = {
  veterans: ['veteran', 'warrior'],
  families: ['family', 'families', 'children', 'mother', 'parent', 'pregnan'],
  youth: ['youth', 'young', 'teen'],
  seniors: ['senior', 'older adult'],
  'domestic-violence': ['domestic violence', 'safe harbor', 'abuse', 'survivor'],
  reentry: ['re-entry', 'reentry', 'returning', 'incarcerat', 'prison', 'jail', 'time served'],
  'no-id': ['no questions', 'without', 'identification', 'no id'],
  'substance-use': ['recovery', 'addiction', 'substance', 'detox', 'sober', 'phoenix'],
  women: ['women', 'woman', "women's"],
  men: ['men', "men's", 'overcomers', 'rescue mission'],
};

function relevanceRank(r: Resource, audKey: AudienceKey): number {
  const hay = `${r.name} ${r.description}`.toLowerCase();
  return AUDIENCE_KEYWORDS[audKey].some((k) => hay.includes(k)) ? 0 : 1;
}

export function resourcesForIntent(catKey: CategoryKey, audKey: AudienceKey): Resource[] {
  return RESOURCES.filter(
    (r) => r.categories.includes(catKey) && r.audiences.includes(audKey)
  ).sort((a, b) => {
    const rel = relevanceRank(a, audKey) - relevanceRank(b, audKey);
    if (rel !== 0) return rel;
    return sortBySpecificity(a, b);
  });
}

export function countInCategory(key: CategoryKey): number {
  return RESOURCES.filter((r) => r.categories.includes(key)).length;
}

/** Categories that actually have at least one resource, in taxonomy order. */
export function activeCategories(): Category[] {
  return CATEGORIES.filter((c) => countInCategory(c.key) > 0);
}

export interface Intent {
  category: Category;
  audience: Audience;
  count: number;
}

const MIN_RESOURCES_FOR_INTENT = 2;

/** Valid (category × audience) intent pages: service categories with >=2 matches. */
export function validIntents(): Intent[] {
  const intents: Intent[] = [];
  for (const category of INTENT_CATEGORIES) {
    for (const audience of AUDIENCES) {
      const count = resourcesForIntent(category.key, audience.key).length;
      if (count >= MIN_RESOURCES_FOR_INTENT) {
        intents.push({ category, audience, count });
      }
    }
  }
  return intents;
}

/** Intents available within a single category (for cross-linking on hubs). */
export function intentsForCategory(catKey: CategoryKey): Intent[] {
  return validIntents().filter((i) => i.category.key === catKey);
}

/**
 * Hub-and-spoke: for a population category (e.g. Veteran Services), the intent
 * pages across every service category that serve that same audience.
 */
export function spokesForAudience(audKey: AudienceKey): Intent[] {
  return validIntents().filter((i) => i.audience.key === audKey);
}

/** Lightweight records for the client-side directory search index. */
export function searchIndex() {
  return RESOURCES.map((r) => ({
    name: r.name,
    slug: r.slug,
    description: r.description,
    categories: r.categories,
    categoryLabels: r.categories.map((c) => getCategory(c)?.label ?? c),
    audiences: r.audiences,
    address: r.address ?? '',
    serves: r.serves.join(' '),
  }));
}
