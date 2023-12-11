import common from '../model/common.js'
import StartWeChat4u from '../adapter/WeChat-Web/index.js'

export class WebWcChat extends plugin {
  constructor () {
    super({
      name: '微信',
      dsc: '网页版微信机器人',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: '^#微信登录$',
          fnc: 'login'
        },
        {
          reg: '^#微信账号$',
          fnc: 'account'
        },
        {
          reg: '^#微信删除.*$',
          fnc: 'delUser'
        }
      ]
    })
  }

  async login () {
    let login = false
    const id = `wx_${parseInt(Date.now() / 1000)}`
    await new StartWeChat4u(id)

    for (let i = 0; i < 60; i++) {
      if (!login && Bot.lain.loginMap.get(id)) {
        login = true
        const { url } = Bot.lain.loginMap.get(id)
        const msg = [
          {
            type: 'text',
            text: '请于60秒内通过手机扫码登录微信~'
          },
          {
            type: 'image',
            file: Buffer.from(await (await fetch(url)).arrayBuffer())
          }
        ]
        await this.e.reply(msg, false, { recall: 60 })
        break
      }
      await common.sleep(1000)
    }

    for (let i = 0; i < 60; i++) {
      const bot = Bot.lain.loginMap.get(id)
      if (login && bot && bot.login) {
        return this.e.reply(`Bot：${id} 登录成功~`, true, { at: true })
      }
      await common.sleep(1000)
    }
  }
}
