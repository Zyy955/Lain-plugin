import fs from "fs"
import chalk from "chalk"
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
    if (data?.[1]?.data?.type === "test") {
        msg.push({ type: "forward", text: data[0] })
        msg.push(...data[1].msg)
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
 * @param forwardMsg 转发内容
 * @param data 特殊处理日志
 */
export async function makeForwardMsg(forwardMsg, data = {}) {
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
                if (Bot.lain.cfg.forwar) {
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
            await log(this.id, `Bot无法在频道 ${qg.id} 中读取基础信息，请给予权限...错误信息：${err.message}`, "error")
            logger.error("未知字段，请反馈至作者：", msg)
        }
    }
    /** 对一些重复元素进行去重 */
    message.msg = Array.from(new Set(new_msg.map(JSON.stringify))).map(JSON.parse)
    message.data = { type: "test", text: "forward", app: "com.tencent.multimsg", meta: { detail: { news: [{ text: "1" }] }, resid: "", uniseq: "", summary: "" } }
    return message
}

export default { sleep, log, array, makeForwardMsg }
