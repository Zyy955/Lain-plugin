import Api from './api.js'

export class ShamrockPlugin extends plugin {
  constructor () {
    super({
      name: 'Lain-plugin shamrock',
      priority: -140,
      rule: [
        {
          // yenai-plugin
          reg: '^#?((我要|给我)?(资料卡)?(点赞)?(赞|超|操|草|抄|吵|炒)我)|((赞|超|操|草|抄|吵|炒)(他|她|它|TA|ta|Ta))$',
          fnc: 'thumbUp'
        }
      ]
    })
  }

  /**
   * 适配椰奶赞我
   * @param e
   * @return {Promise<boolean>}
   */
  async thumbUp (e) {
    if (e.adapter !== 'shamrock') return false
    try {
      const YenaiQQApi = (await import('../../../yenai-plugin/model/api/QQApi.js')).default
      const YenaiFun = (await import('../../../yenai-plugin/apps/fun.js')).Fun
      // 劫持为shamrock点赞
      let target = (e.at && e.msg.includes('他', '她', '它', 'TA', 'ta', 'Ta')) ? e.at : e.user_id
      let lock = await redis.get(`lain:thumbup:${e.self_id}_${target}`)
      let _this = this
      YenaiQQApi.prototype.thumbUp = async (uid, times) => {
        // shamrock不管点没点上一律返回ok。。只好自己伪造了，不然椰奶会死循环，暂不考虑svip的情况。
        try {
          await Api.send_like(e.self_id, uid, times)
        } catch (err) {
          logger.error(err)
          return { code: 1, msg: 'Shamrock点赞失败，请查看日志' }
        }
        if (lock) {
          // 今天点过了
          return { code: 2, msg: `今天已经${_this.do || '赞'}过了，还搁这讨${_this.do || '赞'}呢！！！` }
        } else {
          const now = new Date()
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(0, 0, 0, 0)
          const secondsUntilMidnight = Math.floor((tomorrow - now) / 1000)
          await redis.set(`lain:thumbup:${e.self_id}_${target}`, '1', { EX: secondsUntilMidnight })
          lock = true
          return { code: 0, msg: '点赞成功' }
        }
      }
      const originalThumbUp = YenaiFun.prototype.thumbUp
      try {
        const tu = originalThumbUp.bind(this)
        await tu(e)
      } finally {
        // 恢复
        YenaiQQApi.prototype.thumbUp = originalThumbUp
      }
    } catch (err) {
      logger.error(err)
    }
  }
}
