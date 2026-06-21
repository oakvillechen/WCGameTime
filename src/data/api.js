/**
 * Live data fetcher from worldcup26.ir API
 * Provides accurate match results, schedules, and standings.
 */

import { matches as staticMatches } from './matches.js';

const API_BASE = 'https://worldcup26.ir';

// Cache for API responses
let cachedGames = null;
let cachedStadiums = null;
let cachedTeams = null;
let lastFetch = 0;
const CACHE_TTL = 60_000; // 1 minute cache

let cachedMatches = null;
let isFetchingInBackground = false;

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Stadium ID -> timezone mapping for converting local_date to UTC
const STADIUM_TIMEZONES = {
  '1':  'America/Mexico_City',    // Estadio Azteca
  '2':  'America/Mexico_City',    // Estadio Akron, Guadalajara
  '3':  'America/Mexico_City',    // Estadio BBVA, Monterrey
  '4':  'America/Chicago',        // AT&T Stadium, Dallas
  '5':  'America/Chicago',        // NRG Stadium, Houston
  '6':  'America/Chicago',        // GEHA Field, Kansas City
  '7':  'America/New_York',       // Mercedes-Benz Stadium, Atlanta
  '8':  'America/New_York',       // Hard Rock Stadium, Miami
  '9':  'America/New_York',       // Gillette Stadium, Boston
  '10': 'America/New_York',       // Lincoln Financial Field, Philadelphia
  '11': 'America/New_York',       // MetLife Stadium, New York/NJ
  '12': 'America/Toronto',        // BMO Field, Toronto
  '13': 'America/Vancouver',      // BC Place, Vancouver
  '14': 'America/Los_Angeles',    // Lumen Field, Seattle
  '15': 'America/Los_Angeles',    // Levi's Stadium, San Francisco
  '16': 'America/Los_Angeles',    // SoFi Stadium, Los Angeles
};

// Stadium ID -> our venue key mapping
const STADIUM_TO_VENUE = {
  '1':  'mexico_city',
  '2':  'guadalajara',
  '3':  'monterrey',
  '4':  'dallas',
  '5':  'houston',
  '6':  'kansas_city',
  '7':  'atlanta',
  '8':  'miami',
  '9':  'boston',
  '10': 'philadelphia',
  '11': 'new_york',
  '12': 'toronto',
  '13': 'vancouver',
  '14': 'seattle',
  '15': 'san_francisco',
  '16': 'los_angeles',
};

/**
 * Parse the API's local_date (venue local time) into a proper UTC ISO string.
 * local_date format: "MM/DD/YYYY HH:mm"
 */
function parseLocalDateToUTC(localDateStr, stadiumId) {
  // Parse "06/11/2026 13:00"
  const [datePart, timePart] = localDateStr.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');

  // Build a date string that we can interpret in the venue's timezone
  // Using Intl to reverse-engineer UTC from local time
  const tz = STADIUM_TIMEZONES[stadiumId] || 'America/New_York';

  // Create a date object — we need to figure out UTC from local venue time
  // Strategy: create a rough UTC guess, then adjust
  const roughDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);

  // Get the offset for this timezone at this rough date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // The offset between UTC and local time
  // We'll use a trick: format the rough UTC date in the target timezone,
  // then compute the difference
  const parts = formatter.formatToParts(roughDate);
  const localAtRough = {};
  parts.forEach(p => { localAtRough[p.type] = p.value; });

  const localHourAtRough = parseInt(localAtRough.hour === '24' ? '0' : localAtRough.hour);
  const localDayAtRough = parseInt(localAtRough.day);

  // Compute offset in hours (simplified — good enough for whole/half hour offsets)
  let offsetHours = localHourAtRough - roughDate.getUTCHours();
  if (localDayAtRough > roughDate.getUTCDate()) offsetHours += 24;
  if (localDayAtRough < roughDate.getUTCDate()) offsetHours -= 24;

  // The actual UTC time = local time - offset
  const utcMs = roughDate.getTime() - (offsetHours * 3600000);
  // Also account for minutes offset (e.g. India +5:30, Iran +3:30)
  const localMinAtRough = parseInt(localAtRough.minute);
  const minuteOffset = localMinAtRough - roughDate.getUTCMinutes();
  const finalUtcMs = utcMs - (minuteOffset * 60000);

  return new Date(finalUtcMs).toISOString();
}

/**
 * Convert an API game object to our local match format
 */
