import lodash from "lodash"
import util from "node:util"
import Runtime from '../../../lib/plugins/runtime.js'

export default new class loader {
    async deal(e) {
        /** 记录消息次数 */
        await redis.incr(`lain:${e.self_id}:sendMsg:total`)
        Bot[e.self_id].stat.recv_msg_cnt = await redis.get(`lain:${e.self_id}:sendMsg:total`)

        Object.defineProperty(e, 'bot', {
            value: Bot[e.self_id]
        })

        /** 检查频道消息 */
        if (e.adapter = "shamrock" && this.checkGuildMsg(e)) return
        /** 检查黑白名单 */
        if (e.adapter = "shamrock" && !this.checkBlack(e)) return

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