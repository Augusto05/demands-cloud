export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  meetUrl?: string;
  start: string; // ISO format "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD"
  end?: string;  // ISO format "YYYY-MM-DDTHH:mm:ss" or "YYYY-MM-DD"
  allDay: boolean;
  calendarName?: string;
  color?: string;
  source: 'google' | 'kanban';
  kanbanCardId?: string;
  kanbanColumnId?: string;
  completed?: boolean;
  rrule?: string;
}

export interface GoogleCalendarFeed {
  id: string;
  name: string;
  url?: string;
  color: string;
  enabled: boolean;
  lastUpdated?: string;
  eventCount?: number;
  rawContent?: string;
}

const STORAGE_KEY_FEEDS = 'demands_google_calendar_feeds_v2';
const STORAGE_KEY_PASTED_EVENTS = 'demands_google_pasted_events_v2';
const STORAGE_KEY_URL_CACHE_EVENTS = 'demands_google_url_cache_events_v2';

// Default initial feeds (only used if key was never initialized in localStorage)
export const DEFAULT_FEEDS: GoogleCalendarFeed[] = [
  {
    id: 'feed-leadsale',
    name: 'Google Agenda (Leadsale)',
    url: 'https://calendar.google.com/calendar/ical/augusto%40leadsale.com.br/public/basic.ics',
    color: '#3B82F6',
    enabled: true
  }
];

export const getStoredFeeds = (): GoogleCalendarFeed[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored Google Calendar feeds:', e);
  }
  return DEFAULT_FEEDS;
};

export const saveStoredFeeds = (feeds: GoogleCalendarFeed[]): void => {
  localStorage.setItem(STORAGE_KEY_FEEDS, JSON.stringify(feeds));
};

// Manually Uploaded / Imported .ics File Events Storage
export const getStoredPastedEvents = (): CalendarEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PASTED_EVENTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(cleanEvent);
    }
    // Legacy fallback check
    const oldRaw = localStorage.getItem('demands_google_pasted_events');
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (Array.isArray(oldParsed)) return oldParsed.map(cleanEvent);
    }
  } catch (e) {
    console.error('Failed to parse uploaded events:', e);
  }
  return [];
};

import { saveStorageItem } from './syncService';

export const saveStoredPastedEvents = (events: CalendarEvent[]): void => {
  saveStorageItem('pasted_events', STORAGE_KEY_PASTED_EVENTS, events);
};

// URL Feed Synced Events Cache Storage
export const getStoredUrlFeedCache = (): CalendarEvent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_URL_CACHE_EVENTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(cleanEvent);
    }
  } catch (e) {
    console.error('Failed to parse URL feed cache:', e);
  }
  return [];
};

export const saveStoredUrlFeedCache = (events: CalendarEvent[]): void => {
  localStorage.setItem(STORAGE_KEY_URL_CACHE_EVENTS, JSON.stringify(events));
};

// Combined Reader for All Google Calendar Events
export const getAllStoredGoogleEvents = (): CalendarEvent[] => {
  const uploaded = getStoredPastedEvents();
  const urlCache = getStoredUrlFeedCache();
  
  // Deduplicate events by id
  const map = new Map<string, CalendarEvent>();
  uploaded.forEach(e => map.set(e.id, e));
  urlCache.forEach(e => map.set(e.id, e));
  
  return Array.from(map.values());
};

