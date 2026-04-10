const bcrypt = require('bcrypt'); // or 'bcrypt' if that's what you use

(async () => {
  const hash = '$2b$10$yqgy0Bu7WDJ0jttrWV2/D.IQiLRFBJCHed2hyiyBYX6YoFmg/FMKa';
  const password = 'admin123';

  const isMatch = await bcrypt.compare(password, hash);
  console.log(isMatch ? '✅ Password matches' : '❌ Password does NOT match');
})();
