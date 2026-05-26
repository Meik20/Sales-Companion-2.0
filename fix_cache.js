const fs = require('fs')
const path = require('path')
function walk(dir) {
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) walk(p)
    else if (f === 'route.ts') {
      let content = fs.readFileSync(p, 'utf8')
      if (!content.includes('force-dynamic')) {
        fs.writeFileSync(p, "export const dynamic = 'force-dynamic';\n" + content)
      }
    }
  })
}
walk('apps/web/src/app/api/admin')
walk('apps/web/src/app/api/team/assignments')
walk('apps/web/src/app/api/pipeline')
walk('apps/web/src/app/api/search/companies')
