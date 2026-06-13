import fs from 'fs';
import { teams } from '../src/data/teams.js';
import { venues } from '../src/data/venues.js';

const venueKeys = Object.keys(venues);

// Group teams by their designated group
const groups = {};
Object.entries(teams).forEach(([teamId, team]) => {
  if (!groups[team.group]) groups[team.group] = [];
  groups[team.group].push(teamId);
});

const matches = [];
let matchId = 1;

// The 2026 World Cup group stage starts June 11, 2026 and runs roughly to June 27, 2026.
// We'll distribute the 72 matches across these 17 days.
const startDate = new Date('2026-06-11T16:00:00Z');

// Standard match pairings for a 4-team group (teams 0, 1, 2, 3):
// Round 1: 0 vs 1, 2 vs 3
// Round 2: 0 vs 2, 1 vs 3
// Round 3: 3 vs 0, 1 vs 2

const rounds = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[3, 0], [1, 2]]
];

Object.keys(groups).sort().forEach((groupName, gIndex) => {
  const gTeams = groups[groupName];
  if (gTeams.length < 4) return; // safeguard

  rounds.forEach((round, rIndex) => {
    round.forEach(pair => {
      // distribute dates roughly sequentially
      // Groups A-L (12 groups). Round 1 takes about 5 days, Round 2 takes 5 days, etc.
      const dayOffset = (rIndex * 5) + Math.floor(gIndex / 3);
      // assign time slots: 16:00, 19:00, 22:00 UTC
      const hourOffset = [16, 19, 22][gIndex % 3];
      
      const matchDate = new Date(startDate.getTime());
      matchDate.setUTCDate(matchDate.getUTCDate() + dayOffset);
      matchDate.setUTCHours(hourOffset, 0, 0, 0);
      
      // Select random venue
      const venue = venueKeys[Math.floor(Math.random() * venueKeys.length)];
      
      matches.push({
        id: matchId++,
        date: matchDate.toISOString(),
        group: groupName,
        home: gTeams[pair[0]],
        away: gTeams[pair[1]],
        venue: venue,
        stage: "Group Stage",
        score: null
      });
    });
  });
});

// Sort matches chronologically, then reassign IDs sequentially
matches.sort((a, b) => new Date(a.date) - new Date(b.date));
matches.forEach((m, i) => m.id = i + 1);

// Pick the first 3 matches to have mock live/finished scores so the front page looks good
if (matches[0]) matches[0].score = { home: 2, away: 0 };
if (matches[1]) {
  matches[1].score = { home: 2, away: 1 };
  matches[1].status = "live";
}
if (matches[2]) matches[2].score = { home: 1, away: 1 };

const output = `export const matches = ${JSON.stringify(matches, null, 2)};\n`;
fs.writeFileSync('src/data/matches.js', output);
console.log(`Generated ${matches.length} matches and saved to src/data/matches.js`);