// Helper to convert iCal date strings (e.g. 20260723T140000Z or 20260724) to ISO format
export const parseICalDate = (icalDateStr: string): { dateStr: string; allDay: boolean } => {
  if (!icalDateStr) return { dateStr: new Date().toISOString(), allDay: false };

  const cleaned = icalDateStr.trim().replace(/^TZID=[^:]+:/, '');
  
  // Date-only format YYYYMMDD (all day event)
  if (/^\d{8}$/.test(cleaned)) {
    const y = cleaned.substring(0, 4);
    const m = cleaned.substring(4, 6);
    const d = cleaned.substring(6, 8);
    return { dateStr: `${y}-${m}-${d}`, allDay: true };
  }

  // DateTime format YYYYMMDDTHHMMSS (optional Z)
  if (/^\d{8}T\d{6}Z?$/.test(cleaned)) {
    const y = parseInt(cleaned.substring(0, 4), 10);
    const m = parseInt(cleaned.substring(4, 6), 10);
    const d = parseInt(cleaned.substring(6, 8), 10);
    const hh = parseInt(cleaned.substring(9, 11), 10);
    const mm = parseInt(cleaned.substring(11, 13), 10);
    const ss = parseInt(cleaned.substring(13, 15), 10);

    if (cleaned.endsWith('Z')) {
      const utcDate = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
      const ly = utcDate.getFullYear();
      const lm = String(utcDate.getMonth() + 1).padStart(2, '0');
      const ld = String(utcDate.getDate()).padStart(2, '0');
      const lhh = String(utcDate.getHours()).padStart(2, '0');
      const lmm = String(utcDate.getMinutes()).padStart(2, '0');
      const lss = String(utcDate.getSeconds()).padStart(2, '0');
      return { dateStr: `${ly}-${lm}-${ld}T${lhh}:${lmm}:${lss}`, allDay: false };
    } else {
      const sm = String(m).padStart(2, '0');
      const sd = String(d).padStart(2, '0');
      const shh = String(hh).padStart(2, '0');
      const smm = String(mm).padStart(2, '0');
      const sss = String(ss).padStart(2, '0');
      return { dateStr: `${y}-${sm}-${sd}T${shh}:${smm}:${sss}`, allDay: false };
    }
  }

  return { dateStr: new Date().toISOString(), allDay: false };
};

// Expand recurring events (RRULE) across days
export const expandRecurringEvents = (events: CalendarEvent[]): CalendarEvent[] => {
  const result: CalendarEvent[] = [];

  events.forEach(event => {
    if (!event.rrule) {
      result.push(event);
      return;
    }

    const ruleObj: Record<string, string> = {};
    event.rrule.split(';').forEach(part => {
      const [k, v] = part.split('=');
      if (k && v) ruleObj[k.toUpperCase()] = v.toUpperCase();
    });

    const freq = ruleObj['FREQ'];
    if (!freq) {
      result.push(event);
      return;
    }

    const baseStart = new Date(event.start);
    if (isNaN(baseStart.getTime())) {
      result.push(event);
      return;
    }

    const byDays = ruleObj['BYDAY'] ? ruleObj['BYDAY'].split(',') : [];
    const dayMap: Record<string, number> = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
    const targetDayNums = byDays.map(d => dayMap[d]).filter(n => n !== undefined);

    let durationMs = 3600000;
    if (event.end) {
      const eDate = new Date(event.end);
      if (!isNaN(eDate.getTime())) {
        durationMs = Math.max(0, eDate.getTime() - baseStart.getTime());
      }
    }

    const today = new Date();
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - 60);

    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + 90);

    const timeStr = event.start.includes('T') ? event.start.split('T')[1] : '';

    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateOnlyStr = `${year}-${month}-${day}`;

      let matches = false;

      if (freq === 'DAILY') {
        matches = true;
      } else if (freq === 'WEEKLY') {
        if (targetDayNums.length > 0) {
          matches = targetDayNums.includes(d.getDay());
        } else {
          matches = d.getDay() === baseStart.getDay();
        }
      } else if (freq === 'MONTHLY') {
        matches = d.getDate() === baseStart.getDate();
      }

      if (matches && d >= baseStart) {
        const newStart = timeStr ? `${dateOnlyStr}T${timeStr}` : dateOnlyStr;
        let newEnd = newStart;
        if (timeStr && durationMs > 0) {
          const endDateObj = new Date(new Date(newStart).getTime() + durationMs);
          const ey = endDateObj.getFullYear();
          const em = String(endDateObj.getMonth() + 1).padStart(2, '0');
          const ed = String(endDateObj.getDate()).padStart(2, '0');
          const ehh = String(endDateObj.getHours()).padStart(2, '0');
          const emm = String(endDateObj.getMinutes()).padStart(2, '0');
          const ess = String(endDateObj.getSeconds()).padStart(2, '0');
          newEnd = `${ey}-${em}-${ed}T${ehh}:${emm}:${ess}`;
        }

        result.push({
          ...event,
          id: `${event.id}_rec_${dateOnlyStr}`,
          start: newStart,
          end: newEnd
        });
      }
    }
  });

  return result;
};

