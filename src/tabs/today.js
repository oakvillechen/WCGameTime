import L from 'leaflet';
import { teams } from '../data/teams.js';
import { venues } from '../data/venues.js';
import { fetchTodayMatches, invalidateCache } from '../data/api.js';
import { openTeamModal } from '../components/teamModal.js';
import { t, getLang } from '../i18n.js';

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
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('today.loading')}</h3></div>`;
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

  const lang = getLang();
  const dateLocale = lang === 'zh' ? 'zh-CN' : 'en-US';

  const timeString = new Intl.DateTimeFormat(dateLocale, { timeStyle: 'medium', timeZone: 'America/Toronto' }).format(new Date());

  if (error) {
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('today.error')}</h3><p style="color: var(--text-secondary);">${error}</p></div>`;
    return;
  }

  if (todaysMatches.length === 0) {
    container.innerHTML = `<div class="glass-panel" style="padding: 2rem; text-align: center;"><h3>${t('today.noMatches')}</h3><p style="color: var(--text-secondary);">🍁 ${t('today.torontoTime')}: ${timeString}</p></div>`;
    return;
  }

  let html = `<div id="today-status" style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--text-secondary);">🍁 ${t('today.torontoTime')}: ${timeString} | <span style="color: var(--accent-gold);">${t('today.liveData')}</span></div><div class="match-grid">`;

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
    const localTime = new Intl.DateTimeFormat(dateLocale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Toronto',
      timeZoneName: 'short'
    }).format(matchDateObj);

    const venueTime = venue ? new Intl.DateTimeFormat(dateLocale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: venue.timezone,
      timeZoneName: 'short'
    }).format(matchDateObj) : localTime;

    // Status badge
    let statusBadge;
    if (match.status === 'live') {
      const minuteDisplay = match.liveMinute || '';
      statusBadge = `<span class="live-badge">🔴 ${t('today.live')} ${minuteDisplay}</span>`;
    } else if (match.status === 'finished' && match.score) {
      statusBadge = `<span class="live-badge" style="background: var(--text-secondary)">${t('today.ft')}</span>`;
    } else {
      // upcoming — show countdown
      const diffMs = matchDateObj.getTime() - now.getTime();
      if (diffMs > 0) {
        const diffH = Math.floor(diffMs / 3600000);
        const diffM = Math.floor((diffMs % 3600000) / 60000);
        const countdownText = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;
        statusBadge = `<span>⏱ ${t('today.kickoffIn')} ${countdownText} • ${localTime}</span>`;
      } else {
        statusBadge = `<span style="color: var(--text-secondary);">${localTime}</span>`;
      }
    }

    // Score display
    let scoreDisplay;
    if (match.score && (match.status === 'finished' || match.status === 'live')) {
      scoreDisplay = `<span>${match.score.home}</span><span>-</span><span>${match.score.away}</span>`;
    } else if (match.status === 'live') {
      scoreDisplay = `<span style="font-size: 1.2rem; color: var(--accent-red); animation: pulse 1.5s infinite;">${t('today.live')}</span>`;
    } else {
      scoreDisplay = `<span style="font-size: 1.5rem; color: var(--text-secondary)">vs</span>`;
    }

    // Scorers display
    let scorersHtml = '';
    if (match.homeScorers || match.awayScorers) {
      const parseScorers = (raw) => {
        if (!raw || raw === 'null') return [];
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
          <span>${t('today.match')} ${match.id} • ${match.stage} • ${t('today.group')} ${match.group}</span>
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
             ${t('today.viewLiveGoogle')}
          </a>
        </div>

        ${venue ? `
        <div style="margin-top: 1rem; border-top: 1px solid var(--glass-border); padding-top: 1rem;">
          <div class="venue-info">
            <strong>${venue.name}</strong>
            ${venue.city}, ${venue.country} • ${t('today.kickoff')}: ${venueTime} (${t('today.venueTime')})
          </div>
          
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.75rem 0; line-height: 1.4;">
            ${lang === 'zh' && venue.description_zh ? venue.description_zh : venue.description}
          </p>
          
          <div id="map-${match.id}" class="map-container"></div>
          <button class="open-map-btn" data-match-id="${match.id}" data-venue-key="${match.venue}"
            style="display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.75rem; padding: 0.5rem 1rem; background: rgba(255,255,255,0.08); border: 1px solid var(--glass-border); color: var(--text-primary); border-radius: 8px; cursor: pointer; font-family: var(--font-main); font-size: 0.85rem; font-weight: 600; transition: all 0.2s ease;">
            ${t('today.openMap')}
          </button>
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

    // Add click listeners to open-map buttons
    container.querySelectorAll('.open-map-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const venueKey = btn.dataset.venueKey;
        const venue = venues[venueKey];
        if (!venue) return;
        openMapWindow(venue);
      });
    });
  }, 100);
}

function openMapWindow(venue) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${venue.name} - ${venue.city}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; }
    #map { width: 100vw; height: calc(100vh - 56px); }
    .map-header {
      height: 56px; display: flex; align-items: center;
      padding: 0 1.5rem; background: #fff;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .map-header h2 { font-size: 1rem; font-weight: 700; color: #1a202c; }
    .map-header h2 span { color: #b7791f; font-weight: 400; }
    .map-header p { font-size: 0.8rem; color: #718096; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="map-header">
    <div>
      <h2>🏟️ ${venue.name} <span>· ${venue.realName || ''}</span></h2>
      <p>${venue.city}, ${venue.country}</p>
    </div>
  </div>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""><\/script>
  <script>
    const map = L.map('map').setView([${venue.lat}, ${venue.lng}], 15);
    const streets = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd', maxZoom: 20
    });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri', maxZoom: 19
    });
    streets.addTo(map);
    L.control.layers({ 'Street': streets, 'Satellite': satellite }).addTo(map);
    L.marker([${venue.lat}, ${venue.lng}])
      .addTo(map)
      .bindPopup('<b>${venue.name.replace(/'/g, "\\'")}</b><br>${venue.city}, ${venue.country}')
      .openPopup();
  <\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'width=1000,height=700');
}
