const fs = require('fs')

let html = fs.readFileSync('public/landing.html', 'utf8')

fs.mkdirSync('src/features/landing/components', { recursive: true })
fs.mkdirSync('src/features/landing/styles', { recursive: true })

// Extract CSS
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
if (styleMatch) {
  fs.writeFileSync('src/features/landing/styles/landing.css', styleMatch[1])
  html = html.replace(styleMatch[0], '')
} else {
  fs.writeFileSync('src/features/landing/styles/landing.css', '')
}

// Extract body
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/)
if (!bodyMatch) {
  console.log('No body found')
  process.exit(1)
}
let body = bodyMatch[1]

// Convert HTML to JSX
body = body.replace(/class=/g, 'className=')
body = body.replace(/for=/g, 'htmlFor=')
body = body.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}')
body = body.replace(/<br>/g, '<br />')
body = body.replace(/<hr>/g, '<hr />')
body = body.replace(/<img([^>]*[^/])>/g, '<img$1 />')
body = body.replace(/<input([^>]*[^/])>/g, '<input$1 />')
body = body.replace(/<meta([^>]*[^/])>/g, '<meta$1 />')
body = body.replace(/<link([^>]*[^/])>/g, '<link$1 />')

// Convert inline styles
body = body.replace(/style="([^"]*)"/g, (match, p1) => {
  const rules = p1.split(';').filter((r) => r.trim())
  const obj = {}
  rules.forEach((r) => {
    let [key, val] = r.split(':')
    if (!key || !val) return
    key = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase())
    val = val.trim()
    obj[key] = isNaN(val) || val === '' ? val : Number(val)
  })
  return 'style={' + JSON.stringify(obj) + '}'
})

// Fix some specific JSX issues
body = body.replace(/stroke-width/g, 'strokeWidth')
body = body.replace(/stroke-linejoin/g, 'strokeLinejoin')
body = body.replace(/stroke-linecap/g, 'strokeLinecap')
body = body.replace(/stroke-dasharray/g, 'strokeDasharray')
body = body.replace(/fill-opacity/g, 'fillOpacity')
body = body.replace(/stop-color/g, 'stopColor')
body = body.replace(/clip-path/g, 'clipPath')

const jsx = `import '../styles/landing.css'
import { useTranslation } from '@/providers/I18nProvider'

export function LandingPage() {
  const { t, lang, setLang } = useTranslation()

  return (
    <div className="landing-root">
      ${body}
    </div>
  )
}
`

fs.mkdirSync('src/features/landing/components', { recursive: true })
fs.mkdirSync('src/features/landing/styles', { recursive: true })
fs.writeFileSync('src/features/landing/components/LandingPage.tsx', jsx)
console.log('Done!')