function apiGameToMatch(game) {
  const isFinished = game.finished === 'TRUE';
  const isLive = game.time_elapsed && game.time_elapsed !== 'notstarted' && game.time_elapsed !== 'finished';

  // Find FIFA codes from team names
  const homeFifa = game.home_team_fifa_code || findFifaCode(game.home_team_id);
  const awayFifa = game.away_team_fifa_code || findFifaCode(game.away_team_id);

  // Look up local match ID and metadata from staticMatches by comparing home & away teams
  const localMatch = staticMatches.find(m => 
    (m.home === homeFifa && m.away === awayFifa) || 
    (m.home === awayFifa && m.away === homeFifa)
  );

  const matchId = localMatch ? localMatch.id : parseInt(game.id);
  const group = localMatch ? localMatch.group : game.group;
  const stage = localMatch ? localMatch.stage : (game.type === 'group' ? 'Group Stage' : game.type);
  
  // Decide actual home/away based on localMatch order if available
  const actualHome = localMatch ? localMatch.home : homeFifa;
  const actualAway = localMatch ? localMatch.away : awayFifa;
  const isSwapped = localMatch && (localMatch.home === awayFifa);

  const utcDate = parseLocalDateToUTC(game.local_date, game.stadium_id);

  const match = {
    id: matchId,
    date: utcDate,
    group: group,
    home: actualHome,
    away: actualAway,
    venue: STADIUM_TO_VENUE[game.stadium_id] || 'unknown',
    stage: stage,
    matchday: parseInt(game.matchday),
    score: null,
    status: game.time_elapsed,
    homeScorers: isSwapped ? (game.away_scorers !== 'null' ? game.away_scorers : null) : (game.home_scorers !== 'null' ? game.home_scorers : null),
    awayScorers: isSwapped ? (game.home_scorers !== 'null' ? game.home_scorers : null) : (game.away_scorers !== 'null' ? game.away_scorers : null),
  };

  if (isFinished || isLive) {
    const rawHomeScore = parseInt(game.home_score);
    const rawAwayScore = parseInt(game.away_score);
    match.score = {
      home: isSwapped ? rawAwayScore : rawHomeScore,
      away: isSwapped ? rawHomeScore : rawAwayScore,
    };
    match.status = isFinished ? 'finished' : 'live';
    if (isLive) {
      match.liveMinute = game.time_elapsed;
    }
  } else {
    match.status = 'upcoming';
  }

  return match;
}

// Team ID -> FIFA code mapping (populated from API)
let teamIdToFifa = {};

function findFifaCode(teamId) {
  return teamIdToFifa[teamId] || 'UNK';
}

/**
 * Fetch all data from the API
 */
async function fetchFromAPI() {
  const now = Date.now();
  if (cachedGames && (now - lastFetch) < CACHE_TTL) {
    return { games: cachedGames };
  }

  try {
    const [gamesRes, teamsRes] = await Promise.all([
      fetchWithTimeout(`${API_BASE}/get/games`, { timeout: 15000 }),
      cachedTeams ? Promise.resolve(null) : fetchWithTimeout(`${API_BASE}/get/teams`, { timeout: 15000 }),
    ]);

    if (!gamesRes.ok) throw new Error(`Games API returned ${gamesRes.status}`);

    const gamesData = await gamesRes.json();

    if (teamsRes) {
      const teamsData = await teamsRes.json();
      cachedTeams = teamsData.teams;
      // Build the ID->FIFA code map
      teamIdToFifa = {};
      cachedTeams.forEach(t => {
        teamIdToFifa[t.id] = t.fifa_code;
      });
    }

    cachedGames = gamesData.games;
    lastFetch = now;

    return { games: cachedGames };
  } catch (err) {
    console.error('Failed to fetch from worldcup26.ir:', err);
    // Throttle retries: set lastFetch so we wait at least 30s before retrying
    lastFetch = Date.now() - CACHE_TTL + 30000;
    return { games: null, error: err.message };
  }
}

async function triggerBackgroundFetch() {
  try {
    const { games, error } = await fetchFromAPI();
    if (games && games.length > 0) {
      const liveMatches = games.map(apiGameToMatch);
      // Sort by date, then by ID
      liveMatches.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
      cachedMatches = liveMatches;
      window.dispatchEvent(new CustomEvent('wc-data-updated'));
    }
  } catch (err) {
    console.warn('Background fetch error:', err);
  }
}

/**
 * Get all matches in our app's format, fetched live from the API
 */
export async function fetchMatches() {
  const now = Date.now();

  if (!cachedMatches) {
    cachedMatches = [...staticMatches];
  }

  if ((now - lastFetch) > CACHE_TTL && !isFetchingInBackground) {
    isFetchingInBackground = true;
    triggerBackgroundFetch().finally(() => {
      isFetchingInBackground = false;
    });
  }

  return { matches: cachedMatches, error: null };
}

/**
 * Get matches for a specific date (Toronto timezone)
 */
export async function fetchTodayMatches() {
  const { matches, error } = await fetchMatches();
  if (error) return { matches: [], error };

  const todayFormat = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    timeZone: 'America/Toronto',
  });

  const todayStr = todayFormat.format(new Date());

  const todaysMatches = matches.filter(match => {
    const matchDateStr = todayFormat.format(new Date(match.date));
    return matchDateStr === todayStr || match.status === 'live';
  });

  return { matches: todaysMatches, error: null };
}

/**
 * Force refresh the cache
 */
export function invalidateCache() {
  lastFetch = 0;
}
