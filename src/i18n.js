/**
 * Internationalization (i18n) module
 * Supports English (en) and Chinese (zh)
 */

const translations = {
  en: {
    // Header
    'app.title.1': 'WorldCup',
    'app.title.2': 'GameTime',
    'app.subtitle': 'FIFA World Cup 2026™ Companion',

    // Tabs
    'tab.today': "Today's Games",
    'tab.schedule': 'Schedule',
    'tab.groups': 'Groups',
    'tab.standings': 'Standings',

    // Today tab
    'today.loading': '⏳ Loading today\'s matches...',
    'today.error': '⚠️ Could not fetch match data',
    'today.noMatches': 'No matches scheduled for today.',
    'today.torontoTime': 'Toronto Time',
    'today.liveData': '✓ Live data from worldcup26.ir',
    'today.match': 'Match',
    'today.group': 'Group',
    'today.live': 'LIVE',
    'today.ft': 'FT',
    'today.kickoffIn': 'Kickoff in',
    'today.viewLiveGoogle': '🔍 View Live on Google',
    'today.venueTime': 'Venue Time',
    'today.kickoff': 'Kickoff',
    'today.openMap': '🗺️ Open Map in New Window',

    // Schedule tab
    'schedule.title': 'Tournament Schedule',
    'schedule.loading': '⏳ Loading schedule...',
    'schedule.error': '⚠️ Could not load schedule',
    'schedule.today': 'Today',

    // Groups tab
    'groups.title': 'Group Standings',
    'groups.loading': '⏳ Loading groups...',
    'groups.error': '⚠️ Could not load groups',
    'groups.group': 'Group',

    // Table headers
    'table.team': 'Team',
    'table.p': 'P',
    'table.w': 'W',
    'table.d': 'D',
    'table.l': 'L',
    'table.gf': 'GF',
    'table.ga': 'GA',
    'table.gd': 'GD',
    'table.pts': 'Pts',
    'table.confed': 'Confed',
    'table.group': 'Group',

    // Standings tab
    'standings.title': 'Teams & Standings',
    'standings.subtitle': 'Overall rankings across all groups',
    'standings.loading': '⏳ Loading standings...',

    // Team modal
    'modal.confederation': 'Confederation',
    'modal.group': 'Group',
    'modal.squad': '26-Man Squad',
    'modal.loadingCountry': 'Loading country info...',
    'modal.noCountryInfo': 'No country information found.',
    'modal.errorCountryInfo': 'Error loading country info.',
    'modal.partialRoster': '* Partial roster shown for demo',
    'modal.pic': 'Pic',
    'modal.no': 'No.',
    'modal.name': 'Name',
    'modal.pos': 'Pos',
    'modal.club': 'Club',
    'modal.age': 'Age',
    'modal.birthYear': 'Birth Yr',
    'modal.height': 'Height',
    'modal.goals': 'Goals',
    'modal.info': 'Info',
    'modal.search': 'Search',

    // Language
    'lang.toggle': '中文',
  },
  zh: {
    // Header
    'app.title.1': '世界杯',
    'app.title.2': '赛程助手',
    'app.subtitle': '2026年FIFA世界杯™ 伴侣',

    // Tabs
    'tab.today': '今日赛程',
    'tab.schedule': '赛程表',
    'tab.groups': '小组赛',
    'tab.standings': '排名',

    // Today tab
    'today.loading': '⏳ 正在加载今日比赛...',
    'today.error': '⚠️ 无法获取比赛数据',
    'today.noMatches': '今天没有比赛。',
    'today.torontoTime': '多伦多时间',
    'today.liveData': '✓ 实时数据来自 worldcup26.ir',
    'today.match': '比赛',
    'today.group': '组',
    'today.live': '直播中',
    'today.ft': '已结束',
    'today.kickoffIn': '开球倒计时',
    'today.viewLiveGoogle': '🔍 在Google查看实时比分',
    'today.venueTime': '当地时间',
    'today.kickoff': '开球',
    'today.openMap': '🗺️ 在新窗口打开地图',

    // Schedule tab
    'schedule.title': '赛程表',
    'schedule.loading': '⏳ 正在加载赛程...',
    'schedule.error': '⚠️ 无法加载赛程',
    'schedule.today': '今天',

    // Groups tab
    'groups.title': '小组积分榜',
    'groups.loading': '⏳ 正在加载小组...',
    'groups.error': '⚠️ 无法加载小组',
    'groups.group': '组',

    // Table headers
    'table.team': '球队',
    'table.p': '场',
    'table.w': '胜',
    'table.d': '平',
    'table.l': '负',
    'table.gf': '进球',
    'table.ga': '失球',
    'table.gd': '净胜球',
    'table.pts': '积分',
    'table.confed': '赛区',
    'table.group': '小组',

    // Standings tab
    'standings.title': '球队排名',
    'standings.subtitle': '所有小组综合排名',
    'standings.loading': '⏳ 正在加载排名...',

    // Team modal
    'modal.confederation': '赛区',
    'modal.group': '小组',
    'modal.squad': '26人大名单',
    'modal.loadingCountry': '正在加载国家信息...',
    'modal.noCountryInfo': '未找到国家信息。',
    'modal.errorCountryInfo': '加载国家信息出错。',
    'modal.partialRoster': '* 仅展示部分球员名单',
    'modal.pic': '头像',
    'modal.no': '号码',
    'modal.name': '姓名',
    'modal.pos': '位置',
    'modal.club': '俱乐部',
    'modal.age': '年龄',
    'modal.birthYear': '出生年',
    'modal.height': '身高',
    'modal.goals': '进球',
    'modal.info': '详情',
    'modal.search': '搜索',

    // Language
    'lang.toggle': 'EN',
  },
};

const STORAGE_KEY = 'wc-lang';

let currentLang = localStorage.getItem(STORAGE_KEY) || 'en';

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

export function t(key) {
  const dict = translations[currentLang] || translations.en;
  return dict[key] || translations.en[key] || key;
}
