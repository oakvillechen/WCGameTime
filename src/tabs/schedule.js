import { teams } from '../data/teams.js';
import { venues } from '../data/venues.js';
import { fetchMatches } from '../data/api.js';
import { openTeamModal } from '../components/teamModal.js';
import { t, getLang } from '../i18n.js';

export function renderScheduleTab() {
  const container = document.getElementById('tab-schedule');

  let html = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family: var(--font-head); font-size: 2.5rem;">${t('schedule.title')}</h2>
    </div>
    
    <div id="schedule-list" class="schedule-container"><div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('schedule.loading')}</h3></div></div>
  `;

  container.innerHTML = html;
  renderScheduleList();
}

async function renderScheduleList() {
  const scheduleContainer = document.getElementById('schedule-list');
  const { matches, error } = await fetchMatches();

  if (error || matches.length === 0) {
    scheduleContainer.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('schedule.error')}</h3></div>`;
    return;
  }

  const lang = getLang();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  // Group matches by date (Toronto timezone)
  const groupedMatches = {};

  const dateFormatter = new Intl.DateTimeFormat(dateLocale, {
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
          ${isToday ? `<span class="today-badge" style="background: var(--accent-gold); color: var(--bg-color); font-size: 0.8rem; padding: 0.2rem 0.5rem; border-radius: 4px; margin-left: 0.5rem; vertical-align: middle;">${t('schedule.today')}</span>` : ''}
        </h3>
    `;

    groupedMatches[date].forEach(match => {
      const homeTeam = teams[match.home];
      const awayTeam = teams[match.away];
      const venue = venues[match.venue];

      if (!homeTeam || !awayTeam) return;

      const timeStr = new Intl.DateTimeFormat(dateLocale, {
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
        matchDisplay = `<span style="color: var(--accent-red);">🔴 ${t('today.live')}</span>`;
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
            <div><strong>${t('today.group')} ${match.group}</strong></div>
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
