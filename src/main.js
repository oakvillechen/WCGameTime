import './style.css';
import { renderTodayTab } from './tabs/today.js';
import { renderScheduleTab } from './tabs/schedule.js';
import { renderGroupsTab } from './tabs/groups.js';
import { renderTeamsTab } from './tabs/teamsTable.js';
import { getLang, setLang, t } from './i18n.js';

// Simple tab routing
document.addEventListener('DOMContentLoaded', () => {
  const desktopBtns = document.querySelectorAll('#desktop-nav .tab-btn');
  const mobileBtns = document.querySelectorAll('#mobile-nav .mobile-nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(targetId) {
    // Update desktop buttons
    desktopBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    // Update mobile buttons
    mobileBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    // Update content visibility
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === targetId);
    });

    // Re-render the active tab
    if (targetId === 'tab-today') renderTodayTab();
    if (targetId === 'tab-schedule') renderScheduleTab();
    if (targetId === 'tab-groups') renderGroupsTab();
    if (targetId === 'tab-standings') renderTeamsTab();
  }

  // Desktop nav clicks
  desktopBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.target));
  });

  // Mobile nav clicks
  mobileBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.target));
  });

  // Initialize language
  updateUILanguage();

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

  // Language toggle
  const langToggle = document.getElementById('lang-toggle');
  langToggle.addEventListener('click', () => {
    const newLang = getLang() === 'en' ? 'zh' : 'en';
    setLang(newLang);
    updateUILanguage();
    // Re-render current tab
    const activeBtn = document.querySelector('#desktop-nav .tab-btn.active');
    if (activeBtn) switchTab(activeBtn.dataset.target);
  });

  // Listen for background data updates and re-render current tab
  window.addEventListener('wc-data-updated', () => {
    const activeBtn = document.querySelector('#desktop-nav .tab-btn.active');
    if (activeBtn) {
      const targetId = activeBtn.dataset.target;
      if (targetId === 'tab-today') renderTodayTab();
      if (targetId === 'tab-schedule') renderScheduleTab();
      if (targetId === 'tab-groups') renderGroupsTab();
      if (targetId === 'tab-standings') renderTeamsTab();
    }
  });
});

function updateUILanguage() {
  // Update header
  document.getElementById('title-1').textContent = t('app.title.1');
  document.getElementById('title-2').textContent = t('app.title.2');
  document.getElementById('app-subtitle').textContent = t('app.subtitle');
  document.getElementById('lang-toggle').textContent = t('lang.toggle');

  // Update desktop nav labels
  const desktopBtns = document.querySelectorAll('#desktop-nav .tab-btn');
  const tabKeys = ['tab.today', 'tab.schedule', 'tab.groups', 'tab.standings'];
  desktopBtns.forEach((btn, i) => {
    btn.textContent = t(tabKeys[i]);
  });

  // Update mobile nav labels
  const mobileLabels = document.querySelectorAll('#mobile-nav .mobile-nav-label');
  const mobileKeys = ['tab.today', 'tab.schedule', 'tab.groups', 'tab.standings'];
  mobileLabels.forEach((label, i) => {
    label.textContent = t(mobileKeys[i]);
  });
}
