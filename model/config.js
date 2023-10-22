import fs from "fs"
import Yaml from "yaml"
import chalk from "chalk"
import guild from "./guild.js"
import chokidar from "chokidar"
import common from "../../../lib/common/common.js"

const _path = process.cwd() + "/plugins/QQGuild-plugin/config"


/** 兼容旧配置 */
if (fs.existsSync("./plugins/QQGuild-plugin/config.yaml")) {
    if (!fs.existsSync(_path + "/bot.yaml")) {
        const old = Yaml.parse(fs.readFileSync("./plugins/QQGuild-plugin/config.yaml", "utf8"))
        fs.writeFileSync(_path + "/bot.yaml", Yaml.stringify(old.bot), "utf8")
    }
}

/** 检查配置文件是否存在 */
if (!fs.existsSync(_path + "/config.yaml")) {
    fs.copyFileSync(_path + "/defSet/config.yaml", _path + "/config.yaml")
} else {
    /** 兼容旧配置文件 */
    let cfg = fs.readFileSync(_path + "/config.yaml", "utf8")
    if (!cfg.match(RegExp("width:"))) {
        cfg = cfg + `\n# 压缩后图片宽度像素大小\nwidth: 1000`
    }
    if (!cfg.match(RegExp("quality:"))) {
        cfg = cfg + `\n# 压缩后的图片质量\nquality: 100`
    }
    if (!cfg.match(RegExp("recallQR:"))) {
        cfg = cfg + `\n# 撤回url转换成二维码的时间(秒) 0表示不撤回\nrecallQR: 20`
    }
    if (!cfg.match(RegExp("isLog:"))) {
        cfg = cfg + `\n# 非白名单或黑名单是否显示日志(关闭后会转为debug日志)\nisLog: true`
    }
    if (!cfg.match(RegExp("ImageSize:"))) {
        cfg = cfg + `\n# 图片压缩阈值\nImageSize: 2.5`
    }
    if (!cfg.match(RegExp("prefixBlack:"))) {
        cfg = cfg + `\n# 前缀转换黑名单 在这里添加机器人的开发者id(appID)则不会转换该机器人的前缀\nprefixBlack:\n  - 123456`
    }
    fs.writeFileSync(_path + "/config.yaml", cfg, "utf8")
}

/** 生成默认配置文件 */
if (!fs.existsSync(_path + "/bot.yaml")) {
    fs.writeFileSync(_path + "/bot.yaml", `# 机器人配置 请不要删除default！这是兼容旧配置的！\ndefault: {}`, 'utf8')
}

const cfg = Yaml.parse(fs.readFileSync(_path + "/config.yaml", "utf8"))
const YZ = JSON.parse(fs.readFileSync("./package.json", "utf-8"))
const guilds = JSON.parse(fs.readFileSync("./plugins/QQGuild-plugin/package.json", "utf-8"))

Bot.qg = {
    /** 云崽信息 */
    YZ: {
        name: YZ.name === "miao-yunzai" ? "Miao-Yunzai" : "Yunzai-Bot",
        ver: YZ.version
    },
    /** 插件信息 */
    guild: {
        name: guilds.name,
        ver: guilds.version,
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
    await (new guild).monitor(bot)
}

/** 热重载~ */
try {
    const filePath = _path + "/config.yaml"
    if (fs.existsSync(filePath)) {
        const watcher = chokidar.watch(filePath)

        watcher.on("change", async () => {
            await common.sleep(1500)
            Bot.qg.cfg = Yaml.parse(fs.readFileSync(filePath, "utf8"))
            logger.mark("[QQGuild-plugin][配置文件修改] 成功重载")
        })

        watcher.on("error", (error) => {
            logger.error(`[QQGuild-plugin]发生错误: ${error}`)
            watcher.close()
        })
    } else {
        logger.error(`[QQGuild-plugin]文件 ${filePath} 不存在`)
    }
} catch (err) {
    logger.error(err)
}

logger.info(chalk.hex("#868ECC")(`[QQ频道]QQ频道插件${Bot.qg.guild.ver}初始化...`))
logger.info("https://gitee.com/Zyy955/QQGuild-plugin")