import Yaml from 'yaml'
import fs from 'node:fs'
import chokidar from 'chokidar'

/** 配置文件 */
class Cfg {
  constructor () {
    this._path = './plugins/Lain-plugin/config/'
    this.config = {}

    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} }

    this.initCfg()
  }

  /** 初始化配置 */
  initCfg () {
    this.path = this._path + '/config/'
    this.pathDef = this._path + '/defSet/'
    const files = fs.readdirSync(this.pathDef).filter(file => file.endsWith('.yaml'))
    for (let file of files) {
      if (!fs.existsSync(`${this.path}${file}`)) {
        fs.copyFileSync(`${this.pathDef}${file}`, `${this.path}${file}`)
      }
    }
    if (!fs.existsSync('data')) fs.mkdirSync('data')
    if (!fs.existsSync('resources')) fs.mkdirSync('resources')
  }

  /** 群配置 */
  getGroup (appid = '') {
    let config = this.getConfig('Config-group')
    let defSet = this.getdefSet('Config-group')
    if (config[appid]) {
      return { ...defSet.default, ...config.default, ...config[appid] }
    }
    return { ...defSet.default, ...config.default }
  }

  /** other配置 */
  getOther () {
    let defSet = this.getdefSet('Config-other')
    let config = this.getConfig('Config-other')
    return { ...defSet, ...config }
  }

  /** QQ频道配置 */
  getQQGuild (guild_id = '') {
    let defSet = this.getdefSet('Config-QQGuild')
    let config = this.getConfig('Config-QQGuild')
    return { ...defSet.default, ...config.default, ...config[guild_id] }
  }

  /** QQ群、频道机器人token配置 */
  getToken (appid = 'all') {
    let config = this.getConfig('token')
    if (config.token?.[appid]) {
      return config.token[appid]
    }
    return config.token || {}
  }

  /** 基本配置 */
  get bot () {
    let defSet = this.getdefSet('Config-bot')
    let config = this.getConfig('Config-bot')
    return { ...defSet, ...config }
  }

  /** HTTP服务器配置 */
  get Server () {
    return this.getConfig('Config-bot').Server
  }

  /** HTTP服务器端口 */
  get port () {
    return Number(this.getConfig('Config-bot').Server.port)
  }

  /** link替换白名单配置 */
  get WhiteLink () {
    return this.getConfig('Config-bot').Other.WhiteLink
  }

  /** 标准输入 */
  get Stdin () {
    return this.getConfig('Config-other').Stdin
  }

  /** ComWeChat */
  get ComWeChat () {
    return this.getConfig('Config-other').ComWeChat
  }

  /** QQ频道基本配置 */
  get GuildCfg () {
    return this.getConfig('Config-QQGuild')
  }

  /** 三叶草配置 */
  get Shamrock () {
    let defSet = this.getdefSet('Config-Shamrock')
    let config = this.getConfig('Config-Shamrock')
    return { ...defSet, ...config }
  }

  /** 其他配置 */
  get Other () {
    let defSet = this.getdefSet('Config-other')
    let config = this.getConfig('Config-other')
    return { ...defSet, ...config }
  }

  /** 本体package.json */
  get YZPackage () {
    if (this._YZPackage) return this._YZPackage

    this._YZPackage = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
    return this._YZPackage
  }

  /** package.json */
  get package () {
    if (this._package) return this._package

    this._package = JSON.parse(fs.readFileSync(this._path + '../package.json', 'utf8'))
    return this._package
  }

  /**
   * @param name 配置文件名称
   */
  getdefSet (name) {
    return this.getYaml('defSet', name)
  }

  /** 用户配置 */
  getConfig (name) {
    return this.getYaml('config', name)
  }

  /**
   * 获取配置yaml
   * @param type 默认跑配置-defSet，用户配置-config
   * @param name 名称
   */
  getYaml (type, name) {
    let file = `${this._path}/${type}/${name}.yaml`
    let key = `${type}.${name}`
    if (this.config[key]) return this.config[key]

    this.config[key] = Yaml.parse(
      fs.readFileSync(file, 'utf8')
    )

    this.watch(file, name, type)

    return this.config[key]
  }

  /** 监听配置文件 */
  watch (file, name, type = 'defSet') {
    let key = `${type}.${name}`

    if (this.watcher[key]) return

    const watcher = chokidar.watch(file)
    watcher.on('change', path => {
      delete this.config[key]
      if (typeof Bot == 'undefined') return
      logger.mark(`[修改配置文件][${type}][${name}]`)
      if (this[`change_${name}`]) {
        this[`change_${name}`]()
      }
    })

    this.watcher[key] = watcher
  }

  /** 更新全局Bot中的配置 */
  change_token () {
    const CfgList = Object.values(this.token())
    if (CfgList.length) for (const i of CfgList) if (typeof Bot[i.appid] !== 'undefined') Bot[i.appid].config = i
  }
}

export default new Cfg()
