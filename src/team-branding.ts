import './team-branding.css';

type TeamBranding = {
  logoUrl: string;
  color: string;
  alternateColor: string;
  displayName: string;
};

type BrandingAPI = typeof window.teamNeedsAPI & {
  getTeamBranding: (teamName: string) => Promise<TeamBranding | null>;
};

type BrandingCache = Record<string, TeamBranding>;

const CACHE_KEY = 'cfb27-team-branding-cache-v1';
const brandingAPI = window.teamNeedsAPI as BrandingAPI;
let activeTeamName = '';
let activeBranding: TeamBranding | null = null;
let requestSequence = 0;

function selectedTeamName(): string {
  const select = document.querySelector<HTMLSelectElement>('#teamSelect');
  const option = select?.selectedOptions?.[0];
  if (!select || !option || !select.value) return '';
  return String(option.textContent ?? '').replace(/\s*•\s*User\s*$/i, '').trim();
}

function readCache(): BrandingCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BrandingCache;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(teamName: string, branding: TeamBranding): void {
  try {
    const cache = readCache();
    cache[teamName.toLowerCase()] = branding;
    const entries = Object.entries(cache).slice(-40);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Branding cache is optional.
  }
}

function normalizedColor(value: string, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function setTeamLabel(teamName: string): void {
  const titleBlock = document.querySelector<HTMLElement>('.title-wrap > div:last-child');
  if (!titleBlock) return;
  let label = titleBlock.querySelector<HTMLElement>('.team-brand-label');
  if (!teamName) {
    label?.remove();
    return;
  }
  if (!label) {
    label = document.createElement('div');
    label.className = 'team-brand-label';
    titleBlock.append(label);
  }
  label.textContent = teamName;
}

function setHeaderLogo(teamName: string, branding: TeamBranding | null): void {
  const mark = document.querySelector<HTMLElement>('.mark');
  if (!mark) return;

  if (!branding) {
    mark.classList.remove('has-team-logo');
    mark.querySelector('.team-logo-image')?.remove();
    mark.textContent = '27';
    mark.removeAttribute('title');
    return;
  }

  mark.textContent = '';
  mark.classList.add('has-team-logo');
  let image = mark.querySelector<HTMLImageElement>('.team-logo-image');
  if (!image) {
    image = document.createElement('img');
    image.className = 'team-logo-image';
    image.alt = '';
    image.decoding = 'async';
    mark.append(image);
  }
  image.src = branding.logoUrl;
  mark.title = `${teamName} logo`;
}

function setSummaryWatermark(branding: TeamBranding | null): void {
  const firstCard = document.querySelector<HTMLElement>('#summary article:first-child');
  if (!firstCard) return;
  let image = firstCard.querySelector<HTMLImageElement>('.team-summary-watermark');

  if (!branding) {
    image?.remove();
    return;
  }

  if (!image) {
    image = document.createElement('img');
    image.className = 'team-summary-watermark';
    image.alt = '';
    image.decoding = 'async';
    firstCard.append(image);
  }
  image.src = branding.logoUrl;
}

function applyBranding(teamName: string, branding: TeamBranding | null): void {
  const root = document.documentElement;
  if (branding) {
    root.style.setProperty('--team-accent', normalizedColor(branding.color, '#7b3342'));
    root.style.setProperty('--team-accent-alt', normalizedColor(branding.alternateColor, '#d6b35a'));
  } else {
    root.style.removeProperty('--team-accent');
    root.style.removeProperty('--team-accent-alt');
  }
  setHeaderLogo(teamName, branding);
  setTeamLabel(teamName);
  setSummaryWatermark(branding);
}

async function syncBranding(): Promise<void> {
  const teamName = selectedTeamName();
  if (!teamName) {
    activeTeamName = '';
    activeBranding = null;
    applyBranding('', null);
    return;
  }

  if (teamName === activeTeamName) {
    applyBranding(teamName, activeBranding);
    return;
  }

  activeTeamName = teamName;
  const cached = readCache()[teamName.toLowerCase()];
  if (cached) {
    activeBranding = cached;
    applyBranding(teamName, cached);
  } else {
    activeBranding = null;
    applyBranding(teamName, null);
  }

  const requestId = ++requestSequence;
  try {
    const resolved = await brandingAPI.getTeamBranding(teamName);
    if (requestId !== requestSequence || selectedTeamName() !== teamName) return;
    activeBranding = resolved;
    if (resolved) writeCache(teamName, resolved);
    applyBranding(teamName, resolved);
  } catch {
    if (requestId !== requestSequence || selectedTeamName() !== teamName) return;
    applyBranding(teamName, activeBranding);
  }
}

const teamSelect = document.querySelector<HTMLSelectElement>('#teamSelect');
teamSelect?.addEventListener('change', () => void syncBranding());

const observer = new MutationObserver(() => queueMicrotask(() => void syncBranding()));
if (teamSelect) observer.observe(teamSelect, { childList: true, subtree: true });
const summary = document.querySelector('#summary');
if (summary) observer.observe(summary, { childList: true });

void syncBranding();
