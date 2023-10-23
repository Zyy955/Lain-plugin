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
export function logModule(id, log, type = "info") {
    const list = {
        info: function () { logger.info(`${chalk.hex("#868ECC")(`[${Bot[id].nickname}]`)} ${log}`) },
        error: function () { logger.error(`${chalk.hex("#868ECC")(`[${Bot[id].nickname}]`)} ${log}`) },
        mark: function () { logger.mark(`${chalk.hex("#868ECC")(`[${Bot[id].nickname}]`)} ${log}`) },
        debug: function () { logger.debug(`${chalk.hex("#868ECC")(`[${Bot[id].nickname}]`)} ${log}`) },
        warn: function () { logger.warn(`${chalk.hex("#868ECC")(`[${Bot[id].nickname}]`)} ${log}`) },
    }
    return list[type]()
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
                if (Bot.qg.cfg.forwar) {
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
            logger.error("未知字段，请反馈至作者：", msg)
        }
    }
    /** 对一些重复元素进行去重 */
    message.msg = Array.from(new Set(new_msg.map(JSON.stringify))).map(JSON.parse)
    message.data = { type: "test", text: "forward", app: "com.tencent.multimsg", meta: { detail: { news: [{ text: "1" }] }, resid: "", uniseq: "", summary: "" } }
    return message
}

export default { sleep, logModule, makeForwardMsg }
