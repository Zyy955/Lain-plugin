import fs from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws'
import common from '../../model/common.js'
import api from './api.js'
import { faceMap, pokeMap } from '../../model/shamrock/face.js'

class Shamrock {
  constructor (bot, request) {
    /** 存一下 */
    bot.request = request
    /** 机器人QQ号 */
    this.id = Number(request.headers['x-self-id'])
    /** Shamrock版本 */
    this.version = request.headers['user-agent']
    /** QQ登录协议版本 */
    this.QQVersion = request.headers['x-qq-version']
    /** ws */
    this.bot = bot
    /** 监听事件 */
    this.bot.on('message', (data) => this.event(data))
    /** 监听连接关闭事件 */
    bot.on('close', () => logger.warn(`[Lain-plugin] [${this.version}，${this.QQVersion}] QQ ${this.id} 连接已断开`))
    /** 主动请求后得到的响应 */
    Bot.echo = new Map()
  }

  /** 收到请求 */
  async event (data) {
    /** debug日志 */
    common.debug(this.id, '[ws] received -> ', data)
    /** 解析得到的JSON */
    data = JSON.parse(data)
    /** 带echo事件为主动请求得到的响应，另外保存 */
    if (data?.echo) return Bot.echo.set(data.echo, data)
    try {
      /** 处理事件 */
      try { this[data?.post_type](data) } catch { logger.error(`[Shamrock][未知事件] ${JSON.stringify(data)}`) }
    } catch (error) {
      /** 处理错误打印日志 */
      logger.error('[Shamrock]事件处理错误', error)
      logger.mark('[Shamrock]事件处理错误', data)
    }
  }

  /** 元事件 */
  async meta_event (data) {
    switch (data.meta_event_type) {
      /** 生命周期 */
      case 'lifecycle':
        this.LoadBot()
        common.info('Lain-plugin', `[${this.version}，${this.QQVersion}] QQ ${this.id} 建立连接成功，正在加载资源中`)
        break
      /** 心跳 */
      case 'heartbeat':
        common.debug('Lain-plugin', `[${this.version}，${this.QQVersion}] QQ ${this.id} 收到心跳：${data.status['qq.status']}`)
        break
      default:
        logger.error(`[Shamrock][未知事件] ${JSON.stringify(data)}`)
        break
    }
  }

  /** 消息事件 */
  async message (data) {
    /** 转置消息后给喵崽 */
    await Bot.emit('message', await this.ICQQEvent(data))
  }

  /** 自身消息事件 */
  async message_sent (data) {
    data.post_type = 'message'
    /** 屏蔽由喵崽处理过后发送后的消息 */
    await common.sleep(1500)
    if (await redis.get(`Shamrock:${this.id}:${data.message_id}`)) return
    /** 转置消息后给喵崽 */
    await Bot.emit('message', await this.ICQQEvent(data))
  }

