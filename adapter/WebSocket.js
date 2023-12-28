import fs from 'fs'
import express from 'express'
import fetch from 'node-fetch'
import { createServer } from 'http'
import common from '../model/common.js'
import shamrock from './shamrock/index.js'
import ComWeChat from './WeChat/index.js'
import { fileTypeFromBuffer } from 'file-type'

export default class WebSocket {
  constructor () {
    this.port = Bot.lain.cfg.port
    this.path = '/Shamrock'
    this.path_wx = '/ComWeChat'
  }

  async server () {
    /** 存储连接的bot对象 */
    Bot.shamrock = new Map()
    /** 保存监听器返回 */
    Bot.lain.on = new Map()
    /** 微信登录 */
    Bot.lain.loginMap = new Map()
    /** 创建Express应用程序 */
    const app = express()
    /** 创建HTTP服务器 */
    this.Server = createServer(app)

    /** 解除端口占用api */
    app.get('/api/close-server', async (req, res) => {
      const ip = req.ip
      if (ip !== '::1' && ip !== '127.0.0.1') {
        return res.status(401).json({ error: '未经授权的访问' })
      }

      try {
        res.json({ message: '正在关闭当前服务器...' })
        this.Server.close(() => {
          logger.warn('[Lain-plugin] 服务器在另外一处启动，正在关闭当前服务器...')
        })
      } catch (error) {
        logger.error(error)
        res.status(500).json({ error: '关闭服务器时出错' })
      }
    })

    /** QQBotApi */
    app.get('/api/QQBot', async (req, res) => {
      const { token, name } = req.query
      common.mark('QQBotApi', `[收到请求] 访问文件：${name}`)
      /** 检查令牌有效性 */
      if (token !== Bot.lain.cfg.QQBotImgToken) return res.status(401).send('令牌无效')
      const _path = process.cwd() + `/plugins/Lain-plugin/resources/QQBotApi/${name}`
      if (!fs.existsSync(_path)) return res.status(404).send('啊咧，文件不存在捏')

      /** 图片类型特殊处理 */
      const type = await fileTypeFromBuffer(fs.readFileSync(_path))
      if (type && type.mime.startsWith('image')) {
        res.setHeader('Content-Type', type.mime)
        res.setHeader('Content-Disposition', 'inline')
      }

      /** 返回文件 */
      res.sendFile(_path, {}, (err) => {
        if (err) {
          common.error('QQBotApi', err)
        } else {
          /** 访问后删除文件 */
          try {
            setTimeout(() => {
              if (fs.existsSync(_path)) fs.unlink(_path, (err) => { if (err) common.error('QQBotApi', err) })
            }, Number(Bot.lain.cfg.QQBotDelFiles) * 100)
          } catch { }
        }
      })
    })

    /** 将WebSocket服务器实例与HTTP服务器关联 */
    this.Server.on('upgrade', (request, socket, head) => {
      const pathname = request.url
      if (pathname === this.path) {
        shamrock.handleUpgrade(request, socket, head, (socket) => {
          shamrock.emit('connection', socket, request)
        })
      } else if (pathname === this.path_wx) {
        ComWeChat.handleUpgrade(request, socket, head, (socket) => {
          ComWeChat.emit('connection', socket, request)
        })
      } else {
        logger.error('', `未知连接，已拒绝连接：${request.url}`)
        socket.destroy()
      }
    })

    this.Server.listen(this.port, async () => {
      common.info('Lain-plugin', `HTTP服务器：${logger.blue(`http://localhost:${this.port}`)}`)
      common.info('Lain-plugin', `QQBotApi：${logger.blue(`http://localhost:${this.port}/api/QQBot`)}`)
      common.info('Lain-plugin', `本地 Shamrock 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path}`)}`)
      common.info('Lain-plugin', `本地 ComWeChat 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path_wx}`)}`)
    })

    /** 捕获错误 */
    this.Server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`[Lain-plugin] 端口${this.port}已被占用，正在尝试解除`)
        try {
          const response = await fetch(`http://localhost:${this.port}/api/close-server`)
          if (response.ok) {
            await common.sleep(5000)
            common.info('Lain-plugin', `本地 Shamrock 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path}`)}`)
            common.info('Lain-plugin', `本地 ComWeChat 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path_wx}`)}`)
          } else {
            throw new Error(`HTTP请求失败，状态码: ${response.status}`)
          }
        } catch (error) {
          logger.error(error)
        }
      } else {
        logger.error(error)
      }
    })
  }
}
