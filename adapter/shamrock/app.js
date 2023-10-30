import { WebSocketServer } from "ws"
import express from "express"
import { createServer } from "http"
import common from "../../model/common.js"
import { randomUUID } from "crypto"
import SendMsg from "./sendMsg.js"
import api from "./api.js"
import loader from "../../plugins/loader.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"

export default class shamrock {
    constructor() {
        const port = 2956
        const path = "/Shamrock"
        this.port = port
        this.path = path
    }

    async server() {
        /** 存储连接的bot对象 */
        Bot.shamrock = new Map()
        /** 创建Express应用程序 */
        const app = express()
        /** 创建HTTP服务器 */
        const httpServer = createServer(app)
        /** 创建WebSocket服务器实例 */
        const wss = new WebSocketServer({ noServer: true })

        wss.on("connection", async (bot, request) => {
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
                /** 丢弃带echo的事件 */
                if (data?.echo) return
                const event = {
                    /** 产生连接 */
                    lifecycle: async () => {
                        await common.log(uin, `建立连接成功，正在加载资源`)
                        return await this.loadRes(uin)
                    },
                    /** 心跳 */
                    heartbeat: async () => {
                        return await common.log(uin, `心跳：${data.status["qq.status"]}`, "debug")
                    },
                    message: async () => {
                        return await loader.deal.call(pluginsLoader, await this.msg(data))
                    }
                }
                try {
                    await event[data?.meta_event_type || data?.post_type]()
                } catch (error) {
                    // logger.error(error)
                    logger.mark("未知事件：", data)
                }
            })

            bot.on("close", async () => {
                await common.log(uin, "连接已关闭", "error")
                Bot.shamrock.delete(uin)
            })
        })

        /** 将WebSocket服务器实例与HTTP服务器关联 */
        httpServer.on("upgrade", (request, socket, head) => {
            const pathname = request.url

            if (pathname === this.path) {
                wss.handleUpgrade(request, socket, head, (socket) => {
                    wss.emit("connection", socket, request)
                })
            } else {
                socket.destroy()
            }
        })

        httpServer.listen(this.port, async () => {
            await common.log("", `本地 Shamrock 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path}`)}`)
        })
    }

    /** 转换格式给云崽 */
    async msg(data) {
        /** 机器人id */
        const id = data.self_id
        /** 判断是否群聊 */
        let isGroup = true
        /** 先打印日志 */
        if (data.message_type === "private") {
            isGroup = false
            await common.log(id, `好友消息：[${data.user_id}] ${data.raw_message}`)
        } else {
            await common.log(id, `群消息：[${data.group_id}，${data.user_id}] ${data.raw_message}`)
        }

        /** 初始化e */
        let e = data

        /** 添加适配器标识 */
        e.adapter = "shamrock"

        /** 格式化message */
        e.message = this.message(data.message)

        /** 快速撤回 */
        e.recall = async () => {
            return await api.delete_msg(id, data.message_id)
        }
        /** 快速回复 */
        e.reply = async (msg, quote) => {
            const peer_id = isGroup ? data.group_id : data.user_id
            return await (new SendMsg(id, isGroup)).message(msg, peer_id, quote ? data.message_id : false)
        }
        /** 将收到的消息转为字符串 */
        e.toString = () => {
            return data.raw_message
        }

        /** 获取对应用户头像 */
        e.getAvatarUrl = (userID = data.user_id) => {
            return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userID}`
        }

        /** 构建场景对应的方法 */
        if (isGroup) {
            e.group = {
                pickMember: async (user_ID) => {
                    let member = await api.get_group_member_info(id, data.group_id, user_ID)
                    /** 获取头像 */
                    member.getAvatarUrl = (userID = data.user_id) => {
                        return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userID}`
                    }
                    const { group_id, user_id, nickname, last_sent_time } = member
                    member.info = { group_id, user_id, nickname, last_sent_time }
                    return member
                },
                getChatHistory: async (msg_id, num) => {
                    return ["test"]
                },
                recallMsg: async (msg_id) => {
                    return await api.delete_msg(id, msg_id)
                },
                sendMsg: async (msg, quote) => {
                    const peer_id = data.group_id
                    return await (new SendMsg(id, quote ? data.message_id : false)).message(msg, peer_id)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                }
            }
        } else {
            e.friend = {
                sendMsg: async (msg, quote) => {
                    const peer_id = data.user_id
                    return await (new SendMsg(id, quote ? data.message_id : false)).message(msg, peer_id)
                },
                recallMsg: async (msg_id) => {
                    return await api.delete_msg(id, msg_id)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                getChatHistory: async (msg_id, num) => {
                    return ["test"]
                },
                getAvatarUrl: async (userID = data.user_id) => {
                    return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userID}`
                }
            }
        }

        return e
    }


    /** 处理云崽的message */
    message(msg) {
        const message = []
        for (const i of msg) {
            message.push({ type: i.type, ...i.data })
        }
        return message
    }

    /** 加载资源 */
    async loadRes(uin) {
        /** 获取bot自身信息 */
        const info = await api.get_login_info(uin)
        const bot = Bot.shamrock.get(String(uin))
        /** 构建基本参数 */
        Bot[uin] = {
            /** 好友列表 */
            fl: new Map(),
            /** 群列表 */
            gl: new Map(),
            gml: new Map(),
            uin: uin,
            nickname: info.nickname,
            avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${uin}`,
            stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
            apk: { display: bot["qq-ver"].split(" ")[0], version: bot["qq-ver"].split(" ")[1] },
            version: { id: "QQ", name: "Shamrock", version: bot["user-agent"].replace("Shamrock/", "") },
            /** 转发 */
            makeForwardMsg: async (forwardMsg) => {
                return await common.makeForwardMsg(forwardMsg)
            },
            pickGroup: (group_id) => {
                return {
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin)).message(msg, group_id)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            },
            pickUser: (user_id) => {
                return {
                    sendMsg: async (msg) => {
                        return await (new SendMsg(uin, false)).message(msg, user_id)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            },
            getGroupMemberInfo: async function (group_id, user_id) {
                let member = await api.get_group_member_info(uin, group_id, user_id)
                member.card = member.nickname
                return member
            }
        }

        /** 注册uin */
        if (!Bot?.adapter) {
            Bot.adapter = [Bot.uin, uin]
        } else {
            Bot.adapter.push(uin)
            /** 去重防止断连后出现多个重复的id */
            Bot.adapter = Array.from(new Set(Bot.adapter.map(JSON.stringify))).map(JSON.parse)
        }

        /** 获取群聊列表啦~ */
        let group_list
        for (let retries = 0; retries < 5; retries++) {
            group_list = await api.get_group_list(uin)
            if (!(group_list && Array.isArray(group_list))) {
                await common.log(uin, `Shamrock群列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 群列表获取失败 */
        if (!group_list) {
            await common.log(uin, `Shamrock群列表获取失败次数过多，已停止重试`, "error")
        }

        if (group_list && typeof group_list === "object") {
            for (let i of group_list) {
                /** 给锅巴用 */
                Bot.gl.set(i.group_id, i)
                /** 自身参数 */
                Bot[uin].gl.set(i.group_id, i)
            }
        }

        /** 好友列表 */
        let friend_list
        for (let retries = 0; retries < 5; retries++) {
            friend_list = await api.get_friend_list(uin)
            if (!(friend_list && Array.isArray(friend_list))) {
                await common.log(uin, `Shamrock好友列表获取失败，正在重试：${retries + 1}`, "error")
            }
            await common.sleep(1000)
        }

        /** 好友列表获取失败 */
        if (!group_list) {
            await common.log(uin, `Shamrock好友列表获取失败次数过多，已停止重试`, "error")
        }

        if (friend_list && typeof friend_list === "object") {
            for (let i of friend_list) {
                /** 给锅巴用 */
                Bot.fl.set(i.user_id, i)
                /** 自身参数 */
                Bot[uin].fl.set(i.user_id, i)
            }
        }

        await common.log(uin, "Shamrock加载资源成功")
    }

    /** 发送请求 */
    async SendApi(id, action, params) {
        const bot = Bot.shamrock.get(String(id))
        if (!bot) return common.log(id, "不存在此Bot")
        return new Promise((resolve) => {
            bot.socket.once("message", (res) => {
                const data = JSON.parse(res)
                resolve(data?.data || data)
            })
            bot.socket.send(JSON.stringify({ echo: randomUUID(), action, params }))
        })
    }
}