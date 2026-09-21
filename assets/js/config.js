window.APP = {
  name: 'Sabah Buskers Community',
  shortName: 'SBC',
  domain: 'sabahbuskers.my',
  tagline: 'Platform busking Sabah',
  city: 'Kota Kinabalu',
  mobileLabel: 'SBC Mobile Apps',
  tosKey: 'sabahbuskers_tos_v1',
  prayerCity: 'Kota Kinabalu',
  prayerCountry: 'Malaysia',
  apiPrefix: 'api/',
  tokenKey: 'sabahbuskers_token',
  userKey: 'sabahbuskers_user',
  langKey: 'sabahbuskers_lang',
buildName: '2.0.1-beta',
  buildCode: 13,
  webBuild: '20261038',
  updateUrl: 'https://apps.sabahbuskers.my/version.json',
  downloadUrl: 'https://apps.sabahbuskers.my/sbc-mobile.apk',
  sessions: { 'Slot 1': { label: 'Pagi', time: '06:30–12:00' }, 'Slot 2': { label: 'Petang', time: '14:00–17:30' }, 'Slot 3': { label: 'Malam', time: '17:30–21:00' } },
};

window.APP.isNative = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

const _ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
window.APP.isMobileBrowser = !window.APP.isNative &&
  (/Mobi|Android|iPhone|iPod|iPad|Opera Mini|IEMobile|BlackBerry/i.test(_ua) ||
   screen.width <= 979);
window.APP.isMobile = window.APP.isNative || window.APP.isMobileBrowser;

if (window.APP.isMobile) {
  document.documentElement.classList.add('is-app');
}

if (window.APP.isNative) {
  window.APP.apiPrefix = 'https://apps.sabahbuskers.my/api/';
  document.documentElement.classList.add('is-native');
}

window.APP.abs = function (p) {
  if (!p || !window.APP.isNative) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/')) return 'https://apps.sabahbuskers.my' + p;
  return 'https://apps.sabahbuskers.my/' + p;
};

window.LOCALE = {
  monthShort: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  monthLong: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
  dayShort: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
};