  /** 通知事件 */
  async notice (data) {
    /** 啊啊啊，逼死强迫症 */
    data.post_type = 'notice';
    (async () => {
      if (['group_increase', 'group_decrease', 'group_admin'].includes(data.notice_type)) {
        // 加载或刷新该群的信息
        let group = await api.get_group_info(this.id, data.group_id, true)
        if (group?.group_id) {
          Bot.gl.set(data.group_id, group)
          Bot[this.id].gl.set(data.group_id, group)
          // 加载或刷新该群的群成员列表
          await Bot[this.id]._loadGroupMemberList(data.group_id, this.id)
        }
      }
    })().catch(common.error)
    switch (data.notice_type) {
      case 'group_recall':
        data.notice_type = 'group'
        data.sub_type = 'recall'
        if (data.operator_id === data.user_id) {
          common.info(this.id, `群消息撤回：[${data.group_id}，${data.user_id}] ${data.message_id}`)
        } else {
          common.info(this.id, `群消息撤回：[${data.group_id}]${data.operator_id} 撤回 ${data.user_id}的消息 ${data.message_id} `)
        }
        break
      case 'group_increase': {
        data.notice_type = 'group'
        let subType = data.sub_type
        data.sub_type = 'increase'
        data.user_id = data.target_id
        if (this.id === data.user_id) {
          common.info(this.id, `机器人加入群聊：[${data.group_id}}]`)
        } else {
          switch (subType) {
            case 'invite': {
              common.info(this.id, `[${data.operator_id}]邀请[${data.user_id}]加入了群聊[${data.group_id}] `)
              break
            }
            default: {
              common.info(this.id, `新人${data.user_id}加入群聊[${data.group_id}] `)
            }
          }
        }
        break
      }
      case 'group_decrease': {
        data.notice_type = 'group'
        data.sub_type = 'decrease'
        data.user_id = data.target_id
        if (this.id === data.user_id) {
          common.info(this.id, data.operator_id
            ? `机器人被[${data.operator_id}]踢出群聊：[${data.group_id}}]`
            : `机器人退出群聊：[${data.group_id}}]`)
          // 移除该群的信息
          Bot.gl.delete(data.group_id)
          Bot[this.id].gl.delete(data.group_id)
          Bot[this.id].gml.delete(data.group_id)
        } else {
          common.info(this.id, data.operator_id
            ? `成员[${data.user_id}]被[${data.operator_id}]踢出群聊：[${data.group_id}}]`
            : `成员[${data.user_id}]退出群聊[${data.group_id}}]`)
        }
        break
      }
      case 'group_admin': {
        data.notice_type = 'group'
        data.set = data.sub_type === 'set'
        data.sub_type = 'admin'
        data.user_id = data.target_id
        if (this.id === data.user_id) {
          let gml = await Bot[this.id].gml.get(data.group_id)
          gml[this.id] = { ...gml[this.id] }
          if (data.set) {
            gml[this.id].role = 'admin'
            common.info(this.id, `机器人[${this.id}]在群[${data.group_id}]被设置为管理员`)
          } else {
            gml[this.id].role = 'member'
            common.info(this.id, `机器人[${this.id}]在群[${data.group_id}]被取消管理员`)
          }
          Bot[this.id].gml.set(data.group_id, { ...gml })
        } else {
          let gml = await Bot[this.id].gml.get(data.group_id)
          gml[data.target_id] = { ...gml[data.target_id] }
          if (data.set) {
            gml[data.target_id].role = 'admin'
            common.info(this.id, `成员[${data.target_id}]在群[${data.group_id}]被设置为管理员`)
          } else {
            gml[data.target_id].role = 'member'
            common.info(this.id, `成员[${data.target_id}]在群[${data.group_id}]被取消管理员`)
          }
          Bot[this.id].gml.set(data.group_id, { ...gml })
        }
        break
      }
      case 'group_ban': {
        data.notice_type = 'group'
        if (data.sub_type === 'lift_ban') {
          data.sub_type = 'ban'
          data.duration = 0
        } else {
          data.sub_type = 'ban'
        }
        if (this.id === data.target_id) {
          common.info(this.id, data.duration === 0
            ? `机器人[${this.id}]在群[${data.group_id}]被解除禁言`
            : `机器人[${this.id}]在群[${data.group_id}]被禁言${data.duration}秒`)
        } else {
          common.info(this.id, data.duration === 0
            ? `成员[${data.target_id}]在群[${data.group_id}]被解除禁言`
            : `成员[${data.target_id}]在群[${data.group_id}]被禁言${data.duration}秒`)
        }
        // 异步加载或刷新该群的群成员列表以更新禁言时长
        Bot[this.id]._loadGroupMemberList(data.group_id, this.id)
        break
      }
      case 'notify':
        switch (data.sub_type) {
          case 'poke': {
            let action = data.poke_detail?.action || '戳了戳'
            let suffix = data.poke_detail?.suffix || ''
            common.info(this.id, `[${data.operator_id}]${action}[${data.target_id}]${suffix}`)
            break
          }
          case 'title': {
            common.info(this.id, `群[${data.group_id}]成员[${data.user_id}]获得头衔[${data.title}]`)
            let gml = Bot[this.id].gml.get(data.group_id)
            let user = gml[data.user_id]
            user.title = data.title
            gml[data.user_id] = user
            Bot[this.id].gml.set(data.group_id, gml)
            break
          }
          default:
        }
        // const time = Date.now()
        // if (time - pokeCD < 1500) return false
        // pokeCD = time
        break
      case 'friend_add':
        // shamrock暂未实现
        break
      case 'essence': {
        // todo
        common.info(this.id, `群[${data.group_id}]成员[${data.sender_id}]的消息[${data.message_id}]被[${data.operator_id}]${data.sub_type === 'add' ? '设为' : '移除'}精华`)
        break
      }
      case 'group_card': {
        common.info(this.id, `群[${data.group_id}]成员[${data.user_id}]群名片变成为${data.card_new}`)
        let gml = Bot[this.id].gml.get(data.group_id)
        let user = gml[data.user_id]
        user.card = data.card_new
        gml[data.user_id] = user
        Bot[this.id].gml.set(data.group_id, gml)
        break
      }
      default:
    }
    return await Bot.emit('notice.group', await this.ICQQEvent(data))
  }

  /** 请求事件 */
  async request (data) {
    data.post_type = 'request'
    switch (data.request_type) {
      case 'group': {
        data.tips = data.comment
        if (data.sub_type === 'add') {
          common.info(this.id, `[${data.user_id}]申请入群[${data.group_id}]: ${data.tips}`)
        } else {
          // invite
          common.info(this.id, `[${data.user_id}]邀请机器人入群[${data.group_id}]: ${data.tips}`)
        }
        break
      }
      case 'friend': {
        data.sub_type = 'add'
        common.info(this.id, `[${data.user_id}]申请加机器人[${this.id}]好友: ${data.comment}`)
        break
      }
    }
    data.post_type = 'request'
    switch (data.request_type) {
      case 'group': {
        data.tips = data.comment
        if (data.sub_type === 'add') {
          common.info(this.id, `[${data.user_id}]申请入群[${data.group_id}]: ${data.tips}`)
        } else {
          // invite
          common.info(this.id, `[${data.user_id}]邀请机器人入群[${data.group_id}]: ${data.tips}`)
        }
        break
      }
      case 'friend': {
        data.sub_type = 'add'
        common.info(this.id, `[${data.user_id}]申请加机器人[${this.id}]好友: ${data.comment}`)
        break
      }
    }
    return await Bot.emit('request', await this.ICQQEvent(data))
  }

