import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import api from "./api.js"
import common from "../../model/common.js"
import { fileTypeFromBuffer } from "file-type"

export default class SendMsg {
    /** 传入基本配置 */
    constructor(id, data) {
        /** 开发者id */
        this.id = id
        const { group_id, detail_type, user_id } = data
        this.group_id = group_id
        this.user_id = user_id
        this.detail_type = detail_type
    }

    /** 发送消息 */
    async message(msg) {
        /** 将云崽过来的消息统一为数组 */
        msg = await common.array(msg)
        /** 发送 */
        return await this.wc_msg(msg)
    }

    /** 转换格式并发送消息 */
    async wc_msg(msg) {
        const content = []
        /** 单独存储多图片，严格按照图片顺序进行发送 */
        const ArrImg = []

        /** chatgpt-plugin */
        if (msg?.[0].type === "xml") msg = msg?.[0].msg

        for (const i of msg) {
            /** 加个延迟防止过快 */
            await common.sleep(200)
            switch (i.type) {
                case "at":
                    content.push({
                        type: "mention",
                        data: { user_id: String(i.qq) == 0 ? i.id : i.qq }
                    })
                    break
                case "face":
                    content.push(`[emoji:${i.text}]`)
                    break
                case "text":
                    content.push({
                        type: "text",
                        data: { text: i.text.replace("<lora", "lora") }
                    })
                    break
                case "emoji":
                    content.push({
                        type: "wx.emoji",
                        data: { file_id: i.text }
                    })
                case "file":
                    break
                case "record":
                    break
                case "video":
                    break
                case "image":
                    const img = await this.get_file_id(i)
                    if (img?.type === "text") {
                        content.push(img)
                    } else {
                        ArrImg.push(img)
                    }
                    break
                case "forward":
                    content.push({
                        type: "text",
                        data: { text: content.length > 0 ? `\n${i.text.replace("<lora", "lora")}` : i.text.replace("<lora", "lora") }
                    })
                    break
                default:
                    content.push(JSON.stringify(i))
                    break
            }
        }

        /** 返回结果 */
        let res
        /** 发送消息 */
        if (content.length > 0) {
            await api.send_message(this.detail_type, this.group_id || this.user_id, content)
        }

        await common.sleep(200)

        /** 发送图片 */
        if (ArrImg.length > 0) {
            res = await api.send_message(this.detail_type, this.group_id || this.user_id, ArrImg)
        }
        return res
    }

    /** 上传图片获取图片id */
    async get_file_id(i) {
        let name
        let type = "data"
        let file = i.file

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
            name = `${Date.now()}.${(await fileTypeFromBuffer(Buffer.from(file, "base64"))).ext}`
        }
        /** 本地文件 */
        else if (fs.existsSync(file)) {
            name = path.basename(file)
            file = fs.readFileSync(file).toString("base64")
        }
        /** url图片 */
        else if (/^http(s)?:\/\//.test(file)) {
            file = Buffer.from(await (await fetch(file)).arrayBuffer()).toString("base64")
            name = `${Date.now()}.${(await fileTypeFromBuffer(Buffer.from(file, "base64"))).ext}`
        }
        /** 留个容错防止炸了 */
        else {
            await common.log(this.id, i, "error")
            return { type: "text", data: { text: "未知格式...请寻找作者适配..." } }
        }

        /** 上传文件 获取文件id */
        let file_id
        /** 如果获取为空 则进行重试 最多3次 */
        for (let retries = 0; retries < 3; retries++) {
            file_id = (await api.upload_file(type, name, file))?.file_id
            if (file_id) break
            else logger.error(`第${retries + 1}次上传文件失败，正在重试...`)
        }

        /** 处理文件id为空 */
        if (!file_id) return { type: "text", data: { text: "图片上传失败..." } }

        /** 特殊处理表情包 */
        if (/.gif$/.test(name)) {
            return { type: "wx.emoji", data: { file_id: file_id } }
        } else {
            return { type: "image", data: { file_id: file_id } }
        }
    }
}