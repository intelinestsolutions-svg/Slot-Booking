const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function rm(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function cp(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src)) {
      cp(path.join(src, e), path.join(dst, e));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

rm(DIST);
fs.mkdirSync(DIST, { recursive: true });
cp(path.join(ROOT, 'index.html'), path.join(DIST, 'index.html'));
cp(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
console.log('dist/ built:', fs.readdirSync(DIST).join(', '));