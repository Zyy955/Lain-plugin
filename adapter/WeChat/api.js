import { randomUUID } from "crypto"
import common from "../../model/common.js"

const api = {
    /** 获取支持的动作列表 */
    async get_supported_actions() {
        const params = {}
        return await this.SendApi(params, "get_supported_actions")
    },
    /** 获取运行状态 */
    async get_status() {
        const params = {}
        return await this.SendApi(params, "get_status")
    },
    /** 获取版本信息 */
    async get_version() {
        const params = {}
        return await this.SendApi(params, "get_version")
    },

    /** 获取机器人自身信息 */
    async get_self_info() {
        const params = {}
        return await this.SendApi(params, "get_self_info")
    },
    /** 获取好友信息 */
    async get_user_info(user_id) {
        const params = { user_id: user_id }
        return await this.SendApi(params, "get_user_info")
    },
    /** 获取好友列表 */
    async get_friend_list() {
        const params = {}
        return await this.SendApi(params, "get_friend_list")
    },

    /** 获取群信息 */
    async get_group_info(group_id) {
        const params = { group_id: group_id }
        return await this.SendApi(params, "get_group_info")
    },
    /** 获取群列表 */
    async get_group_list() {
        const params = {}
        return await this.SendApi(params, "get_group_list")
    },
    /** 获取群成员信息 */
    async get_group_member_info(group_id, user_id) {
        const params = { group_id: group_id, user_id: user_id }
        return await this.SendApi(params, "get_group_member_info")
    },
    /** 获取群成员列表 */
    async get_group_member_list(group_id) {
        const params = { group_id: group_id }
        return await this.SendApi(params, "get_group_member_list")
    },
    /** 设置群名称 */
    async set_group_name(group_id, group_name) {
        const params = { group_id: group_id, group_name: group_name }
        return await this.SendApi(params, "set_group_name")
    },
    /** 上传文件 */
    async upload_file(type, name, file) {
        const params = { type: type, name: name, [type]: file }
        return await this.SendApi(params, "upload_file")
    },
    /** 获取文件 */
    async get_file(type, file_id) {
        const params = { type: type, file_id: file_id }
        return await this.SendApi(params, "get_file")
    },
    /** 通过好友请求 */
    async accept_friend(v3, v4) {
        const params = { v3: v3, v4: v4 }
        return await this.SendApi(params, "wx.accept_friend")
    },
    /** 获取微信版本 */
    async get_wechat_version() {
        const params = {}
        return await this.SendApi(params, "wx.get_wechat_version")
    },
    /** 设置微信版本号 */
    async set_wechat_version(version) {
        const params = { version: version }
        return await this.SendApi(params, "wx.set_wechat_version")
    },
    /** 删除好友 */
    async delete_friend(user_id) {
        const params = { user_id: user_id }
        return await this.SendApi(params, "wx.delete_friend")
    },
    /** 设置群昵称 */
    async set_group_nickname(group_id, nickname) {
        const params = { group_id: group_id, nickname: nickname }
        return await this.SendApi(params, "wx.set_group_nickname")
    },
    /** 发送消息 */
    async send_message(type, id, message) {
        const ty = {
            "group": "group",
            "private": "private",
            "wx.get_group_poke": "group",
            "wx.get_private_poke": "private"
        }
        /** 群消息、好友消息 */
        let send_type = ty[type] ?? "group"
        /** 群id、好友id */
        let msg_type = send_type === "private" ? "user_id" : "group_id"
        const params = { detail_type: send_type, [msg_type]: id, message: message }
        /** 将发送的消息转为适合人类阅读的日志 */
        let concat = ""
        for (const i of message) {
            if (i.type === "mention") {
                concat += `{at:${i.data.user_id}}`
            }
            else if (i.type === "image") {
                concat += `{image:${i.data.file_id}}`
            }
            else if (i.type === "text") {
                concat += i.data.text
            } else {
                concat += JSON.stringify(i)
            }
        }
        await common.log(Bot.lain.wc.uin, `发送${send_type === "private" ? "好友消息" : "群消息"}：[${id}] ${concat}`)
        return await this.SendApi(params, "send_message")
    },
    /** 发送请求事件 */
    async SendApi(params, action) {
        const echo = randomUUID()

        Bot.lain.wc.send(JSON.stringify({ echo, action, params }))

        for (let i = 0; i < 20; i++) {
            const data = await Bot.lain.on.get(echo)
            if (data) {
                Bot.lain.on.delete(echo)
                try {
                    if (Object.keys(data?.data).length > 0 && data?.data) return data.data
                    return data
                } catch {
                    return data
                }
            } else {
                await common.sleep(1000)
            }
        }
        /** 获取失败 */
        return "获取失败"
    }
}

export default api