  /** 注册Bot */
  async LoadBot () {
    /** 构建基本参数 */
    Bot[this.id] = {
      ws: this.bot,
      bkn: 0,
      fl: new Map(),
      gl: new Map(),
      tl: new Map(),
      gml: new Map(),
      guilds: new Map(),
      adapter: 'shamrock',
      uin: this.id,
      tiny_id: String(this.id),
      avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${this.id}`,
      stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
      apk: { display: this.QQVersion.split(' ')[0], version: this.QQVersion.split(' ')[1] },
      version: { id: 'shamrock', name: '三叶草', version: this.version.replace('Shamrock/', '') },
      pickMember: (group_id, user_id) => this.pickMember(group_id, user_id),
      pickUser: (user_id) => this.pickFriend(Number(user_id)),
      pickFriend: (user_id) => this.pickFriend(Number(user_id)),
      pickGroup: (group_id) => this.pickGroup(Number(group_id)),
      setEssenceMessage: async (msg_id) => await this.setEssenceMessage(msg_id),
      sendPrivateMsg: async (user_id, msg) => await this.sendFriendMsg(Number(user_id), msg),
      getGroupMemberInfo: async (group_id, user_id, no_cache) => await this.getGroupMemberInfo(Number(group_id), Number(user_id), no_cache),
      removeEssenceMessage: async (msg_id) => await this.removeEssenceMessage(msg_id),
      makeForwardMsg: async (message) => await common.makeForwardMsg(message, true),
      getMsg: (msg_id) => '',
      quit: (group_id) => this.quit(group_id),
      getFriendMap: () => Bot[this.id].fl,
      getGroupList: () => Bot[this.id].gl,
      getGuildList: () => Bot[this.id].tl,
      getMuteList: async (group_id) => await this.getMuteList(group_id),
      getChannelList: async (guild_id) => await this.getChannelList(guild_id),
      _loadGroup: this.loadGroup,
      _loadGroupMemberList: this.loadGroupMemberList,
      _loadFriendList: this.loadFriendList,
      _loadAll: this.LoadAll,
      readMsg: async () => await common.recvMsg(this.id, 'shamrock', true),
      MsgTotal: async (type) => await common.MsgTotal(this.id, 'shamrock', type, true),
      api: new Proxy(api, {
        get: (target, prop) => {
          try {
            if (typeof target[prop] === 'function') {
              return (...args) => target[prop](this.id, ...args)
            } else {
              return target[prop]
            }
          } catch (error) {
            logger.error(error)
          }
        }
      })
    }

    /** 重启 */
    await common.init('Lain:restart:shamrock')
    /** 保存uin */
    if (!Bot.adapter.includes(this.id)) Bot.adapter.push(this.id)
    /** 加载缓存资源 */
    this.LoadAll()
  }

  /** 加载缓存资源 */
  async LoadAll () {
    /** 获取bot自身信息 */
    const info = await api.get_login_info(this.id)
    Bot[this.id].nickname = info?.nickname || ''
    let _this = this
    await Promise.all([
      // 加载群信息
      (async () => {
        // 加载群列表
        let groupList = await _this.loadGroup()
        // 加载群员
        await Promise.all(groupList.map(async (group, index) => {
          await common.sleep(50 * Math.floor(index / 10))
          await _this.loadGroupMemberList(group.group_id)
        }))
      })(),
      // 加载好友信息
      _this.loadFriendList()
    ])

    // let { token } = await api.get_csrf_token(uin, "qun.qq.com")
    try {
      let { cookies } = await api.get_cookies(this.id)
      if (cookies) {
        let match = cookies.match(/skey=([^;]+)/)
        if (match) {
          let skey = match[1]
          let n = 5381
          for (let e = skey || '', r = 0, o = e.length; r < o; ++r) {
            n += (n << 5) + e.charAt(r).charCodeAt(0)
          }
          Bot[this.id].bkn = 2147483647 & n
        }
      }
    } catch (err) {
      common.warn(this.id, 'Shamrock获取bkn失败。')
    }

    Bot[this.id].cookies = {}
    let domains = ['aq.qq.com', 'buluo.qq.com', 'connect.qq.com', 'docs.qq.com', 'game.qq.com', 'gamecenter.qq.com', 'haoma.qq.com', 'id.qq.com', 'kg.qq.com', 'mail.qq.com', 'mma.qq.com', 'office.qq.com', 'openmobile.qq.com', 'qqweb.qq.com', 'qun.qq.com', 'qzone.qq.com', 'ti.qq.com', 'v.qq.com', 'vip.qq.com', 'y.qq.com', '']
    for (let domain of domains) {
      api.get_cookies(this.id, domain).then(ck => {
        ck = ck?.cookies
        if (ck) {
          try {
            // 适配椰奶逆天的ck转JSON方法
            ck = ck.trim().replace(/\w+=;/g, '').replace(/\w+=$/g, '')
          } catch (err) { }
        }
        Bot[this.id].cookies[domain] = ck
      }).catch(error => {
        common.debug(this.id, `${domain} 获取cookie失败：${error}`)
      })
    }

    const log = `Shamrock加载资源成功：加载了${Bot[this.id].fl.size}个好友，${Bot[this.id].gl.size}个群。`
    common.info(this.id, log)
    return log
  }

  /** 群列表 */
  async loadGroup (id = this.id) {
    let groupList
    for (let retries = 0; retries < 5; retries++) {
      groupList = await api.get_group_list(id)
      if (!(groupList && Array.isArray(groupList))) {
        common.error(this.id, `Shamrock群列表获取失败，正在重试：${retries + 1}`)
      }
      await common.sleep(50)
    }

    if (groupList && typeof groupList === 'object') {
      for (const i of groupList) {
        /** 给锅巴用 */
        Bot.gl.set(i.group_id, i)
        /** 自身参数 */
        Bot[id].gl.set(i.group_id, i)
      }
    }
    common.debug(id, '加载群列表完成')
    return groupList
  }

  /** 获取群成员，缓存到gml中 */
  async loadGroupMemberList (groupId, id = this.id) {
    try {
      let gml = {}
      let memberList = await api.get_group_member_list(id, groupId)
      for (const user of memberList) {
        user.card = user.nickname
        gml[user.user_id] = user
      }
      Bot[id].gml.set(groupId, gml)
      common.debug(id, `加载[${groupId}]群成员完成`)
    } catch (error) { }
  }

  /** 好友列表 */
  async loadFriendList (id = this.id) {
    let friendList
    for (let retries = 0; retries < 5; retries++) {
      friendList = await api.get_friend_list(id)
      if (!(friendList && Array.isArray(friendList))) {
        common.error(this.id, `Shamrock好友列表获取失败，正在重试：${retries + 1}`)
      }
      await common.sleep(50)
    }

    /** 好友列表获取失败 */
    if (!friendList || !(typeof friendList === 'object')) {
      common.error(this.id, 'Shamrock好友列表获取失败次数过多，已停止重试')
    }

    if (friendList && typeof friendList === 'object') {
      for (let i of friendList) {
        i.nickname = i.user_name || i.user_displayname || i.user_remark
        /** 给锅巴用 */
        Bot.fl.set(i.user_id, i)
        /** 自身参数 */
        Bot[id].fl.set(i.user_id, i)
      }
    }
    common.debug(id, '加载好友列表完成')
  }

  /** 群对象 */
  pickGroup (group_id) {
    const name = Bot[this.id].gl.get(group_id)?.group_name || group_id
    const is_admin = Bot[this.id].gml.get(group_id)?.[this.id]?.role === 'admin'
    const is_owner = Bot[this.id].gml.get(group_id)?.[this.id]?.role === 'owner'
    return {
      name,
      is_admin: is_owner || is_admin,
      is_owner,
      /** 发送消息 */
      sendMsg: async (msg) => await this.sendGroupMsg(group_id, msg),
      /** 撤回消息 */
      recallMsg: async (msg_id) => await this.recallMsg(msg_id),
      /** 制作转发 */
      makeForwardMsg: async (message) => await this.makeForwardMsg(message),
      /** 戳一戳 */
      pokeMember: async (operator_id) => await api.group_touch(this.id, group_id, operator_id),
      /** 禁言 */
      muteMember: async (user_id, time) => await api.set_group_ban(this.id, group_id, Number(user_id), Number(time)),
      /** 全体禁言 */
      muteAll: async (type) => await api.set_group_whole_ban(this.id, group_id, type),
      /** 设置群名称 */
      setName: async (name) => await api.set_group_name(this.id, group_id, name),
      /** 退群 */
      quit: async () => await api.set_group_leave(this.id, group_id),
      /** 设置管理 */
      setAdmin: async (qq, type) => await api.set_group_admin(this.id, group_id, qq, type),
      /** 踢 */
      kickMember: async (qq, reject_add_request = false) => await api.set_group_kick(this.id, group_id, qq, reject_add_request),
      /** 头衔 **/
      setTitle: async (qq, title, duration) => await api.set_group_special_title(this.id, group_id, qq, title),
      /** 修改群名片 **/
      setCard: async (qq, card) => await api.set_group_card(this.id, group_id, qq, card),
      pickMember: (id) => this.pickMember(group_id, id),
      /** 获取群成员列表 */
      getMemberMap: async () => await this.getMemberMap(group_id),
      /** 设置精华 */
      setEssenceMessage: async (msg_id) => await this.setEssenceMessage(msg_id),
      /** 移除群精华消息 **/
      removeEssenceMessage: async (msg_id) => await this.removeEssenceMessage(msg_id),
      /** 上传群文件 */
      sendFile: async (filePath) => await this.upload_group_file(group_id, filePath),
      /** 打卡 */
      sign: async () => await api.send_group_sign(this.id, group_id),
      /** 音乐分享 */
      shareMusic: async (platform, id) => await this.shareMusic(group_id, platform, id),
      /** 获取文件下载地址 */
      getFileUrl: async (fid) => await this.getFileUrl(fid),
      /**
       * 获取聊天历史记录
       * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
       * @param num 数量
       * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
       * @return {Promise<Awaited<unknown>[]>}
       */
      getChatHistory: async (msg_id, num, reply) => {
        let { messages } = await api.get_group_msg_history(this.id, group_id, num, msg_id)
        let group = Bot[this.id].gl.get(group_id)
        messages = messages.map(async m => {
          m.group_name = group?.group_name || group_id
          m.atme = !!m.message.find(msg => msg.type === 'at' && msg.data?.qq == this.id)
          let result = await this.getMessage(m.message, null, reply)
          m = Object.assign(m, result)
          return m
        })
        return Promise.all(messages)
      }
    }
  }

  /** 好友对象 */
  pickFriend (user_id) {
    return {
      sendMsg: async (msg) => await this.sendFriendMsg(user_id, msg, false),
      recallMsg: async (msg_id) => await this.recallMsg(msg_id),
      makeForwardMsg: async (message) => await this.makeForwardMsg(message),
      getAvatarUrl: (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`,
      sendFile: async (filePath) => await this.upload_private_file(user_id, filePath),
      /** 获取文件下载地址 */
      getFileUrl: async (fid) => await this.getFileUrl(fid),
      /**
       * 获取私聊聊天记录
       * @param msg_id 起始消息的message_id（默认为0，表示从最后一条发言往前）
       * @param num 数量
       * @param reply 是否展开回复引用的消息(source)（实测数量大的时候耗时且可能出错）
       * @return {Promise<Awaited<unknown>[]>}
       */
      getChatHistory: async (msg_id, num, reply) => {
        let { messages } = await api.get_history_msg(this.id, 'private', user_id, null, num, msg_id)
        messages = messages.map(async m => {
          let result = await this.getMessage(m.message, null, reply)
          m = Object.assign(m, result)
          return m
        })
        return Promise.all(messages)
      }
    }
  }

