import fs from 'fs'
import Yaml from 'yaml'
import common from '../model/common.js'

/** 适配器列表 */
const adapter = []

/** 启动HTTP服务器，加载shamrock、Com微信适配器 */
adapter.push(async function httpServer () {
  const WebSocket = (await import('./WebSocket.js')).default
  return await (new WebSocket()).server()
})

/** 加载标准输入 */
adapter.push(async function stdin () {
  const stdin = (await import('./stdin/stdin.js')).default
  await stdin()
  return common.info('标准输入', '加载完成...您可以在控制台输入指令哦~')
})

/** 加载QQ频道适配器 */
adapter.push(async function QQGuild () {
  if (!fs.existsSync(Bot.lain._path + '/bot.yaml')) return
  const bot = Yaml.parse(fs.readFileSync(Bot.lain._path + '/bot.yaml', 'utf8'))
  for (const i in bot) {
    if (i === 'default') continue
    try {
      const Guild = (await import('./QQGuild/index.js')).default
      await new Guild(bot[i]).monitor()
    } catch (err) {
      logger.error(err)
    }
  }
  common.info('Lain-plugin', 'QQ频道适配器加载完成...')
})

/** QQBot适配器 */
adapter.push(async function QQBot () {
  try {
    const cfg = fs.readFileSync(Bot.lain._path + '/QQBot.yaml', 'utf8')
    Object.entries(Yaml.parse(cfg)).forEach(async ([appid, cfg]) => {
      if (Object.keys(cfg).length === 0) return
      const StartQQBot = (await import('./QQBot/index.js')).default
      return new StartQQBot(cfg)
    })
  } catch (err) { return common.error('QQBot', `QQBot适配器加载失败,${err}`) }
})

/** 加载微信 */
adapter.push(async function wechat4u () {
  const StartWeChat4u = (await import('./WeChat-Web/index.js')).default
  const _path = fs.readdirSync('./plugins/Lain-plugin/config')
  const Jsons = _path.filter(file => file.endsWith('.json'))
  if (Jsons.length > 0) {
    Jsons.forEach(async i => {
      const id = i.replace(/\.json$/gi, '')
      try {
        await new StartWeChat4u(id, i)
      } catch (error) {
        common.error('Lain-plugin', `微信 ${id} 登录失败，已跳过。`)
        common.error('Lain-plugin', error)
      }
    })
  }
})

/** 加载适配器 */
for (let i of adapter) {
  try {
    await i()
  } catch (error) {
    common.error('Lain-plugin', error)
  }
}

common.info('Lain-plugin', `Lain-plugin插件${Bot.lain.version}全部初始化完成~`)
common.info('Lain-plugin', 'https://gitee.com/Zyy955/Lain-plugin')
