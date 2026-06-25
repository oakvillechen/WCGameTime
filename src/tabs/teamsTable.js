import { teams } from '../data/teams.js';
import { fetchMatches } from '../data/api.js';
import { openTeamModal } from '../components/teamModal.js';
import { t } from '../i18n.js';

export function renderTeamsTab() {
  const container = document.getElementById('tab-standings');
  // Show loading state only if no table is already rendered
  if (!container.querySelector('.teams-table')) {
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('standings.loading')}</h3></div>`;
  }
  renderTeamsAsync(container);
}

async function renderTeamsAsync(container) {
  const { matches, error } = await fetchMatches();

  // Calculate points and goals from real match data
  const stats = {};
  Object.keys(teams).forEach(id => {
    stats[id] = { played: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 };
  });

  if (matches) {
    matches.forEach(m => {
      if (m.status === 'finished' && m.score) {
        if (!stats[m.home]) stats[m.home] = { played: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 };
        if (!stats[m.away]) stats[m.away] = { played: 0, w: 0, d: 0, l: 0, pts: 0, gf: 0, ga: 0 };

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
  }

  // Convert to array and sort
  const sortedTeams = Object.values(teams).map(team => ({
    ...team,
    pts: (stats[team.id] || {}).pts || 0,
    gf: (stats[team.id] || {}).gf || 0,
    ga: (stats[team.id] || {}).ga || 0,
    played: (stats[team.id] || {}).played || 0,
    w: (stats[team.id] || {}).w || 0,
    d: (stats[team.id] || {}).d || 0,
    l: (stats[team.id] || {}).l || 0,
  })).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 0.5rem;">
      <h2 style="font-family: var(--font-head); font-size: 2.5rem; color: var(--accent-gold);">${t('standings.title')}</h2>
      <p style="color: var(--text-secondary)">${t('standings.subtitle')}</p>
    </div>
    
    <div class="glass-panel" style="overflow-x: auto;">
      <table class="teams-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>${t('table.team')}</th>
            <th>${t('table.confed')}</th>
            <th>${t('table.group')}</th>
            <th>${t('table.p')}</th>
            <th>${t('table.w')}</th>
            <th>${t('table.d')}</th>
            <th>${t('table.l')}</th>
            <th>${t('table.gf')}</th>
            <th>${t('table.ga')}</th>
            <th>${t('table.gd')}</th>
            <th>${t('table.pts')}</th>
          </tr>
        </thead>
        <tbody>
  `;

  sortedTeams.forEach((team, idx) => {
    const gd = team.gf - team.ga;
    html += `
      <tr class="team-row" data-team="${team.id}">
        <td style="color: var(--text-secondary);">${idx + 1}</td>
        <td><span style="font-size: 1.5rem; margin-right: 0.5rem; vertical-align: middle;">${team.flag}</span> <span style="font-weight: bold;">${team.name}</span></td>
        <td><span style="background: rgba(0,0,0,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.85rem;">${team.confed}</span></td>
        <td><strong>${team.group}</strong></td>
        <td>${team.played}</td>
        <td>${team.w}</td>
        <td>${team.d}</td>
        <td>${team.l}</td>
        <td>${team.gf}</td>
        <td>${team.ga}</td>
        <td style="color: ${gd > 0 ? 'var(--accent-gold)' : gd < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'};">${gd > 0 ? '+' : ''}${gd}</td>
        <td style="font-weight: 800; color: var(--accent-gold); font-size: 1.1rem;">${team.pts}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  // Add click listeners
  container.querySelectorAll('.team-row').forEach(row => {
    row.addEventListener('click', () => {
      openTeamModal(row.dataset.team);
    });
  });
}