  /** 群员对象 */
  pickMember (group_id, user_id, refresh = false, cb = () => { }) {
    if (!refresh) {
      /** 取缓存！！！别问为什么，因为傻鸟同步 */
      let member = Bot[this.id].gml.get(group_id)?.[user_id] || {}
      member.info = { ...member }
      return member
    } else {
      api.get_group_member_info(this.id, group_id, user_id, true).then(res => {
        if (typeof cb === 'function') {
          cb(res)
        }
      })
      return {}
    }
  }

  /** 群成员列表 */
  async getMemberMap (group_id) {
    let group_Member = Bot[this.id].gml.get(group_id)
    if (group_Member && Object.keys(group_Member) > 0) return group_Member
    group_Member = new Map()
    let member_list = await api.get_group_member_list(this.id, group_id)
    member_list.forEach(user => {
      group_Member.set(user.user_id, user)
    })
    return group_Member
  }

  /** 频道成员列表 */
  getChannelList (guild_id) {
    return {
      channel_id: 'string',
      channel_name: 'string',
      channel_type: 'ChannelType',
      guild_id: 'string'
    }
  }

  /** 上传群文件 */
  async upload_group_file (group_id, filePath) {
    if (!fs.existsSync(filePath)) return true
    /** 先传到shamrock... */
    const base64 = 'base64://' + fs.readFileSync(filePath).toString('base64')
    const { file } = await api.download_file(this.id, base64)
    const name = path.basename(filePath) || Date.now() + path.extname(filePath)
    return await api.upload_group_file(this.id, group_id, file, name)
  }

