import common from '../../model/common.js'
import SendMsg from './sendMsg.js'
import api from './api.js'
import fs from 'fs'
import path from 'path'

export default new class zaiMsg {
  /** 转换格式给云崽 */
  async msg (data) {
    const { self_id, user_id, group_id, message_type, message_id, sender } = data

    let raw_message = data.raw_message

    /** 判断是否群聊 */
    let isGroup = true

    /** 初始化e */
    let e = data

    if (data.post_type === 'message') {
      /** 处理message，引用消息 */
      const { message, source, file } = await this.message(self_id, data.message, group_id, 'e')
      e.message = message
      /** 特殊处理文件 */
      if (file) e.file = file
      /** 引用消息 */
      if (source) {
        e.source = source
        if (typeof e.source === 'string') {
          common.error(user_id, e.source)
        } else {
          e.source.message = source.raw_message
        }
      }
    } else if (e.post_type === 'notice' && e.sub_type === 'poke') {
      e.action = '戳了戳'
      raw_message = `${e.operator_id} 戳了戳 ${e.user_id}`
      /** 私聊字段 */
      if (e?.sender_id) {
        isGroup = false
        e.notice_type = 'private'
      } else {
        e.notice_type = 'group'
      }
    } else if (e.post_type === 'request') {
      switch (e.request_type) {
        case 'friend': {
          e.approve = async (approve = true) => {
            if (e.flag) {
              return await api.set_friend_add_request(self_id, e.flag, approve)
            } else {
              common.error(self_id, '处理好友申请失败：缺少flag参数')
              return false
            }
          }
          break
        }
        case 'group': {
          e.approve = async (approve = true) => {
            if (e.flag) {
              return await api.set_group_add_request(self_id, e.flag, e.sub_type, approve)
            } else {
              if (e.sub_type === 'add') {
                common.error(self_id, '处理入群申请失败：缺少flag参数')
              } else {
                // invite
                common.error(self_id, '处理邀请机器人入群失败：缺少flag参数')
              }
              return false
            }
          }
          break
        }
        default:
      }
    }
    let group_name = group_id
    /** 先打印日志 */
    if (message_type === 'private') {
      isGroup = false
      common.info(self_id, `好友消息：[${sender?.nickname || sender?.card}(${user_id})] ${raw_message}`)
    } else {
      try {
        group_name = Bot[self_id].gl.get(group_id)?.group_name
      } catch {
        group_name = group_id
      }
      raw_message && common.info(self_id, `群消息：[${group_name}，${sender?.nickname || sender?.card}(${user_id})] ${raw_message}`)
    }

    /** 快速撤回 */
    e.recall = async () => {
      return await api.delete_msg(self_id, message_id)
    }
    /** 快速回复 */
    e.reply = async (msg, quote) => {
      const peer_id = isGroup ? group_id : user_id
      return await (new SendMsg(self_id, isGroup)).message(msg, peer_id, quote ? message_id : false)
    }

    /** 获取对应用户头像 */
    e.getAvatarUrl = (size = 0, id = user_id) => {
      return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${id}`
    }

    /** 构建场景对应的方法 */
    if (isGroup) {
      try {
        e.group_name = Bot[self_id].gl.get(group_id)?.group_name || group_id
      } catch {
        e.group_name = group_id
      }

      /** 构建member */
      e.member = {
        info: {
          group_id: data?.group_id,
          user_id: data?.user_id,
          nickname: data?.sender?.card,
          last_sent_time: data?.time
        },
        card: data?.sender?.card,
        nickname: data?.sender?.nickname,
        group_id: data?.group_id,
        is_admin: data?.sender?.role === 'admin' || false,
        is_owner: data?.sender?.role === 'owner' || false,
        /** 获取头像 */
        getAvatarUrl: (size = 0) => {
          return `https://q1.qlogo.cn/g?b=qq&s=${size}&nk=${user_id}`
        },
        /** 椰奶禁言 */
        mute: async (time) => {
          return await api.set_group_ban(self_id, group_id, user_id, time)
        }
      }
      e.group = { ...this.pickGroup(group_id) }
    } else {
      e.friend = { ...this.pickFriend(user_id) }
    }

    /** 将收到的消息转为字符串 */
    e.toString = () => {
      return raw_message
    }

    /** 添加适配器标识 */
    e.adapter = 'shamrock'

    /** 保存消息次数 */
    try { common.recvMsg(e.self_id, e.adapter) } catch { }
    return e
  }

  async message (id, msg, group_id, reply = true) {
    return await message(id, msg, group_id, reply)
  }
}()

