import fs from "fs"
import Yaml from "yaml"
import chalk from "chalk"
import crypto from "crypto"
import chokidar from "chokidar"
import common from "../model/common.js"
import guild from "../adapter/QQGuild/guild.js"
import WebSocket from "../adapter/WebSocket.js"

const _path = process.cwd() + "/plugins/Lain-plugin/config"

const configItems = [
    { key: 'port', value: '2955', comment: '# 端口' },
    { key: 'path', value: '"/ComWeChat"', comment: '# 路径' },
    { key: 'autoFriend', value: '0', comment: '# 是否自动同意加好友 1-同意 0-不处理' },
    { key: 'name', value: '""', comment: '# 自定义椰奶状态名称' },
    { key: 'stdin_nickname', value: '"标准输入"', comment: '# 标准输入的昵称' },
    { key: 'baseUrl', value: '', comment: '# shamrock主动http端口，例如http://localhost:5700。若填写将通过此端口进行文件上传等被动ws不支持的操作' },
    { key: 'token', value: '', comment: '# 鉴权token，如果开放公网强烈建议配置' },
    { key: 'QQBotImgIP', value: '127.0.0.1', comment: '# 图片Api的IP或者域名' },
    { key: 'QQBotImgToken', value: crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex"), comment: '# 图片Api的token 随机生成 无特殊需求不建议更改' }
]

/** 检查配置文件是否存在 */
if (!fs.existsSync(_path + "/config.yaml")) {
    fs.copyFileSync(_path + "/defSet/config.yaml", _path + "/config.yaml")
} else {
    /** 兼容旧配置文件 */
    let cfg = fs.readFileSync(_path + "/config.yaml", "utf8")
    configItems.forEach(item => {
        if (!cfg.match(RegExp(`${item.key}:`))) {
            cfg += `\n${item.comment}\n${item.key}: ${item.value}`
        }
    })
    fs.writeFileSync(_path + "/config.yaml", cfg, "utf8")
}

/** 生成默认配置文件 */
if (!fs.existsSync(_path + "/bot.yaml")) {
    fs.writeFileSync(_path + "/bot.yaml", `# 机器人配置 请不要删除default！这是兼容旧配置的！\ndefault: {}`, "utf8")
}

/** 生成默认配置文件 */
if (!fs.existsSync(_path + "/QQBot.yaml")) {
    fs.writeFileSync(_path + "/QQBot.yaml", `ndefault: {}`, "utf8")
}
if (!fs.existsSync(_path + `/../resources/image`)) fs.mkdirSync(_path + `/../resources/image`)

const cfg = Yaml.parse(fs.readFileSync(_path + "/config.yaml", "utf8"))
const YZ = JSON.parse(fs.readFileSync("./package.json", "utf-8"))
const packageCfg = JSON.parse(fs.readFileSync("./plugins/Lain-plugin/package.json", "utf-8"))

Bot.lain = {
    /** 云崽信息 */
    ...packageCfg,
    name: YZ.name === "miao-yunzai" ? "Miao-Yunzai" : "Yunzai-Bot",
    ver: YZ.version,
    /** 插件信息 */
    guild: {
        name: packageCfg.name,
        ver: packageCfg.adapter.qg,
        guild_ver: packageCfg.dependencies["qq-guild-bot"].replace("^", "")
    },
    /** 基本配置 */
    cfg: cfg,
    /** 配置文件夹路径 */
    _path: _path,
    /** 全部频道列表 */
    guilds: {},
}

/** 检查配置文件是否存在 */
if (fs.existsSync(_path + "/bot.yaml")) {
    const bot = Yaml.parse(fs.readFileSync(_path + "/bot.yaml", "utf8"))
    for (const i in bot) {
        if (i === "default") break
        try {
            const qg = new guild(bot[i])
            await qg.monitor()
        } catch (err) {
            logger.error(err)
        }
    }
}

/** 热重载~ */
try {
    const filePath = _path + "/config.yaml"
    if (fs.existsSync(filePath)) {
        const watcher = chokidar.watch(filePath)

        watcher.on("change", async () => {
            await common.sleep(1500)
            Bot.lain.cfg = Yaml.parse(fs.readFileSync(filePath, "utf8"))
            logger.mark("[Lain-plugin][配置文件修改] 成功重载")
        })

        watcher.on("error", (error) => {
            logger.error(`[Lain-plugin]发生错误: ${error}`)
            watcher.close()
        })
    } else {
        logger.error(`[Lain-plugin]文件 ${filePath} 不存在`)
    }
} catch (err) {
    logger.error(err)
}

await (new WebSocket()).server()

logger.info(chalk.hex("#868ECC")(`Lain-plugin插件${Bot.lain.version}全部初始化完成~`))
logger.info(chalk.hex("#868ECC")("https://gitee.com/Zyy955/Lain-plugin"))