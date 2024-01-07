import { exec } from 'child_process'
import fs from 'fs'
import sizeOf from 'image-size'
import lodash from 'lodash'
import path from 'path'
import QQBot from 'qq-group-bot'
import QrCode from 'qrcode'
import { encode as encodeSilk } from 'silk-wasm'
import Yaml from 'yaml'
import MiaoCfg from '../../../../lib/config/config.js'
import common from '../../lib/common/common.js'
import Button from './plugins.js'
import Cfg from '../../lib/config/config.js'
import loader from '../../../../lib/plugins/loader.js'

export default class adapterQQBot {
  /** 传入基本配置 */
  constructor (config, add) {
    /** 开发者id */
    this.id = config.appid
    /** 基本配置 */
    this.config = config
    /** 重试次数 */
    this.config.maxRetry = 10
    /** 禁止移除at */
    this.config.removeAt = false
    /** 监听事件 */
    this.config.intents = ['GROUP_AT_MESSAGE_CREATE', 'C2C_MESSAGE_CREATE']
    /** 日志等级 */
    this.config.logLevel = Bot.lain.BotCfg.log_level
    /** 启动当前Bot */
    if (!add) this.StartBot()
  }

  async StartBot () {
    this.bot = new QQBot.Bot(this.config)
    // 群聊被动回复
    this.bot.on('message.group', async (e) => {
      e = await this.msg(e, true)
      if (e) Bot.emit('message', e)
    })
    // 私聊被动回复
    this.bot.on('message.private', async (e) => {
      e = await this.msg(e, true)
      if (e) Bot.emit('message', e)
    })

    /** 开始链接 */
    await this.bot.start()

    this.bot.logger = {
      info: log => this.msgLog(log),
      trace: log => common.trace(this.id, log),
      debug: log => common.debug(this.id, log),
      mark: log => common.mark(this.id, log),
      warn: log => common.warn(this.id, log),
      error: log => common.error(this.id, log),
      fatal: log => common.fatal(this.id, log)
    }
    const { id, avatar, username } = await this.bot.getSelfInfo()

    Bot[this.id] = {
      ws: this.bot,
      config: this.config,
      bkn: 0,
      avatar,
      adapter: 'QQBot',
      uin: this.id,
      tiny_id: id,
      fl: new Map(),
      gl: new Map(),
      tl: new Map(),
      gml: new Map(),
      guilds: new Map(),
      nickname: username,
      stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
      apk: Bot.lain.adapter.QQBot.apk,
      version: Bot.lain.adapter.QQBot.version,
      getFriendMap: () => Bot[this.id].fl,
      getGroupList: () => Bot[this.id].gl,
      getGuildList: () => Bot[this.id].tl,
      readMsg: async () => await common.recvMsg(this.id, 'QQBot', true),
      MsgTotal: async (type) => await common.MsgTotal(this.id, 'QQBot', type, true),
      pickGroup: (groupID) => this.pickGroup(groupID),
      pickUser: (userId) => this.pickFriend(userId),
      pickFriend: (userId) => this.pickFriend(userId),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getGroupMemberInfo: (group_id, user_id) => Bot.getGroupMemberInfo(group_id, user_id)
    }
    /** 加载缓存中的群列表 */
    this.gmlList('gl')
    /** 加载缓存中的好友列表 */
    this.gmlList('fl')
    /** 保存id到adapter */
    if (!Bot.adapter.includes(String(this.id))) Bot.adapter.push(String(this.id))

    /** 重启 */
    await common.init('Lain:restart:QQBot')
    return `QQBot：[${username}(${this.id})] 连接成功!`
  }

