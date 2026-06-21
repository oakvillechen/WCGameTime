import { teams } from '../data/teams.js';
import { venues } from '../data/venues.js';
import { fetchMatches } from '../data/api.js';
import { openTeamModal } from '../components/teamModal.js';

export function renderScheduleTab() {
  const container = document.getElementById('tab-schedule');
  
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h2 style="font-family: var(--font-head); font-size: 2.5rem;">Tournament Schedule</h2>
      <div style="display: flex; gap: 1rem;">
        <button class="tab-btn active" style="padding: 0.5rem 1rem; font-size: 0.9rem;" id="btn-schedule">Schedule</button>
        <button class="tab-btn" style="padding: 0.5rem 1rem; font-size: 0.9rem;" id="btn-groups">Groups</button>
      </div>
    </div>
    
    <div id="subtab-schedule" class="schedule-container"><div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>⏳ Loading schedule...</h3></div></div>
    <div id="subtab-groups" class="groups-grid" style="display: none;"><div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>⏳ Loading groups...</h3></div></div>
  `;
  
  container.innerHTML = html;
  
  // Setup sub-tab switching
  document.getElementById('btn-schedule').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('btn-groups').classList.remove('active');
    document.getElementById('subtab-schedule').style.display = 'block';
    document.getElementById('subtab-groups').style.display = 'none';
  });
  
  document.getElementById('btn-groups').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('btn-schedule').classList.remove('active');
    document.getElementById('subtab-schedule').style.display = 'none';
    document.getElementById('subtab-groups').style.display = 'grid';
  });

  // Fetch and render both subtabs
  renderScheduleList();
  renderGroupsList();
}

async function renderScheduleList() {
  const scheduleContainer = document.getElementById('subtab-schedule');
  const { matches, error } = await fetchMatches();

  if (error || matches.length === 0) {
    scheduleContainer.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>⚠️ Could not load schedule</h3></div>`;
    return;
  }
  
  // Group matches by date (Toronto timezone)
  const groupedMatches = {};
  
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Toronto'
  });
  
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  sortedMatches.forEach(match => {
    const dateObj = new Date(match.date);
    const dateStr = dateFormatter.format(dateObj);
    
    if (!groupedMatches[dateStr]) {
      groupedMatches[dateStr] = [];
    }
    groupedMatches[dateStr].push(match);
  });
  
  const todayStr = dateFormatter.format(new Date());
  const now = new Date();

  let targetDateKey = null;

  // Try to find today's date group
  for (const date of Object.keys(groupedMatches)) {
    if (date === todayStr) {
      targetDateKey = date;
      break;
    }
  }

  // If today has no matches, find the first date group that has upcoming matches
  if (!targetDateKey) {
    for (const date of Object.keys(groupedMatches)) {
      const matchDate = new Date(groupedMatches[date][0].date);
      if (matchDate >= now) {
        targetDateKey = date;
        break;
      }
    }
  }

  let html = '';
  
  Object.keys(groupedMatches).forEach(date => {
    const isToday = date === todayStr;
    const isTarget = date === targetDateKey;
    html += `
      <div class="date-group glass-panel" style="padding: 1.5rem; ${isToday ? 'border: 2px solid var(--accent-gold);' : ''}" ${isTarget ? 'id="scroll-target"' : ''}>
        <h3 class="date-header">
          ${date}
          ${isToday ? '<span class="today-badge" style="background: var(--accent-gold); color: var(--bg-color); font-size: 0.8rem; padding: 0.2rem 0.5rem; border-radius: 4px; margin-left: 0.5rem; vertical-align: middle;">Today</span>' : ''}
        </h3>
    `;
    
    groupedMatches[date].forEach(match => {
      const homeTeam = teams[match.home];
      const awayTeam = teams[match.away];
      const venue = venues[match.venue];
      
      if (!homeTeam || !awayTeam) return;

      const timeStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Toronto',
        timeZoneName: 'short'
      }).format(new Date(match.date));

      let matchDisplay;
      if (match.status === 'finished' && match.score) {
        matchDisplay = `${match.score.home} - ${match.score.away}`;
      } else if (match.status === 'live' && match.score) {
        matchDisplay = `<span style="color: var(--accent-red);">🔴 ${match.score.home} - ${match.score.away}</span>`;
      } else if (match.status === 'live') {
        matchDisplay = `<span style="color: var(--accent-red);">🔴 LIVE</span>`;
      } else {
        matchDisplay = 'vs';
      }
      
      html += `
        <div class="schedule-row">
          <div class="schedule-time">${timeStr}</div>
          <div class="schedule-teams">
            <span style="font-size: 1.5rem; cursor: pointer;" class="schedule-team-link" data-team="${match.home}">${homeTeam.flag} ${homeTeam.name}</span>
            <span style="color: var(--text-secondary); margin: 0 0.5rem;">${matchDisplay}</span>
            <span style="font-size: 1.5rem; cursor: pointer;" class="schedule-team-link" data-team="${match.away}">${awayTeam.name} ${awayTeam.flag}</span>
          </div>
          <div class="schedule-venue">
            <div><strong>Group ${match.group}</strong></div>
            <div>${venue ? `${venue.name}, ${venue.city}` : match.venue}</div>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  scheduleContainer.innerHTML = html;
  
  // Add modal clicks
  scheduleContainer.querySelectorAll('.schedule-team-link').forEach(el => {
    el.addEventListener('click', () => {
      openTeamModal(el.dataset.team);
    });
  });

  // Scroll down to today's games or the next upcoming games
  setTimeout(() => {
    const targetEl = document.getElementById('scroll-target');
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
}

async function renderGroupsList() {
  const groupsContainer = document.getElementById('subtab-groups');
  const { matches, error } = await fetchMatches();

  if (error) {
    groupsContainer.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>⚠️ Could not load groups</h3></div>`;
    return;
  }
  
  // Calculate real standings from match results
  const stats = {};
  Object.keys(teams).forEach(id => {
    stats[id] = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  });

  matches.forEach(m => {
    if (m.status === 'finished' && m.score) {
      if (!stats[m.home]) stats[m.home] = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      if (!stats[m.away]) stats[m.away] = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };

      stats[m.home].played += 1;
      stats[m.away].played += 1;
      stats[m.home].gf += m.score.home;
      stats[m.home].ga += m.score.away;
      stats[m.away].gf += m.score.away;
      stats[m.away].ga += m.score.home;
      
      if (m.score.home > m.score.away) {
        stats[m.home].w += 1;
        stats[m.home].pts += 3;
        stats[m.away].l += 1;
      } else if (m.score.home < m.score.away) {
        stats[m.away].w += 1;
        stats[m.away].pts += 3;
        stats[m.home].l += 1;
      } else {
        stats[m.home].d += 1;
        stats[m.away].d += 1;
        stats[m.home].pts += 1;
        stats[m.away].pts += 1;
      }
    }
  });

  // Group teams by their group
  const groups = {};
  Object.values(teams).forEach(team => {
    if (!groups[team.group]) groups[team.group] = [];
    groups[team.group].push(team);
  });
  
  // Sort group letters
  const sortedGroupLetters = Object.keys(groups).sort();
  
  let html = '';
  
  sortedGroupLetters.forEach(letter => {
    const groupTeams = groups[letter];
    
    // Sort teams within group by points, then GD, then GF
    groupTeams.sort((a, b) => {
      const sa = stats[a.id] || { pts: 0, gf: 0, ga: 0 };
      const sb = stats[b.id] || { pts: 0, gf: 0, ga: 0 };
      if (sb.pts !== sa.pts) return sb.pts - sa.pts;
      const gdA = sa.gf - sa.ga;
      const gdB = sb.gf - sb.ga;
      if (gdB !== gdA) return gdB - gdA;
      return sb.gf - sa.gf;
    });

    html += `
      <div class="glass-panel" style="padding: 1.5rem;">
        <h3 style="font-family: var(--font-head); color: var(--accent-gold); margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">
          Group ${letter}
        </h3>
        <table class="group-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    groupTeams.forEach(team => {
      const s = stats[team.id] || { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      const gd = s.gf - s.ga;
      html += `
        <tr>
          <td style="font-weight: 600; cursor: pointer;" class="group-team-link" data-team="${team.id}">
            <span style="font-size: 1.2rem; margin-right: 0.5rem;">${team.flag}</span> ${team.name}
          </td>
          <td>${s.played}</td>
          <td>${s.w}</td>
          <td>${s.d}</td>
          <td>${s.l}</td>
          <td>${s.gf}</td>
          <td>${s.ga}</td>
          <td style="color: ${gd > 0 ? 'var(--accent-gold)' : gd < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'};">${gd > 0 ? '+' : ''}${gd}</td>
          <td style="font-weight: 800; color: var(--accent-gold);">${s.pts}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  });
  
  groupsContainer.innerHTML = html;
  
  // Add modal clicks
  groupsContainer.querySelectorAll('.group-team-link').forEach(el => {
    el.addEventListener('click', () => {
      openTeamModal(el.dataset.team);
    });
  });
}
