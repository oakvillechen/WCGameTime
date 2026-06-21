import './style.css';
import { renderTodayTab } from './tabs/today.js';
import { renderScheduleTab } from './tabs/schedule.js';
import { renderTeamsTab } from './tabs/teamsTable.js';

// Simple tab routing
document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Tabs state not needed for re-renders

  function switchTab(targetId) {
    // Update buttons
    tabBtns.forEach(btn => {
      if (btn.dataset.target === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update content visibility
    tabContents.forEach(content => {
      if (content.id === targetId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    // Re-render components to fetch latest data state
    if (targetId === 'tab-today') renderTodayTab();
    if (targetId === 'tab-schedule') renderScheduleTab();
    if (targetId === 'tab-teams') renderTeamsTab();
  }

  // Event listeners for tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target.dataset.target;
      switchTab(target);
    });
  });

  // Initialize first tab
  switchTab('tab-today');
  
  // Handle modal close
  const modal = document.getElementById('team-modal');
  const closeBtn = document.querySelector('.close-btn');
  
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Listen for background data updates and re-render current tab
  window.addEventListener('wc-data-updated', () => {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn) {
      const targetId = activeBtn.dataset.target;
      if (targetId === 'tab-today') renderTodayTab();
      if (targetId === 'tab-schedule') renderScheduleTab();
      if (targetId === 'tab-teams') renderTeamsTab();
    }
  });
});
