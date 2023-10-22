import fs from "fs"
import chalk from "chalk"
import { URL } from "url"
import Api from "./api.js"
import lodash from "lodash"
import qrcode from "qrcode"
import fetch from "node-fetch"
import { FormData, Blob } from "node-fetch"
import common from "../../../lib/common/common.js"
import puppeteer from "../../../lib/puppeteer/puppeteer.js"


export default new class SendMsg {
    /** 处理消息 */
    async message(data, msg, reference) {
        this.reference = reference
        /** 统一为数组 */
        msg = this.Array(msg)
        /** 转为api格式、打印日志、发送 */
        return await this.qg_msg(data, msg, reference)
    }

    /** 将云崽过来的消息全部统一格式存放到数组里面 */
    Array(msg) {
        let newMsg = []
        /** 将格式统一为对象 随后进行转换成api格式 */
        if (msg?.[1]?.data?.type === "test") {
            newMsg.push({ type: "forward", text: msg[0] })
            newMsg.push(...msg[1].msg)
        }
        else if (msg?.data?.type === "test") {
            newMsg.push(...msg.msg)
        }
        else if (Array.isArray(msg)) {
            newMsg = [].concat(...msg.map(i => (typeof i === "string" ? [{ type: "text", text: i }] :
                Array.isArray(i) ? [].concat(...i.map(format => (typeof format === "string" ? [{ type: "text", text: format }]
                    : typeof format === "object" && format !== null ? [format] : []))) : typeof i === "object" && i !== null ? [i] : []
            )))
        }
        else if (msg instanceof fs.ReadStream) {
            newMsg.push({ type: "image", file: `file://./${msg.file.path}` })
        }
        else if (msg instanceof Uint8Array) {
            newMsg.push({ type: "image", file: msg })
        }
        else if (typeof msg === "object") {
            newMsg.push(msg)
        }
        else {
            newMsg.push({ type: "text", text: msg })
        }
        return newMsg
    }

    /** 转为频道格式的消息 */
    async qg_msg(data, msg, reference) {
        let image = {}
        let content = []
        const images = []
        const data_msg = data.msg
        /** chatgpt-plugin */
        if (msg?.[0].type === "xml") msg = msg?.[0].msg

        for (const i of msg) {
            /** 加个延迟防止过快 */
            await common.sleep(200)
            switch (i.type) {
                case "at":
                    if (i.text === data_msg?.author?.username) content.push(`<@${data_msg?.author?.id}>`)
                    else content.push(`<@${String(i.qq == 0 ? i.id : i.qq).replace("qg_", "")}>`)
                    break
                case "face":
                    content.push(`<emoji:${i.text}>`)
                    break
                case "text":
                    content.push(await this.urlHandler(data, i.text))
                    break
                case "image":
                    /** 多图片只保留第一个一起发 其他分片发送 */
                    const img = await this.Base64(i)
                    if (Object.keys(image).length > 0) images.push(img)
                    else image = img
                    break
                case "forward":
                    /** 转发消息 */
                    if (Bot.qg.cfg.forwar) {
                        /** 构建请求参数、打印日志 */
                        const SendMsg = await this.Construct_data(data, {
                            ...image || null,
                            content: await this.urlHandler(data, i.text)
                        }, false)
                        await this.SendMsg(data, SendMsg)
                    } else {
                        content.push(await this.urlHandler(data, `${i.text}\n\n`))
                    }
                    break
                default:
                    content.push(JSON.stringify(i))
                    break
            }
        }

        content = content.join("").replace(/\n{1,2}$/g, '').replace(/\n{3,4}/g, '\n')
        const Api_msg = { content: content, ...image }
        if (!content && content === "" && Object.keys(image).length === 0) return
        const SendMsg = await this.Construct_data(data, Api_msg, reference)
        const res = await this.SendMsg(data, SendMsg)

        /** 处理分片 */
        if (images.length > 0) {
            for (const i of images) {
                /** 延迟下... */
                await common.sleep(200)
                /** 构建请求参数、打印日志 */
                const SendMsg = await this.Construct_data(data, i, false)
                await this.SendMsg(data, SendMsg)
            }
        }
        return res
    }

    /** 对url进行特殊处理，防止发送失败 */
    async urlHandler(data, msg) {
        if (typeof msg !== 'string') return msg
        const urls = Bot.qg.cfg.whitelist_Url
        const whiteRegex = new RegExp(`\\b(${urls.map(url => url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
        /** 将url转二维码 */
        if (!msg.match(whiteRegex)) {
            const urlRegex = /(https?:\/\/)?(([0-9a-z.-]+\.[a-z]+)|(([0-9]{1,3}\.){3}[0-9]{1,3}))(:[0-9]+)?(\/[0-9a-z%/.\-_#]*)?(\?[0-9a-z=&%_\-.]*)?(\#[0-9a-z=&%_\-]*)?/ig
            if (urlRegex.test(msg)) {
                /** 二次检测 防止奇怪的url */
                const url_a = (s, protocols = ["http", "https"]) => {
                    try {
                        new URL(s.match(/^[a-zA-Z]+:\/\//) ? s : `${protocols[0]}://${s}`)
                        return true
                    } catch (err) {
                        return protocols.length > 1 ? url_a(s, protocols.slice(1)) : false
                    }
                }
                return msg.replace(urlRegex, url => {
                    /** 二次确认当前是否为url */
                    if (!url_a(url)) return url
                    logger.info(logger.green(`未通过url白名单，正在转为二维码发送...\n初始URL：${url}`))
                    qrcode.toBuffer(url, {
                        errorCorrectionLevel: "H",
                        type: "png",
                        margin: 4,
                        text: url
                    }, async (err, buffer) => {
                        if (err) throw err
                        const base64 = "base64://" + buffer.toString("base64")
                        const Uint8Array = await this.picture_reply(base64, url)
                        const Api_msg = { content: "", type: "file_image", image: Uint8Array, log: "{image：base64://...}" }
                        /** 转换的二维码连接是否撤回 */
                        const qr = Number(Bot.qg.cfg.recallQR) || 0
                        /** 构建请求参数、打印日志 */
                        const SendMsg = await this.Construct_data(data, Api_msg, false)
                        await this.SendMsg(data, SendMsg, qr)
                    })

                    return "{请扫码查看链接}"
                })
            }
            return msg
        } else {
            return msg
        }
    }

    /** 处理各种牛马格式的图片 返回二进制base64 { type, image: base64, log } TMD */
    async Base64(msg) {
        let log = `{image：base64://...}`
        let type = "file_image"
        let base64
        /** 米游社公告类 */
        let file = msg.file

        /** 特殊处理本地文件 */
        if (typeof file === "string") {
            if (fs.existsSync(file.replace(/^file:[/]{0,2}/, ""))) {
                base64 = fs.readFileSync(file.replace(/^file:[/]{0,2}/, ""))
                return { type, image: base64, log }

            } else if (fs.existsSync(file.replace(/^file:[/]{0,3}/, ""))) {
                base64 = fs.readFileSync(file.replace(/^file:[/]{0,3}/, ""))
                return { type, image: base64, log }
            }
        }


        /** 套娃的二进制base64 */
        if (msg.file.type === "Buffer") {
            if (!(msg.file.data instanceof Uint8Array)) {
                base64 = new Uint8Array(msg.file.data)
            } else {
                base64 = msg.file.data
            }
        }
        /** 天知道从哪里蹦出来的... */
        else if (file instanceof fs.ReadStream) {
            base64 = fs.readFileSync(`./${msg.file.path}`)
        }
        /** Uint8Array */
        else if (file instanceof Uint8Array) {
            base64 = file
        }

        /** 检测是否为频道下发图片 复读表情包用... */
        else if (typeof file === "string" && msg.url) {
            base64 = new Uint8Array(await (await fetch(msg.url)).arrayBuffer())
        }
        /** 判断url是否为白名单，否则缓存图片转为二进制 */
        else if (typeof file === "string" && /^(https|http):\/\//.test(file)) {
            const urls = Bot.qg.cfg.whitelist_Url
            const whiteRegex = new RegExp(`\\b(${urls.map(url =>
                url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
            if (!file.match(whiteRegex)) {
                /** 下载图片转为base64 */
                base64 = new Uint8Array(await (await fetch(file)).arrayBuffer())
            } else {
                log = `{image：${file}}`
                type = "url"
                base64 = file
            }
        }
        /** 字符串格式的base64 */
        else if (typeof file === "string") {
            base64 = Buffer.from(file.replace(/^base64:\/\//, ""), "base64")
        } else {
            logger.error("未适配字段，请反馈:", msg)
        }
        return { type, image: base64, log }
    }

    /** 构建请求参数并打印日志 */
    async Construct_data(data, Api_msg, reference) {
        let logs = ""
        let SendMsg = {}
        const { msg } = data
        let { content, type, image, log } = Api_msg
        switch (type) {
            case "file_image":
                logs += log
                SendMsg = new FormData()
                if (msg?.id) SendMsg.set("msg_id", msg.id)
                try {
                    /** 检测大小 */
                    let sizeInMB = image?.byteLength / (1024 * 1024)
                    /** 动态导入 */
                    const sharp = (await import("sharp")).default
                    if (sharp && sizeInMB > Number(Bot.qg.cfg.ImageSize)) {
                        await sharp(image)
                            /** 宽度像素 */
                            .resize({ width: Bot.qg.cfg.width })
                            /** 质量 */
                            .jpeg({ quality: Bot.qg.cfg.quality })
                            .toBuffer()
                            .then(data => {
                                SendMsg.set("file_image", new Blob([data]))
                            })
                    } else {
                        if (!sharp) logger.error("[QQ频道]缺少 sharp 依赖，请运行 pnpm install -P 或 pnpm i 进行安装依赖~")
                        /** 如果图片大小不超过2.5MB，那么直接存入SendMsg */
                        SendMsg.set("file_image", new Blob([image]))
                    }
                } catch (err) {
                    /** 产生错误直接存入即可 */
                    SendMsg.set("file_image", new Blob([image]))
                }
                break
            case "url":
                logs += Api_msg.log
                /** 引用消息 */
                if (reference) {
                    SendMsg.message_reference = {
                        message_id: msg?.id,
                        ignore_get_message_error: true
                    }
                }
                SendMsg.image = image
                if (msg?.id) SendMsg.msg_id = msg.id
                break
            default:
                /** 引用消息 */
                if (reference) {
                    SendMsg.message_reference = {
                        message_id: msg?.id,
                        ignore_get_message_error: true
                    }
                }
                if (msg?.id) SendMsg.msg_id = msg.id
                break
        }
        /** 文本 */
        if (content) {
            if (SendMsg instanceof FormData) {
                SendMsg.set("content", content)
            } else {
                SendMsg.content = content
            }
            logs += content

            /** 存一份原始消息，用于后续发送失败渲染图片 */
            data.content = content
        }
        this.log(data, logs)
        return SendMsg
    }

    /** 打印日志 */
    log(data, logs) {
        const { id, group_name } = data
        const bot = chalk.hex("#868ECC")(`[${Bot[id].name}]`) + "发送消息："
        switch (data.eventType) {
            /** 私信 */
            case "DIRECT_MESSAGE_CREATE":
                logger.info(`${bot}[${group_name}] ${logs}`)
                break
            case "MESSAGE_CREATE":
                logger.info(`${bot}[${group_name}] ${logs}`)
                break
            case "AT_MESSAGE_CREATE":
                logger.info(`${bot}[${group_name}] ${logs}`)
                break
            default:
                logger.error("未知场景：", data)
        }
    }

    /** 向API发送消息 */
    async SendMsg(data, SendMsg, qr = 0) {

        /** 随机延迟 */
        await common.sleep(lodash.random(100, 300))

        const { id, msg } = data
        const msg_id = msg.id
        const { guild_id, channel_id } = msg

        /** 发送消息并储存res */
        let res
        try {
            /** 判断频道还是私聊 */
            data.eventType === "DIRECT_MESSAGE_CREATE"
                ? res = await Api.postDirectMessage(id, guild_id, SendMsg)
                : res = await Api.postMessage(id, channel_id, SendMsg)
        } catch (error) {
            logger.error(`${Bot[id].name} 发送消息错误，正在转成图片重新发送...\n错误信息：`, error)
            /** 转换为图片发送 */
            let image = new FormData()
            if (msg_id) image.set("msg_id", msg_id)

            let content = null
            if (data?.content) content = data?.content?.replace(/\n/g, "\\n")
            image.set("file_image", new Blob([await this.picture_reply(content || "啊咧，图片发不出来", error)]))

            /** 判断频道还是私聊 */
            data.eventType === "DIRECT_MESSAGE_CREATE"
                ? res = await Api.postDirectMessage(id, guild_id, image)
                : res = await Api.postMessage(id, channel_id, image)
        }

        /** 连接转二维码撤回 */
        if (res.id && qr && qr > 0) this.recallQR(id, res, qr)

        /** 返回消息id给撤回用？ */
        return {
            seq: res.seq_in_channel,
            rand: 1,
            time: parseInt(Date.parse(res.timestamp) / 1000),
            message_id: res.id
        }
    }

    /** 撤回消息 */
    async recallQR(id, res, qr) {
        setTimeout(async function () {
            await Api.deleteMessage(id, res.channel_id, res.id, false)
        }, qr * 1000)
    }

    /** 渲染图片 */
    async picture_reply(content, error) {
        const data = {
            Yz: Bot.qg.YZ,
            error: error,
            guild: Bot.qg.guild.ver,
            msg: content,
            saveId: 'QQGuild-plugin',
            _plugin: 'QQGuild-plugin',
            tplFile: './plugins/QQGuild-plugin/resources/index.html',
        }
        const msg = await puppeteer.screenshot(`QQGuild-plugin/QQGuild-plugin`, data)
        return msg.file
    }

}