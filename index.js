import fs from "fs"
import pm2 from "pm2"
import "./model/config.js"
import crypto from "crypto"
import "./adapter/stdin/stdin.js"
import "./adapter/QQBot/index.js"
import yaml from "./model/yaml.js"
import { createRequire } from 'module'
import { execSync } from "child_process"
import { update } from "../other/update.js"
import guild from "./adapter/QQGuild/guild.js"
import createAndStartBot from "./adapter/QQBot/index.js"
import { ShamrockPlugin } from "./adapter/shamrock/plugin.js"

const require = createRequire(import.meta.url)
const { exec } = require('child_process')

/** 设置主人 */
let sign = {}
const _path = "./plugins/Lain-plugin/config"

export class Lain extends plugin {
    constructor() {
        super({
            name: "Lain-plugin",
            priority: -50,
            rule: [
                {
                    reg: /^#QQ频道设置.+$/gi,
                    fnc: "QQGuildCfg",
                    permission: "master"
                },
                {
                    reg: /^#QQ(群|群机器人|机器人)设置.+$/gi,
                    fnc: "QQBBot",
                    permission: "master"
                },
                {
                    reg: /^#QQ频道账号$/gi,
                    fnc: "QQGuildAccount",
                    permission: "master"
                },
                {
                    reg: /^#(Lain|铃音|QQ频道)(强制)?更新(日志)?$/gi,
                    fnc: "update",
                    permission: "master"
                },
                {
                    reg: /^#设置主人$/,
                    fnc: 'master'
                },
                {
                    reg: /^#(删除|取消)主人$/,
                    fnc: "del_master",
                    permission: "master"
                },
                {
                    reg: /^#(我的|当前)?(id|信息)$/gi,
                    fnc: "user_id"
                },
                {
                    reg: /^#微信修改名称.+/,
                    fnc: "ComName",
                    permission: "master"
                }
            ]
        })
    }