  /** 上传好友文件 */
  async upload_private_file (user_id, filePath) {
    if (!fs.existsSync(filePath)) return true
    /** 先传到shamrock... */
    const base64 = 'base64://' + fs.readFileSync(filePath).toString('base64')
    const { file } = await api.download_file(this.id, base64)
    const name = path.basename(filePath) || Date.now() + path.extname(filePath)
    return await api.upload_private_file(this.id, user_id, file, name)
  }

  /** 获取文件下载链接 */
  async getFileUrl () {
    return logger.warn('暂未实现，请先使用 [e.file]')
  }

  /** 音乐分享 */
  async shareMusic (group_id, platform, id) {
    if (!['qq', '163'].includes(platform)) {
      return 'platform not supported yet'
    }
    return await this.sendGroupMsg(group_id, { type: 'music', data: { type: platform, id } })
  }

  /** 设置精华 */
  async setEssenceMessage (msg_id) {
    let res = await api.set_essence_msg(this.id, msg_id)
    return res?.message === '成功' ? '加精成功' : res?.message
  }

  /** 移除群精华消息 **/
  async removeEssenceMessage (msg_id) {
    let res = await api.delete_essence_msg(this.id, msg_id)
    return res?.message === '成功' ? '加精成功' : res?.message
  }

  /** 获取群成员信息 */
  async getGroupMemberInfo (group_id, user_id, refresh) {
    /** 被自己坑了 */
    if (user_id == '88888' || user_id == 'stdin') user_id = this.id
    try {
      let member = await api.get_group_member_info(this.id, group_id, user_id, refresh)
      member.card = member.nickname
      return member
    } catch {
      return { card: 'shamrock', nickname: 'shamrock' }
    }
  }

  /** 退群 */
  async quit (group_id) {
    return await api.set_group_leave(this.id, group_id)
  }

  /** 制作转发消息 */
  async makeForwardMsg (data) {
    if (!Array.isArray(data)) data = [data]
    let makeForwardMsg = {
      /** 标记下，视为转发消息，防止套娃 */
      test: true,
      message: [],
      data: { type: 'test', text: 'forward', app: 'com.tencent.multimsg', meta: { detail: { news: [{ text: '1' }] }, resid: '', uniseq: '', summary: '' } }
    }

    let msg = []
    for (let i in data) {
      /** 该死的套娃，能不能死一死啊... */
      if (typeof data[i] === 'object' && (data[i]?.test || data[i]?.message?.test)) {
        if (data[i]?.message?.test) {
          makeForwardMsg.message.push(...data[i].message.message)
        } else {
          makeForwardMsg.message.push(...data[i].message)
        }
      } else {
        if (!data[i]?.message) continue
        msg.push(data[i].message)
      }
    }

    if (msg.length) {
      for (let i of msg) {
        let { message, raw_message } = await this.getShamrock(i)

        try {
          const { message_id } = await api.send_private_msg(this.id, this.id, message, raw_message)
          makeForwardMsg.message.push({ type: 'node', data: { id: message_id } })
        } catch (err) {
          common.error(this.id, err)
        }
      }
    }
    return makeForwardMsg
  }

  /** 撤回消息 */
  async recallMsg (msg_id) {
    return await api.delete_msg(this.id, msg_id)
  }

  /** 获取禁言列表 */
  async getMuteList (group_id) {
    return await api.get_prohibited_member_list(this.id, group_id)
  }

