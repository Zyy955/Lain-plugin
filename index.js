import fs from 'fs'
import './model/config.js'
import './adapter/adapter.js'
import './adapter/Bot/bot.js'
import './lib/init.js'

let ret = []
let apps = {}
const files = fs.readdirSync('./plugins/Lain-plugin/apps').filter(file => file.endsWith('.js'))

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})
ret = await Promise.allSettled(ret)

for (let i in files) {
  let name = files[i].replace('.js', '')
  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }

  // apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
  for (let clazz of Object.keys(ret[i].value)) {
    apps[clazz] = ret[i].value[clazz]
  }
}

export { apps }