// Robust iCal text parser (.ics)
export const parseICSContent = (icsText: string, calendarName = 'Google Agenda', color = '#3B82F6'): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  if (!icsText || !icsText.includes('BEGIN:VCALENDAR')) return events;

  // Unfold folded lines (lines starting with space or tab)
  const unfoldedText = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfoldedText.split(/\r?\n/);

  let curEvent: Partial<CalendarEvent> | null = null;
  let summary = '';
  let description = '';
  let location = '';
  let dtStart = '';
  let dtEnd = '';
  let uid = '';
  let rrule = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === 'BEGIN:VEVENT') {
      curEvent = {};
      summary = '';
      description = '';
      location = '';
      dtStart = '';
      dtEnd = '';
      rrule = '';
      uid = `g_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    } else if (line === 'END:VEVENT' && curEvent) {
      if (dtStart) {
        const startParsed = parseICalDate(dtStart);
        const endParsed = dtEnd ? parseICalDate(dtEnd) : startParsed;

        events.push({
          id: uid,
          title: (summary || '(Sem título)').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n'),
          description: description || undefined,
          location: location || undefined,
          start: startParsed.dateStr,
          end: endParsed.dateStr,
          allDay: startParsed.allDay,
          calendarName,
          color,
          source: 'google',
          rrule: rrule || undefined
        });
      }
      curEvent = null;
    } else if (curEvent) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const keyPart = line.substring(0, idx);
        const val = line.substring(idx + 1).trim();
        const keyName = keyPart.split(';')[0].toUpperCase();

        if (keyName === 'SUMMARY') summary = val;
        if (keyName === 'DESCRIPTION') description = (description ? description + '\n' : '') + val;
        if (keyName === 'LOCATION') location = val;
        if (keyName === 'DTSTART') dtStart = val;
        if (keyName === 'DTEND') dtEnd = val;
        if (keyName === 'UID') uid = val;
        if (keyName === 'RRULE') rrule = val;
      }
    }
  }

  // Expand recurring events
  const expanded = expandRecurringEvents(events);
  return expanded.map(cleanEvent);
};

// Fetch feed URL with fallback to CORS proxy
export const fetchGoogleCalendarFeed = async (feed: GoogleCalendarFeed): Promise<CalendarEvent[]> => {
  if (!feed.url) return [];

  const targetUrl = feed.url.trim();

  // Array of fetch attempts (direct + proxies)
  const urlsToTry = [
    targetUrl,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const fetchUrl of urlsToTry) {
    try {
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('BEGIN:VCALENDAR')) {
          return parseICSContent(text, feed.name, feed.color);
        }
      }
    } catch (e) {
      // Continue to next proxy
    }
  }

  return [];
};

// Storage Helpers
export const cleanEvent = (event: CalendarEvent): CalendarEvent => {
  let rawDesc = event.description || '';
  let rawLoc = event.location || '';

  const meetMatch = (rawDesc + ' ' + rawLoc + ' ' + (event.meetUrl || '')).match(/(https:\/\/meet\.google\.com\/[a-z0-9-]+)/i);
  const meetUrl = event.meetUrl || (meetMatch ? meetMatch[1] : undefined);

  let cleanedDesc = rawDesc
    .replace(/[-~:_]{3,}[^]*$/g, '')
    .replace(/[-~:_]{3,}.*/g, '')
    .replace(/Join with Google Meet:[^\n]*/gi, '')
    .replace(/Or dial:[^\n]*/gi, '')
    .replace(/More phone numbers\.[^\n]*/gi, '')
    .replace(/PIN:[^\n]*/gi, '')
    .trim();

  let cleanedLoc = rawLoc
    .replace(/[-~:_]{3,}[^]*$/g, '')
    .replace(/[-~:_]{3,}.*/g, '')
    .replace(/Join with Google Meet:[^\n]*/gi, '')
    .trim();

  return {
    ...event,
    description: cleanedDesc || undefined,
    location: cleanedLoc || undefined,
    meetUrl
  };
};
