import { WebSocketServer } from "ws"
import common from "../../model/common.js"
import addBot from "./bot.js"
import zaiMsg from "./message.js"
import loader from "../../plugins/loader.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"

class Shamrock {
    async server(bot, request) {
        /** 获取机器人uin */
        const uin = request.headers["x-self-id"]

        if (!uin) {
            await common.log("shamrock", "没有提供机器人标识", "error")
            return bot.close()
        }

        const MapBot = Bot.shamrock.get(uin)
        if (MapBot && MapBot.state) {
            await common.log("shamrock", "重复的链接", "error")
            return bot.close()
        }

        /** 保存当前bot */
        Bot.shamrock.set(uin, {
            id: uin,
            socket: bot,
            state: false,
            "qq-ver": request.headers["x-qq-version"],
            "user-agent": request.headers["user-agent"]
        })

        bot.on("message", async (data) => {
            data = JSON.parse(data)
            /** 带echo事件另外保存 */
            if (data?.echo) {
                return Bot.lain.on.set(data.echo, data)
            }
            const event = {
                /** 产生连接 */
                lifecycle: async () => {
                    if (Bot.shamrock.get(uin)?.state) return
                    Bot.shamrock.set(uin, { ...Bot.shamrock.get(uin), state: true })
                    await common.log(uin, `建立连接成功，正在加载资源：${request.headers["user-agent"]}`)
                    return await addBot.loadRes(uin)
                },
                /** 心跳 */
                heartbeat: async () => {
                    return await common.log(uin, `心跳：${data.status["qq.status"]}`, "debug")
                },
                /** 消息事件 */
                message: async () => {
                    return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                },
                /** 戳一戳 */
                notice: async () => {
                    data.post_type = "notice"
                    switch (data.notice_type) {
                        case "group_recall":
                            if (data.operator_id === data.user_id) {
                                await common.log(uin, `群消息撤回：[${data.group_id}，${data.user_id}] ${data.message_id}`)
                            } else {
                                await common.log(uin, `群消息撤回：[${data.group_id}]${data.operator_id} 撤回 ${data.user_id}的消息 ${data.message_id} `)
                            }
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        case "group_increase": {
                            data.notice_type = "group"
                            let sub_type = data.sub_type
                            data.sub_type = "increase"
                            data.user_id = data.target_id
                            if (data.self_id === data.user_id) {
                                await common.log(uin, `机器人加入群聊：[${data.group_id}}]`)
                            } else {
                                switch (sub_type) {
                                    case "invite": {
                                        await common.log(uin, `[${data.operator_id}]邀请[${data.user_id}]加入了群聊[${data.group_id}] `)
                                    }
                                    default: {
                                        await common.log(uin, `新人${data.user_id}加入群聊[${data.group_id}] `)
                                    }
                                }
                            }
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        }
                        case "group_decrease": {
                            data.notice_type = "group"
                            data.sub_type = "decrease"
                            data.user_id = data.target_id
                            if (data.self_id === data.user_id) {
                                await common.log(uin, data.operator_id ? `机器人被[${data.operator_id}]踢出群聊：[${data.group_id}}]`
                                    : `机器人退出群聊：[${data.group_id}}]`)
                            } else {
                                await common.log(uin, data.operator_id ? `成员[${data.user_id}]被[${data.operator_id}]踢出群聊：[${data.group_id}}]`
                                    : `成员[${data.user_id}]退出群聊[${data.group_id}}]`)
                            }
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        }
                        case "group_admin": {
                            data.notice_type = "group"
                            data.set = data.sub_type === 'set'
                            data.sub_type = "admin"
                            data.user_id = data.target_id
                            if (data.self_id === data.user_id) {
                                await common.log(uin, data.set ? `机器人[${data.self_id}]在群[${data.group_id}]被设置为管理员` :
                                    `机器人[${data.self_id}]在群[${data.group_id}]被取消管理员`)
                            } else {
                                await common.log(uin, data.set ? `成员[${data.user_id}]在群[${data.group_id}]被设置为管理员` :
                                    `成员[${data.user_id}]在群[${data.group_id}]被取消管理员`)
                            }
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        }
                        case "group_ban": {
                            data.notice_type = "group"
                            if (data.sub_type === 'lift_ban') {
                                data.sub_type = "ban"
                                data.duration = 0
                            } else {
                                data.sub_type = "ban"
                            }
                            if (data.self_id === data.target_id) {
                                await common.log(uin, data.duration === 0 ? `机器人[${data.self_id}]在群[${data.group_id}]被解除禁言` :
                                    `机器人[${data.self_id}]在群[${data.group_id}]被禁言${data.duration}秒`)
                            } else {
                                await common.log(uin, data.duration === 0 ? `成员[${data.target_id}]在群[${data.group_id}]被解除禁言` :
                                    `成员[${data.target_id}]在群[${data.group_id}]被禁言${data.duration}秒`)
                            }
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        }
                        case "group_apply": {
                            data.post_type = "request"
                            data.request_type = "group"
                            data.user_id = data.operator_id
                            data.tips = data.tips || data.comment || data.tip
                            await common.log(uin, `[${data.user_id}]申请入群[${data.group_id}]: ${data.tips}`)
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        }
                        case "friend_apply":
                        case "friend_add": {
                            data.post_type = "request"
                            data.request_type = "friend"
                            data.comment = data.comment || data.tip
                            await common.log(uin, `[${data.user_id}]申请加机器人[${data.self_id}]好友: ${data.tips}`)
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        }
                        case "notify":
                            switch (data.sub_type) {
                                case "poke": {
                                    await common.log(uin, `[${data.operator_id}]戳了戳[${data.target_id}]好友`)
                                    break
                                }
                                default:
                            }
                            return await loader.deal.call(pluginsLoader, await zaiMsg.msg(data))
                        default:
                            return
                    }
                }
            }
            try {
                await event[data?.meta_event_type || data?.post_type]()
            } catch (error) {
                logger.error(error)
                logger.mark("未知事件：", data)
            }
        })

        bot.on("close", async () => {
            Bot.shamrock.set(uin, { ...Bot.shamrock.get(uin), state: false })
            await common.log(uin, "连接已关闭", "error")
            // Bot.shamrock.delete(uin)
        })
    }
}

/** Shamrock的WebSocket服务器实例 */
const shamrock = new WebSocketServer({ noServer: true })

shamrock.on("connection", async (bot, request) => {
    await new Shamrock().server(bot, request)
})

/** 捕获错误 */
shamrock.on("error", async error => {
    if (error.code === "EADDRINUSE") {
        const msg = `Shamrock：启动WS服务器失败，端口${this.port}已被占用，请自行解除端口`
        return await common.log(this.id, msg, "error")
    }
    const msg = `Shamrock - 发生错误：${error.message}`
    await common.log(this.id, msg, "error")
    return await common.log(this.id, msg, "debug")
})

export default shamrock
