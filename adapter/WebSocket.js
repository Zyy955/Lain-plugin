import shamrock from "./shamrock/app.js"
import ComWeChat from "./WeChat/ComWx.js"
import express from "express"
import { createServer } from "http"
import common from "../model/common.js"
import fetch from "node-fetch"
import fs from "fs"

export default class WebSocket {
    constructor() {
        this.port = Bot.lain.cfg.port
        this.path = "/Shamrock"
        this.path_wx = "/ComWeChat"
    }

    async server() {
        /** 存储连接的bot对象 */
        Bot.shamrock = new Map()
        /** 保存监听器返回 */
        Bot.lain.on = new Map()
        /** 限制访问地址 */
        const accessCache = new Map()
        /** 创建Express应用程序 */
        const app = express()
        /** 创建HTTP服务器 */
        this.Server = createServer(app)

        /** 解除端口占用api */
        app.get("/api/close-server", async (req, res) => {
            const ip = req.ip
            if (ip !== "::1" && ip !== "127.0.0.1") {
                return res.status(401).json({ error: "未经授权的访问" })
            }

            try {
                res.json({ message: "正在关闭当前服务器..." })
                this.Server.close(() => {
                    logger.warn(`[Lain-plugin] 服务器在另外一处启动，正在关闭当前服务器...`)
                })
            } catch (error) {
                logger.error(error)
                res.status(500).json({ error: "关闭服务器时出错" })
            }
        })

        /** QQBot图片Api */
        app.get("/api/image", (req, res) => {
            const { token, name } = req.query
            /** 检查令牌有效性 */
            if (token !== Bot.lain.cfg.QQBotImgToken) return res.status(401).send("令牌无效")
            const time = Date.now()
            /** 访问频率 */
            if (accessCache.has(name) && time - accessCache.get(name) < 60000) return res.status(429).send("同一个地址每分钟只能访问一次")
            const _path = process.cwd() + `/plugins/Lain-plugin/resources/image/${name}`
            if (!fs.existsSync(_path)) return res.status(404).send("啊咧，图片不存在捏")
            accessCache.set(name, time)
            /** 返回图片 */
            res.sendFile(_path, {}, (err) => {
                if (err) {
                    common.log("QQBot图片Api", err, "error")
                } else {
                    /** 1分钟后删除图片文件 */
                    setTimeout(() => { fs.unlink(_path, (err) => { if (err) common.log("QQBot图片Api", err, "error") }) }, 60000)
                }
            })
        })

        /** 将WebSocket服务器实例与HTTP服务器关联 */
        this.Server.on("upgrade", (request, socket, head) => {
            const pathname = request.url
            if (pathname === this.path) {
                shamrock.handleUpgrade(request, socket, head, (socket) => {
                    shamrock.emit("connection", socket, request)
                })
            }
            else if (pathname === this.path_wx) {
                ComWeChat.handleUpgrade(request, socket, head, (socket) => {
                    ComWeChat.emit("connection", socket, request)
                })
            }
            else {
                logger.error("", `未知连接，已拒绝连接：${request.url}`)
                socket.destroy()
            }
        })

        this.Server.listen(this.port, async () => {
            await common.log("", `本地 Shamrock 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path}`)}`)
            await common.log("", `本地 ComWeChat 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path_wx}`)}`)
        })

        /** 捕获错误 */
        this.Server.on("error", async (error) => {
            if (error.code === "EADDRINUSE") {
                logger.error(`[Lain-plugin] 端口${this.port}已被占用，正在尝试解除`)
                try {
                    const response = await fetch(`http://localhost:${this.port}/api/close-server`)
                    if (response.ok) {
                        await common.sleep(5000)
                        await common.log("", `本地 Shamrock 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path}`)}`)
                        await common.log("", `本地 ComWeChat 连接地址：${logger.blue(`ws://localhost:${this.port}${this.path_wx}`)}`)
                        return
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