    async QQGuildCfg(e) {
        const cfg = new yaml(_path + "/config.yaml")
        if (e.msg.includes("分片转发")) {
            e.msg.includes("开启") ? cfg.set("forwar", true) : cfg.set("forwar", false)
            const msg = `分片转发已${cfg.get("forwar") ? '开启' : '关闭'}`
            return await e.reply(msg, true, { at: true })
        } else {
            const msg = async (e) => {
                const cmd = e.msg.replace(/^#QQ频道设置/gi, "").replace(/：/g, ":").trim().split(':')
                if (!/^1\d{8}$/.test(cmd[2])) return "appID 错误！"
                if (!/^[0-9a-zA-Z]{32}$/.test(cmd[3])) return "token 错误！"

                let bot
                const cfg = new yaml(_path + "/bot.yaml")
                /** 重复的appID，删除 */
                if (cfg.hasIn(cmd[2])) {
                    cfg.del(cmd[2])
                    return `Bot：${Bot[cmd[2]].nickname}${cmd[2]} 删除成功...重启后生效...`
                } else {
                    bot = { appID: cmd[2], token: cmd[3], sandbox: cmd[0] === "1", allMsg: cmd[1] === "1" }
                }

                /** 保存新配置 */
                cfg.addIn(cmd[2], bot)
                try {
                    await (new guild(bot)).monitor()
                    return `Bot：${Bot[cmd[2]].nickname}(${cmd[2]}) 已连接...`
                } catch (err) {
                    return err
                }

            }
            return await e.reply(await msg(e))
        }
    }

    async QQBBot(e) {
        const msg = async (e) => {
            const cmd = e.msg.replace(/^#QQ(群|群机器人|机器人)设置/gi, "").replace(/：/g, ":").trim().split(':')
            if (cmd.length !== 6) return "格式错误..."
            let bot
            const cfg = new yaml(_path + "/QQBot.yaml")
            /** 重复的appID，删除 */
            if (cfg.hasIn(cmd[3])) {
                cfg.del(cmd[3])
                return `QQBot：${cmd[3]} 删除成功...重启后生效...`
            } else {
                // 沙盒:私域:移除at:appID:appToken:secret 是=1 否=0
                bot = { appid: cmd[3], token: cmd[4], sandbox: cmd[0] === "1", allMsg: cmd[1] === "1", removeAt: cmd[2] === "1", secret: cmd[5] }
            }

            /** 保存新配置 */
            cfg.addIn(cmd[3], bot)
            try {
                await createAndStartBot(bot)
                return `QQBot：${cmd[3]} 已连接...`
            } catch (err) {
                return err
            }

        }
        return await e.reply(await msg(e))
    }

    async QQGuildAccount(e) {
        const cfg = new yaml(_path + "/bot.yaml")
        if (e.sub_type === "friend") {
            const msg = []
            const config = cfg.data()
            for (const i in config) {
                const cfg = [
                    config[i].sandbox ? 1 : 0,
                    config[i].allMsg ? 1 : 0,
                    config[i].appID,
                    config[i].token
                ]
                msg.push(`${Bot[i]?.nickname || "未知"}：${cfg.join(':')}`)
            }
            return await e.reply(`共${msg.length}个账号：\n${msg.join('\n')}`)
        } else
            return await e.reply("请私聊查看")
    }

    async update(e) {
        let new_update = new update()
        new_update.e = e
        new_update.reply = this.reply
        const name = "Lain-plugin"
        if (e.msg.includes("更新日志")) {
            if (new_update.getPlugin(name)) {
                this.e.reply(await new_update.getLog(name))
            }
        } else {
            if (new_update.getPlugin(name)) {
                if (this.e.msg.includes('强制'))
                    execSync('git reset --hard', { cwd: `${process.cwd()}/plugins/${name}/` })
                await new_update.runUpdate(name)
                if (new_update.isUp)
                    setTimeout(() => new_update.restart(), 2000)
            }
        }
        return true
    }

    async master(e) {
        let user_id = e.user_id
        if (e.at) {
            const cfg = new yaml("./config/config/other.yaml")
            /** 存在at检测触发用户是否为主人 */
            if (!e.isMaster) return e.reply(`只有主人才能命令我哦~\n(*/ω＼*)`)
            user_id = e.at
            /** 检测用户是否已经是主人 */
            if (cfg.value("masterQQ", user_id)) return e.reply([segment.at(user_id), "已经是主人了哦(〃'▽'〃)"])
            /** 添加主人 */
            return await e.reply(apps.master(e, user_id))
        } else {
            /** 检测用户是否已经是主人 */
            if (e.isMaster) return e.reply([segment.at(e.user_id), "已经是主人了哦(〃'▽'〃)"])
        }
        /** 生成验证码 */
        sign[user_id] = crypto.randomUUID()
        logger.mark(`设置主人验证码：${logger.green(sign[e.user_id])}`)
        await e.reply([segment.at(e.user_id), `请输入控制台的验证码`])
        /** 开始上下文 */
        return await this.setContext('SetAdmin')
    }

    async del_master(e) {
        if (!e.at) return e.reply("你都没有告诉我是谁！快@他吧！^_^")
        const cfg = new yaml("./config/config/other.yaml")
        if (!cfg.value("masterQQ", e.at)) {
            return e.reply("这个人不是主人啦(〃'▽'〃)", false, { at: true })
        }
        cfg.delVal("masterQQ", e.at)
        return await e.reply([segment.at(e.at), "拜拜~"])
    }


    async user_id(e) {
        const msg = []
        msg.push(`您的个人ID：${e.user_id}`)
        e.guild_id ? msg.push(`当前频道ID：${e.guild_id}`) : ""
        e.channel_id ? msg.push(`当前子频道ID：${e.channel_id}`) : ""
        e.group_id ? msg.push(`当前群聊ID：${e.group_id}`) : ""
        if (e.isMaster && e?.adapter === "QQGuild") msg.push("\n温馨提示：\n使用本体黑白名单请使用「群聊ID」\n使用插件黑白名单请按照配置文件说明进行添加~")
        return await e.reply(`\n${msg.join('\n')}`, true, { at: true })
    }

    /** 微信椰奶状态自定义名称 */
    async ComName(e) {
        const msg = e.msg.replace("#微信修改名称", "").trim()
        const cfg = new yaml(Bot.lain._path + "/config.yaml")
        cfg.set("name", msg)
        Bot[Bot.lain.wc.uin].nickname = msg
        return await e.reply(`修改成功，新名称为：${msg}`, false, { at: true })
    }

    SetAdmin() {
        /** 结束上下文 */
        this.finish('SetAdmin')
        /** 判断验证码是否正确 */
        if (this.e.msg.trim() === sign[this.e.user_id]) {
            this.e.reply(apps.master(this.e))
        } else {
            return this.reply([segment.at(this.e.user_id), "验证码错误"])
        }
    }
}

let apps = {
    /** 设置主人 */
    master(e, user_id = null) {
        user_id = user_id || e.user_id
        const cfg = new yaml("./config/config/other.yaml")
        cfg.addVal("masterQQ", user_id)
        return [segment.at(user_id), "新主人好~(*/ω＼*)"]
    }
}

/** 还是修改一下，不然cvs这边没法用...  */
if (!fs.existsSync("./plugins/ws-plugin/model/dlc/index.js")) {
    const getGroupMemberInfo = Bot.getGroupMemberInfo
    Bot.getGroupMemberInfo = async function (group_id, user_id) {
        try {
            return await getGroupMemberInfo.call(this, group_id, user_id)
        } catch (error) {
            let nickname
            error?.stack?.includes("ws-plugin") ? nickname = "chronocat" : nickname = String(group_id).includes("qg_") ? "QQGuild-Bot" : "WeChat-Bot"
            return {
                group_id,
                user_id,
                nickname,
                card: nickname,
                sex: "female",
                age: 6,
                join_time: "",
                last_sent_time: "",
                level: 1,
                role: "member",
                title: "",
                title_expire_time: "",
                shutup_time: 0,
                update_time: "",
                area: "南极洲",
                rank: "潜水",
            }
        }
    }
}

export class Restart extends plugin {
    constructor(e = '') {
        super({
            name: '重启',
            dsc: '#重启',
            event: 'message',
            priority: 0,
            rule: [
                {
                    reg: '^#重启$',
                    fnc: 'restart',
                    permission: 'master'
                }
            ]
        })

        if (e) this.e = e

        this.key = 'Lain:restart'
    }

    async restart() {
        if (!this.e?.adapter) return false

        const adapters = {
            shamrock: 'Lain:restart:shamrock',
            QQGuild: 'Lain:restart:QQGuild',
            WeChat: 'Lain:restart:WeChat'
        }

        this.key = adapters[this.e.adapter]

        if (!this.key) return false

        await this.e.reply('开始执行重启，请稍等...')
        logger.mark(`${this.e.logFnc} 开始执行重启，请稍等...`)

        const data = JSON.stringify({
            uin: this.e?.self_id || this.e.bot.uin,
            isGroup: !!this.e.isGroup,
            id: this.e.isGroup ? this.e.group_id : this.e.user_id,
            time: new Date().getTime(),
            msg_id: this.e.message_id
        })

        const npm = await this.checkPnpm()

        try {
            await redis.set(this.key, data, { EX: 120 })

            pm2.connect((err) => {
                if (err) return logger.error(err)

                pm2.list((err, processList) => {
                    if (err) {
                        logger.error(err)
                    } else {
                        const PM2Data = JSON.parse(fs.readFileSync('./config/pm2/pm2.json'))
                        const processExists = processList.some(processInfo => processInfo.name === PM2Data.apps[0].name)
                        const cm = processExists ? `${npm} run restart` : `${npm} start`
                        pm2.disconnect()
                        exec(cm, { windowsHide: true }, (error, stdout) => {
                            if (error) {
                                redis.del(this.key)
                                this.e.reply(`操作失败！\n${error.stack}`)
                                logger.error(`重启失败\n${error.stack}`)
                            } else if (stdout) {
                                logger.mark('重启成功，运行已由前台转为后台')
                                logger.mark(`查看日志请用命令：${npm} run log`)
                                logger.mark(`停止后台运行命令：${npm} stop`)
                                process.exit()
                            }
                        })
                    }
                })
            })
        } catch (error) {
            redis.del(this.key)
            const errorMessage = error.stack ?? error
            this.e.reply(`操作失败！\n${errorMessage}`)
            logger.error(`重启失败\n${errorMessage}`)
        }

        return true
    }

    async checkPnpm() {
        let npm = 'npm'
        let ret = await this.execSync('pnpm -v')
        if (ret.stdout) npm = 'pnpm'
        return npm
    }

    async execSync(cmd) {
        return new Promise((resolve, reject) => {
            exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
                resolve({ error, stdout, stderr })
            })
        })
    }
}

async function init(key = "Lain:restart") {
    let restart = await redis.get(key)
    if (restart) {
        restart = JSON.parse(restart)
        const uin = restart?.uin || Bot.uin
        let time = restart.time || new Date().getTime()
        const msg_id = restart?.msg_id || false
        time = (new Date().getTime() - time) / 1000
        console.log(typeof uin)
        let msg = `重启成功：耗时${time.toFixed(2)}秒`
        try {
            if (restart.isGroup) {
                Bot[uin].pickGroup(restart.id, msg_id).sendMsg(msg)
            } else {
                Bot[uin].pickUser(restart.id).sendMsg(msg)
            }
        } catch (error) {
            /** 发送失败后等待5s重试一次，适配器可能没连接bot */
            await new Promise((resolve) => setTimeout(resolve, 5000))
            msg = `重启成功：耗时${(time + 5).toFixed(2)}秒`
            if (restart.isGroup) {
                Bot[uin].pickGroup(restart.id, msg_id).sendMsg(msg)
            } else {
                Bot[uin].pickUser(restart.id, msg_id).sendMsg(msg)
            }
        }
        redis.del(key)
    }
}

export { init, ShamrockPlugin }
