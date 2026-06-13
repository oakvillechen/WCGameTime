import { teams } from '../data/teams.js';

export function openTeamModal(teamId) {
  const team = teams[teamId];
  if (!team) return;

  const modal = document.getElementById('team-modal');
  const modalBody = document.getElementById('modal-body');

  modalBody.innerHTML = `
    <div class="modal-header">
      <div class="flag">${team.flag}</div>
      <div>
        <h2 style="font-family: var(--font-head); color: var(--accent-gold); font-size: 2rem;">${team.name}</h2>
        <p style="color: var(--text-primary); font-weight: bold;">Confederation: ${team.confed} | Group ${team.group}</p>
        <div id="country-info" style="min-height: 20px;">
          <small style="color: var(--text-secondary)">Loading country info...</small>
        </div>
      </div>
    </div>
    
    <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">26-Man Squad</h3>
    
    <div style="overflow-x: auto;">
      <table class="teams-table" style="font-size: 0.9rem;">
        <thead>
          <tr>
            <th>Pic</th>
            <th>No.</th>
            <th>Name</th>
            <th>Pos</th>
            <th>Club</th>
            <th>Age</th>
            <th>Birth Yr</th>
            <th>Height</th>
            <th>Goals</th>
            <th>Info</th>
          </tr>
        </thead>
        <tbody>
          ${team.roster.map(player => `
            <tr>
              <td>
                <img id="img-${teamId}-${player.number}" 
                     src="https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=40" 
                     alt="${player.name}" 
                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" />
              </td>
              <td style="color: var(--accent-gold); font-weight: bold;">${player.number}</td>
              <td style="font-weight: 600;">${player.name}</td>
              <td><span style="background: rgba(0,0,0,0.05); padding: 0.2rem 0.4rem; border-radius: 4px;">${player.pos}</span></td>
              <td>${player.club}</td>
              <td>${player.age || '-'}</td>
              <td>${player.birthYear || '-'}</td>
              <td>${player.height || '-'}</td>
              <td>${player.goals !== undefined ? player.goals : '-'}</td>
              <td>
                <a href="https://www.google.com/search?q=${encodeURIComponent(player.name + ' football player stats')}" target="_blank" style="text-decoration: none; background: var(--accent-color); color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Search</a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ${team.roster.length < 26 ? `<div style="text-align: center; color: var(--text-secondary); margin-top: 1rem; font-size: 0.8rem;">* Partial roster shown for demo</div>` : ''}
  `;

  modal.classList.add('active');

  // Fetch country data asynchronously from Wikipedia
  const countryInfoDiv = document.getElementById('country-info');
  
  let searchQuery = team.name;
  if (team.id === 'USA') searchQuery = 'United States';
  if (team.id === 'ENG') searchQuery = 'England';
  if (team.id === 'KOR') searchQuery = 'South Korea';
  if (team.id === 'CZE') searchQuery = 'Czech Republic';
  
  fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=2&exlimit=1&titles=${encodeURIComponent(searchQuery)}&explaintext=1&formatversion=2&format=json&origin=*`)
    .then(res => res.json())
    .then(data => {
      if (data && data.query && data.query.pages && data.query.pages[0] && data.query.pages[0].extract) {
        countryInfoDiv.innerHTML = `
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem; line-height: 1.4;">
            ${data.query.pages[0].extract}
          </div>
        `;
      } else {
        countryInfoDiv.innerHTML = `<small style="color: var(--text-secondary)">No country information found.</small>`;
      }
    })
    .catch(err => {
      countryInfoDiv.innerHTML = `<small style="color: var(--accent-red)">Error loading country info.</small>`;
    });

  // Dynamically fetch player headshots from Wikipedia
  team.roster.forEach(player => {
    // Only attempt to fetch if we have a name to search
    if (!player.name) return;
    
    // Attempt to search Wikipedia for the player's thumbnail
    fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(player.name)}&prop=pageimages&format=json&pithumbsize=100&origin=*`)
      .then(res => res.json())
      .then(data => {
        if (data && data.query && data.query.pages) {
          const pages = data.query.pages;
          const pageId = Object.keys(pages)[0];
          if (pageId !== "-1" && pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
            const imgEl = document.getElementById(`img-${teamId}-${player.number}`);
            if (imgEl) {
              imgEl.src = pages[pageId].thumbnail.source;
            }
          }
        }
      })
      .catch(e => { /* Ignore thumbnail fetch errors and keep placeholder */ });
  });
}
