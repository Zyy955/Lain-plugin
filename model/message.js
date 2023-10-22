import chalk from "chalk"
import Api from "./api.js"

export default new class message {
    /** 消息转换为Yunzai格式 */
    async msg(data, type = "") {
        /** 初始化e */
        let e = {}
        /** 获取消息体、appID */
        const { msg, id } = data

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
        const gl = Bot.gl.get(group_id)
        /** 频道名称 */
        const guild_name = gl ? gl.guild_name : (Bot.qg.guilds?.[msg?.src_guild_id || msg.guild_id]?.name || "未知")
        /** 子频道名称 */
        const channel_name = type === "私信" ? "私信" : (gl ? gl.channel_name : "未知")
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
        data.group_name = group_name
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
            self_id: id,
            seq: msg.seq,
            time: time,
            uin: id,
            user_id: user_id
        }

        /** 构建message */
        const { message, toString, atBot } = this._message(data)
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
                await Api.muteMember(id, msg.guild_id, msg.author.id, options)
            },
            /** 踢 */
            kick: async () => {
                await Api.deleteGuildMember(id, msg.guild_id, msg.author.id)
            }
        }

        /** 赋值 */
        e.member = member

        /** 动态导入 防止一些未知错误 */
        const guild = (await import("./guild.js")).default

        /** 构建场景对应的方法 */
        if (type === "私信") {
            e.friend = {
                sendMsg: async (reply, reference) => {
                    return await (new guild).reply(data, reply, reference)
                },
                recallMsg: (msg_id) => {
                    logger.info(`${Bot[id].name} 撤回消息：${msg_id}`)
                    return Api.deleteMessage(id, msg.channel_id, msg_id, false)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await this.makeForwardMsg(forwardMsg, data)
                },
                getChatHistory: async (msg_id, num) => {
                    const source = await this.getChatHistory(id, msg.channel_id, msg_id)
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
                    const source = await this.getChatHistory(id, msg.channel_id, msg_id)
                    return [source]
                },
                recallMsg: (msg_id) => {
                    logger.info(`${Bot[id].name} 撤回消息：${msg_id}`)
                    return Api.deleteMessage(id, msg.channel_id, msg_id, false)
                },
                sendMsg: async (reply, reference) => {
                    return await (new guild).reply(data, reply, reference)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await this.makeForwardMsg(forwardMsg, data)
                }
            }
        }

        /** 快速撤回 */
        e.recall = () => {
            logger.info(`${this.name} 撤回消息：${msg.id}`)
            return Api.deleteMessage(id, msg.channel_id, msg.id, false)
        }
        /** 快速回复 */
        e.reply = async (reply, reference) => {
            return await (new guild).reply(data, reply, reference)
        }
        /** 将收到的消息转为字符串 */
        e.toString = () => {
            return toString
        }

        /** 引用消息 */
        if (msg?.message_reference?.message_id) {
            const reply = (await Api.message(id, msg.channel_id, msg.message_reference.message_id)).message
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
        if (data.checkBlack) {
            logger.mark(this.log(e))
        } else {
            Bot.qg.cfg.isLog ? logger.info(this.log(e)) : logger.debug(this.log(e))
        }

        return e
    }

    /** 构建message */
    _message(data) {
        let atBot = false
        const message = []
        const raw_message = []
        const { id, msg } = data

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
                    if (Bot[id].id === user_id) {
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
                    if (i && Bot.qg.cfg.prefix && !Bot.qg.cfg.prefixBlack.includes(id)) {
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

    /** 转发 */
    async makeForwardMsg(forwardMsg, data = {}) {
        const message = {}
        const new_msg = []
        /** 防止报错 */
        if (!Array.isArray(forwardMsg)) forwardMsg = [forwardMsg]

        for (const i_msg of forwardMsg) {
            const msg = i_msg.message
            /** 处理无限套娃 */
            if (typeof msg === "object" && (msg?.data?.type === "test" || msg?.type === "xml")) {
                new_msg.push(...msg.msg)
            }
            /** 兼容喵崽更新抽卡记录 */
            else if (Array.isArray(msg)) {
                msg.forEach(i => {
                    if (typeof i === "string") {
                        new_msg.push({ type: "forward", text: i.trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") })
                    } else {
                        new_msg.push(i)
                    }
                })
            }
            /** 优先处理日志 */
            else if (typeof msg === "object" && /^#.*日志$/.test(data?.msg?.content)) {
                const splitMsg = msg.split("\n").map(i => {
                    if (!i || i.trim() === "") return
                    if (qg.cfg.cfg.分片转发) {
                        return { type: "forward", text: i.substring(0, 1000).trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") }
                    } else {
                        return { type: "forward", text: i.substring(0, 100).trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") }
                    }
                })
                new_msg.push(...splitMsg.slice(0, 50))
            }
            /** AT 表情包 */
            else if (typeof msg === "object") {
                new_msg.push(msg)
            }
            /** 普通文本 */
            else if (typeof msg === "string") {
                /** 正常文本 */
                new_msg.push({ type: "forward", text: msg.replace(/^\\n{1,3}|\\n{1,3}$/g, "") })
            }
            else {
                logger.error("未知字段，请反馈至作者：", msg)
            }
        }
        /** 对一些重复元素进行去重 */
        message.msg = Array.from(new Set(new_msg.map(JSON.stringify))).map(JSON.parse)
        message.data = { type: "test", text: "forward", app: "com.tencent.multimsg", meta: { detail: { news: [{ text: "1" }] }, resid: "", uniseq: "", summary: "" } }
        return message
    }

    /** 获取聊天记录 */
    async getChatHistory(appID, channel, msg_id) {
        const source = await Api.message(appID, channel, msg_id)
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
                card: "",
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
    log(e) {
        const name = Bot[e.uin].name
        let group_name
        if (e.message_type === "group") {
            group_name = e.group_name
        } else {
            group_name = e.guild_name + "私信"
        }
        return `${chalk.hex("#868ECC")(`[${name}]`)}频道消息：[${group_name}，${e.sender?.card || e.sender?.nickname}] ${e.raw_message}`
    }
}