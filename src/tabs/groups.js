import { teams } from '../data/teams.js';
import { fetchMatches } from '../data/api.js';
import { openTeamModal } from '../components/teamModal.js';
import { t } from '../i18n.js';

export function renderGroupsTab() {
  const container = document.getElementById('tab-groups');

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family: var(--font-head); font-size: 2.5rem;">${t('groups.title')}</h2>
    </div>
    <div id="groups-list" class="groups-grid"><div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('groups.loading')}</h3></div></div>
  `;

  renderGroupsList();
}

async function renderGroupsList() {
  const groupsContainer = document.getElementById('groups-list');
  const { matches, error } = await fetchMatches();

  if (error) {
    groupsContainer.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('groups.error')}</h3></div>`;
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
          ${t('groups.group')} ${letter}
        </h3>
        <table class="group-table">
          <thead>
            <tr>
              <th>${t('table.team')}</th>
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
