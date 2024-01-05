import fs from 'node:fs'
import { exec } from 'child_process'
import { Restart } from '../../other/restart.js'
import { AdapterRestart } from '../apps/restart.js'

const _path = process.cwd() + '/plugins/Lain-plugin'

/** 全局变量lain */
global.lain = {
  _path,
  _pathCfg: _path + '/config/config'
}

/** 还是修改一下，不然cvs这边没法用...  */
if (!fs.existsSync('./plugins/ws-plugin/model/dlc/index.js') &&
  !fs.existsSync('./plugins/ws-plugin/model/red/index.js')) {
  const getGroupMemberInfo = Bot.getGroupMemberInfo
  Bot.getGroupMemberInfo = async function (group_id, user_id) {
    try {
      return await getGroupMemberInfo.call(this, group_id, user_id)
    } catch (error) {
      let nickname
      error?.stack?.includes('ws-plugin') ? nickname = 'chronocat' : nickname = 'Yunzai-Bot'
      return {
        group_id,
        user_id,
        nickname,
        card: nickname,
        sex: 'female',
        age: 6,
        join_time: '',
        last_sent_time: '',
        level: 1,
        role: 'member',
        title: '',
        title_expire_time: '',
        shutup_time: 0,
        update_time: '',
        area: '南极洲',
        rank: '潜水'
      }
    }
  }
}

try {
  /** 兼容原版椰奶点赞 */
  const QQApi = (await import('../../yenai-plugin/model/api/QQApi.js')).default
  QQApi.prototype.thumbUp = async function (uid, times = 1) {
    if (this.e?.adapter && this.e?.adapter == 'shamrock') {
      // 劫持为shamrock点赞
      let target = (this.e.at && this.e.msg.includes('他', '她', '它', 'TA', 'ta', 'Ta')) ? this.e.at : this.e.user_id
      let lock = await redis.get(`lain:thumbup:${this.e.self_id}_${target}`)
      // shamrock不管点没点上一律返回ok。。只好自己伪造了，不然椰奶会死循环，暂不考虑svip的情况。
      try {
        const Api = (await import('../../Lain-plugin/adapter/shamrock/api.js')).default
        await Api.send_like(this.e.self_id, uid, times)
      } catch (err) {
        logger.error(err)
        return { code: 1, msg: 'Shamrock点赞失败，请查看日志' }
      }
      if (lock) {
        // 今天点过了
        return { code: 2, msg: '今天已经赞过了，还搁这讨赞呢！！！' }
      } else {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        const secondsUntilMidnight = Math.floor((tomorrow - now) / 1000)
        await redis.set(`lain:thumbup:${this.e.self_id}_${target}`, '1', { EX: secondsUntilMidnight })
        lock = true
        return { code: 0, msg: '点赞成功' }
      }
    }
    let core = this.Bot.core
    if (!core) {
      try {
        core = (await import('icqq')).core
      } catch (error) {
        throw Error('非icqq无法进行点赞')
      }
    }
    if (times > 20) { times = 20 }
    let ReqFavorite
    if (this.Bot.fl.get(uid)) {
      ReqFavorite = core.jce.encodeStruct([
        core.jce.encodeNested([
          this.Bot.uin, 1, this.Bot.sig.seq + 1, 1, 0, Buffer.from('0C180001060131160131', 'hex')
        ]),
        uid, 0, 1, Number(times)
      ])
    } else {
      ReqFavorite = core.jce.encodeStruct([
        core.jce.encodeNested([
          this.Bot.uin, 1, this.Bot.sig.seq + 1, 1, 0, Buffer.from('0C180001060131160135', 'hex')
        ]),
        uid, 0, 5, Number(times)
      ])
    }
    const body = core.jce.encodeWrapper({ ReqFavorite }, 'VisitorSvc', 'ReqFavorite', this.Bot.sig.seq + 1)
    const payload = await this.Bot.sendUni('VisitorSvc.ReqFavorite', body)
    let result = core.jce.decodeWrapper(payload)[0]
    return { code: result[3], msg: result[4] }
  }
} catch { }

Restart.prototype.restart = async function () {
  if (this.e?.adapter) {
    let adapter = new AdapterRestart()
    adapter.restart.call(this)
  } else {
    await this.e.reply('开始执行重启，请稍等...')
    logger.mark(`${this.e.logFnc} 开始执行重启，请稍等...`)

    let data = JSON.stringify({
      uin: this.e?.self_id || this.e.bot.uin,
      isGroup: !!this.e.isGroup,
      id: this.e.isGroup ? this.e.group_id : this.e.user_id,
      time: new Date().getTime()
    })

    let npm = await this.checkPnpm()

    try {
      await redis.set(this.key, data, { EX: 120 })
      let cm = `${npm} start`
      if (process.argv[1].includes('pm2')) {
        cm = `${npm} run restart`
      }

      exec(cm, { windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          redis.del(this.key)
          this.e.reply(`操作失败！\n${error.stack}`)
          logger.error(`重启失败\n${error.stack}`)
        } else if (stdout) {
          logger.mark('重启成功，运行已由前台转为后台')
          logger.mark(`查看日志请用命令：${npm} run log`)
          logger.mark(`停止后台运行命令：${npm} stop`)
          process.exit()
        }
      })
    } catch (error) {
      redis.del(this.key)
      let e = error.stack ?? error
      this.e.reply(`操作失败！\n${e}`)
    }

    return true
  }
}
