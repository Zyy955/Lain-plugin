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
        const { content, CQ } = await this.msg(msg)
        msg = content
        /** 引用消息 */
        if (quote) msg.unshift({ type: "reply", data: { id: quote } })
        /** 发送消息 */
        return await this.SendMsg(id, msg, CQ)
    }

    /** 转为shamrock可以使用的格式 */
    async msg(msg) {
        if (!Array.isArray(msg)) msg = [{ type: "text", text: msg }]
        const content = []
        const CQ = []
        const image = []
        let forward = []
        /** chatgpt-plugin */
        if (msg?.[0].type === "xml") msg = msg?.[0].msg

        for (let i of msg) {
            /** 加个延迟防止过快 */
            await common.sleep(200)
            switch (i.type) {
                case "at":
                    CQ.push(`[CQ:at,qq=${Number(i.qq) == 0 ? i.id : i.qq}]`)
                    content.push({
                        type: "at",
                        data: { qq: Number(i.qq) == 0 ? i.id : i.qq }
                    })
                    break
                case "face":
                    CQ.push(`[CQ:face,id=${i.text}]`)
                    content.push({
                        type: "face",
                        data: { id: i.text }
                    })
                    break
                case "text":
                    CQ.push(`[CQ:text,text=${i.text}]`)
                    forward.push(i.text)
                    break
                case "file":
                    break
                case "record":
                    if (i?.url) i.file = i.url
                    CQ.push(`[CQ:record,file=${i.file}]`)
                    content.push({
                        type: "record",
                        data: { file: i.file }
                    })
                    break
                case "video":
                    CQ.push(`[CQ:video,file=${i.file}]`)
                    content.push({
                        type: "video",
                        data: { file: i.file.replace("protobuf://", "base64://") }
                    })
                    break
                case "image":
                    CQ.push(`[CQ:image,file=base64://...]`)
                    image.push(await this.get_image(i))
                    break
                case "poke":
                    CQ.push(`[CQ:poke,id=${i.id}]`)
                    content.push({
                        type: "poke",
                        data: { type: i.id, id: 0, strength: i?.strength || 0 }
                    })
                    break
                case "touch":
                    CQ.push(`[CQ:poke,id=${i.id}]`)
                    content.push(i)
                    break
                case "forward":
                    CQ.push(`[CQ:text,text=${i.text}]`)
                    forward.push(forward.length > 0 ? `${i.text}\n` : i.text)
                    break
                default:
                    CQ.push(`[CQ:text,text=${JSON.stringify(i)}]`)
                    content.push({
                        type: "text",
                        data: { text: JSON.stringify(i) }
                    })
                    break
            }
        }
        forward = forward.join("\n").trim()
        content.push({ type: "text", data: { text: forward } })
        content.push(...image)
        return { content, CQ }
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
            return { type: "image", data: { file, url: file } }
        }
        /** 留个容错防止炸了 */
        else {
            await common.log(this.id, i, "error")
            return { type: "text", data: { text: "未知格式...请寻找作者适配..." } }
        }

        return { type: "image", data: { file: `base64://${file}` } }
    }

    /** 发送消息 */
    async SendMsg(id, msg, CQ) {
        const bot = Bot.shamrock.get(String(this.id))
        if (!bot) return common.log(this.id, "不存在此Bot")

        const echo = randomUUID()
        const action = this.isGroup ? "send_group_msg" : "send_private_msg"
        const params = { [this.isGroup ? "group_id" : "user_id"]: id, message: msg }
        common.log(this.id, `发送${this.isGroup ? "群" : "好友"}${CQ.join("")}`)

        bot.socket.send(JSON.stringify({ echo, action, params }))

        for (let i = 0; i < 10; i++) {
            let data = await Bot.lain.on.get(echo)
            if (data) {
                Bot.lain.on.delete(echo)
                try {
                    if (Object.keys(data?.data).length > 0 && data?.data) {
                        data.seq = data?.data?.message_id
                        data.rand = 1
                        return data?.data || data
                    }
                    return data
                } catch {
                    return data
                }
            } else {
                await common.sleep(500)
            }
        }

        /** 获取失败 */
        return "获取失败"
    }
}
