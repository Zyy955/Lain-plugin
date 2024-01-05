import fs from 'fs'
import common from '../lib/common/common.js'
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
          reg: '^#微信登(录|陆)$',
          fnc: 'login',
          permission: 'master'
        },
        {
          reg: '^#微信账号$',
          fnc: 'account',
          permission: 'master'
        },
        {
          reg: '^#微信删除.*$',
          fnc: 'delUser',
          permission: 'master'
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

  async account () {
    const _path = fs.readdirSync('./plugins/Lain-plugin/config')
    const Jsons = _path.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''))
    if (Jsons) {
      return await this.reply(`微信账号：\n${Jsons.join('\n')}`, true)
    } else {
      return await this.reply('还没有账号呢~', true)
    }
  }

  async delUser () {
    const msg = this.e.msg.replace(/#微信删除/, '').trim()
    try {
      const _path = Bot.lain._path + `/${msg}.json`
      Bot[msg].stop()
      if (fs.existsSync(_path)) fs.unlinkSync(_path)
      return await this.reply(`已停止并删除${msg}`, true)
    } catch (error) {
      return await this.e.reply(`账号 ${msg} 不存在`)
    }
  }
}
