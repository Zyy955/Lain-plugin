import api from "./api.js"
import SendMsg from "./sendMsg.js"
import common from "../../model/common.js"

export default class message {
    /** 传入基本配置 */
    constructor(id) {
        /** 开发者id */
        this.id = id
        /** bot名称 */
        this.name = Bot[id].nickname
    }

    /** 消息转换为Yunzai格式 */
    async msg(data) {
        const { group_id, detail_type, self, time, message_id } = data
        /** 存一份原始消息到redis中，用于引用消息 */
        if (message_id) {
            const msg = JSON.stringify({
                id: data.alt_message,
                user_id: data.user_id
            })
            try {
                await redis.set(message_id, msg, { EX: 1800 })
            } catch (error) { }
        }

        let user_id = data.user_id
        /** 构建Yunzai的message */
        let { message, atme, source } = await this.message(data.message)
        /** 获取用户名称 */
        let user_name
        if (detail_type === "private" || detail_type === "wx.get_private_poke") {
            user_name = (await api.get_user_info(user_id))?.user_name || ""
        } else {
            user_name = (await api.get_group_member_info(group_id, user_id))?.user_name || ""
        }

        const sub_type = (detail_type === "private" || detail_type === "wx.get_private_poke") ? "friend" : "normal"

        const member = {
            info: {
                group_id,
                user_id,
                nickname: user_name,
                last_sent_time: time,
            },
            group_id,
        }

        let e = {
            atBot: atme,
            atme: atme,
            adapter: "WeChat",
            uin: this.id,
            group_id,
            group_name: Bot.gl.get(group_id)?.group_name || "未知",
            post_type: "message",
            message_id,
            user_id,
            time,
            raw_message: data.alt_message,
            message_type: detail_type,
            sub_type,
            source: source,
            self_id: this.id,
            seq: message_id,
            member,
            sender: {
                user_id,
                nickname: user_name,
                card: user_name,
                role: "member",
            }
        }
        if (detail_type === "private" || detail_type === "wx.get_private_poke") {
            e.friend = {
                recallMsg: () => {
                    return
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                getChatHistory: (seq, num) => {
                    return ["message", "test"]
                },
                sendMsg: async (msg) => {
                    return await (new SendMsg(this.id, data)).message(msg)
                },
            }
        } else {
            e.group = {
                getChatHistory: (seq, num) => {
                    return ["message", "test"]
                },
                recallMsg: () => {
                    return
                },
                sendMsg: async (msg) => {
                    return await (new SendMsg(this.id, data)).message(msg)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                pickMember: (id) => {
                    if (id === user_id) {
                        return member
                    }
                },
            }
        }
        e.recall = () => {
            return
        }
        e.reply = async (msg) => {
            return await (new SendMsg(this.id, data)).message(msg)
        }
        e.toString = () => {
            return data.alt_message
        }

        if (message) e.message = [...message]

        /** 私聊拍一拍 */
        if (data.detail_type === "wx.get_private_poke") {
            e.action = "戳了戳"
            e.sub_type = "poke"
            e.post_type = "notice"
            e.notice_type = "private"
            e.user_id = data.from_user_id
            e.target_id = data.user_id
            e.operator_id = data.from_user_id
            user_id = data.from_user_id
        }
        /** 群聊拍一拍 */
        if (data.detail_type === "wx.get_group_poke") {
            e.action = "戳了戳"
            e.sub_type = "poke"
            e.post_type = "notice"
            e.notice_type = "group"
            e.target_id = data.user_id
            e.operator_id = data.from_user_id
        }

        return e
    }

    /** 构建message */
    async message(msg) {
        let atme = false
        let message = []
        let source = {}
        if (!msg) return false

        for (let i of msg) {
            const { type, data } = i
            switch (type) {
                case "text":
                    message.push({ type: "text", text: data.text })
                    break
                case "mention":
                    if (data.user_id === this.id) atme = true
                    else message.push({ type: "at", text: "", qq: data.user_id })
                    break
                case "mention_all":
                    break
                case "image":
                    const image = await api.get_file("url", data.file_id)
                    message.push({ type: "image", name: image.name, url: image.url })
                    break
                case "voice":
                    break
                case "audio":
                    break
                case "video":
                    break
                case "file":
                    break
                case "location":
                    break
                case "reply":
                    try {
                        const res = JSON.parse(await redis.get(i.data.message_id) || { id: "", user_id: "" })
                        source = { message: res.id, rand: 0, seq: 0, time: 0, user_id: res.user_id }
                    } catch (err) {
                        logger.error(err)
                    }
                    break
                case "wx.emoji":
                    message.push({ type: "emoji", text: data.file_id })
                    break
                case "wx.link":
                    message.push({ type: "wx.link", data: data })
                    break
                case "wx.app":
                    break
            }
        }
        return { message, atme, source }
    }

    /** 处理消息、转换格式 */
    async reply(msg, quote, group_name) {
        const { guild_id, channel_id } = this.data.msg
        /** 处理云崽过来的消息 */
        return await (new SendMsg(this.id, { guild_id, channel_id }, this.data.eventType, this.msg_id, group_name)).message(msg, quote)
    }
}