  /** 转换消息为ICQQ格式 */
  async ICQQEvent (data) {
    const { post_type, group_id, user_id, message_type, message_id, sender } = data
    /** 初始化e */
    let e = data

    /** 消息事件 */
    const messagePostType = async function () {
      /** 处理message、引用消息、toString、raw_message */
      const { message, ToString, raw_message, log_message, source, file } = await this.getMessage(data.message, group_id)

      /** 通用数据 */
      e.message = message
      e.raw_message = raw_message
      e.log_message = log_message
      e.toString = () => ToString
      if (file) e.file = file
      if (source) e.source = source

      /** 群消息 */
      if (message_type === 'group') {
        let group_name
        try {
          group_name = Bot[this.id].gl.get(group_id).group_name
          group_name = group_name ? `${group_name}(${group_id})` : group_id
        } catch {
          group_name = group_id
        }
        e.log_message && common.info(this.id, `群消息：[${group_name || group_id}，${sender?.nickname || sender?.card}(${user_id})] ${e.log_message}`)
        /** 手动构建member */
        e.member = {
          info: {
            group_id,
            user_id,
            nickname: sender?.card,
            last_sent_time: data?.time
          },
          card: sender?.card,
          nickname: sender?.nickname,
          group_id,
          is_admin: sender?.role === 'admin' || false,
          is_owner: sender?.role === 'owner' || false,
          /** 获取头像 */
          getAvatarUrl: (size = 0) => {
            return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`
          },
          /** 禁言 */
          mute: async (time) => {
            return await api.set_group_ban(this.id, group_id, user_id, time)
          }
        }
        e.group = { ...this.pickGroup(group_id) }
      } else {
        /** 私聊消息 */
        e.log_message && common.info(this.id, `好友消息：[${sender?.nickname || sender?.card}(${user_id})] ${e.log_message}`)
        e.friend = { ...this.pickFriend(user_id) }
      }
    }
    /** 通知事件 */
    const noticePostType = async function () {
      e.action = '戳了戳'
      e.raw_message = `${e.operator_id} 戳了戳 ${e.user_id}`
      /** 私聊字段 */
      if (e?.sender_id) {
        e.notice_type = 'private'
      } else {
        e.notice_type = 'group'
      }
    }

    /** 请求事件 */
    const requestPostType = async function () {
      switch (e.request_type) {
        case 'friend': {
          e.approve = async (approve = true) => {
            if (e.flag) {
              return await api.set_friend_add_request(this.id, e.flag, approve)
            } else {
              common.error(this.id, '处理好友申请失败：缺少flag参数')
              return false
            }
          }
          break
        }
        case 'group': {
          e.approve = async (approve = true) => {
            if (e.flag) return await api.set_group_add_request(this.id, e.flag, e.sub_type, approve)
            if (e.sub_type === 'add') {
              common.error(this.id, '处理入群申请失败：缺少flag参数')
            } else {
              // invite
              common.error(this.id, '处理邀请机器人入群失败：缺少flag参数')
            }
            return false
          }
          break
        }
        default:
      }
    }

    switch (post_type) {
      /** 消息事件 */
      case 'message':
        await messagePostType.call(this)
        break
      /** 通知事件 */
      case 'notice':
        await noticePostType.call(this)
        break
      /** 请求事件 */
      case 'request':
        await requestPostType.call(this)
        break
    }

    /** 快速撤回 */
    e.recall = async () => await api.delete_msg(this.id, message_id)
    /** 快速回复 */
    e.reply = async (msg, quote) => await this.sendReplyMsg(e, group_id || user_id, msg, quote)
    /** 获取对应用户头像 */
    e.getAvatarUrl = (size = 0) => `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${this.id}`

    /** 添加适配器标识 */
    e.adapter = 'shamrock'

    /** 保存消息次数 */
    try { common.recvMsg(this.id, e.adapter) } catch { }
    return e
  }

  /**
 * 处理云崽的message
 * @param msg
 * @param group_id
 * @param reply 是否处理引用消息，默认处理
 * @return {Promise<{source: (*&{user_id, raw_message: string, reply: *, seq}), message: *[]}|{source: string, message: *[]}>}
 */
  async getMessage (msg, group_id, reply = true) {
    let file
    let source
    let message = []
    let ToString = []
    let log_message = []
    let raw_message = []

    for (let i of msg) {
      switch (i.type) {
        /** AT 某人 */
        case 'at':
          message.push({ type: 'at', qq: Number(i.data.qq) })
          try {
            let qq = i.data.qq
            ToString.push(`{at:${qq}}`)
            let groupMemberList = Bot[this.id].gml.get(group_id)?.[qq]
            let at = groupMemberList?.nickname || groupMemberList?.card || qq
            raw_message.push(`@${at}`)
            log_message.push(at == qq ? `@${qq}` : `[@${at}:${qq}]`)
          } catch (err) {
            raw_message.push(`@${i.data.qq}`)
            log_message.push(`@${i.data.qq}`)
          }
          break
        case 'text':
          message.push({ type: 'text', text: i.data.text })
          raw_message.push(i.data.text)
          log_message.push(i.data.text)
          break
        /** 表情 */
        case 'face':
          message.push({ type: 'face', ...i.data })
          raw_message.push(`[${faceMap[Number(i.data.id)]}]`)
          log_message.push(`[${faceMap[Number(i.data.id)]}]`)
          ToString.push(`{face:${i.data.id}}`)
          break
        /** 回复 */
        case 'reply':
          if (reply) {
            source = await this.source(i, group_id)
            if (source) {
              let qq = Number(source.sender.user_id)
              let text = source.sender.nickname
              message.push({ type: 'at', qq, text })
              raw_message.push(`@${text}`)
              log_message.push(`[回复] [@${text}:${qq}]`)
            }
          }
          break
        /** 图片 */
        case 'image':
          message.push({ type: 'image', ...i.data })
          raw_message.push('[图片]')
          log_message.push(`[图片:${i.data?.url || i.data.file}]`)
          ToString.push(`{image:${i.data.file}}`)
          break
        /** 语音 */
        case 'record':
          message.push({ type: 'record', ...i.data })
          raw_message.push('[语音]')
          log_message.push(`[语音:${i.data?.url || i.data.file}]`)
          ToString.push(`{record:${i.data.file}}`)
          break
        /** 视频 */
        case 'video':
          message.push({ type: 'video', ...i.data })
          raw_message.push('[视频]')
          log_message.push(`[视频:${i.data?.url || i.data.file}]`)
          ToString.push(`{video:${i.data.file}}`)
          break
        /** 文件 */
        case 'file':
          file = { ...i.data, fid: i.data.id }
          message.push({ type: 'file', ...i.data, fid: i.data.id })
          raw_message.push('[文件]')
          log_message.push(`[视频:${i.data?.url || i.data.file}]`)
          ToString.push(`{file:${i.data.id}}`)
          /** 存一手，给获取函数 */
          redis.set(i.data.id, JSON.stringify(i.data))
          break
        /** 转发 */
        case 'forward':
          /** 不理解为啥为啥不是node... */
          message.push({ type: 'node', ...i.data })
          raw_message.push('[转发消息]')
          log_message.push(`[转发消息:${JSON.stringify(i.data)}]`)
          ToString.push(`{forward:${i.data.id}}`)
          break
        /** JSON 消息 */
        case 'json':
          message.push({ type: 'json', ...i.data })
          raw_message.push('[json消息]')
          log_message.push(`[json消息:${i.data}]`)
          ToString.push(i.data.data)
          break
        /** XML消息 */
        case 'xml':
          message.push({ type: 'xml', ...i.data })
          raw_message.push('[xml消息]')
          log_message.push(`[xml消息:${i.data}]`)
          ToString.push(i.data.data)
          break
        /** 篮球 */
        case 'basketball':
          message.push({ type: 'basketball', ...i.data })
          raw_message.push('[篮球]')
          log_message.push(`[篮球:${i.data.id}]`)
          ToString.push(`{basketball:${i.data.id}}`)
          break
        /** 新猜拳 */
        case 'new_rps':
          message.push({ type: 'new_rps', ...i.data })
          raw_message.push('[猜拳]')
          log_message.push(`[猜拳:${i.data.id}]`)
          ToString.push(`{new_rps:${i.data.id}}`)
          break
        /** 新骰子 */
        case 'new_dice':
          message.push({ type: 'new_dice', ...i.data })
          raw_message.push('[骰子]')
          log_message.push(`[骰子:${i.data.id}]`)
          ToString.push(`{new_dice:${i.data.id}}`)
          break
        /** 骰子 (NTQQ废弃) */
        case 'dice':
          message.push({ type: 'dice', ...i.data })
          raw_message.push('[骰子]')
          log_message.push(`[骰子:${i.data.id}]`)
          ToString.push(`{dice:${i.data}}`)
          break
        /** 剪刀石头布 (NTQQ废弃) */
        case 'rps':
          message.push({ type: 'rps', ...i.data })
          raw_message.push('[剪刀石头布]')
          log_message.push(`[剪刀石头布:${i.data.id}]`)
          ToString.push(`{rps:${i.data}}`)
          break
        /** 戳一戳 */
        case 'poke':
          message.push({ type: 'poke', ...i.data })
          raw_message.push(`[${pokeMap[Number(i.data.id)]}]`)
          log_message.push(`[${pokeMap[Number(i.data.id)]}]`)
          ToString.push(`{poke:${i.data.id}}`)
          break
        /** 戳一戳(双击头像) */
        case 'touch':
          message.push({ type: 'touch', ...i.data })
          raw_message.push('[双击头像]')
          log_message.push(`[双击头像:${i.data.id}]`)
          ToString.push(`{touch:${i.data.id}}`)
          break
        /** 音乐 */
        case 'music':
          message.push({ type: 'music', ...i.data })
          raw_message.push('[音乐]')
          log_message.push(`[音乐:${i.data.id}]`)
          ToString.push(`{music:${i.data.id}}`)
          break
        /** 音乐(自定义) */
        case 'custom':
          message.push({ type: 'custom', ...i.data })
          raw_message.push('[自定义音乐]')
          log_message.push(`[自定义音乐:${i.data.url}]`)
          ToString.push(`{custom:${i.data.url}}`)
          break
        /** 天气 */
        case 'weather':
          message.push({ type: 'weather', ...i.data })
          raw_message.push('[天气]')
          log_message.push(`[天气:${i.data.city}]`)
          ToString.push(`{weather:${i.data.city}}`)
          break
        /** 位置 */
        case 'location':
          message.push({ type: 'location', ...i.data })
          raw_message.push('[位置分享]')
          log_message.push(`[位置分享:${i.data.lat}-${i.data.lon}]`)
          ToString.push(`{location:${i.data.lat}-${i.data.lon}}`)
          break
        /** 链接分享 */
        case 'share':
          message.push({ type: 'share', ...i.data })
          raw_message.push('[链接分享]')
          log_message.push(`[链接分享:${i.data.url}]`)
          ToString.push(`{share:${i.data.url}}`)
          break
        /** 礼物 */
        case 'gift':
          message.push({ type: 'gift', ...i.data })
          raw_message.push('[礼物]')
          log_message.push(`[礼物:${i.data.id}]`)
          ToString.push(`{gift:${i.data.id}}`)
          break
        default:
          message.push({ type: 'text', ...i.data })
          i = JSON.stringify(i)
          raw_message.push(i)
          log_message.push(i)
          ToString.push(i)
          break
      }
    }

    ToString = ToString.join('').trim()
    raw_message = raw_message.join('').trim()
    log_message = log_message.join(' ').trim()
    return { message, ToString, raw_message, log_message, source, file }
  }

  /**
   * 获取被引用的消息
   * @param {object} i
   * @param {number} group_id
   * @return {array|false} -
   */
  async source (i, group_id) {
    /** 引用消息的id */
    const msg_id = i.data.id
    /** id不存在滚犊子... */
    if (!msg_id) return false
    let source
    try {
      let retryCount = 0

      while (retryCount < 2) {
        source = await api.get_msg(this.id, msg_id)
        if (typeof source === 'string') {
          common.error(this.id, `获取引用消息内容失败，正在重试：第 ${retryCount} 次`)
          retryCount++
        } else {
          break
        }
      }

      if (typeof source === 'string') {
        common.error(this.id, '获取引用消息内容失败，重试次数上限，已终止')
        return false
      }
      common.debug('', source)

      let { raw_message } = await this.getMessage(source.message, group_id, false)

      source = {
        ...source,
        seq: source.message_id,
        user_id: source.sender.user_id,
        message: raw_message,
        raw_message
      }

      return source
    } catch (error) {
      logger.error(error)
      return false
    }
  }

  /**
 * 回被动消息
 * @param {object} e - 接收的e - 喵崽格式
 * @param {number} id - 目标QQ
 * @param {string|object|array} msg - 消息内容
 * @param {boolean} quote - 是否引用回复
 */
  async sendReplyMsg (e, id, msg, quote) {
    let { message, raw_message, node } = await this.getShamrock(msg)

    if (quote) {
      message.push({ type: 'reply', data: { id: e.message_id } })
      raw_message = '[回复]' + raw_message
    }

    if (e.isGroup) return await api.send_group_msg(this.id, id, message, raw_message, node)
    return await api.send_private_msg(this.id, id, message, raw_message)
  }

  /**
   * 发送好友消息 - 主动消息
   * @param {number} user_id - 好友QQ
   * @param {string|object|array} msg - 消息内容
   */
  async sendFriendMsg (user_id, msg) {
    const { message, raw_message, node } = await this.getShamrock(msg)
    return await api.send_private_msg(this.id, user_id, message, raw_message, node)
  }

  /**
   * 发送群消息 - 主动消息
   * @param {number} group_id - 群聊QQ
   * @param {string|object|array} msg - 消息内容
   */
  async sendGroupMsg (group_id, msg) {
    const { message, raw_message, node } = await this.getShamrock(msg)
    return await api.send_group_msg(this.id, group_id, message, raw_message, node)
  }

  /**
   * 转换message为Shamrock格式
   * @param {string|Array|object} data - 消息内容
   */
  async getShamrock (data) {
    /** 标准化消息内容 */
    data = common.array(data)
    let node = false
    /** 保存 Shamrock标准 message */
    let message = []
    /** 打印的日志 */
    let raw_message = []

    /** chatgpt-plugin */
    if (data?.[0]?.type === 'xml') data = data?.[0].msg

    /** 转为Shamrock标准 message */
    for (let i of data) {
      if (i?.node) node = true
      switch (i.type) {
        case 'at':
          message.push({ type: 'at', data: { qq: Number(i.qq) } })
          raw_message.push(`[@${i.qq}]`)
          break
        case 'face':
          message.push({ type: 'face', data: { id: Number(i.id) } })
          raw_message.push(`[${faceMap[Number(i.id)]}]`)
          break
        case 'text':
          if (typeof value !== 'number' && !i.text.trim()) break
          message.push({ type: 'text', data: { text: i.text } })
          raw_message.push(i.text)
          break
        case 'file':
          break
        case 'record':
          try {
            let file = await Bot.Base64(i.file, { http: true })
            /** 非链接需要先上传到手机 */
            if (!/^http:\/\//.test(file)) {
              const data = await api.download_file(this.id, `base64://${file}`)
              file = `file://${data.file}`
            }
            message.push({ type: 'record', data: { file } })
            raw_message.push(`[语音:${i.file}]`)
          } catch (err) {
            common.error(this.id, '语音上传失败:', err)
            /** 都报错了还发啥？...我以前写的什么牛马 */
            // msg.push(await this.getFile(i, 'record'))
            message.push({ type: 'text', data: { text: JSON.stringify(err) } })
            raw_message.push(JSON.stringify(err))
          }
          break
        case 'video':
          try {
            /** 笨比复读! */
            if (i?.url) i.file = i.url
            /** 视频文件需要先上传到手机 */
            const { file } = await api.download_file(this.id, `base64://${await Bot.Base64(i.file)}`)
            message.push({ type: 'video', data: { file: `file://${file}` } })
          } catch (err) {
            common.error(this.id, '视频上传失败:', err)
            message.push({ type: 'text', data: { text: JSON.stringify(err) } })
            raw_message.push(JSON.stringify(err))
          }
          raw_message.push(`[视频:${i.file}]`)
          break
        case 'image':
          try {
            /** 笨比复读! */
            if (i?.url) i.file = i.url
            let file = await Bot.Base64(i.file, { http: true })
            /** 判断是否为http */
            if (!/^http(s)?:\/\//.test(file)) {
              file = `base64://${file}`
              raw_message.push('[图片:base64://...]')
            } else {
              raw_message.push(`[图片:${file}]`)
            }
            message.push({ type: 'image', data: { file } })
          } catch (err) {
            message.push({ type: 'text', data: { text: JSON.stringify(err) } })
            raw_message.push(JSON.stringify(err))
          }
          break
        case 'poke':
          message.push({ type: 'poke', data: { type: i.id, id: 0, strength: i?.strength || 0 } })
          raw_message.push(`[${pokeMap[Number(i.id)]}]` || `[戳一戳:${i.id}]`)
          break
        case 'touch':
          message.push({ type: 'touch', data: { id: i.id } })
          raw_message.push(`[拍一拍:${i.id}]`)
          break
        case 'weather':
          message.push({ type: 'weather', data: { code: i.code, city: i.city } })
          raw_message.push(`[天气:${i?.city || i?.code}]`)
          break
        case 'json':
          try {
            let json = i.data
            if (typeof i.data !== 'string') json = JSON.stringify(i.data)
            message.push({ type: 'json', data: { data: json } })
            raw_message.push(`[json:${json}]`)
          } catch (err) {
            message.push({ type: 'text', data: { text: JSON.stringify(err) } })
            raw_message.push(JSON.stringify(err))
          }
          break
        case 'music':
          message.push({ type: 'music', data: i.data })
          raw_message.push(`[音乐:${i.data.type},id:${i.data.id}]`)
          break
        case 'location':
          try {
            const { lat, lng: lon } = data
            message.push({ type: 'location', data: { lat, lon } })
            raw_message.push(`[位置:纬度=${lat},经度=${lon}]`)
          } catch (err) {
            message.push({ type: 'text', data: { text: JSON.stringify(err) } })
            raw_message.push(JSON.stringify(err))
          }
          break
        case 'share':
          try {
            const { url, title, image, content } = data
            message.push({ type: 'share', data: { url, title, content, image } })
            raw_message.push(`[链接分享:${url},标题=${title},图片链接=${image},内容=${content}]`)
          } catch (err) {
            message.push({ type: 'text', data: { text: JSON.stringify(err) } })
            raw_message.push(JSON.stringify(err))
          }
          break
        case 'forward':
          message.push({ type: 'text', data: { text: i.text } })
          raw_message.push(i.text)
          break
        case 'node':
          node = true
          message.push({ type: 'node', data: { ...i.data } })
          raw_message.push(`[转发消息:${i.data.id}]`)
          break
        default:
          // 为了兼容更多字段，不再进行序列化，风险是有可能未知字段导致Shamrock崩溃
          message.push({ type: i.type, data: { ...i.data } })
          raw_message.push(`[${i.type}:${JSON.stringify(i.data)}]`)
          break
      }
    }

    raw_message = raw_message.join('')

    /** 合并转发 */
    if (node) raw_message = `[转发消息:${JSON.stringify(message)}]`

    return { message, raw_message, node }
  }
}

/** Shamrock的WebSocket服务器实例 */
const shamrock = new WebSocketServer({ noServer: true })

/** 连接 */
shamrock.on('connection', async (bot, request) => new Shamrock(bot, request))

/** 捕获错误 */
shamrock.on('error', async error => logger.error(error))

export default shamrock