  /** 修改一下日志 */
  msgLog (e) {
    if (typeof e !== 'string') return common.info(this.id, e)
    e = e.trim()
    try {
      if (/^recv from Group/.test(e)) {
        e = e.replace(/^recv from Group\([^)]+\): /, `群消息：[${e.match(/\(([^)]+)\)/)[1]}]`)
      } else if (/^send to Group/.test(e)) {
        e = e.replace(/^send to Group\([^)]+\): /, `发送群消息：[${e.match(/\(([^)]+)\)/)[1]}]`)
      }
    } catch { }
    return common.info(this.id, e)
  }

  /** 加载缓存中的群、好友列表 */
  async gmlList (type = 'gl') {
    try {
      const List = await redis.keys(`lain:${type}:${this.id}:*`)
      List.forEach(async i => {
        const id = await redis.get(i)
        if (type === 'gl') {
          Bot[this.id].gl.set(id, JSON.parse(id))
        } else {
          Bot[this.id].fl.set(id, JSON.parse(id))
        }
      })
    } catch { }
  }

  /** 群对象 */
  pickGroup (groupID) {
    return {
      is_admin: false,
      is_owner: false,
      sendMsg: async (msg) => await this.sendGroupMsg(groupID, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      pickMember: (userID) => this.pickMember(groupID, userID),
      /** 戳一戳 */
      pokeMember: async (operatorId) => '',
      /** 禁言 */
      muteMember: async (groupId, userId, time) => '',
      /** 全体禁言 */
      muteAll: async (type) => '',
      getMemberMap: async () => '',
      /** 退群 */
      quit: async () => '',
      /** 设置管理 */
      setAdmin: async (qq, type) => '',
      /** 踢 */
      kickMember: async (qq, rejectAddRequest = false) => '',
      /** 头衔 **/
      setTitle: async (qq, title, duration) => '',
      /** 修改群名片 **/
      setCard: async (qq, card) => ''
    }
  }

  /** 好友对象 */
  pickFriend (userId) {
    return {
      sendMsg: async (msg) => await this.sendFriendMsg(userId, msg),
      makeForwardMsg: async (data) => await common.makeForwardMsg(data),
      getChatHistory: async () => [],
      getAvatarUrl: async (size = 0, userID) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID.split('-')[1] || this.id}`
    }
  }

  pickMember (groupID, userID) {
    return {
      member: this.member(groupID, userID),
      getAvatarUrl: (size = 0, userID) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userID.split('-')[1] || this.id}`
    }
  }

  member (groupId, userId) {
    const member = {
      info: {
        group_id: `${this.id}-${groupId}`,
        user_id: `${this.id}-${userId}`,
        nickname: '',
        last_sent_time: ''
      },
      group_id: `${this.id}-${groupId}`,
      is_admin: false,
      is_owner: false,
      /** 获取头像 */
      getAvatarUrl: (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${userId}`,
      mute: async (time) => ''
    }
    return member
  }

  /** 转换格式给云崽处理 */
  async msg (data, isGroup) {
    let { self_id: tinyId, ...e } = data
    e.data = data
    e.tiny_id = tinyId
    e.self_id = e.bot.config.appid
    e.sendMsg = data.reply
    e.raw_message = e.raw_message.trim()

    /** 过滤事件 */
    let priority = true
    let raw_message = e.raw_message
    if (e.group_id && raw_message) {
      raw_message = this.hasAlias(raw_message, e, false)
      raw_message = raw_message.replace(/^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/, '#星铁')
    }

    for (let v of loader.priority) {
      let p = new v.class(e)
      p.e = e
      /** 判断是否启用功能 */
      if (!this.checkDisable(e, p, raw_message)) {
        priority = false
        return false
      }
    }

    if (!priority) return false

    if (Bot[this.id].config.other.Prefix) {
      e.message.some(msg => {
        if (msg.type === 'text') {
          msg.text = this.hasAlias(msg.text, e)
          return true
        }
        return false
      })
    }

    /** 构建快速回复消息 */
    e.reply = async (msg, quote) => await this.reply(e, msg, quote)
    /** 快速撤回 */
    e.recall = async () => { }
    /** 将收到的消息转为字符串 */
    e.toString = () => e.raw_message
    /** 获取对应用户头像 */
    e.getAvatarUrl = (size = 0, id = data.user_id) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${id}`

    /** 构建场景对应的方法 */
    if (isGroup) {
      try {
        const groupId = `${this.id}-${e.group_id}`
        if (!Bot[e.self_id].gl.get(groupId)) Bot[e.self_id].gl.set(groupId, { group_id: groupId })
        /** 缓存群列表 */
        if (await redis.get(`lain:gl:${e.self_id}:${groupId}`)) redis.set(`lain:gl:${e.self_id}:${groupId}`, JSON.stringify({ group_id: groupId }))
        /** 防倒卖崽 */
        if (Bot.lain.cfg.QQBotTips) await this.QQBotTips(data, groupId)
      } catch { }

      e.member = this.member(e.group_id, e.user_id)
      e.group_name = `${this.id}-${e.group_id}`
      e.group = this.pickGroup(e.group_id)
    } else {
      e.friend = this.pickFriend(e.user_id)
    }

    /** 添加适配器标识 */
    e.adapter = 'QQBot'
    e.user_id = `${this.id}-${e.user_id}`
    e.group_id = `${this.id}-${e.group_id}`
    e.author.id = `${this.id}-${e.author.id}`
    e.sender.user_id = `${this.id}-${e.sender.user_id}`

    /** 缓存好友列表 */
    if (!Bot[e.self_id].fl.get(e.user_id)) Bot[e.self_id].fl.set(e.user_id, { user_id: e.user_id })
    if (await redis.get(`lain:fl:${e.self_id}:${e.user_id}`)) redis.set(`lain:fl:${e.self_id}:${e.user_id}`, JSON.stringify({ user_id: e.user_id }))

    /** 保存消息次数 */
    try { common.recvMsg(e.self_id, e.adapter) } catch { }
    return e
  }

  /** 判断是否启用功能 */
  checkDisable (e, p, raw_message) {
    let groupCfg = Cfg.getGroup(e.self_id)
    /** 白名单 */
    if (!lodash.isEmpty(groupCfg.enable)) {
      if (groupCfg.enable.includes(p.name)) {
        /** 判断当前传入的值是否符合正则 */
        for (let i of p.rule) {
          i = new RegExp(i.reg)
          if (i.test(raw_message.trim())) {
            return true
          }
        }
        logger.mark(`[Lain-plugin][${p.name}]功能已禁用`)
        return false
      }
    }

    if (!lodash.isEmpty(groupCfg.disable)) {
      if (groupCfg.disable.includes(p.name)) {
        /** 判断当前传入的值是否符合正则 */
        for (let i of p.rule) {
          i = new RegExp(i.reg)
          if (i.test(raw_message.trim())) {
            logger.mark(`[Lain-plugin][${p.name}]功能已禁用`)
            return false
          }
        }
      }
    }
    return true
  }

  /** 前缀处理 */
  hasAlias (text, e, hasAlias = true) {
    if (e.bot.config.other.Prefix && text.trim().startsWith('/')) {
      return text.trim().replace(/^\//, '#')
    }
    /** 兼容前缀 */
    let groupCfg = MiaoCfg.getGroup(e.group_id)
    let alias = groupCfg.botAlias
    if (!Array.isArray(alias)) {
      alias = [alias]
    }
    for (let name of alias) {
      if (text.startsWith(name)) {
        /** 先去掉前缀 再 / => # */
        text = lodash.trimStart(text, name).trim()
        if (e.bot.config.other.Prefix) text = text.replace(/^\//, '#')
        if (hasAlias) return name + text
        return text
      }
    }
    return text
  }

  /** 小兔崽子 */
  async QQBotTips (data, groupId) {
    /** 首次进群后，推送防司马崽声明~ */
    if (!await redis.get(`lain:QQBot:tips:${groupId}`)) {
      const msg = []
      const name = `「${Bot[this.id].nickname}」`
      msg.push('温馨提示：')
      msg.push(`感谢使用${name}，本Bot完全开源免费~\n`)
      msg.push('请各位尊重Yunzai本体及其插件开发者们的努力~')
      msg.push('如果本Bot是付费入群,请立刻退款举报！！！\n')
      msg.push('来自：Lain-plugin防倒卖崽提示，本提示仅在首次入群后触发~')
      if (Bot.lain.cfg.QQBotGroupId) msg.push(`\n如有疑问，请添加${name}官方群: ${Bot.lain.cfg.QQBotGroupId}~`)
      data.reply(msg.join('\n'))
      redis.set(`lain:QQBot:tips:${groupId}`, JSON.stringify({ group_id: groupId }))
    }
  }

  /** ffmpeg转码 转为pcm */
  async runFfmpeg (input, output) {
    let cm
    let ret = await new Promise((resolve, reject) => exec('ffmpeg -version', { windowsHide: true }, (error, stdout, stderr) => resolve({ error, stdout, stderr })))
    return new Promise((resolve, reject) => {
      if (ret.stdout) {
        cm = 'ffmpeg'
      } else {
        const cfg = Yaml.parse(fs.readFileSync('./config/config/bot.yaml', 'utf8'))
        cm = cfg.ffmpeg_path ? `"${cfg.ffmpeg_path}"` : null
      }

      if (!cm) {
        throw new Error('未检测到 ffmpeg ，无法进行转码，请正确配置环境变量或手动前往 bot.yaml 进行配置')
      }

      exec(`${cm} -i "${input}" -f s16le -ar 48000 -ac 1 "${output}"`, async (error, stdout, stderr) => {
        if (error) {
          common.error('Lain-plugin', `执行错误: ${error}`)
          reject(error)
          return
        }
        resolve()
      }
      )
    })
  }

  /** 转换文本中的URL为图片 */
  async HandleURL (msg) {
    const message = []
    if (msg?.text) msg = msg.text
    if (typeof msg !== 'string') return msg

    /** 需要处理的url */
    let urls = Bot.getUrls(msg, Cfg.WhiteLink)

    let promises = urls.map(link => {
      return new Promise((resolve, reject) => {
        common.mark('Lain-plugin', `url替换：${link}`)
        QrCode.toBuffer(link, {
          errorCorrectionLevel: 'H',
          type: 'png',
          margin: 4,
          text: link
        }, async (err, buffer) => {
          if (err) reject(err)
          const base64 = 'base64://' + buffer.toString('base64')
          const Uint8Array = await common.Rending({ base64, link }, 'QRCode/QRCode')
          message.push(await this.getImage(Uint8Array))
          msg = msg.replace(link, '[链接(请扫码查看)]')
          msg = msg.replace(link.replace(/^http:\/\//g, ''), '[链接(请扫码查看)]')
          msg = msg.replace(link.replace(/^https:\/\//g, ''), '[链接(请扫码查看)]')
          resolve()
        })
      })
    })

    await Promise.all(promises)
    message.unshift({ type: 'text', text: msg })
    return message
  }

  // #QQ群设置模板0 => 关闭
  // #QQ群设置模板1 => 全局，不发送原消息
  // #QQ群设置模板2 => 正则模式，遍历插件，按需替换发送
  // #QQ群设置模板3 => 原样发送并遍历插件，自动补发一条按钮模板消息
  // #QQ群设置模板4 => 超级模板

  /** 转换message */
  async getQQBot (data, e) {
    data = common.array(data)
    let reply
    const text = []
    const image = []
    const message = []
    const Pieces = []

    for (let i of data) {
      switch (i.type) {
        case 'text':
        case 'forward':
          if (i.text.trim()) {
            for (let item of (await this.HandleURL(i.text.trim()))) {
              item.type === 'image' ? image.push(item) : text.push(item.text)
            }
          }
          break
        case 'at':
          if ([1, '1', 4, '4'].includes(e.bot.config.markdown)) text.push(`<@${i.qq || i.id}>`)
          break
        case 'image':
          image.push(await this.getImage(i?.url || i.file))
          break
        case 'video':
          message.push(await this.getVideo(i?.url || i.file))
          break
        case 'record':
          message.push(await this.getAudio(i.file))
          break
        case 'reply':
          reply = i
          break
        case 'ark':
        case 'button':
        case 'markdown':
          message.push(i)
          break
        default:
          message.push(i)
          break
      }
    }

    /** 消息次数 */
    if (text.length) try { common.MsgTotal(this.id, 'QQBot') } catch { }
    if (image.length) try { common.MsgTotal(this.id, 'QQBot', 'image') } catch { }

    switch (e.bot.config.markdown.type) {
      /** 关闭 */
      case 0:
      case '0':
        if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
        if (image.length) message.push(image.shift())
        if (image.length) Pieces.push(...image)
        break
      /** 全局，不发送原消息 */
      case 1:
      case '1':
        /** 返回数组，无需处理，直接发送即可 */
        if (image.length && text.length) {
          Pieces.push(await this.markdown(e, [{ type: 'text', text: text.join('\n') }, ...image]))
        } else if (image.length) {
          Pieces.push(await this.markdown(e, image))
        } else if (text.length) {
          Pieces.push(await this.markdown(e, [{ type: 'text', text: text.join('\n') }]))
        }
        break
      /** 正则模式，遍历插件，按需替换发送 */
      case 2:
      case '2':
        try {
          /** 先走一遍按钮正则，匹配到按钮则修改为markdown */
          const button = await this.button(e)
          if (button && button?.length) {
            const markdown = []
            if (image.length && text.length) {
              /** 返回数组，拆出来和按钮合并 */
              markdown.push(...await this.markdown(e, [{ type: 'text', text: text.join('\n') }, ...image], false))
            } else if (image.length) {
              /** 返回数组，拆出来和按钮合并 */
              markdown.push(...await this.markdown(e, image, false))
            } else if (text.length) {
              /** 返回数组，拆出来和按钮合并 */
              markdown.push(...await this.markdown(e, [{ type: 'text', text: text.join('\n') }], false))
            }
            /** 加入按钮 */
            Pieces.push([...markdown, ...button])
          } else {
            /** 返回数组，无需处理，直接发送即可 */
            if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
            if (text.length) Pieces.push(...text)
            if (image.length) message.push(image.shift())
            if (image.length) Pieces.push(...image)
          }
        } catch (error) {
          logger.error(error)
        }
        break
      /** 原样发送并遍历插件，自动补发一条按钮模板消息 */
      case 3:
      case '3':
        if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
        if (image.length) message.push(image.shift())
        if (image.length) Pieces.push(...image)
        /** 按钮模板 */
        try {
          const button = await this.button(e)
          if (button && button?.length) {
            const markdown = [
              {
                type: 'markdown',
                custom_template_id: e.bot.config.markdown.id,
                params: [{ key: e.bot.config.markdown.text || 'text_start', values: ['\u200B'] }]
              },
              ...button
            ]
            Pieces.push(markdown)
          }
        } catch (error) {
          logger.error(error)
        }
        break
      case 4:
      case '4':
        try {
          /** 返回数组，无需处理，直接发送即可 */
          if (image.length && text.length) {
            Pieces.push(...await Bot.Markdown(e, [{ type: 'text', text: text.join('\n') }, ...image]))
          } else if (image.length) {
            Pieces.push(...await Bot.Markdown(e, image))
          } else if (text.length) {
            Pieces.push(...await Bot.Markdown(e, [{ type: 'text', text: text.join('\n') }]))
          }
        } catch (_err) {
          console.error(_err)
          if (text.length) message.push(text.length < 4 ? text.join('') : text.join('\n'))
          if (image.length) message.push(image.shift())
          if (image.length) Pieces.push(...image)
        }
        break
    }

    /** 合并为一个数组 */
    return { Pieces: message.length ? [message, ...Pieces] : Pieces, reply }
  }

  /** 处理图片 */
  async getImage (file) {
    file = await Bot.FormatFile(file)
    const type = 'image'
    try {
      /** 自定义图床 */
      if (Bot?.imageToUrl) {
        const { width, height, url } = await Bot.imageToUrl(file)
        common.mark('Lain-plugin', `使用自定义图床发送图片：${url}`)
        return { type, file: url, width, height }
      } else if (Bot?.uploadFile) {
        /** 老接口，后续废除 */
        const url = await Bot.uploadFile(file)
        common.mark('Lain-plugin', `使用自定义图床发送图片：${url}`)
        const { width, height } = sizeOf(await Bot.Buffer(file))
        console.warn('[Bot.uploadFile]接口即将废除，请查看文档更换新接口！')
        return { type, file: url, width, height }
      }
    } catch (error) {
      logger.error('自定义服务器调用错误，已跳过')
    }

    try {
      /** QQ图床 */
      const uin = Bot.lain.cfg.QQBotUin
      if (uin) {
        const { width, height, url } = await Bot.uploadQQ(file, uin)
        common.mark('Lain-plugin', `QQ图床上传成功：${url}`)
        return { type, file: url, width, height }
      }
    } catch (error) {
      logger.error('QQ图床调用错误，已跳过：', error)
    }

    /** 公网 */
    const { width, height, url } = await Bot.FileToUrl(file)
    common.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    return { type, file: url, width, height }
  }

  /** 处理视频 */
  async getVideo (file) {
    const type = 'video'
    try {
      /** 自定义接口 */
      if (Bot?.videoToUrl) {
        /** 视频接口 */
        const url = await Bot.videoToUrl(file)
        common.mark('Lain-plugin', `使用自定义服务器发送视频：${url}`)
        return { type, file: url }
      }
    } catch (error) {
      logger.error('自定义视频服务器调用错误，已跳过')
    }

    /** 现成url直接发 */
    if (/^http(s)?:\/\//.test(file)) {
      common.mark('Lain-plugin', `在线视频：${file}`)
      return { type, file }
    }

    /** 公网 */
    const { url } = await Bot.FileToUrl(file, type)
    common.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    return { type, file: url }
  }

  /** 处理语音 */
  async getAudio (file) {
    const type = 'audio'
    const _path = Bot.lain._path + '/../resources/QQBotApi'
    const mp3 = path.join(_path, `${Date.now()}.mp3`)
    const pcm = path.join(_path, `${Date.now()}.pcm`)
    const silk = path.join(_path, `${Date.now()}.silk`)

    /** 保存为MP3文件 */
    fs.writeFileSync(mp3, await Bot.Buffer(file))
    /** mp3 转 pcm */
    await this.runFfmpeg(file, pcm)
    common.mark('Lain-plugin', 'mp3 => pcm 完成!')
    common.mark('Lain-plugin', 'pcm => silk 进行中!')

    /** pcm 转 silk */
    await encodeSilk(fs.readFileSync(pcm), 48000)
      .then((silkData) => {
        /** 转silk完成，保存 */
        fs.writeFileSync(silk, silkData?.data || silkData)
        /** 删除初始mp3文件 */
        fs.unlink(file, () => { })
        /** 删除pcm文件 */
        fs.unlink(pcm, () => { })
        common.mark('Lain-plugin', 'pcm => silk 完成!')
      })
      .catch((err) => {
        common.error('Lain-plugin', `转码失败${err}`)
        return { type: 'text', text: `转码失败${err}` }
      })

    try {
      /** 自定义语音接口 */
      if (Bot?.audioToUrl) {
        const url = await Bot.audioToUrl(`file://${silk}`)
        common.mark('Lain-plugin', `使用自定义服务器发送语音：${url}`)
        return { type, file: url }
      }
    } catch (error) {
      logger.error('自定义服务器调用错误，已跳过')
    }

    /** 公网 */
    const { url } = await Bot.FileToUrl(`file://${silk}`, type)
    common.mark('Lain-plugin', `使用公网临时服务器：${url}`)
    return { type, file: url }
  }

  /** 转换为全局md */
  async markdown (e, data, Button = true) {
    let markdown = {
      type: 'markdown',
      custom_template_id: e.bot.config.markdown.id,
      params: []
    }

    for (let i of data) {
      switch (i.type) {
        case 'text':
          markdown.params.push({ key: e.bot.config.markdown.text || 'text_start', values: [i.text.replace(/\n/g, '\r')] })
          break
        case 'image':
          markdown.params.push({ key: e.bot.config.markdown.img_url || 'img_url', values: [i.file] })
          markdown.params.push({ key: e.bot.config.markdown.img_dec || 'img_dec', values: [`text #${i.width}px #${i.height}px`] })
          break
        default:
          break
      }
    }
    markdown = [markdown]
    /** 按钮 */
    if (Button) {
      const button = await this.button(e)
      if (button && button?.length) markdown.push(...button)
    }
    return markdown
  }

  /** 按钮添加 */
  async button (e) {
    try {
      for (let p of Button) {
        for (let v of p.plugin.rule) {
          const regExp = new RegExp(v.reg)
          if (regExp.test(e.msg)) {
            const button = await p[v.fnc](e)
            /** 无返回不添加 */
            if (button) return [...(Array.isArray(button) ? button : [button])]
            return false
          }
        }
      }
    } catch (error) {
      common.error('Lain-plugin', error)
      return false
    }
  }

  /** 发送好友消息 */
  async sendFriendMsg (userId, data) {
    userId = userId.split('-')?.[1] || userId
    /** 构建一个普通e给按钮用 */
    let e = {
      bot: Bot[this.id],
      user_id: userId,
      message: common.array(data)
    }

    e.message.forEach(i => { if (i.type === 'text') e.msg = (e.msg || '') + (i.text || '').trim() })
    const { Pieces, reply } = await this.getQQBot(data, e)
    Pieces.forEach(i => {
      if (reply) i = Array.isArray(i) ? [...i, reply] : [i, reply]
      this.bot.sendPrivateMessage(userId, i, this.bot)
    })
  }

  /** 发送群消息 */
  async sendGroupMsg (groupID, data) {
    /** 获取正确的id */
    groupID = groupID.split('-')?.[1] || groupID
    /** 构建一个普通e给按钮用 */
    let e = {
      bot: Bot[this.id],
      group_id: groupID,
      user_id: 'QQBot',
      message: common.array(data)
    }

    e.message.forEach(i => { if (i.type === 'text') e.msg = (e.msg || '') + (i.text || '').trim() })
    const { Pieces, reply } = await this.getQQBot(data, e)
    Pieces.forEach(i => {
      if (reply) i = Array.isArray(i) ? [...i, reply] : [i, reply]
      this.bot.sendGroupMessage(groupID, i, this.bot)
    })
  }

  /** 快速回复 */
  async reply (e, msg) {
    let res
    let { Pieces } = await this.getQQBot(msg, e)

    for (let i of Pieces) {
      try {
        if (!i || (Array.isArray(i) && !i.length)) continue
        res = await e.sendMsg.call(e.data, i)
      } catch (error) {
        common.error(e.self_id, JSON.stringify(error))
        let data = error?.response?.data
        /** 全局模板的情况下发送失败转为发送普通消息 */
        if (e.bot.config?.markdownType != 0) {
          try {
            res = await e.sendMsg.call(e.data, i)
          } catch (err) {
            data = error?.response?.data || err
            common.error(e.self_id, data)
          }
        }

        if (data) {
          data = `\n发送消息失败：\ncode:：${error.response.data.code}\nmessage：${error.response.data.message}`
        } else {
          data = error?.message || error
        }
        res = await e.sendMsg.call(e.data, data)
      }
    }

    res = {
      ...res,
      rand: 1,
      time: Date.now(),
      message_id: res?.msg_id
    }
    common.debug('Lain-plugin', res)
    return res
  }
}
