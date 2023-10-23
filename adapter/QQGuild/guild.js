import SendMsg from "./sendMsg.js"
import common from "../../model/common.js"
import qg_log from "./log.js"
import message from "./message.js"
import loader from "../../plugins/loader.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"
import { createOpenAPI, createWebsocket } from "qq-guild-bot"

export default class guild {
    /** 传入基本配置 */
    constructor(Cfg) {
        /** 开发者id */
        this.id = Cfg.appID
        /** 机器人令牌(token) */
        this.token = Cfg.token
        /** 沙盒模式 */
        this.sandbox = Cfg.sandbox
        /** 是否接收全部消息 */
        this.allMsg = Cfg.allMsg
        /** 当前机器人配置 */
        this.Cfg = Cfg
    }

    /** 创建连接 */
    async monitor() {
        /** 基础监听事件 */
        const intents = ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGE_REACTIONS", "DIRECT_MESSAGE"]
        /** 接收全部消息 */
        this.allMsg ? intents.push("GUILD_MESSAGES") : intents.push("PUBLIC_GUILD_MESSAGES")
        /** 添加监听事件 */
        this.Cfg.intents = intents
        /** 注册Bot */
        Bot[this.id] = this.Cfg
        /** 创建 client */
        Bot[this.id].client = createOpenAPI(Bot[this.id])
        /** 创建 websocket 连接 */
        Bot[this.id].ws = createWebsocket(Bot[this.id])
        /** 建立ws链接 监听bot频道列表、频道资料、列表变化事件 */
        Bot[this.id].ws.on('GUILDS', (e) => { e.id = this.id, this.event(e) })
        /** 建立ws链接 监听频道成员变化事件 */
        Bot[this.id].ws.on('GUILD_MEMBERS', (e) => { e.id = this.id, this.event(e) })
        /** 建立ws链接 监听私信消息 */
        Bot[this.id].ws.on('DIRECT_MESSAGE', (e) => { e.id = this.id, this.event(e) })
        /** 建立ws链接 监听私域事件 */
        Bot[this.id].ws.on('GUILD_MESSAGES', (e) => { e.id = this.id, this.event(e) })
        /** 建立ws链接 监听公域事件 */
        Bot[this.id].ws.on('PUBLIC_GUILD_MESSAGES', (e) => { e.id = this.id, this.event(e) })
        /** 建立ws链接 监听表情动态事件 */
        Bot[this.id].ws.on('GUILD_MESSAGE_REACTIONS', (e) => { e.id = this.id, this.event(e) })

        /** 在this保存一下 */
        this.client = Bot[this.id].client
        /** 保存bot的信息 */
        await this.me(this.id)
        /** 告知用户已连接成功 */
        await common.logModule(this.id, "连接成功，正在加载资源中...")
        /** 延迟下 */
        await common.sleep(200)
        /** 获取一些基本信息 */
        await this.guilds(this.id)
        /** 告知用户加载资源完成 */
        await common.logModule(this.id, "加载资源完毕...")
    }

