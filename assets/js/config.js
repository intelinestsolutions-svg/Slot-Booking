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
  sessions: { 'Slot 1': { label: 'Pagi', time: '06:30–12:00' }, 'Slot 2': { label: 'Petang', time: '14:00–17:30' }, 'Slot 3': { label: 'Malam', time: '17:30–21:00' } },
};

window.APP.isNative = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

if (window.APP.isNative) {
  window.APP.apiPrefix = 'https://ghostwhite-bee-423431.hostingersite.com/api/';
}

window.APP.abs = function (p) {
  if (!p || !window.APP.isNative) return p;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith('/')) return 'https://ghostwhite-bee-423431.hostingersite.com' + p;
  return 'https://ghostwhite-bee-423431.hostingersite.com/' + p;
};

window.LOCALE = {
  monthShort: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  monthLong: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
  dayShort: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
};