/**
 * 处理云崽的message
 * @param id
 * @param msg
 * @param group_id
 * @param reply 是否处理引用消息
 * @return {Promise<{source: (*&{user_id, raw_message: string, reply: *, seq}), message: *[]}|{source: string, message: *[]}>}
 */
export async function message (id, msg, group_id, reply = true) {
  const message = []
  let source
  let file
  for (const i of msg) {
    if (i.type === 'reply' && reply) {
      /** 引用消息的id */
      const msg_id = i.data.id
      /** id不存在滚犊子... */
      if (!msg_id) continue
      try {
        let retryCount = 0

        while (retryCount < 2) {
          source = await api.get_msg(id, msg_id)

          if (typeof source === 'string') {
            common.info(id, `获取引用消息内容失败，正在重试：第 ${retryCount} 次`)
            retryCount++
          } else {
            break
          }
        }
        if (typeof source === 'string') {
          common.error(id, '获取引用消息内容失败，重试次数上限，已终止')
          continue
        }
        common.debug('', source)
        // todo 判断引用是否追溯得到
        let source_reply = source.message.map(u => (u.type === 'at' ? { type: u.type, qq: Number(u.data.qq) } : { type: u.type, ...u.data }))

        let raw_message = toRaw(source_reply, id, group_id)

        /** 覆盖原先的message */
        source.message = source_reply
        if (reply != 'e') message.push(...source_reply)

        source = {
          ...source,
          reply: source_reply,
          seq: source.message_id,
          user_id: source.sender.user_id,
          raw_message
        }

        /** 回复at */
        message.push({ type: 'at', qq: Number(source.sender.user_id) })
      } catch (error) {
        logger.error(error)
      }
    } else if (i.type === 'forward') {
      /** 不理解为啥为啥不是node... */
      message.push({ type: 'node', ...i.data })
    } else if (i.type === 'file') {
      /** 文件 */
      file = i.data
    } else {
      if (i.type === 'at') {
        message.push({ type: 'at', qq: Number(i.data.qq) })
      } else {
        message.push({ type: i.type, ...i.data })
      }
    }
  }
  return { message, source, file }
}

/**
 *
 * @param msg message，yunzai的或shamrock格式的
 * @param group_id 群号
 * @return {string}
 */
export function toRaw (msg = [], group_id) {
  const raw_message = []
  const 
  for (let i of msg) {
    switch (i.type) {
      case 'image':
        raw_message.push('[图片]')
        break
      case 'text':
        i.text ? raw_message.push(i.text) : raw_message.push(i.data?.text || '')
        break
      case 'file':
        raw_message.push('[文件]')
        break
      case 'record':
        raw_message.push('[语音]')
        break
      case 'video':
        raw_message.push('[视频]')
        break
      case 'music':
        raw_message.push('[音乐]')
        break
      case 'weather':
        raw_message.push('[天气]')
        break
      case 'json':
        raw_message.push('[json]')
        break
      case 'at':
        try {
          let qq = i?.qq || i?.data?.qq
          let groupMemberList = Bot[self_id].gml.get(group_id)
          let at = groupMemberList?.[qq]
          raw_message.push(`[@${at.nickname || at.card || qq}]`)
        } catch (err) {
          raw_message.push(`[@${i?.qq || i?.data?.qq}]`)
        }
        break
      case 'reply':
        break
      default:
        raw_message.push(JSON.stringify(i))
        break
    }
  }
  return raw_message.join('').trim()
}
