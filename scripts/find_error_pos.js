const fs = require('fs');
const s = fs.readFileSync('mobile/index.html','utf8');
const start = s.indexOf('<script>');
const end = s.lastIndexOf('</script>');
const code = s.slice(start+8, end);
const key = "document.addEventListener('DOMContentLoaded'";
console.log('pos', code.indexOf(key));
console.log(code.slice(Math.max(0, code.indexOf(key)-120), code.indexOf(key)+120));
