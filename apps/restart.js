import fs from 'fs'
import pm2 from 'pm2'
import { exec } from 'child_process'

let state = false

export class AdapterRestart extends plugin {
  constructor (e = '') {
    super({
      name: '铃音-重启',
      dsc: '适用于适配器重启',
      event: 'message',
      priority: 0,
      rule: [
        {
          reg: '^#重启$',
          fnc: 'restart',
          permission: 'master'
        }
      ]
    })

    if (e) this.e = e

    this.key = 'Lain:restart'
  }

  async restart () {
    if (state) return true
    state = true
    if (!this.e?.adapter) return false
    this.key = `Lain:restart:${this.e.adapter}`
    // "Lain:restart:QQBot"
    await this.e.reply('开始执行重启，请稍等...')
    logger.mark(`${this.e.logFnc} 开始执行重启，请稍等...`)

    const data = JSON.stringify({
      adapter: this.e.adapter,
      uin: this.e?.self_id || this.e.bot.uin,
      isGroup: !!this.e.isGroup,
      id: this.e.isGroup ? this.e.group_id : this.e.user_id,
      time: new Date().getTime(),
      msg_id: this.e.message_id
    })

    const npm = await this.checkPnpm()

    try {
      await redis.set(this.key, data, { EX: 24000 })
      pm2.connect((err) => {
        if (err) return logger.error(err)

        pm2.list((err, processList) => {
          if (err) {
            logger.error(err)
          } else {
            const PM2Data = JSON.parse(fs.readFileSync('./config/pm2/pm2.json'))
            const processExists = processList.some(processInfo => processInfo.name === PM2Data.apps[0].name)
            const cm = processExists ? `${npm} run restart` : `${npm} start`
            pm2.disconnect()
            exec(cm, { windowsHide: true }, (error, stdout) => {
              if (error) {
                redis.del(this.key)
                this.e.reply(`操作失败！\n${error.stack}`)
                logger.error(`重启失败\n${error.stack}`)
              } else if (stdout) {
                logger.mark('重启成功，运行已由前台转为后台')
                logger.mark(`查看日志请用命令：${npm} run log`)
                logger.mark(`停止后台运行命令：${npm} stop`)
                state = false
                process.exit()
              }
            })
          }
        })
      })
    } catch (error) {
      state = false
      redis.del(this.key)
      const errorMessage = error.stack ?? error
      this.e.reply(`操作失败！\n${errorMessage}`)
      logger.error(`重启失败\n${errorMessage}`)
    }

    return true
  }

  async checkPnpm () {
    let npm = 'npm'
    let ret = await this.execSync('pnpm -v')
    if (ret.stdout) npm = 'pnpm'
    return npm
  }

  async execSync (cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }
}
