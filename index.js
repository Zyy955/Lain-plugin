import fs from "fs"
import "./model/config.js"
import guild from "./adapter/QQGuild/guild.js"
import crypto from "crypto"
import { execSync } from "child_process"
import { createInterface } from "readline"
import { update } from "../other/update.js"
import yaml from "./model/yaml.js"

/** 设置主人 */
let sign = {}
const _path = "./plugins/Lain-plugin/config"

export class QQGuildBot extends plugin {
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
                    reg: /^#QQ频道账号$/gi,
                    fnc: "QQGuildAccount",
                    permission: "master"
                },
                {
                    reg: /^#QQ频道(强制)?更新(日志)?$/gi,
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
                    fnc: 'user_id'
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
            const msg = await apps.addBot(e)
            return await e.reply(msg)
        }
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
                msg.push(`${Bot[i].name}：${cfg.join(':')}`)
            }
            return e.reply(`共${msg.length}个账号：\n${msg.join('\n')}`)
        } else
            return e.reply("请私聊查看")
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
        // const file = _path
        if (!e.at) return e.reply("你都没有告诉我是谁！快@他吧！^_^")
        const cfg = new yaml("./config/config/other.yaml")
        /** trss */
        if (cfg.hasIn("master")) {
            if (!cfg.value("master", e.at)) {
                return e.reply("这个人不是主人啦(〃'▽'〃)", false, { at: true })
            }
            cfg.delVal("master", e.at)
            cfg.delVal("masterQQ", `${e.self_id}:${e.at}`)
        }
        /** 喵 */
        else {
            if (!cfg.value("masterQQ", e.at)) {
                return e.reply("这个人不是主人啦(〃'▽'〃)", false, { at: true })
            }
            cfg.delVal("masterQQ", e.at)
        }
        e.reply([segment.at(e.at), "拜拜~"])
    }


    async user_id(e) {
        const msg = []
        msg.push(`您的个人ID：${e.user_id}`)
        e.guild_id ? msg.push(`当前频道ID：${e.guild_id}`) : ""
        e.channel_id ? msg.push(`当前子频道ID：${e.channel_id}`) : ""
        e.group_id ? msg.push(`当前群聊ID：${e.group_id}`) : ""
        if (e.isMaster && e?.adapter === "QQGuild") msg.push("\n温馨提示：\n使用本体黑白名单请使用「群聊ID」\n使用插件黑白名单请按照配置文件说明进行添加~")
        return e.reply(`\n${msg.join('\n')}`, true, { at: true })
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
        /** trss */
        if (cfg.hasIn("master")) {
            cfg.addVal("master", user_id)
            cfg.addVal("masterQQ", `${e.self_id}:${user_id}`)
        }
        /** 喵 */
        else {
            cfg.addVal("masterQQ", user_id)
        }
        return [segment.at(user_id), "新主人好~(*/ω＼*)"]
    },

    /** 添加Bot */
    async addBot(e) {
        const cmd = e.msg.replace(/^#QQ频道设置/gi, "").replace(/：/g, ":").trim().split(':')
        if (!/^1\d{8}$/.test(cmd[2])) return "appID 错误！"
        if (!/^[0-9a-zA-Z]{32}$/.test(cmd[3])) return "token 错误！"

        let bot
        const cfg = new yaml(_path + "/bot.yaml")
        /** 重复的appID，删除 */
        if (cfg.hasIn(cmd[2])) {
            cfg.del(cmd[2])
            return `Bot：${Bot[cmd[2]].name}${cmd[2]} 删除成功...重启后生效...`
        } else {
            bot = { appID: cmd[2], token: cmd[3], sandbox: cmd[0] === "1", allMsg: cmd[1] === "1" }
        }

        /** 保存新配置 */
        cfg.addIn(cmd[2], bot)
        try {
            const qg = new guild(bot)
            await qg.monitor()
            return `Bot：${Bot[cmd[2]].name}(${cmd[2]}) 已连接...`
        } catch (err) {
            return err
        }

    }
}

/** 监听控制台输入 */
if (!fs.existsSync(process.cwd() + "/plugins/ws-plugin") && Bot?.uin !== "88888") {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.on('SIGINT', () => { rl.close(); process.exit() })
    function getInput() {
        rl.question('', async (input) => {
            const msg = input.trim()
            if (/#QQ频道设置.+/gi.test(msg)) {
                const e = { msg: msg }
                logger.mark(logger.green(await apps.addBot(e)))
            }
            getInput()
        })
    }
    getInput()
}

/** 还是修改一下，不然cvs这边没法用... */
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