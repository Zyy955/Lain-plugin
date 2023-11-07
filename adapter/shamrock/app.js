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

        /** 保存当前bot */
        Bot.shamrock.set(uin, {
            id: uin,
            socket: bot,
            "qq-ver": request.headers["x-qq-version"],
            "user-agent": request.headers["user-agent"]
        })

        bot.on("message", async (data) => {
            data = JSON.parse(data)
            logger.debug(`shamrock(${uin}):`, data)
            /** 带echo事件另外保存 */
            if (data?.echo) {
                return Bot.lain.on.set(data.echo, data)
            }
            const event = {
                /** 产生连接 */
                lifecycle: async () => {
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
                    switch (data.notice_type) {
                        case "group_recall":
                            if (data.operator_id === data.user_id) {
                                return await common.log(uin, `群消息撤回：[${data.group_id}，${data.user_id}] ${data.message_id}`)
                            } else {
                                return await common.log(uin, `群消息撤回：[${data.group_id}]${data.operator_id} 撤回 ${data.user_id}的消息 ${data.message_id} `)
                            }
                        case "notify":
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