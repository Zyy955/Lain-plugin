import SendMsg from './sendMsg.js'
import common from '../../lib/common/common.js'
import qg_log from './log.js'
import message from './message.js'
import Cfg from '../../lib/config/config.js'
import { createOpenAPI, createWebsocket } from 'qq-guild-bot'

export default class guild {
  /** 传入基本配置 */
  constructor (config, add) {
    /** 兼容通用配置 */
    config.appID = config.appid
    /** 开发者id */
    this.id = `qg_${config.appid}`
    /** 机器人令牌(token) */
    this.token = config.token
    /** 沙盒模式 */
    this.sandbox = config.sandbox
    /** 是否接收全部消息 */
    this.allMsg = config.allMsg
    /** 当前机器人配置 */
    this.config = config
    /** 被动连接 */
    if (!add) this.StartBot()
  }

  /** 创建连接 */
  async StartBot () {
    /** 基础监听事件 */
    const intents = ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGE']
    /** 接收全部消息 */
    this.allMsg ? intents.push('GUILD_MESSAGES') : intents.push('PUBLIC_GUILD_MESSAGES')
    /** 添加监听事件 */
    this.config.intents = intents
    /** 注册Bot */
    Bot[this.id] = this.config
    /** 注册配置文件 */
    Bot[this.id].config = this.config
    /** 创建 client */
    Bot[this.id].client = createOpenAPI(Bot[this.id])
    /** 创建 websocket 连接 */
    Bot[this.id].ws = createWebsocket(Bot[this.id])
    /** 建立ws链接 监听bot频道列表、频道资料、列表变化事件 */
    Bot[this.id].ws.on('GUILDS', (e) => { e.id = this.id, this.event(e) })
    /** 建立ws链接 监听频道成员变化事件 */
    Bot[this.id].ws.on('GUILD_MEMBERS', (e) => { e.id = this.id, this.event(e) })
    /** 建立ws链接 监听私信消息 */
    Bot[this.id].ws.on('DIRECT_MESSAGE', (e) => { e.id = this.id, this.event(e) })
    /** 建立ws链接 监听私域事件 */
    Bot[this.id].ws.on('GUILD_MESSAGES', (e) => { e.id = this.id, this.event(e) })
    /** 建立ws链接 监听公域事件 */
    Bot[this.id].ws.on('PUBLIC_GUILD_MESSAGES', (e) => { e.id = this.id, this.event(e) })
    /** 建立ws链接 监听表情动态事件 */
    Bot[this.id].ws.on('GUILD_MESSAGE_REACTIONS', (e) => { e.id = this.id, this.event(e) })

    /** 在this保存一下 */
    this.client = Bot[this.id].client
    /** 保存bot的信息 */
    await this.me(this.id)
    /** 告知用户已连接成功 */
    common.info(this.id, '连接成功，正在加载资源中...')
    /** 延迟下 */
    await common.sleep(200)
    /** 获取一些基本信息 */
    await this.guilds(this.id)
    /** 告知用户加载资源完成 */
    common.info(this.id, '加载资源完毕...')
    return `QQGuild：[${Bot[this.id].nickname}(${this.id})] 连接成功!`
  }

  /** 保存bot的信息 */
  async me () {
    const bot = (await this.client.meApi.me()).data
    /** 机器人名称 */
    this.name = bot.username
    /** 机器人的频道id */
    this.tiny_id = bot.id

    /** 构建基本参数 */
    Bot[this.id] = {
      ...Bot[this.id],
      adapter: 'QQGuild',
      fl: new Map(),
      gl: new Map(),
      tl: new Map(),
      gml: new Map(),
      guilds: new Map(),
      id: bot.id,
      name: bot.username,
      uin: this.id,
      tiny_id: bot.id,
      nickname: bot.username,
      avatar: bot.avatar,
      stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
      apk: Bot.lain.adapter.QQGuild.apk,
      version: Bot.lain.adapter.QQGuild.version,
      /** 转发 */
      makeForwardMsg: async (forwardMsg) => {
        return await common.makeForwardMsg(forwardMsg)
      },
      pickGroup: (groupId, msg_id = false) => {
        const [guild_id, channel_id] = groupId.replace('qg_', '').split('-')
        return {
          sendMsg: async (msg, quote = false) => {
            return await (new SendMsg(this.id, { guild_id, channel_id }, 'MESSAGE_CREATE', msg_id)).message(msg, quote)
          },
          /** 转发 */
          makeForwardMsg: async (forwardMsg) => {
            return await common.makeForwardMsg(forwardMsg)
          }
        }
      },
      getGroupMemberInfo: async function (group_id, user_id) {
        return {
          group_id,
          user_id,
          nickname: this.name,
          card: this.name,
          sex: 'female',
          age: 6,
          join_time: '',
          last_sent_time: '',
          level: 1,
          role: 'member',
          title: '',
          title_expire_time: '',
          shutup_time: 0,
          update_time: '',
          area: '南极洲',
          rank: '潜水'
        }
      },
      getFriendMap: () => Bot[this.id].fl,
      getGroupList: () => Bot[this.id].gl,
      getGuildList: () => Bot[this.id].tl,
      readMsg: async () => await common.recvMsg(this.id, 'QQGuild', true),
      MsgTotal: async (type) => await common.MsgTotal(this.id, 'QQGuild', type, true)
    }

    /** 公域私域 */
    Bot[this.id].version.id = Bot[this.id].allMsg ? '私域' : '公域'

    if (!Bot.adapter.includes(this.id)) Bot.adapter.push(this.id)
  }

