import L from 'leaflet';
import { teams } from '../data/teams.js';
import { venues } from '../data/venues.js';
import { fetchTodayMatches, invalidateCache } from '../data/api.js';
import { openTeamModal } from '../components/teamModal.js';

let refreshInterval = null;

// Fix Leaflet marker icons issue in module environments
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function renderTodayTab() {
  const container = document.getElementById('tab-today');

  // Show loading state only if there are no matches already rendered
  if (!container.querySelector('.match-card')) {
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>⏳ Loading today's matches...</h3></div>`;
  }

  // Fetch and render
  renderMatchesAsync(container);

  // Auto-refresh every 2 minutes
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    invalidateCache();
    renderMatchesAsync(container);
  }, 120000);
}

async function renderMatchesAsync(container) {
  const { matches: todaysMatches, error } = await fetchTodayMatches();

  const timeString = new Intl.DateTimeFormat('en-US', { timeStyle: 'medium', timeZone: 'America/Toronto' }).format(new Date());

  if (error) {
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>⚠️ Could not fetch match data</h3><p style="color: var(--text-secondary);">${error}</p></div>`;
    return;
  }

  if (todaysMatches.length === 0) {
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>No matches scheduled for today.</h3><p style="color: var(--text-secondary);">🍁 Toronto Time: ${timeString}</p></div>`;
    return;
  }

  let html = `<div id="today-status" style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-secondary);">🍁 Toronto Time: ${timeString} | <span style="color: var(--accent-gold);">✓ Live data from worldcup26.ir</span></div><div class="match-grid">`;

  todaysMatches.forEach(match => {
    const homeTeam = teams[match.home];
    const awayTeam = teams[match.away];
    const venue = venues[match.venue];

    if (!homeTeam || !awayTeam) {
      console.warn(`Unknown team code: home=${match.home}, away=${match.away}`);
      return;
    }

    // Time formatting
    const matchDateObj = new Date(match.date);
    const now = new Date();
    const localTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Toronto',
      timeZoneName: 'short'
    }).format(matchDateObj);

    const venueTime = venue ? new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: venue.timezone,
      timeZoneName: 'short'
    }).format(matchDateObj) : localTime;

    // Status badge
    let statusBadge;
    if (match.status === 'live') {
      const minuteDisplay = match.liveMinute || '';
      statusBadge = `<span class="live-badge">🔴 LIVE ${minuteDisplay}</span>`;
    } else if (match.status === 'finished' && match.score) {
      statusBadge = `<span class="live-badge" style="background: var(--text-secondary)">FT</span>`;
    } else {
      // upcoming — show countdown
      const diffMs = matchDateObj.getTime() - now.getTime();
      if (diffMs > 0) {
        const diffH = Math.floor(diffMs / 3600000);
        const diffM = Math.floor((diffMs % 3600000) / 60000);
        const countdownText = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;
        statusBadge = `<span>⏱ Kickoff in ${countdownText} • ${localTime}</span>`;
      } else {
        statusBadge = `<span style="color: var(--text-secondary);">${localTime}</span>`;
      }
    }

    // Score display
    let scoreDisplay;
    if (match.score && (match.status === 'finished' || match.status === 'live')) {
      scoreDisplay = `<span>${match.score.home}</span><span>-</span><span>${match.score.away}</span>`;
    } else if (match.status === 'live') {
      scoreDisplay = `<span style="font-size: 1.2rem; color: var(--accent-red); animation: pulse 1.5s infinite;">Match in progress</span>`;
    } else {
      scoreDisplay = `<span style="font-size: 1.5rem; color: var(--text-secondary)">vs</span>`;
    }

    // Scorers display
    let scorersHtml = '';
    if (match.homeScorers || match.awayScorers) {
      const parseScorers = (raw) => {
        if (!raw || raw === 'null') return [];
        // Remove outer braces and split by comma, clean up quotes
        return raw.replace(/^\{|\}$/g, '').split(',')
          .map(s => s.replace(/^[""\s]+|[""\s]+$/g, '').trim())
          .filter(s => s.length > 0);
      };
      const homeSc = parseScorers(match.homeScorers);
      const awaySc = parseScorers(match.awayScorers);

      if (homeSc.length > 0 || awaySc.length > 0) {
        scorersHtml = `<div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-secondary); text-align: center;">`;
        if (homeSc.length > 0) scorersHtml += `<div>⚽ ${homeTeam.name}: ${homeSc.join(', ')}</div>`;
        if (awaySc.length > 0) scorersHtml += `<div>⚽ ${awayTeam.name}: ${awaySc.join(', ')}</div>`;
        scorersHtml += `</div>`;
      }
    }

    html += `
      <div class="match-card glass-panel" id="match-${match.id}">
        <div class="match-header">
          <span>Match ${match.id} • ${match.stage} • Group ${match.group}</span>
          ${statusBadge}
        </div>
        
        <div class="teams-container">
          <div class="team" data-team="${match.home}">
            <div class="team-flag">${homeTeam.flag}</div>
            <div class="team-name">${homeTeam.name}</div>
          </div>
          
          <div class="score-container" style="${match.status === 'live' ? 'color: var(--accent-red);' : ''}">
            ${scoreDisplay}
          </div>
          
          <div class="team" data-team="${match.away}">
            <div class="team-flag">${awayTeam.flag}</div>
            <div class="team-name">${awayTeam.name}</div>
          </div>
        </div>
        ${scorersHtml}
        
        <div style="margin-top: 1rem; text-align: center;">
          <a href="https://www.google.com/search?q=${encodeURIComponent(homeTeam.name + ' vs ' + awayTeam.name + ' World Cup 2026 score')}" 
             target="_blank" 
             style="display: inline-block; padding: 0.5rem 1rem; background: var(--text-primary); color: var(--bg-color); text-decoration: none; border-radius: 8px; font-weight: bold; margin-bottom: 1rem; font-size: 0.9rem;">
             🔍 View Live on Google
          </a>
        </div>

        ${venue ? `
        <div style="margin-top: 1rem; border-top: 1px solid var(--glass-border); padding-top: 1rem;">
          <div class="venue-info">
            <strong>${venue.name}</strong>
            ${venue.city}, ${venue.country} • Kickoff: ${venueTime} (Venue Time)
          </div>
          
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.75rem 0; line-height: 1.4;">
            ${venue.description}
          </p>
          
          <div id="map-${match.id}" class="map-container"></div>
        </div>
        ` : ''}
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  // Initialize maps and event listeners after DOM update
  setTimeout(() => {
    todaysMatches.forEach(match => {
      const venue = venues[match.venue];
      if (!venue) return;
      const mapEl = document.getElementById(`map-${match.id}`);
      if (!mapEl) return;

      const map = L.map(`map-${match.id}`, {
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true
      }).setView([venue.lat, venue.lng], 13);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      L.marker([venue.lat, venue.lng])
        .addTo(map)
        .bindPopup(`<b>${venue.name}</b><br>${venue.realName}`);
    });

    // Add click listeners to team badges
    container.querySelectorAll('.team').forEach(el => {
      el.addEventListener('click', () => {
        const teamId = el.dataset.team;
        openTeamModal(teamId);
      });
    });
  }, 100);
}
