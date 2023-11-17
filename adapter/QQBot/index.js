import fs from "fs"
import Yaml from "yaml"
import QQBot from "qq-group-bot"
import message from "./message.js"
import common from "../../model/common.js"
import loader from "../../plugins/loader.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"

export default async function createAndStartBot(cfg) {
    const bot = new QQBot.Bot({
        appid: cfg.appid,
        token: cfg.token,
        secret: cfg.secret,
        sandbox: cfg.sandbox || false,
        removeAt: cfg.removeAt || true,
        logLevel: Yaml.parse(fs.readFileSync("./config/config/bot.yaml", "utf8")).log_level,
        maxRetry: 10,
        intents: [
            // 我的意思是，频道建议直接用我的频道适配器单独处理。
            'GROUP_AT_MESSAGE_CREATE', // 群聊@消息事件 没有群权限请注释
            'C2C_MESSAGE_CREATE', // 私聊事件 没有私聊权限请注释
            // 'GUILD_MESSAGES', // 私域机器人频道消息事件 公域机器人请注释
            // 'PUBLIC_GUILD_MESSAGES', // 公域机器人频道消息事件 私域机器人请注释
            // 'DIRECT_MESSAGE', // 频道私信事件
            // 'GUILD_MESSAGE_REACTIONS', // 频道消息表态事件
            // 'GUILDS', // 频道变更事件
            // 'GUILD_MEMBERS', // 频道成员变更事件
            // 'DIRECT_MESSAGE', // 频道私信事件
        ], // (必填)
    })

    // 群聊被动回复
    bot.on("message.group", async (e) => {
        await loader.deal.call(pluginsLoader, await message.msg(e, true))
    })

    // 私聊被动回复
    bot.on("message.private", async (e) => {
        await loader.deal.call(pluginsLoader, await message.msg(e, false))
    })

    // 频道被动回复
    bot.on('message.guild', async (e) => {
        await loader.deal.call(pluginsLoader, await message.msg(e, true))
    })
    // 频道私信被动回复
    bot.on('message.direct', async (e) => {
        await loader.deal.call(pluginsLoader, await message.msg(e, false))
    })

    try {
        // 开始连接
        await bot.start()
        // 注册Bot
        await LoadBot(bot)
    } catch { }
}

async function LoadBot(bot) {
    const { avatar, id, username, union_openid } = await bot.getSelfInfo()
    // 主动发送频道消息
    // bot.sendGuildMessage(channel_id, 'hello')
    // 主动发送频道消息，注：需要先调用bot.createDirectSession(guild_id,user_id)创建私信会话，此处传入的guild_id为创建的session会话中返回的guild_id
    // bot.sendDirectMessage(guild_id, 'hello')

    Bot[id] = {
        bkn: 0,
        /** 好友列表 */
        fl: new Map(),
        /** 群列表 */
        gl: new Map(),
        gml: new Map(),
        uin: id,
        tiny_id: union_openid,
        avatar,
        nickname: username,
        stat: { start_time: Date.now() / 1000, recv_msg_cnt: 0 },
        apk: { display: "qq-group-bot", version: Bot.lain["dependencies"]["qq-group-bot"].replace("^", "") },
        version: { id: "QQ", name: "QQBot", version: Bot.lain["dependencies"]["qq-group-bot"].replace("^", "") },
        /** 转发 */
        makeForwardMsg: async (forwardMsg) => {
            return await common.makeForwardMsg(forwardMsg)
        },
        pickGroup: (groupID) => {
            return {
                is_admin: false,
                is_owner: false,
                sendMsg: async (msg) => {
                    bot.sendGroupMessage(groupID, msg)
                },
                /** 转发 */
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                pickMember: (id) => {
                    return {}
                },
                getChatHistory: async (msg_id, num, reply) => {
                    return ["test"]
                }
            }
        },
        pickUser: (user_id) => {
            return {
                sendMsg: async (msg) => {
                    // 主动发送私聊消息
                    bot.sendPrivateMessage(user_id, msg)
                },
                /** 转发 */
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                getChatHistory: async (msg_id, num, reply) => {
                    return ["test"]
                }
            }
        },
        getGroupMemberInfo: async function (group_id, user_id) {
            return {
                group_id,
                user_id,
                nickname: "QQBot",
                card: "QQBot",
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
        },
        pickFriend: (user_id) => {
            return {
                sendMsg: async (msg) => {
                    return await (new SendMsg(uin, false)).message(msg, user_id)
                },
                /** 转发 */
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg)
                },
                getChatHistory: async (msg_id, num, reply) => {
                    return ["test"]
                }
            }
        }
    }
    if (!Bot.adapter?.[String(id)]) Bot.adapter.push(String(id))
}

const config = Yaml.parse(fs.readFileSync(Bot.lain._path + "/QQBot.yaml", "utf8"))
Object.entries(config).forEach(async ([appid, cfg]) => {
    if (Object.keys(cfg).length === 0) return
    await createAndStartBot(cfg)
})