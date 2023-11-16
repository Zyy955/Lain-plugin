import fs from "fs"
import chalk from "chalk"

/** 注册uin */
if (!Bot?.adapter) {
    const uin = Bot.uin
    if (uin == 88888) {
        Bot.adapter = []
    } else {
        Bot.adapter = [uin]
    }
}

/**
 * 休眠函数
 * @param ms 毫秒
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 打印基本日志
 * @param id 开发者id(appID)
 * @param log 日志内容
 * @param err 可选参数，日志转为错误日志
 */
export function log(id, log, type = "info") {
    id = id ? id = chalk.hex("#868ECC")(`[${Bot?.[id]?.nickname || "未知"}(${id})] `) : id = ""
    const list = {
        info: function () { logger.info(`${id}${log}`) },
        error: function () { logger.error(`${id}${log}`) },
        mark: function () { logger.mark(`${id}${log}`) },
        debug: function () { logger.debug(`${id}${log}`) },
        warn: function () { logger.warn(`${id}${log}`) },
    }
    return list[type]()
}


/** 将云崽过来的消息全部统一格式存放到数组里面 */
export function array(data) {
    let msg = []
    /** 将格式统一为对象 随后进行转换成api格式 */
    if (data?.[0]?.data?.type === "test" || data?.[1]?.data?.type === "test") {
        msg.push(...(data?.[0].msg || data?.[1].msg))
    }
    else if (data?.data?.type === "test") {
        msg.push(...data.msg)
    }
    else if (Array.isArray(data)) {
        msg = [].concat(...data.map(i => (typeof i === "string" ? [{ type: "text", text: i }] :
            Array.isArray(i) ? [].concat(...i.map(format => (typeof format === "string" ? [{ type: "text", text: format }]
                : typeof format === "object" && format !== null ? [format] : []))) : typeof i === "object" && i !== null ? [i] : []
        )))
    }
    else if (data instanceof fs.ReadStream) {
        msg.push({ type: "image", file: `file://./${data.file.path}` })
    }
    else if (data instanceof Uint8Array) {
        msg.push({ type: "image", file: data })
    }
    else if (typeof data === "object") {
        msg.push(data)
    }
    else {
        msg.push({ type: "text", text: data })
    }
    return msg
}

/**
 * 制作转发消息
 * @param data 转发内容
 * @param node 开启后将转为shamrock格式的转发
 * @param e 特殊处理日志
 */
export async function makeForwardMsg(data, node = false, e = {}) {
    const message = {}
    const allMsg = []
    /** 防止报错 */
    if (!Array.isArray(data)) data = [data]

    /** 把无限套娃拆出来 */
    for (let i = 0; i < data.length; i++) {
        let msg = data[i].message
        if (typeof msg === "object" && (msg?.data?.type === "test" || msg?.type === "xml")) {
            /** 拆出来 */
            data.splice(i, 1, ...msg.msg)
            i--
        }
    }



    for (let msg in data) {
        msg = data[msg]?.message || data[msg]
        if (!msg && msg?.type) continue
        /** 兼容喵崽更新抽卡记录 */
        if (Array.isArray(msg)) {
            msg.forEach(i => {
                if (typeof i === "string") {
                    allMsg.push({ type: "forward", text: i.trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") })
                } else {
                    allMsg.push(i)
                }
            })
        }
        /** 优先处理日志 */
        else if (typeof msg === "object" && /^#.*日志$/.test(e?.msg?.content)) {
            const splitMsg = msg.split("\n").map(i => {
                if (!i || i.trim() === "") return
                if (Bot.lain.cfg.forwar) {
                    return { type: "forward", text: i.substring(0, 1000).trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") }
                } else {
                    return { type: "forward", text: i.substring(0, 100).trim().replace(/^\\n{1,3}|\\n{1,3}$/g, "") }
                }
            })
            allMsg.push(...splitMsg.slice(0, 50))
        }
        /** AT 表情包 */
        else if (typeof msg === "object") {
            if (node) msg.node = true
            allMsg.push(msg)
        }
        /** 普通文本 */
        else if (typeof msg === "string") {
            /** 正常文本 */
            allMsg.push({ type: "forward", text: msg.replace(/^\\n{1,3}|\\n{1,3}$/g, "") })
        }
        else {
            await log("未兼容的字段：", msg)
        }
    }
    /** 对一些重复元素进行去重 */
    message.msg = Array.from(new Set(allMsg.map(JSON.stringify))).map(JSON.parse)
    /** 添加字段，用于兼容chatgpt-plugin的转发 */
    message.data = { type: "test", text: "forward", app: "com.tencent.multimsg", meta: { detail: { news: [{ text: "1" }] }, resid: "", uniseq: "", summary: "" } }
    return message
}

/** 传入路径 返回字符串格式的base64 */
export async function base64(path) {
    let file = path
    try {
        if (!fs.existsSync(file)) {
            // 尝试去掉file://
            file = file.replace(/^file:\/\//, "")
            // 再次检查文件是否存在
            if (!fs.existsSync(file)) {
                file = path.replace(/^file:\/\/\//, "")
                if (!fs.existsSync(file)) return
            }
        }
        return fs.readFileSync(file, { encoding: "base64" })
    } catch (err) {
        return
    }
}

export default { sleep, log, array, makeForwardMsg, base64 }
