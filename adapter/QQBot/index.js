import fs from "fs"
import Yaml from "yaml"
import { QQBot } from "ts-qqbot"
import message from "./message.js"
import loader from "../../plugins/loader.js"
import pluginsLoader from "../../../../lib/plugins/loader.js"

export default function createAndStartBot(cfg) {
    const bot = new QQBot({
        appid: cfg.appid,
        token: cfg.token,
        secret: cfg.secret,
        sandbox: cfg.sandbox || false,
        removeAt: cfg.removeAt || true,
        logLevel: Yaml.parse(fs.readFileSync("./config/config/bot.yaml", "utf8")).log_level,
        maxRetry: 10,
        intents: ["GROUP_AT_MESSAGE_CREATE", "C2C_MESSAGE_CREATE"]
    })

    bot.start()

    bot.on("message.group", async (e) => {
        await loader.deal.call(pluginsLoader, await message.msg(e, true))
    })

    bot.on("message.private", async (e) => {
        await loader.deal.call(pluginsLoader, await message.msg(e, false))
    })
}

const config = Yaml.parse(fs.readFileSync(Bot.lain._path + "/QQBot.yaml", "utf8"))
Object.entries(config).forEach(([appid, cfg]) => {
    if (Object.keys(cfg).length === 0) return
    createAndStartBot(cfg)
})
