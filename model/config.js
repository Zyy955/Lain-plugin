import fs from "fs"
import Yaml from "yaml"
import chalk from "chalk"
import guild from "../adapter/QQGuild/guild.js"
import chokidar from "chokidar"
import common from "../../../lib/common/common.js"

const _path = process.cwd() + "/plugins/Lain-plugin/config"

/** 兼容旧配置 */
if (fs.existsSync("./plugins/Lain-plugin/config.yaml")) {
    if (!fs.existsSync(_path + "/bot.yaml")) {
        const old = Yaml.parse(fs.readFileSync("./plugins/Lain-plugin/config.yaml", "utf8"))
        fs.writeFileSync(_path + "/bot.yaml", Yaml.stringify(old.bot), "utf8")
    }
}

/** 检查配置文件是否存在 */
if (!fs.existsSync(_path + "/config.yaml")) {
    fs.copyFileSync(_path + "/defSet/config.yaml", _path + "/config.yaml")
}

/** 生成默认配置文件 */
if (!fs.existsSync(_path + "/bot.yaml")) {
    fs.writeFileSync(_path + "/bot.yaml", `# 机器人配置 请不要删除default！这是兼容旧配置的！\ndefault: {}`, "utf8")
}

const cfg = Yaml.parse(fs.readFileSync(_path + "/config.yaml", "utf8"))
const YZ = JSON.parse(fs.readFileSync("./package.json", "utf-8"))
const guilds = JSON.parse(fs.readFileSync("./plugins/Lain-plugin/package.json", "utf-8"))

Bot.qg = {
    /** 云崽信息 */
    YZ: {
        name: YZ.name === "miao-yunzai" ? "Miao-Yunzai" : "Yunzai-Bot",
        ver: YZ.version
    },
    /** 插件信息 */
    guild: {
        name: guilds.name,
        ver: guilds.adapter.qg,
        guild_ver: guilds.dependencies["qq-guild-bot"].replace("^", "")
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
            Bot.qg.cfg = Yaml.parse(fs.readFileSync(filePath, "utf8"))
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

logger.info(chalk.hex("#868ECC")(`Lain-plugin插件${Bot.qg.guild.ver}全部初始化完成~`))
logger.info(chalk.hex("#868ECC")("https://gitee.com/Zyy955/Lain-plugin"))