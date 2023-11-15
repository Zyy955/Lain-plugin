import { QQBot } from 'ts-qqbot'
import message from './message.js'
import loader from '../../plugins/loader.js'
import pluginsLoader from "../../../../lib/plugins/loader.js"

// 创建机器人
const bot = new QQBot({
    appid: '', // qq机器人的appID (必填)
    token: '', // qq机器人的appToken (必填)
    secret: '', // qq机器人的secret (必填)
    sandbox: false, // 是否是沙箱环境 默认 false
    removeAt: true, // 移除第一个at 默认 false
    logLevel: 'info', // 日志等级 默认 info
    maxRetry: 10, // 最大重连次数 默认 10
    intents: ['GROUP_AT_MESSAGE_CREATE', 'C2C_MESSAGE_CREATE'], // (必填)
})
// 启动机器人
bot.start()

bot.on('message.group', async (e) => {
    await loader.deal.call(pluginsLoader, await message.msg(e, true))
})

bot.on('message.private', async (e) => {
    await loader.deal.call(pluginsLoader, await message.msg(e, false))
})

