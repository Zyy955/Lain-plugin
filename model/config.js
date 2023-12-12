import fs from 'fs'
import Yaml from 'yaml'
import crypto from 'crypto'
import chokidar from 'chokidar'
import common from '../model/common.js'

const _path = process.cwd() + '/plugins/Lain-plugin/config'

const configItems = [
  { key: 'port', value: '2955', comment: '# 端口' },
  { key: 'autoFriend', value: '0', comment: '# 是否自动同意加好友 1-同意 0-不处理' },
  { key: 'name', value: '""', comment: '# 自定义椰奶状态名称' },
  { key: 'stdin_nickname', value: '"标准输入"', comment: '# 标准输入的昵称' },
  { key: 'baseUrl', value: '', comment: '# shamrock主动http端口，例如http://localhost:5700。若填写将通过此端口进行文件上传等被动ws不支持的操作' },
  { key: 'token', value: '', comment: '# 鉴权token，如果开放公网强烈建议配置' },
  { key: 'QQBotImgIP', value: '127.0.0.1', comment: '# 图片Api的IP或者域名' },
  { key: 'QQBotImgToken', value: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'), comment: '# 图片Api的token 随机生成 无特殊需求不建议更改' },
  { key: 'FigureBed', value: 'http://206.233.128.146/uploadimg', comment: '# 方法1：图床API 从网上收集的，非本人所属，侵权删~' },
  { key: 'QQBotPort', value: 0, comment: '# QQBot图片Api公网IP实际端口。实际占用的是HTTP端口，此配置适用于内网和公网端口不一致用户。' },
  { key: 'QQBotPrefix', value: true, comment: '# QQBot指令前缀转换 /转#' },
  { key: 'githubKey', value: '', comment: '# Github personal access token, 用于查看和下载shamrock版本信息' },
  { key: 'QQBotGroupId', value: '', comment: '# QQBot默认进群后，推送提示显示的群号。' },
  { key: 'QQBotTips', value: false, comment: '# QQBot防倒卖崽提示' }
]

/** 检查配置文件是否存在 */
if (!fs.existsSync(_path + '/config.yaml')) {
  fs.copyFileSync(_path + '/defSet/config.yaml', _path + '/config.yaml')
  let cfg = fs.readFileSync(_path + '/config.yaml', 'utf8')
  cfg = cfg.replace('QQBotImgToken: ""', `QQBotImgToken: "${crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex')}"`)
  fs.writeFileSync(_path + '/config.yaml', cfg, 'utf8')
} else {
  /** 兼容旧配置文件 */
  let cfg = fs.readFileSync(_path + '/config.yaml', 'utf8')
  configItems.forEach(item => {
    if (!cfg.match(RegExp(`${item.key}:`))) {
      cfg += `\n${item.comment}\n${item.key}: ${item.value}`
    }
  })
  /** 处理token */
  if (cfg.match(RegExp('QQBotImgToken: "test"'))) {
    cfg = cfg.replace('QQBotImgToken: "test"', `QQBotImgToken: "${crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex')}"`)
  } else if (cfg.match(RegExp('QQBotImgToken: ""'))) {
    cfg = cfg.replace('QQBotImgToken: ""', `QQBotImgToken: "${crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex')}"`)
  }
  fs.writeFileSync(_path + '/config.yaml', cfg, 'utf8')
}

/** 生成默认配置文件 */
if (!fs.existsSync(_path + '/bot.yaml')) {
  fs.writeFileSync(_path + '/bot.yaml', '# 机器人配置 请不要删除default！这是兼容旧配置的！\ndefault: {}', 'utf8')
}

/** 生成默认配置文件 */
if (!fs.existsSync(_path + '/QQBot.yaml')) {
  fs.writeFileSync(_path + '/QQBot.yaml', 'ndefault: {}', 'utf8')
}
if (!fs.existsSync(_path + '/../resources/QQBotApi')) fs.mkdirSync(_path + '/../resources/QQBotApi')
if (!fs.existsSync(process.cwd() + '/temp/WeXin')) fs.mkdirSync(process.cwd() + '/temp/WeXin')

const cfg = Yaml.parse(fs.readFileSync(_path + '/config.yaml', 'utf8'))
const packYZ = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
const BotCfg = Yaml.parse(fs.readFileSync('./config/config/bot.yaml', 'utf8'))
const packLain = JSON.parse(fs.readFileSync('./plugins/Lain-plugin/package.json', 'utf-8'))

const { name, version, adapter, dependencies } = packLain
Bot.lain = {
  /** 云崽信息 */
  ...packLain,
  /** 基本配置 */
  cfg,
  /** 配置文件夹路径 */
  _path,
  BotCfg,
  /** 全部频道列表 */
  guilds: {},
  /** 适配器版本及依赖 */
  adapter: {
    lain: {
      /** 插件 */
      version: {
        id: '喵崽',
        name,
        version
      },
      /** 主体 */
      apk: {
        display: 'Miao-Yunzai',
        version: packYZ.version
      }
    },
    QQGuild: {
      /** 插件 */
      version: {
        id: '私域',
        name: 'QQ频道',
        version: adapter.QQGuild
      },
      /** 依赖包 */
      apk: {
        display: 'qq-guild-bot',
        version: dependencies['qq-guild-bot'].replace('^', '')
      }
    },
    ComWeChat: {
      /** 插件 */
      version: {
        id: 'PC',
        name: '微信',
        version: adapter.ComWeChat
      },
      /** 依赖包 */
      apk: {
        display: 'CWeChatRobot',
        version: adapter.CWeChatRobot.replace('^', '')
      }
    },
    stdin: {
      /** 插件 */
      version: {
        id: 'stdin',
        name: '标准输入',
        version: adapter.stdin
      },
      /** 依赖包 */
      apk: {
        display: '',
        version: ''
      }
    },
    Shamrock: {
      /** 插件 */
      version: {
        id: 'Shamrock',
        name: '三叶草',
        version: adapter.stdin
      },
      /** 依赖包 */
      apk: {
        display: '',
        version: ''
      }
    },
    QQBot: {
      /** 插件 */
      version: {
        id: 'QQBot',
        name: 'QQBot',
        version: adapter.QQBot
      },
      /** 依赖包 */
      apk: {
        display: 'qq-group-bot',
        version: dependencies['qq-group-bot'].replace('^', '')
      }
    },
    WeXin: {
      /** 插件 */
      version: {
        id: 'WeXin',
        name: 'WeXin',
        version: adapter.WeXin
      },
      /** 依赖包 */
      apk: {
        display: 'wechat4u',
        version: dependencies.wechat4u.replace('^', '')
      }
    }
  }
}

/** 清空资源 */
fs.readdir(`${_path}/../resources/QQBotApi`, (err, files) => {
  if (err) console.error(err)
  files.forEach(file => { fs.unlink(`${_path}/../resources/QQBotApi/${file}`, (err) => { console.error(err) }) })
})

/** 热重载~ */
try {
  const filePath = _path + '/config.yaml'
  if (fs.existsSync(filePath)) {
    const watcher = chokidar.watch(filePath)

    watcher.on('change', async () => {
      await common.sleep(1500)
      Bot.lain.cfg = Yaml.parse(fs.readFileSync(filePath, 'utf8'))
      logger.mark('[Lain-plugin][配置文件修改] 成功重载')
    })

    watcher.on('error', (error) => {
      logger.error(`[Lain-plugin]发生错误: ${error}`)
      watcher.close()
    })
  } else {
    logger.error(`[Lain-plugin]文件 ${filePath} 不存在`)
  }
} catch (err) {
  logger.error(err)
}
