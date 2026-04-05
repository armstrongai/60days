const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const pub = path.join(root, 'public')
const configJs = path.join(pub, 'config.js')
const configDefault = path.join(pub, 'config.default.js')

fs.copyFileSync(path.join(root, 'supabase.js'), path.join(pub, 'supabase.js'))

if (!fs.existsSync(configJs)) {
  fs.copyFileSync(configDefault, configJs)
}
