import fs from 'fs'
import Cfg from '../lib/config/config.js'
import common from '../lib/common/common.js'

/** 适配器列表 */
const adapter = []

/** 启动HTTP服务器，加载shamrock、Com微信适配器 */
adapter.push(async function httpServer () {
  const WebSocket = (await import('./WebSocket.js')).default
  return await (new WebSocket()).server()
})

/** 加载标准输入 */
adapter.push(async function stdin () {
  if (!Cfg.Stdin.state) return
  const stdin = (await import('./stdin/stdin.js')).default
  await stdin()
  return common.info('标准输入', '加载完成...您可以在控制台输入指令哦~')
})

/** QQBot适配器 */
adapter.push(async function QQBot () {
  if (Object.values(Cfg.token()).length) {
    Object.values(Cfg.token()).forEach(async bot => {
      if (bot.model == 0 || bot.model == 2) {
        try {
          const StartQQBot = (await import('./QQBot/index.js')).default
          return new StartQQBot(bot)
        } catch (err) {
          return common.error('Lain-plugin', 'QQBot适配器加载失败：', err)
        }
      }
    })
  }
})

/** 加载QQ频道适配器 */
adapter.push(async function QQGuild () {
  if (Object.values(Cfg.token()).length) {
    Object.values(Cfg.token()).forEach(async bot => {
      if (bot.model == 0 || bot.model == 1) {
        try {
          /** 同时创建连接会出bug...sbTX */
          if (bot.model == 0) await common.sleep(5000)
          const Guild = (await import('./QQGuild/index.js')).default
          await new Guild(bot)
        } catch (err) {
          return common.error('Lain-plugin', 'QQGuild适配器加载失败：', err)
        }
      }
    })
  }
  common.info('Lain-plugin', 'QQ频道适配器加载完成...')
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
