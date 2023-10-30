import fs from "fs"
import { randomUUID } from "crypto"
import common from "../../model/common.js"

export default class SendMsg {
    /** 传入基本配置 */
    constructor(id, isGroup = true) {
        /** 机器人uin */
        this.id = id
        /** 是否群聊 */
        this.isGroup = isGroup
    }

    /** 发送消息 */
    async message(msg, id, quote = false) {
        /** 将云崽过来的消息统一为数组 */
        msg = common.array(msg)
        /** 转为shamrock可以使用的格式 */
        msg = await this.msg(msg)
        /** 引用消息 */
        if (quote) msg.push({ type: "reply", data: { id: quote } })
        /** 发送消息 */
        this.SendMsg(msg, id)
    }

    /** 转为shamrock可以使用的格式 */
    async msg(msg) {
        if (!Array.isArray(msg)) msg = [{ type: "text", text: msg }]
        const content = []
        /** chatgpt-plugin */
        if (msg?.[0].type === "xml") msg = msg?.[0].msg

        for (const i of msg) {
            /** 加个延迟防止过快 */
            await common.sleep(200)
            switch (i.type) {
                case "at":
                    content.push({
                        type: "at",
                        data: { user_id: Number(i.qq) == 0 ? i.id : i.qq }
                    })
                    break
                case "face":
                    content.push({
                        type: "face",
                        data: { id: i.text }
                    })
                    break
                case "text":
                    content.push({
                        type: "text",
                        data: { text: i.text }
                    })
                    break
                case "file":
                    break
                case "record":
                    /** 不清楚是否可以发送魔法语音，暂不处理 */
                    if (i.url) {
                        content.push({
                            type: "record",
                            data: { url: i.url }
                        })
                    } else {
                        content.push({
                            type: "record",
                            data: { file: i.file.replace("protobuf://", "base64://") }
                        })
                    }
                    break
                case "video":
                    content.push({
                        type: "video",
                        data: { file: i.file.replace("protobuf://", "base64://") }
                    })
                    break
                case "image":
                    content.push(await this.get_image(i))
                    break
                case "forward":
                    content.push({
                        type: "text",
                        data: { text: i.text }
                    })
                    break
                default:
                    content.push({
                        type: "text",
                        data: { text: JSON.stringify(i) }
                    })
                    break
            }
        }
        return content
    }

    /** 统一图片格式 */
    async get_image(i) {
        let file
        /** 特殊格式？... */
        if (i.file?.type === "Buffer") {
            file = `base64://${Buffer.from(i.file.data).toString("base64")}`
        }
        /** 将二进制的base64转字符串 防止报错 */
        else if (i.file instanceof Uint8Array) {
            file = `base64://${Buffer.from(i.file).toString("base64")}`
        }
        /** 天知道从哪里蹦出来的... */
        else if (i.file instanceof fs.ReadStream) {
            file = `./${i.file.path}`
        }
        /** 去掉本地图片的前缀 */
        else if (typeof i.file === "string") {
            file = i.file.replace(/^file:\/\//, "") || i.url
        }

        /** base64 */
        if (/^base64:\/\//.test(file)) {
            file = file.replace(/^base64:\/\//, "")
        }
        /** 本地文件 */
        else if (fs.existsSync(file)) {
            file = fs.readFileSync(file).toString("base64")
        }
        /** url图片 */
        else if (/^http(s)?:\/\//.test(file)) {
            return { type: "image", data: { url: file } }
        }
        /** 留个容错防止炸了 */
        else {
            await common.log(this.id, i, "error")
            return { type: "text", data: { text: "未知格式...请寻找作者适配..." } }
        }

        return { type: "image", data: { file: `base64://${file}` } }
    }

    /** 发送消息 */
    async SendMsg(msg, id) {
        const bot = Bot.shamrock.get(String(this.id))
        if (!bot) return common.log(this.id, "不存在此Bot")

        const echo = randomUUID()
        const action = this.isGroup ? "send_group_msg" : "send_private_msg"
        const params = { [this.isGroup ? "group_id" : "user_id"]: id, message: msg }

        return new Promise((resolve) => {
            bot.socket.once("message", (res) => {
                const data = JSON.parse(res)
                const msg_id = data?.data?.id
                /** 返回消息id给撤回用？ */
                resolve({
                    seq: msg_id,
                    rand: 1,
                    time: data?.data?.time,
                    message_id: msg_id
                })
            })
            bot.socket.send(JSON.stringify({ echo, action, params }))
        })
    }
}