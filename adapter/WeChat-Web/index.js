import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import common from '../../model/common.js'

export default class StartWeChat4u {
  constructor (id, config) {
    this.id = id
    this.config = config
    this.login()
  }

  async login () {
    let WeChat4u

    try {
      WeChat4u = (await import('wechat4u')).default
    } catch (error) {
      return '未安装 WeChat4u 依赖，请执行pnpm i'
    }

    if (this.config) {
      this.bot = new WeChat4u(JSON.parse(fs.readFileSync(`./plugins/Lain-plugin/config/${this.config}`)))
      this.bot.restart()
    } else {
      this.bot = new WeChat4u()
      this.bot.start()
    }

    /** uuid事件，参数为uuid，根据uuid生成二维码 */
    this.bot.on('uuid', async uuid => {
      const url = `https://login.weixin.qq.com/qrcode/${uuid}`
      Bot.lain.loginMap.set(this.id, { url, uuid, login: false })
      common.info(this.id, `请扫码登录：${url}`)
    })

    /** 登录事件 */
    this.bot.on('login', () => {
      this.name = this.bot.user.NickName
      common.info(this.id, '登录成功，正在加载资源...')
      /** 登录成功~ */
      if (Bot.lain.loginMap.get(this.id)) {
        Bot.lain.loginMap.set(this.id, { ...Bot.lain.loginMap.get(this.id), login: true })
      }
      /** 保存登录数据用于后续登录 */
      try {
        fs.writeFileSync(`${Bot.lain._path}/${this.id}.json`, JSON.stringify(this.bot.botData))
      } catch (error) {
        common.error(this.id, error)
      }

      Bot[this.id] = {
        ...this.bot,
        sdk: this.bot,
        stop: this.stop,
        bkn: 0,
        adapter: 'WeXin',
        uin: this.id,
        tiny_id: this.id,
        fl: new Map(),
        gl: new Map(),
        tl: new Map(),
        gml: new Map(),
        guilds: new Map(),
        nickname: this.name,
        avatar: process.cwd() + `/temp/WeXin/${this.id}.jpg`,
        stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
        apk: Bot.lain.adapter.WeXin.apk,
        version: Bot.lain.adapter.WeXin.version,
        getFriendMap: () => Bot[this.id].fl,
        getGroupList: () => Bot[this.id].gl,
        getGuildList: () => Bot[this.id].tl,
        pickGroup: (groupID) => this.pickGroup(groupID),
        pickUser: (userId) => this.pickFriend(userId),
        pickFriend: (userId) => this.pickFriend(userId),
        makeForwardMsg: async (data) => await common.makeForwardMsg(data),
        getGroupMemberInfo: (groupId, userId) => Bot.getGroupMemberInfo(groupId, userId)
      }
      /** 保存id到adapter */
      if (!Bot.adapter.includes(String(this.id))) Bot.adapter.push(String(this.id))
    })

    /** 登录用户头像事件，手机扫描后可以得到登录用户头像的Data URL */
    this.bot.on('user-avatar', avatar => {
      try {
        avatar = avatar.split(';base64,').pop()
        avatar = Buffer.from(avatar, 'base64')
        const _path = process.cwd() + `/temp/WeXin/${this.id}.jpg`
        if (!fs.existsSync(_path)) fs.writeFileSync(_path, avatar)
      } catch (error) {
        console.log(error)
      }
    })

    /** 接收消息 */
    this.bot.on('message', async msg => {
      msg = await this.msg(msg)
      if (!msg) return
      Bot.emit('message', msg)
    })

    /** 登出 */
    this.bot.on('logout', () => {
      common.info(this.id, `Bot${this.name}已登出`)
      try { fs.unlinkSync(`${Bot.lain._path}/${this.id}.json`) } catch { }
    })

    /** 捕获错误 */
    this.bot.on('error', err => {
      common.error(this.id, err?.tips || err)
      common.debug(this.io, err)
    })
  }

  /** 关🐔 */
  stop () {
    this.bot.stop()
  }

