import lodash from "lodash"
import util from "node:util"
import cfg from "../../../lib/config/config.js"
import Runtime from '../../../lib/plugins/runtime.js'

export default new class QQGuildLoader {
    async deal(e) {
        Object.defineProperty(e, 'bot', {
            value: Bot
        })
        /** 冷却 */
        if (!this.checkLimit(e)) return
        /** 处理消息 */
        this.dealMsg(e)
        /** 处理回复 */
        this.reply(e)
        /** 过滤事件 */
        let priority = []
        /** 注册runtime */
        await Runtime.init(e)

        this.priority.forEach(v => {
            let p = new v.class(e)
            p.e = e
            /** 判断是否启用功能 */
            if (!this.checkDisable(e, p)) return
            /** 过滤事件 */
            if (!this.filtEvent(e, p)) return
            priority.push(p)
        })

        for (let plugin of priority) {
            /** 上下文hook */
            if (plugin.getContext) {
                let context = plugin.getContext()
                if (!lodash.isEmpty(context)) {
                    for (let fnc in context) {
                        plugin[fnc](context[fnc])
                    }
                    return
                }
            }

            /** 群上下文hook */
            if (plugin.getContextGroup) {
                let context = plugin.getContextGroup()
                if (!lodash.isEmpty(context)) {
                    for (let fnc in context) {
                        plugin[fnc](context[fnc])
                    }
                    return
                }
            }
        }

        /** 是否只关注主动at */
        if (!this.onlyReplyAt(e)) return

        // 判断是否是星铁命令，若是星铁命令则标准化处理
        // e.isSr = true，且命令标准化为 #星铁 开头
        if (this.srReg.test(e.msg)) {
            e.isSr = true
            e.msg = e.msg.replace(this.srReg, '#星铁')
        }

        /** accept */
        for (let plugin of priority) {
            /** accept hook */
            if (plugin.accept) {
                let res = plugin.accept(e)

                if (util.types.isPromise(res)) res = await res

                if (res === 'return') return

                if (res) break
            }
        }

        /* eslint-disable no-labels */
        a:
        for (let plugin of priority) {
            /** 正则匹配 */
            if (plugin.rule) {
                for (let v of plugin.rule) {
                    /** 判断事件 */
                    if (v.event && !this.filtEvent(e, v)) continue

                    const regExp = new RegExp(v.reg)
                    /**  匹配消息或者小程序 */
                    const messageOrApplet = e.msg || e.message?.[0]?.data
                    if (regExp.test(messageOrApplet)) {
                        e.logFnc = `[${plugin.name}][${v.fnc}]`

                        if (v.log !== false) {
                            logger.mark(`${e.logFnc}${e.logText} ${lodash.truncate(e.msg, { length: 80 })}`)
                        }

                        /** 判断权限 */
                        if (!this.filtPermission(e, v)) break a

                        try {
                            let res = plugin[v.fnc] && plugin[v.fnc](e)

                            let start = Date.now()

                            if (util.types.isPromise(res)) res = await res

                            if (res !== false) {
                                /** 设置冷却cd */
                                this.setLimit(e)
                                if (v.log !== false) {
                                    logger.mark(`${e.logFnc} ${lodash.truncate(e.msg, { length: 80 })} 处理完成 ${Date.now() - start}ms`)
                                }
                                break a
                            }
                        } catch (error) {
                            logger.error(`${e.logFnc}`)
                            logger.error(error.stack)
                            break a
                        }
                    }
                }
            }
        }
    }
}

let _loader = {
    /**
     * 处理消息，加入自定义字段
     * @param e.msg 文本消息，多行会自动拼接
     * @param e.img 图片消息数组
     * @param e.atBot 是否at机器人
     * @param e.at 是否at，多个at 以最后的为准
     * @param e.file 接受到的文件
     * @param e.isPrivate 是否私聊
     * @param e.isGroup 是否群聊
     * @param e.isMaster 是否管理员
     * @param e.logText 日志用户字符串
     * @param e.logFnc  日志方法字符串
     
     * 频道
     * @param e.isGuild 是否频道
     * @param e.at 支持频道 tiny_id
     * @param e.atBot 支持频道
     
     */
    dealMsg(e) {
        if (e.message) {
            for (let val of e.message) {
                switch (val.type) {
                    case 'text':
                        e.msg = (e.msg || '') + (val.text || '').replace(/^\s*[＃井#]+\s*/, '#').replace(/^\s*[\\*※＊]+\s*/, '*').trim()
                        break
                    case 'image':
                        if (!e.img) {
                            e.img = []
                        }
                        e.img.push(val.url)
                        break
                    case 'at':
                        /** 加一个自定义判断，判断频道或者微信场景下是否atBot */
                        if (val.qq == e.bot.uin || val.qq == e.uin) {
                            e.atBot = true
                        } else if (val.id == e.bot.tiny_id || val.id == e.uin) {
                            e.atBot = true
                            /** 多个at 以最后的为准 */
                        } else if (val.id) {
                            e.at = val.id
                        } else {
                            e.at = val.qq
                        }
                        break
                    case 'file':
                        e.file = { name: val.name, fid: val.fid }
                        break
                }
            }
        }

        e.logText = ''

        if (e.message_type === 'private' || e.notice_type === 'friend') {
            e.isPrivate = true

            if (e.sender) {
                e.sender.card = e.sender.nickname
            } else {
                e.sender = {
                    card: e.friend?.nickname,
                    nickname: e.friend?.nickname
                }
            }

            e.logText = `[私聊][${e.sender.nickname}(${e.user_id})]`
        }

        if (e.message_type === 'group' || e.notice_type === 'group') {
            e.isGroup = true
            if (e.sender) {
                e.sender.card = e.sender.card || e.sender.nickname
            } else if (e.member) {
                e.sender = {
                    card: e.member.card || e.member.nickname
                }
            } else if (e.nickname) {
                e.sender = {
                    card: e.nickname,
                    nickname: e.nickname
                }
            } else {
                e.sender = {
                    card: '',
                    nickname: ''
                }
            }

            if (!e.group_name) e.group_name = e.group?.name

            e.logText = `[${e.group_name}(${e.sender.card})]`
        } else if (e.detail_type === 'guild') {
            e.isGuild = true
        }

        if (e.user_id && cfg.masterQQ.includes(Number(e.user_id) || String(e.user_id))) {
            e.isMaster = true
        }

        /** 只关注主动at msg处理 */
        if (e.msg && e.isGroup) {
            let groupCfg = cfg.getGroup(e.group_id)
            let alias = groupCfg.botAlias
            if (!Array.isArray(alias)) {
                alias = [alias]
            }
            for (let name of alias) {
                if (e.msg.startsWith(name)) {
                    e.msg = lodash.trimStart(e.msg, name).trim()
                    e.hasAlias = true
                    break
                }
            }
        }
    }
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
