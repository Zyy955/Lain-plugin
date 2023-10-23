import SendMsg from "./sendMsg.js"
import common from "../../model/common.js"

export default class message {
    /** 传入基本配置 */
    constructor(id, data) {
        /** 开发者id */
        this.id = id
        /** bot名称 */
        this.name = Bot[id].name
        /** 接收到的消息 */
        this.data = data
    }

    /** 消息转换为Yunzai格式 */
    async msg(type = "") {
        /** 初始化e */
        let e = {}
        /** 获取消息体、appID */
        const { msg } = this.data

        /** 保存消息id */
        this.msg_id = msg.id
        /** 获取时间戳 */
        const time = parseInt(Date.parse(msg.timestamp) / 1000)
        /** 获取用户的身份组信息 */
        const roles = msg.member.roles
        /** 群主 */
        const is_owner = roles && roles.includes("4") ? true : false
        /** 超管 */
        const is_admin = roles && roles.includes("2") ? true : false
        /** 当前成员身份 */
        const role = is_owner ? "owner" : (is_admin ? "admin" : "member")
        /** 群聊id */
        const group_id = `qg_${msg.guild_id}-${msg.channel_id}`
        /** 从gl中取出当前频道信息 */
        const gl = Bot[this.id].gl.get(group_id)
        /** 频道名称 */
        const guild_name = gl ? gl.guild_name : (Bot.qg.guilds?.[msg?.src_guild_id || msg.guild_id]?.name || msg.guild_id)
        /** 子频道名称 */
        const channel_name = type === "私信" ? "私信" : (gl ? gl.channel_name : msg.channel_id)
        /**  群聊名称 */
        const group_name = guild_name + "-" + channel_name
        /** 用户id */
        const user_id = "qg_" + msg.author.id
        /** 用户名称 */
        const nickname = msg.author.username
        /** 获取场景 */
        const message_type = type === "私信" ? "private" : "group"
        const sub_type = type === "私信" ? "friend" : "normal"
        /** 存入data中 */
        this.data.group_name = group_name
        /** 先存一部分 */
        e = {
            adapter: "QQGuild",
            author: msg.author,
            channel_id: msg.channel_id,
            channel_name: channel_name,
            group_id: group_id,
            guild_id: `qg_${msg.guild_id}`,
            group_name: group_name,
            guild_name: guild_name,
            mentions: msg.mentions,
            message_id: msg.id,
            message_type: message_type,
            post_type: "message",
            sub_type: sub_type,
            self_id: this.id,
            seq: msg.seq,
            time: time,
            uin: this.id,
            user_id: user_id
        }

        /** 构建message */
        const { message, toString, atBot } = this.message()
        e.atme = atBot
        e.atBot = atBot
        /** 这个不用我多说了吧... */
        e.message = message
        /** 将收到的消息转为字符串 */
        e.raw_message = toString
        /** 用户个人信息 */
        e.sender = {
            card: nickname,
            nickname: nickname,
            role: role,
            user_id: user_id
        }

        /** 构建member */
        const member = {
            info: {
                group_id: group_id,
                user_id: user_id,
                nickname: nickname,
                last_sent_time: time,
            },
            group_id: group_id,
            is_admin: is_admin,
            is_owner: is_owner,
            /** 获取头像 */
            getAvatarUrl: () => {
                return msg.author.avatar
            },
            /** 禁言 */
            mute: async (time) => {
                const options = { seconds: time }
                return await Bot[this.id].client.muteApi.muteMember(msg.guild_id, msg.author.id, options)
            },
            /** 踢 */
            kick: async () => {
                return await Bot[id].client.guildApi.deleteGuildMember(msg.guild_id, msg.author.id)
            }
        }

        /** 赋值 */
        e.member = member

        /** 构建场景对应的方法 */
        if (type === "私信") {
            e.friend = {
                sendMsg: async (msg, quote) => {
                    return await this.reply(msg, quote, group_name)
                },
                recallMsg: async (msg_id) => {
                    return await recallMsg(msg.channel_id, msg_id)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, this.data)
                },
                getChatHistory: async (msg_id, num) => {
                    const source = await this.getChatHistory(msg.channel_id, msg_id)
                    return [source]
                },
                getAvatarUrl: async () => {
                    return msg.author.avatar
                }
            }
        } else {
            e.group = {
                is_admin: is_admin,
                is_owner: is_owner,
                pickMember: (id) => {
                    if (id === msg.author.id) {
                        return member
                    }
                },
                getChatHistory: async (msg_id, num) => {
                    const source = await this.getChatHistory(msg.channel_id, msg_id)
                    return [source]
                },
                recallMsg: async (msg_id) => {
                    return await recallMsg(msg.channel_id, msg_id)
                },
                sendMsg: async (msg, quote) => {
                    return await this.reply(msg, quote, group_name)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, this.data)
                }
            }
        }

        /** 快速撤回 */
        e.recall = async () => {
            return await recallMsg(msg.channel_id, msg.id)
        }
        /** 快速回复 */
        e.reply = async (msg, quote) => {
            return await this.reply(msg, quote, group_name)
        }
        /** 将收到的消息转为字符串 */
        e.toString = () => {
            return toString
        }

        /** 引用消息 */
        if (msg?.message_reference?.message_id) {
            const reply = (await Bot[this.id].client.messageApi.message(msg.channel_id, msg.message_reference.message_id)).message
            let message = []
            if (reply.attachments) {
                for (let i of reply.attachments) {
                    message.push({ type: "image", url: `https://${i.url}` })
                }
            }
            if (reply.content) {
                /** 暂不处理...懒 */
                message.push({ type: "text", text: reply.content })
            }
            message.push({ type: "at", text: `@${reply.author.username}`, qq: reply.author.id, id: reply.author.id })
            e.source = {
                message: message,
                rabd: "",
                seq: reply.id,
                time: parseInt(Date.parse(reply.timestamp) / 1000),
                user_id: reply.author.id
            }
        }
        /** 打印日志 */
        await this.log(e)

        /** 缓存一下初始消息，可通过msg_id查询 */
        await redis.set(msg.id, JSON.stringify(message), { EX: 120 })
        return e
    }

    /** 撤回消息 */
    async recallMsg(channel_ID, msg_id) {
        /** 先打印日志 */
        const { data } = await Bot[this.id].client.messageApi.message(channel_ID, msg_id)
        const { guild_id, channel_id, timestamp, author, content } = data.message
        const msg = ""
        msg += `撤回消息:\n频道ID：${guild_id}`
        msg += `\n子频道ID：${channel_id}`
        msg += `\n详细消息：`
        msg += `\n  时间：${timestamp}`
        msg += `\n  用户ID：${author.id}`
        msg += `\n  用户昵称：${author.username}`
        msg += `\n  用户是否为机器人：${author.bot}`
        msg += `\n  消息内容：${content || "未知内容"}`
        /** 打印日志 */
        await common.logModule(this.id, msg)
        /** 撤回消息 */
        return (await Bot[this.id].client.messageApi.deleteMessage(channel_ID, msg_id, false)).data
    }

    /** 构建message */
    message() {
        let atBot = false
        const message = []
        const raw_message = []
        const { msg } = this.data

        /** at、表情、文本 */
        if (msg.content) {
            /** 先对消息进行分割 */
            const content = msg?.content.match(/<@([^>]+)>|<emoji:([^>]+)>|[^<>]+/g)
            /** 获取at成员的名称 */
            let at_name = (i) => {
                for (let name of msg.mentions) {
                    if (name.id === i) return `@${name.username}`
                }
            }

            for (let i of content) {
                if (i.startsWith("<@")) {
                    let user_id = i.slice(3, -1)
                    const name = at_name(user_id)
                    if (Bot[this.id].id === user_id) {
                        user_id = Bot.uin
                        atBot = true
                    } else {
                        user_id = `qg_${user_id}`
                    }
                    raw_message.push(`{at:${user_id}}`)
                    message.push({ type: "at", text: name, qq: user_id })
                } else if (i.startsWith("<emoji:")) {
                    const faceValue = i.slice(7, -1)
                    raw_message.push(`{emoji:${faceValue}}`)
                    message.push({ type: "face", text: faceValue })
                } else {
                    /** 前缀处理 */
                    if (i && Bot.qg.cfg.prefix && !Bot.qg.cfg.prefixBlack.includes(this.id)) {
                        i = i.trim().replace(/^\//, "#")
                    }
                    raw_message.push(i)
                    message.push({ type: "text", text: i })
                }
            }
        }

        /** 图片 动画表情 */
        if (msg.attachments) {
            for (const i of msg.attachments) {
                const image = {
                    type: "image",
                    file: i.filename,
                    url: `https://${i.url}`,
                    content_type: i.content_type
                }
                raw_message.push(`{image:${i.filename}}`)
                message.push(image)
            }
        }

        /** 拼接得到最终的字符串 */
        const toString = raw_message.join("")
        return { message, toString, atBot }
    }

    /** 获取聊天记录 */
    async getChatHistory(channelID, msg_id) {
        const source = await Bot[this.id].client.messageApi.message(channelID, msg_id)
        const { id, content, author, guild_id, channel_id, timestamp, member } = source.message
        const time = (new Date(timestamp)).getTime() / 1000

        /** 获取用户的身份组信息 */
        const roles = member.roles
        /** 群主 */
        const is_owner = roles && roles.includes("4") ? true : false
        /** 超管 */
        const is_admin = roles && roles.includes("2") ? true : false
        /** 当前成员身份 */
        const role = is_owner ? "owner" : (is_admin ? "admin" : "member")

        return {
            post_type: "message",
            message_id: id,
            user_id: "qg_" + author.id,
            time: time,
            seq: id,
            rand: 505133029,
            font: "宋体",
            message: [
                {
                    type: "text",
                    text: content,
                },
            ],
            raw_message: content,
            message_type: "group",
            sender: {
                user_id: "qg_" + author.id,
                nickname: author.username,
                sub_id: undefined,
                card: author.username,
                sex: "unknown",
                age: 0,
                area: "",
                level: 1,
                role: role,
                title: "",
            },
            group_id: "qg_" + guild_id + channel_id,
            group_name: "",
            block: false,
            sub_type: "normal",
            anonymous: null,
            atme: false,
            atall: false,
        }
    }

    /** 处理日志 */
    async log(e) {
        let group_name = e.guild_name + "-私信"
        e.message_type === "group" ? group_name = e.group_name : ""
        return await common.logModule(this.id, `频道消息：[${group_name}，${e.sender?.card || e.sender?.nickname}] ${e.raw_message}`, Bot.qg.cfg.isLog ? "info" : "debug")
    }

    /** 处理消息、转换格式 */
    async reply(msg, quote, group_name) {
        if (msg === "开始执行重启，请稍等...") await this.restart()
        const { guild_id, channel_id } = this.data.msg
        /** 处理云崽过来的消息 */
        return await (new SendMsg(this.id, { guild_id, channel_id }, this.data.eventType, this.msg_id, group_name)).message(msg, quote)
    }

    /** 保存重启到redis中 */
    async restart() {
        const type = this.data.eventType === "DIRECT_MESSAGE_CREATE" ? "私信" : "群聊"
        const { id, guild_id, channel_id } = this.data.msg
        const cfg = JSON.stringify({
            type: type,
            time: new Date().getTime(),
            appID: this.id,
            id: id,
            guild_id: guild_id,
            channel_id: channel_id,
        })
        await redis.set("qg:restart", cfg, { EX: 120 })
    }
}