  /** 处理接收的消息 */
  async msg (msg) {
    /** 屏蔽bot自身消息 */
    if (msg.isSendBySelf) return
    /** 屏蔽历史消息 */
    if (Math.floor(Date.now() / 1000) - msg.CreateTime > 10) return

    // let atBot = false
    /** 当前机器人群聊列表 */
    // const group_list = this.bot.contacts[msg.FromUserName].MemberList
    // if (Array.isArray(group_list)) {
    //   for (let i of group_list) {
    //     const regexp = new RegExp(`@${i.DisplayName}`)
    //     /** 通过正则匹配群名片的方式来查询是否atBot */
    //     if (regexp.test(msg.Content)) atBot = true; break
    //   }
    // }

    let e = {
      adapter: 'WeXin',
      self_id: this.id,
      atme: false,
      atBot: false,
      post_type: 'message',
      message_id: msg.MsgId,
      time: msg.CreateTime,
      source: '',
      seq: msg.MsgId
    }

    /** 用户昵称 */
    const nickname = msg.Content.split(':')[0]
    /** 消息接收者，群聊是群号，私聊时是目标QQ */
    const peer_id = msg.FromUserName

    let text
    let toString = ''
    const message = []

    switch (msg.MsgType) {
      /** 文本 */
      case this.bot.CONF.MSGTYPE_TEXT:
        text = msg.Content?.match(/\n(.+)/)?.[1] || msg.Content
        message.push({ type: 'text', text })
        toString += text
        common.info(this.id, `群消息：${text}`)
        break
      /** 图片 */
      case this.bot.CONF.MSGTYPE_IMAGE:
        this.bot.getMsgImg(msg.MsgId)
          .then(res => {
            const _path = process.cwd() + `/temp/WeXin/${msg.MsgId}.jpg`
            if (!fs.existsSync(_path)) fs.writeFileSync(_path, res.data)
            message.push({ type: 'image', file: _path })
            toString += `{image:${_path}}`
            common.info(this.id, `群消息：[图片:${_path}]`)
          })
          .catch(err => { this.bot.emit('error', err?.tips || err) })
        break

      /** 表情消息 */
      case this.bot.CONF.MSGTYPE_EMOTICON:
        this.bot.getMsgImg(msg.MsgId)
          .then(res => {
            const _path = process.cwd() + `/temp/WeXin/${msg.MsgId}.gif`
            if (!fs.existsSync(_path)) fs.writeFileSync(_path, res.data)
            message.push({ type: 'image', file: _path })
            toString += `{image:${_path}}`
            common.info(this.id, `群消息：[表情:${_path}]`)
          })
          .catch(err => { this.bot.emit('error', err?.tips) })
        break

      /** 好友请求消息 */
      case this.bot.CONF.MSGTYPE_VERIFYMSG:
        this.bot.verifyUser(msg.RecommendInfo.UserName, msg.RecommendInfo.Ticket)
          .then(res => {
            logger.info(`通过了 ${this.bot.Contact.getDisplayName(msg.RecommendInfo)} 好友请求`)
          })
          .catch(err => { this.bot.emit('error', err) })
        break

      /** 语音消息 */
      case this.bot.CONF.MSGTYPE_VOICE:
        break
      /** 视频消息 */
      case this.bot.CONF.MSGTYPE_VIDEO:
        break
      /** 小视频消息 */
      case this.bot.CONF.MSGTYPE_MICROVIDEO:
        break
      /** 文件消息 */
      case this.bot.CONF.MSGTYPE_APP:
        break
      default:
        break
    }

    /** 构建快速回复消息 */
    e.reply = async (msg) => await this.reply(peer_id, msg)
    /** 快速撤回 */
    e.recall = async (MsgID) => this.bot.revokeMsg(MsgID, peer_id)
    /** 将收到的消息转为字符串 */
    e.toString = () => e.raw_message
    /** 获取对应用户头像 */
    e.getAvatarUrl = (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${this.id}`
    e.raw_message = toString

    if (/^@@/.test(msg.FromUserName)) {
      const group_id = `wx_${msg.FromUserName}`
      const user_id = `wx_${msg.OriginalContent.split(':')[0]}`
      e.sub_type = 'normal'
      e.message_type = 'group'
      e.group_id = group_id
      e.user_id = user_id
      e.group_name = this.bot.contacts[msg.FromUserName].getDisplayName().replace('[群] ', '')
      e.member = { info: { group_id, user_id, nickname, last_sent_time: msg.CreateTime }, group_id }
      e.group = {
        getChatHistory: (seq, num) => [],
        recallMsg: (MsgID) => this.bot.revokeMsg(MsgID, peer_id),
        sendMsg: async (msg) => await this.reply(peer_id, msg),
        makeForwardMsg: async (data) => await common.makeForwardMsg(data)
      }
      e.sender = {
        user_id,
        nickname,
        card: nickname,
        role: 'member'
      }
    } else {
      const user_id = `wx_${msg.FromUserName}`
      e.user_id = user_id
      e.sub_type = 'friend'
      e.message_type = 'private'
      e.friend = {
        recallMsg: (MsgID) => this.bot.revokeMsg(MsgID, peer_id),
        makeForwardMsg: async (data) => await common.makeForwardMsg(data),
        getChatHistory: (seq, num) => [],
        sendMsg: async (msg) => await this.reply(peer_id, msg)
      }
      e.sender = {
        user_id,
        nickname,
        card: nickname,
        role: 'member'
      }
    }

    /** 兼容message不存在的情况 */
    if (message) e.message = message
    return e
  }

  /** 处理回复消息格式、回复日志 */
  async reply (peer_id, msg) {
    const message = await this.message(msg)
    message.forEach(async i => {
      try {
        const res = await this.bot.sendMsg(i, peer_id)
        common.info(this.id, `发送消息：${JSON.stringify(i)}`)
        return {
          seq: res.MsgID,
          rand: 1,
          time: parseInt(Date.now() / 1000),
          message_id: res.MsgID
        }
      } catch (err) {
        const res = await this.bot.sendMsg(`发送消息失败：${err?.tips || err}`, peer_id)
        common.info(this.id, `发送消息：${`发送消息失败：${err?.tips || err}`}`)
        return {
          seq: res.MsgID,
          rand: 1,
          time: parseInt(Date.now() / 1000),
          message_id: res.MsgID
        }
      }
    })

    /** 群名称 */
    // const group_name = this.bot.contacts[msg.FromUserName].getDisplayName().replace('[群] ', '')
    // const log = !/^@@/.test(from) ? `发送好友消息(${this.name})：[${nickname}(${from})]` : `发送群消息(${this.name})：[${group_name}(${from})]`
    // const data = { id, msg, log }
    // return await this.type(data, reply)
  }

  /** 转换yunzai过来的消息 */
  async message (msg) {
    const message = []
    msg = common.array(msg)
    for (let i of msg) {
      switch (i.type) {
        case 'at':
          break
        case 'image':
          message.push(await this.getFile(i))
          break
        case 'video':
          message.push(await this.getFile(i, 'video'))
          break
        case 'record':
          message.push(await this.getFile(i, 'record'))
          break
        case 'text':
        case 'forward':
          message.push(i.text)
          break
        default:
          message.push(JSON.stringify(i))
          break
      }
    }
    return message
  }

  /** 统一文件格式 */
  async getFile (i, type = 'image') {
    const res = common.getFile(i)
    let { file } = res
    let filename

    if (type == 'image') {
      filename = Date.now() + '.jpg'
    } else if (type == 'record') {
      filename = Date.now() + '.mp3'
    } else if (type == 'video') {
      filename = Date.now() + '.mp4'
    }

    switch (res.type) {
      case 'file':
        file = fs.readFileSync(file.replace(/^file:\/\//, ''))
        return { file, filename: path.extname(file) }
      case 'buffer':
        return { type: 'file', file: Buffer.from(file), filename }
      case 'base64':
        file = Buffer.from(file.replace(/^base64:\/\//, ''))
        return { file, filename }
      case 'http':
        file = Buffer.from(await (await fetch(file)).arrayBuffer())
        return { file, filename: path.extname(file) || filename }
      default:
        return { file, filename }
    }
  }
}