    /** 保存bot的信息 */
    async me() {
        const bot = (await this.client.meApi.me()).data
        /** 机器人名称 */
        this.name = bot.username
        /** 机器人的频道id */
        this.tiny_id = bot.id

        /** 构建基本参数 */
        Bot[this.id] = {
            ...Bot[this.id],
            fl: new Map(),
            /** 群列表 */
            gl: new Map(),
            /** 子频道列表 */
            gml: new Map(),
            uin: this.id,
            tiny_id: bot.id,
            nickname: bot.username,
            avatar: bot.avatar,
            stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
            apk: { display: Bot.qg.guild.name, version: Bot.qg.guild.ver },
            version: { id: Bot[this.id].allMsg ? "私域" : "公域", name: "QQ频道Bot", version: Bot.qg.guild.guild_ver },
            /** 转发 */
            makeForwardMsg: async (forwardMsg) => {
                return await common.makeForwardMsg(forwardMsg)
            },
            pickGroup: (groupId) => {
                const [guild_id, channel_id] = groupId.replace("qg_", "").split('-')
                return {
                    sendMsg: async (msg, quote = false) => {
                        const newMsg = new SendMsg(this.id, { guild_id, channel_id }, "MESSAGE_CREATE")
                        return await newMsg(msg, quote)
                    },
                    /** 转发 */
                    makeForwardMsg: async (forwardMsg) => {
                        return await common.makeForwardMsg(forwardMsg)
                    }
                }
            },
            getGroupMemberInfo: async function (group_id, user_id) {
                return {
                    group_id,
                    user_id,
                    nickname: this.name,
                    card: this.name,
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


        /** 注册uin */
        if (!Bot?.adapter) {
            Bot.adapter = [Bot.uin]
            Bot.adapter.push(this.id)
        } else {
            Bot.adapter.push(this.id)
            /** 去重防止断连后出现多个重复的id */
            Bot.adapter = Array.from(new Set(Bot.adapter.map(JSON.stringify))).map(JSON.parse)
        }
    }

    /** 获取一些基本信息 */
    async guilds(id) {
        /** 加载机器人所在频道、将对应的子频道信息存入变量中用于后续调用 */
        const meGuilds = (await this.client.meApi.meGuilds()).data

        for (let qg of meGuilds) {
            /** 获取对应频道的基础信息 */
            let admin = false
            try {
                const Member = (await this.client.guildApi.guildMember(qg.id, this.tiny_id)).data
                admin = Member.roles.includes("2") ? true : false
            } catch (err) {
                await common.logModule(this.id, `Bot无法在频道 ${qg.id} 中读取基础信息，请给予权限...错误信息：${err.message}`, "error")
            }

            /** 保存所有bot的频道列表 */
            Bot.qg.guilds[qg.id] = {
                ...qg,
                admin,
                id: this.id,
                channels: {}
            }

            /** 延迟下 */
            await common.sleep(200)

            try {
                /** 添加频道列表到Bot.gl中，用于主动发送消息 */
                const channelList = (await this.client.channelApi.channels(qg.id)).data
                for (const i of channelList) {
                    /** 存一份给锅巴用 */
                    Bot.gl.set(`qg_${i.guild_id}-${i.id}`, {
                        id: this.id,
                        group_id: `qg_${i.guild_id}-${i.id}`,
                        group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
                        guild_id: i.guild_id,
                        guild_name: qg.name,
                        channel_id: i.id,
                        channel_name: i.name
                    })
                    /** 存对应uin */
                    Bot[this.id].gl.set(`qg_${i.guild_id}-${i.id}`, {
                        id: this.id,
                        group_id: `qg_${i.guild_id}-${i.id}`,
                        group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
                        guild_id: i.guild_id,
                        guild_name: qg.name,
                        channel_id: i.id,
                        channel_name: i.name
                    })
                    /** 子频道id和对应名称 */
                    Bot.qg.guilds[i.guild_id].channels[i.id] = i.name || i.id
                }
            } catch (err) {
                await common.logModule(this.id, `Bot无法在频道 ${qg.id} 中读取子频道列表，请给予权限...错误信息：${err.message}`, "error")
            }
        }

        try {
            /** 检测是否重启 */
            const restart = await redis.get("qg:restart")
            if (restart && JSON.parse(restart).appID === id) await this.init(restart)
        } catch (error) {
            await common.logModule(this.id, `重启错误：${error}`, "error")
        }
    }

    /** 根据对应事件进行对应处理 */
    async event(data) {
        switch (data.eventType) {
            /** 私域 */
            case "MESSAGE_CREATE":
                await this.permissions(data)
                break
            /** 私信 */
            case "DIRECT_MESSAGE_CREATE":
                await this.permissions(data, "私信")
                break
            /** 公域事件 仅接收@机器人消息 */
            case "AT_MESSAGE_CREATE":
                await this.permissions(data)
                break
            /** 其他事件不需要给云崽、直接单独处理即可 */
            default:
                await (new qg_log(this.id)).event(data)
                break
        }
    }

    async permissions(data, type = "") {
        const cfg = Bot.qg.cfg
        const { guild_id, channel_id } = data.msg

        /** 过频道黑白名单结果 */
        const guild = this.checkBlack(cfg, `qg_${guild_id}`)
        /** 过子频道黑白名单结果 别问为啥一起过...懒 */
        const channel = this.channel_checkBlack(cfg, String(channel_id))

        /** 转换消息 */
        const e = new message(this.id, data)

        if (guild && channel) {
            data.checkBlack = true
            return await loader.deal.call(pluginsLoader, await e.msg(type))
        } else {
            data.checkBlack = false
            return await e.msg(type)
        }
    }

    /** 判断频道黑白名单 */
    checkBlack(cfg, guild_id) {
        /** 过白名单频道 */
        if (Array.isArray(cfg.whitelist) && cfg.whitelist.length > 0) {
            return cfg.whitelist.includes(String(guild_id))
        }
        /** 过黑名单频道 */
        if (Array.isArray(cfg.blacklist) && cfg.blacklist.length > 0) {
            return !cfg.blacklist.includes(String(guild_id))
        }
        return true
    }

    /** 判断子频道黑白名单 */
    channel_checkBlack(cfg, channel_id) {
        /** 过白名单子频道 */
        if (Array.isArray(cfg.channel_whitelist) && cfg.channel_whitelist.length > 0) {
            return cfg.channel_whitelist.includes(String(channel_id))

        }
        /** 过黑名单子频道 */
        if (Array.isArray(cfg.channel_blacklist) && cfg.channel_blacklist.length > 0) {
            return !cfg.channel_blacklist.includes(String(channel_id))
        }
        return true
    }


    /** 发送主动消息 解除私信限制 */
    Sendprivate = async (data) => {
        const { msg } = data
        const new_msg = {
            source_guild_id: msg.guild_id,
            recipient_id: msg.author.id
        }
        const _data = await Bot[this.id].client.directMessageApi.createDirectMessage(new_msg)
        const hi = "QQGuild-plugin：你好~"
        logger.info(`${this.name} 发送私信消息：${hi}`)
        await Bot[this.id].client.directMessageApi.postDirectMessage(_data.data.guild_id, { content: hi })
    }

    /** 重启后发送主动消息 */
    async init(restart) {
        const cfg = JSON.parse(restart)
        const { type, appID, id, guild_id, channel_id } = cfg
        const time = (new Date().getTime() - cfg.time || new Date().getTime()) / 1000
        const msg = `重启成功：耗时${time.toFixed(2)}秒`
        if (type === "私信") {
            await Bot[appID].client.directMessageApi.postDirectMessage(guild_id, { content: msg, msg_id: id })
        } else {
            await Bot[appID].client.messageApi.postMessage(channel_id, { content: msg, msg_id: id })
        }
        redis.del("qg:restart")
    }
}

logger.info(`[Lain-plugin]QQ频道适配器加载完成...`)