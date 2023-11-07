import common from "../../model/common.js"
import SendMsg from "./sendMsg.js"
import api from "./api.js"

export default new class zaiMsg {
    /** 转换格式给云崽 */
    async msg(data) {
        const { self_id, user_id, group_id, message_type, message_id, sender } = data

        let raw_message = data.raw_message

        /** 判断是否群聊 */
        let isGroup = true

        /** 初始化e */
        let e = data

        if (data.post_type === "message") {
            /** 处理message，引用消息 */
            const { message, source } = await this.message(self_id, data.message)
            e.message = message
            if (source) {
                e.source = source
                e.source?.message = source?.raw_message
            }
        } else if (e.post_type === "notice" && e.sub_type === "poke") {
            e.action = "戳了戳"
            raw_message = `${e.operator_id} 戳了戳 ${e.user_id}`
            /** 私聊字段 */
            if (e?.sender_id) {
                isGroup = false
                e.notice_type = "private"
            } else {
                e.notice_type = "group"
            }
        }

        /** 先打印日志 */
        if (message_type === "private") {
            isGroup = false
            await common.log(self_id, `好友消息：[${sender?.nickname || sender?.card}(${user_id})] ${raw_message}`)
        } else {
            let group_name

            try {
                group_name = Bot[self_id].gl.get(group_id)?.group_name
            } catch {
                group_name = group_id
            }

            await common.log(self_id, `群消息：[${group_name}，${sender?.nickname || sender?.card}(${user_id})] ${raw_message}`)
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
        e.getAvatarUrl = (id = user_id) => {
            return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
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
                    last_sent_time: data?.time,
                },
                group_id: data?.group_id,
                is_admin: data?.sender?.role === "admin" || false,
                is_owner: data?.sender?.role === "owner" || false,
                /** 获取头像 */
                getAvatarUrl: () => {
                    return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${user_id}`
                },
                /** 椰奶禁言 */
                mute: async (time) => {
                    return await api.set_group_ban(self_id, group_id, user_id, time)
                },
            }
            e.group = {
                pickMember: (id) => {
                    /** 取缓存！！！别问为什么，因为傻鸟同步 */
                    let member = Bot[self_id].gml.get(group_id)?.[id]
                    try {
                        member.info = { ...member }
                    } catch {
                        member.info = {}
                    }
                    return {
                        member,
                        getAvatarUrl: (userId = id) => `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`
                    }
                },
                getChatHistory: async (msg_id, num) => {
                    let source = await api.get_msg(self_id, msg_id)
                    if (source?.message) {
                        const message = []
                        source.message.forEach(i => {
                            if (i.type === "at") {
                                message.push({ type: "at", qq: Number(i.data.qq) })
                            } else {
                                message.push({ type: i.type, ...i.data })
                            }
                        })
                        source.message = message
                    }
                    return [source]
                },
                recallMsg: async (msg_id) => {
                    return await api.delete_msg(self_id, msg_id)
                },
                sendMsg: async (msg, quote) => {
                    const peer_id = group_id
                    return await (new SendMsg(self_id, isGroup)).message(msg, peer_id, quote ? message_id : false)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                /** 戳一戳 */
                pokeMember: async (operator_id) => {
                    const peer_id = group_id
                    return await (new SendMsg(self_id, isGroup)).message({ type: "touch", data: { id: operator_id } }, peer_id)
                },
                /** 禁言 */
                muteMember: async (group_id, user_id, time) => {
                    return await api.set_group_ban(self_id, group_id, user_id, time)
                },
                /** 全体禁言 */
                muteAll: async (type) => {
                    return await api.set_group_whole_ban(self_id, group_id, type)
                },
                getMemberMap: async () => {
                    let group_Member = Bot[self_id].gml.get(group_id)
                    if (group_Member && Object.keys(group_Member) > 0) return group_Member
                    group_Member = new Map()
                    let member_list = await api.get_group_member_list(self_id, group_id)
                    member_list.forEach(user => {
                        group_Member.set(user.user_id, user)
                    })
                    return group_Member
                },
                /** 退群 */
                quit: async () => {
                    return await api.set_group_leave(self_id, group_id)
                },
                /** 设置管理 */
                setAdmin: async (qq, type) => {
                    return await api.set_group_admin(self_id, group_id, qq, type)
                },
                /** 踢 */
                kickMember: async (qq, reject_add_request = false) => {
                    return await api.set_group_kick(self_id, group_id, qq, reject_add_request)
                }
            }
        } else {
            e.friend = {
                sendMsg: async (msg, quote) => {
                    const peer_id = user_id
                    return await (new SendMsg(self_id, isGroup)).message(msg, peer_id, quote ? message_id : false)
                },
                recallMsg: async (msg_id) => {
                    return await api.delete_msg(self_id, msg_id)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                getChatHistory: async (msg_id, num) => {
                    let source = await api.get_msg(self_id, msg_id)
                    if (source?.message) {
                        const message = []
                        source.message.forEach(i => {
                            if (i.type === "at") {
                                message.push({ type: "at", qq: Number(i.data.qq) })
                            } else {
                                message.push({ type: i.type, ...i.data })
                            }
                        })
                        source.message = message
                    }
                    return [source]
                },
                getAvatarUrl: async (userID = user_id) => {
                    return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userID}`
                }
            }
        }

        /** 将收到的消息转为字符串 */
        e.toString = () => {
            return raw_message
        }

        /** 添加适配器标识 */
        e.adapter = "shamrock"

        return e
    }


    /** 处理云崽的message */
    async message(id, msg) {
        const message = []
        let source
        for (const i of msg) {
            if (i.type === "reply") {
                /** 引用消息的id */
                const msg_id = i.data.id
                /** id不存在滚犊子... */
                if (!msg_id) continue

                try {
                    let retryCount = 0

                    while (retryCount < 2) {
                        source = await api.get_msg(id, msg_id)

                        if (typeof source === "string") {
                            common.log(id, `获取引用消息内容失败，正在重试：第 ${retryCount} 次`)
                            retryCount++
                        } else {
                            break
                        }
                    }
                    if (typeof source === "string") {
                        common.log(id, `获取引用消息内容失败，重试次数上限，已终止`)
                        return { message, source }
                    }
                } catch (error) {
                    logger.error(error)
                }

                let reply = source.message.map(u => (u.type === "at" ? { type: u.type, qq: Number(u.data.qq) } : { type: u.type, ...u.data }))

                const raw_message = []
                for (let i of reply) {
                    switch (i.type) {
                        case "image":
                            raw_message.push("[图片]")
                            break
                        case "text":
                            i.texg ? raw_message.push(i.text) : ""
                            break
                        case "file":
                            raw_message.push("[文件]")
                            break
                        case "record":
                            raw_message.push("[语音]")
                            break
                        case "video":
                            raw_message.push("[视频]")
                            break
                        case "music":
                            raw_message.push("[音乐]")
                            break
                        case "weather":
                            raw_message.push("[天气]")
                            break
                        case "json":
                            raw_message.push("[json]")
                            break
                        case "at":
                            raw_message.push(`[@${i?.qq}]`)
                            break
                        default:
                            raw_message.push(JSON.stringify(i))
                            break
                    }
                }

                source = {
                    ...source,
                    reply,
                    seq: source.message_id,
                    user_id: source.sender.user_id,
                    raw_message: raw_message.join("").trim()
                }
            } else {
                if (i.type === "at") {
                    message.push({ type: "at", qq: Number(i.data.qq) })
                } else {
                    message.push({ type: i.type, ...i.data })
                }
            }
        }
        return { message, source }
    }
}