  /** 获取一些基本信息 */
  async guilds () {
    /** 加载机器人所在频道、将对应的子频道信息存入变量中用于后续调用 */
    const meGuilds = (await this.client.meApi.meGuilds()).data

    for (let qg of meGuilds) {
      /** 获取对应频道的基础信息 */
      let admin = false
      try {
        const Member = (await this.client.guildApi.guildMember(qg.id, this.tiny_id)).data
        admin = !!Member.roles.includes('2')
      } catch (err) {
        common.warn(this.id, `Bot无法在频道 ${qg.id} 中读取基础信息，请给予权限...错误信息：${err.message}`)
      }

      /** 保存所有bot的频道列表 */
      Bot.lain.guilds[qg.id] = {
        ...qg,
        admin,
        id: this.id,
        channels: {}
      }

      /** 按照icqq标准格式保存频道列表 */
      Bot[this.id].guilds.set(qg.id, qg)

      /** 延迟下 */
      await common.sleep(200)

      try {
        /** 添加频道列表到Bot.gl中 */
        const channelList = (await this.client.channelApi.channels(qg.id)).data
        for (const i of channelList) {
          /** 存一份给锅巴用 */
          Bot.gl.set(`qg_${i.guild_id}-${i.id}`, {
            id: this.id,
            group_id: `qg_${i.guild_id}-${i.id}`,
            group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
            guild_id: i.guild_id,
            guild_name: qg.name,
            guild_type: i.type,
            channel_id: i.id,
            channel_name: i.name
          })
          /** 存对应uin */
          Bot[this.id].gl.set(`qg_${i.guild_id}-${i.id}`, {
            id: this.id,
            group_id: `qg_${i.guild_id}-${i.id}`,
            group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
            guild_id: i.guild_id,
            guild_name: qg.name,
            guild_type: i.type,
            channel_id: i.id,
            channel_name: i.name
          })
          /** 子频道id和对应名称 */
          Bot.lain.guilds[i.guild_id].channels[i.id] = i.name || i.id
        }
      } catch (err) {
        common.warn(this.id, `Bot无法在频道 ${qg.id} 中读取子频道列表，请给予权限...错误信息：${err.message}`)
      }
      await common.init('Lain:restart:QQGuild')
    }
  }

  /** 根据对应事件进行对应处理 */
  async event (data) {
    switch (data.eventType) {
      /** 私域 */
      case 'MESSAGE_CREATE':
        await this.permissions(data)
        break
      /** 私信 */
      case 'DIRECT_MESSAGE_CREATE':
        await this.permissions(data, '私信')
        break
      /** 公域事件 仅接收@机器人消息 */
      case 'AT_MESSAGE_CREATE':
        await this.permissions(data)
        break
      /** 其他事件不需要给云崽、直接单独处理即可 */
      default:
        await (new qg_log(this.id)).event(data)
        break
    }
  }

  async permissions (data, type = '') {
    /** 解除私信 */
    if (data?.msg?.content?.includes('#QQ频道解除私信')) {
      return await this.Sendprivate(data)
    }
    const { guild_id, channel_id } = data.msg

    /** 过频道黑白名单结果 */
    const checkBlack = this.checkBlack(`qg_${guild_id}`, channel_id)
    /** 转换消息 */
    const e = new message(this.id, data)

    if (checkBlack) {
      data.checkBlack = true
      return await Bot.emit('message', await e.msg(type))
    } else {
      data.checkBlack = false
      return await e.msg(type)
    }
  }

  /** 判断频道黑白名单 */
  checkBlack (guild_id, channel_id) {
    const config = Cfg.QQGuild(guild_id)
    /** 过白名单频道 */
    if (Array.isArray(config.whiteGuild) && config.whiteGuild.length > 0) {
      return config.whiteGuild.includes(String(guild_id))
    }
    /** 过黑名单频道 */
    if (Array.isArray(config.blackGuild) && config.blackGuild.length > 0) {
      return !config.blackGuild.includes(String(guild_id))
    }

    /** 过白名单子频道 */
    if (Array.isArray(config.whiteChannel) && config.whiteChannel.length > 0) {
      return config.whiteChannel.includes(String(channel_id)) || config.whiteChannel.includes(Number(channel_id))
    }
    /** 过黑名单子频道 */
    if (Array.isArray(config.blackChannel) && config.blackChannel.length > 0) {
      return !config.blackChannel.includes(String(channel_id)) || !config.blackChannel.includes(Number(channel_id))
    }
    return true
  }

  /** 发送主动消息 解除私信限制 */
  Sendprivate = async (data) => {
    const { msg } = data
    const new_msg = {
      source_guild_id: msg.guild_id,
      recipient_id: msg.author.id
    }
    const _data = await Bot[this.id].client.directMessageApi.createDirectMessage(new_msg)
    const hi = 'Lain-plugin：你好~'
    common.info(this.id, `发送私信消息：${hi}`)
    await Bot[this.id].client.directMessageApi.postDirectMessage(_data.data.guild_id, { content: hi })
  }
}
