import fs from "fs"
import Yaml from "yaml"
import QQBot from "ts-qqbot"
import message from "./message.js"
import loader from "../../plugins/loader.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"

export default function createAndStartBot(cfg) {
    const bot = new QQBot.Bot({
        appid: cfg.appid,
        token: cfg.token,
        secret: cfg.secret,
        sandbox: cfg.sandbox || false,
        removeAt: cfg.removeAt || true,
        logLevel: Yaml.parse(fs.readFileSync("./config/config/bot.yaml", "utf8")).log_level,
        maxRetry: 10,
        intents: [
            'GROUP_AT_MESSAGE_CREATE', // 群聊@消息事件 没有群权限请注释
            'PUBLIC_GUILD_MESSAGES', // 公域机器人频道消息事件 私域机器人请注释
            'DIRECT_MESSAGE', // 频道私信事件
            'C2C_MESSAGE_CREATE'
        ],
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

    bot.start()
}

const config = Yaml.parse(fs.readFileSync(Bot.lain._path + "/QQBot.yaml", "utf8"))
Object.entries(config).forEach(([appid, cfg]) => {
    if (Object.keys(cfg).length === 0) return
    createAndStartBot(cfg)
})
