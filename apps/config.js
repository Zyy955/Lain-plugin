import YAML from '../model/yaml.js'
import common from '../lib/common/common.js'
import Cfg from '../lib/config/config.js'

export class adapter extends plugin {
  constructor () {
    super({
      name: 'Bot配置',
      dsc: 'QQ频道、QQ群Bot基本配置',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^#QQ(群|Bot|频道)?设置(?!MD|markdown).+/i,
          fnc: 'bot',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)?账号/i,
          fnc: 'account',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)设置(MD|markdown).+/i,
          fnc: 'markdown',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)(MD|markdown)(\d{9}:)?[01234]{1}$/i,
          fnc: 'type',
          permission: 'master'
        },
        {
          reg: /^#QQ(群|Bot|频道)设置(QQ图床|前缀|防倒卖(群号)?).+/i,
          fnc: 'other',
          permission: 'master'
        }
      ]
    })
  }

  /** bot相关配置 */
  async bot () {
    let config = {
      model: 0,
      appid: '',
      token: '',
      sandbox: false,
      allMsg: false,
      removeAt: false,
      secret: '',
      markdown: {
        id: '',
        type: 0,
        text: 'text_start',
        img_dec: 'img_dec',
        img_url: 'img_url'
      },
      other: {
        Prefix: true,
        QQ: '',
        Tips: false,
        'Tips-GroupId': ''
      }
    }

    const msg = this.e.msg.replace(/^#QQ(群|Bot|频道)?设置/i, '').trim().replace(/：/g, ':').split(':')
    const cfg = new YAML(lain._pathCfg + '/token.yaml')
    const QQBot = (await import('../adapter/QQBot/index.js')).default
    const QQGuild = (await import('../adapter/QQGuild/index.js')).default

    /** 最低要求 */
    if (msg.length < 4) return await this.reply('格式错误', true, { at: true })
    /** 判断开发者id */
    if (msg[2].length != 9) return await this.reply('appid输入错误!', true, { at: true })

    /** 看下是否配置已存在 */
    if (cfg.value('token', msg[2])) {
      cfg.delVal('token', msg[2])
      return await this.reply('删除成功~请重启 Miao-Yunzai 生效~', true, { at: true })
    } else {
      /** 不存在加一下配置 */
      config.sandbox = msg[0] == 1
      config.allMsg = msg[1] == 1
      config.appid = String(msg[2])
      config.token = msg[3]
      if (msg[4]) config.secret = msg[4]

      /** 获取模式 */
      if (/#QQ频道设置/i.test(this.e.msg)) {
        config.model = 1
      } else if (/#QQ(群|Bot)设置/i.test(this.e.msg)) {
        config.model = 2
      }
      cfg.addVal('token', { [config.appid]: config })
    }

    try {
      switch (config.model) {
        case 0:
          /** 同时接群和频道 */
          await this.reply(await new QQBot(config, true).StartBot())
          await common.sleep(5000)
          return await this.reply(await new QQGuild(config, true).StartBot())
        case 1:
          /** 开始连接QQ频道Bot */
          return await this.reply(await new QQGuild(config, true).StartBot())
        case 2:
          /** 开始连接QQ群Bot */
          return await this.reply(await new QQBot(config, true).StartBot())
        default:
      }
    } catch (error) {
      /** 异常处理 */
      return this.reply(error?.message || error)
    }
    return await this.reply('格式错误', true, { at: true })
  }

  /** QQ群、频道Bot账号列表 */
  async account () {
    let list = []
    if (this.e.isGroup) return await this.reply('请私聊查看', true, { at: true })
    let token = Object.values(Cfg.getToken())

    // if (!Array.isArray(token)) token = [token] // 感觉没啥必要。
    if (!token.length) return await this.reply('当前还没有绑定过账号~', true, { at: true })
    token.forEach(i => {
      switch (Number(i.model)) {
        case 0:
          list.push(`全量-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
        case 1:
          list.push(`QQ频道-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
        case 2:
          list.push(`QQ群-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
        default:
          list.push(`未启用-${i.sandbox ? 1 : 0}:${i.allMsg ? 1 : 0}:${i.appid}:${i.token}` + (i.secret ? `:${i.secret}` : ''))
          break
      }
    })

    //     token.forEach(i => {
    //       list.push(`
    // ${i.appid}:
    //   model: ${i.model}
    //   appid: ${i.appid}
    //   sandbox: ${i.sandbox}
    //   allMsg: ${i.allMsg}
    //   token: ${i.token}
    //   secret: ${i.secret}
    //   markdown:
    //     id: ${i.markdown.id}
    //     type: ${i.markdown.type}
    //     text: ${i.markdown.text}
    //     img_dec: ${i.markdown.img_dec}
    //     img_url: ${i.markdown.img_url}
    //   other:
    //     Prefix: ${i.other.Prefix}
    //     QQ: ${i.other.QQ}
    //     Tips: ${i.other.Tips}
    //     Tips-GroupId: ${i.other['Tips-GroupId']}`)
    //     })

    return await this.reply(`QQ群、频道账号列表：\n${list.join('\n')}\n\n共 ${list.length} 个账号`)
  }

  /** 设置模板ID */
  async markdown () {
    let msg = this.e.msg.replace(/^#QQ(群|Bot|频道)设置(MD|markdown)/, '').replace(/：/g, ':').trim().split(':')
    const cfg = new YAML(lain._pathCfg + '/token.yaml')
    let val = cfg.get('token')
    if (this.e?.adapter === 'QQBot') {
      if (msg.length == 1) {
        val[this.e.self_id].markdown.id = msg[0]
        if (val[this.e.self_id].markdown.type == 0) val[this.e.self_id].markdown.type = 1
        /** 保存 */
        cfg.set('token', val)
      } else if (msg.length == 2) {
        val[msg[0]].markdown.id = msg[1]
        if (val[msg[0]].markdown.type == 0) val[msg[0]].markdown.type = 1
        /** 保存 */
        cfg.set('token', val)
      } else {
        return await this.reply('格式错误!', true, { at: true })
      }
    } else {
      if (msg.length != 2) return await this.reply('格式错误!', true, { at: true })
      if (cfg.value('token', msg[0])) {
        val[msg[0]].markdown.id = msg[1]
        if (val[msg[0]].markdown.type == 0) val[msg[0]].markdown.type = 1
        /** 保存 */
        cfg.set('token', val)
      } else {
        return await this.reply('不存在此appid对应的bot!', true, { at: true })
      }
    }
    return await this.reply('修改成功~', true, { at: true })
  }

  /** 切换模板ID */
  async type () {
    let msg = this.e.msg.replace(/^#QQ(群|Bot|频道)(MD|markdown)/i, '').replace(/：/g, ':').trim().split(':')
    const cfg = new YAML(lain._pathCfg + '/token.yaml')
    let val = cfg.get('token')
    if (this.e?.adapter === 'QQBot') {
      if (msg.length == 1) {
        val[this.e.self_id].markdown.type = Number(msg[0])
        /** 保存 */
        cfg.set('token', val)
      } else if (msg.length == 2) {
        val[msg[0]].markdown.type = Number(msg[1])
        /** 保存 */
        cfg.set('token', val)
      } else {
        return await this.reply('格式错误!', true, { at: true })
      }
    } else {
      if (msg.length != 2) return await this.reply('格式错误!', true, { at: true })
      if (cfg.value('token', msg[0])) {
        val[msg[0]].markdown.type = Number(msg[1])
        /** 保存 */
        cfg.set('token', val)
      } else {
        return await this.reply('不存在此appid对应的bot!', true, { at: true })
      }
    }
    return await this.reply('修改成功~', true, { at: true })
  }

  /** 其他 */
  async other () {
    const msg = this.e.msg.replace(/^#QQ(群|Bot|频道)设置(QQ图床|前缀|防倒卖(群号)?)/i, '').replace(/：/g, ':').trim().split(':')
    const cfg = new YAML(lain._pathCfg + '/token.yaml')
    if (msg.length != 1 && msg.length != 2) return await this.reply('格式错误!', true, { at: true })

    let self_id
    if (msg.length == 2) {
      self_id = msg[0]
    } else {
      if (this.e?.adapter === 'QQBot') self_id = this.e.self_id
      return await this.reply('格式错误!', true, { at: true })
    }
    if (cfg.value('token', self_id)) {
      let val = cfg.get('token')
      if (this.e.msg.includes('图床')) {
        val[self_id].other.QQ = Number(msg[1] || msg[0])
      } else if (this.e.msg.includes('前缀')) {
        val[self_id].other.Prefix = (msg[1] || msg[0]) === '开启'
      } else if (this.e.msg.includes('防倒卖群号')) {
        val[self_id].other.Tips = Number(msg[1] || msg[0]) || String(msg[1] || msg[0])
      } else if (this.e.msg.includes('防倒卖')) {
        val[self_id].other['Tips-GroupId'] = Number(msg[1] || msg[0]) || String(msg[1] || msg[0])
      }
      /** 保存 */
      cfg.set('token', val)
      /** 渲染 */
    } else {
      return await this.reply('不存在此appid对应的bot!', true, { at: true })
    }
  }
}
