import { randomUUID } from "crypto"
import common from "../../model/common.js"

const api = {
    /**
     * 获取消息
     * @param {string} id - 机器人QQ
     * @param {string} message_id - 消息id
     */
    async get_msg(id, message_id) {
        const params = { message_id }
        return await this.SendApi(id, "get_msg", params)
    },

    /**
     * 撤回消息
     * @param {string} id - 机器人QQ
     * @param {string} message_id - 消息id
     */
    async delete_msg(id, message_id) {
        const params = { message_id }
        return await this.SendApi(id, "delete_msg", params)
    },

    /**
     * 获取登录号信息
     * @param {string} id - 机器人QQ
     */
    async get_login_info(id) {
        const params = {}
        return await this.SendApi(id, "get_login_info", params)
    },

    /**
     * 设置 QQ 个人资料
     * @param {string} id - 机器人QQ
     * @param {string} nickname - 昵称
     * @param {string} company - 公司
     * @param {string} email - 邮箱
     * @param {string} college - 大学
     * @param {string} personal_note - 个人备注
     * @param {number} [age] - 年龄 (可选)
     * @param {string} [birthday] - 生日 (格式：YYYY-MM-DD) (可选)
     */
    async set_qq_profile(id, nickname, company, email, college, personal_note, age, birthday) {
        const params = { nickname, company, email, college, personal_note, age, birthday }
        return await this.SendApi(id, "set_qq_profile", params)
    },

    /**
     * 获取陌生人信息
     * @param {string} id - 机器人QQ
     * @param {string} user_id - 陌生人QQ
     */
    async get_stranger_info(id, user_id) {
        const params = { user_id }
        return await this.SendApi(id, "get_stranger_info", params)
    },

    /**
     * 获取好友列表
     * @param {string} id - 机器人QQ
     */
    async get_friend_list(id) {
        const params = {}
        return await this.SendApi(id, "get_friend_list", params)
    },

    /**
     * 获取单向好友列表 (未实现)
     * @param {string} id - 机器人QQ
     */
    async get_unidirectional_friend_list(id) {
        const params = {}
        return await this.SendApi(id, "get_unidirectional_friend_list", params)
    },

    /**
    * 获取群信息
    * @param {string} id - 机器人QQ
    * @param {number} group_id - 群号
    */
    async get_group_info(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "get_group_info", params)
    },

    /**
     * 获取群列表
     * @param {string} id - 机器人QQ
     */
    async get_group_list(id) {
        const params = {}
        return await this.SendApi(id, "get_group_list", params)
    },

    /**
    * 获取群成员信息
    * @param {string} id - 机器人QQ
    * @param {number} group_id - 群号
    * @param {number} user_id - 群成员QQ号
    */
    async get_group_member_info(id, group_id, user_id) {
        const params = { group_id, user_id }
        return await this.SendApi(id, "get_group_member_info", params)
    },

    /**
     * 获取群成员列表
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     */
    async get_group_member_list(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "get_group_member_list", params)
    },

    /**
    * 获取群荣誉信息
    * @param {string} id - 机器人QQ
    * @param {number} group_id - 群号
    */
    async get_group_honor_info(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "get_group_honor_info", params)
    },

    /**
     * 获取群系统消息 (未实现)
     * @param {string} id - 机器人QQ
     */
    async get_group_system_msg(id) {
        const params = {}
        return await this.SendApi(id, "get_group_system_msg", params)
    },

    /**
    * 获取精华消息列表 (未实现)
    * @param {string} id - 机器人QQ
    * @param {number} group_id - 群号
    */
    async get_essence_msg_list(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "get_essence_msg_list", params)
    },

    /**
     * QQ是否在黑名单内
     * @param {string} id - 机器人QQ
     * @param {number} user_id - QQ账号
     */
    async is_blacklist_uin(id, user_id) {
        const params = { user_id }
        return await this.SendApi(id, "is_blacklist_uin", params)
    },

    /**
     * 删除好友 (未实现)
     * @param {string} id - 机器人QQ
     * @param {number} user_id - 好友 QQ 号
     */
    async delete_friend(id, user_id) {
        const params = { user_id }
        return await this.SendApi(id, "delete_friend", params)
    },
    /**
     * 删除单向好友 (未实现)
     * @param {string} id - 机器人QQ
     * @param {number} user_id - 单向好友QQ号
     */
    async delete_unidirectional_friend(id, user_id) {
        const params = { user_id }
        return await this.SendApi(id, "delete_unidirectional_friend", params)
    },

    /**
     * 设置群名
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {string} group_name - 新群名
     */
    async set_group_name(id, group_id, group_name) {
        const params = { group_id, group_name }
        return await this.SendApi(id, "set_group_name", params)
    },

    /**
     * 设置群头像
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {number} file - 图片文件
     * @param {number} cache - 是否使用已缓存的文件 通过网络URL发送时有效, 1表示使用缓存, 0关闭关闭缓存
     */
    async set_group_portrait(id, group_id, file, cache = 1) {
        const params = { group_id, file, cache }
        return await this.SendApi(id, "set_group_portrait", params)
    },

    /**
     * 设置群管理员
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {number} user_id - QQ账号
     * @param {bool} enable - 是否设置
     */
    async set_group_admin(id, group_id, user_id, enable) {
        const params = { group_id, user_id, enable }
        return await this.SendApi(id, "set_group_admin", params)
    },

    /**
     * 设置群备注
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {number} user_id - QQ账号
     * @param {string} card - 群名片内容, 不填或空字符串表示删除群名片
     */
    async set_group_card(id, group_id, user_id, card) {
        const params = { group_id, user_id, card }
        return await this.SendApi(id, "set_group_card", params)
    },

    /**
     * 设置群组专属头衔
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {number} user_id - QQ号
     * @param {string} special_title - 头衔
     */
    async set_group_special_title(id, group_id, user_id, special_title) {
        const params = { group_id, user_id, special_title }
        return await this.SendApi(id, "set_group_special_title", params)
    },

    /**
     * 群单人禁言
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {number} user_id - QQ号
     * @param {number} duration - 禁言时长，为 0 时，将解除禁言。
     */
    async set_group_ban(id, group_id, user_id, duration) {
        const params = { group_id, user_id, duration }
        return await this.SendApi(id, "set_group_ban", params)
    },

    /**
     * 群全员禁言
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {boolean} enable - 是否禁言
     */
    async set_group_whole_ban(id, group_id, enable) {
        const params = { group_id, enable }
        return await this.SendApi(id, "set_group_whole_ban", params)
    },

    /**
     * 设置精华消息（未实现）
     * @param {string} id - 机器人QQ
     * @param {number} message_id - 消息ID
     */
    async set_essence_msg(id, message_id) {
        const params = { message_id }
        return await this.SendApi(id, "set_essence_msg", params)
    },

    /**
     * 移出精华消息（未实现）
     * @param {string} id - 机器人QQ
     * @param {number} message_id - 消息ID
     */
    async delete_essence_msg(id, message_id) {
        const params = { message_id }
        return await this.SendApi(id, "delete_essence_msg", params)
    },

    /**
     * 群打卡（未实现）
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     */
    async send_group_sign(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "send_group_sign", params)
    },

    /**
     * 发送群公告（未实现）
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {string} content - 公告内容
     * @param {string} image - 图片路径（可选）
     */
    async send_group_notice(id, group_id, content, image) {
        const params = { group_id, content, image }
        return await this.SendApi(id, "_send_group_notice", params)
    },

    /**
     * 获取群公告（未实现）
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     */
    async get_group_notice(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "_get_group_notice", params)
    },

    /**
     * 群组踢人
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {number} user_id - QQ号
     * @param {boolean} reject_add_request - 是否拒绝再次加群
     */
    async set_group_kick(id, group_id, user_id, reject_add_request) {
        const params = { group_id, user_id, reject_add_request }
        return await this.SendApi(id, "set_group_kick", params)
    },

    /**
     * 退出群组
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     */
    async set_group_leave(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "set_group_leave", params)
    },

    /**
     * 群戳一戳
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {number} user_id - QQ号
     */
    async group_touch(id, group_id, user_id) {
        const params = { group_id, user_id }
        return await this.SendApi(id, "group_touch", params)
    },

    /**
     * 上传私聊文件
     * @param {string} id - 机器人QQ
     * @param {number} user_id - 对方QQ号
     * @param {string} file - 本地文件路径
     * @param {string} name - 文件名称
     */
    async upload_private_file(id, user_id, file, name) {
        const params = { user_id, file, name }
        return await this.SendApi(id, "upload_private_file", params)
    },

    /**
     * 上传群文件
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {string} file - 本地文件路径
     * @param {string} name - 储存名称
     */
    async upload_group_file(id, group_id, file, name) {
        const params = { group_id, file, name }
        return await this.SendApi(id, "upload_group_file", params)
    },

    /**
     * 删除群文件
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {string} file_id - 文件ID 参考 File 对象
     * @param {number} busid - 文件类型 参考 File 对象
     */
    async delete_group_file(id, group_id, file_id, busid) {
        const params = { group_id, file_id, busid }
        return await this.SendApi(id, "delete_group_file", params)
    },

    /**
     * 创建群文件文件夹
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     */
    async create_group_file_folder(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "create_group_file_folder", params)
    },

    /**
     * 删除群文件文件夹
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {string} folder_id - 文件夹ID 参考 Folder 对象
     */
    async delete_group_folder(id, group_id, folder_id) {
        const params = { group_id, folder_id }
        return await this.SendApi(id, "delete_group_folder", params)
    },

    /**
     * 获取群文件系统信息
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     */
    async get_group_file_system_info(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "get_group_file_system_info", params)
    },

    /**
     * 获取群根目录文件列表
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     */
    async get_group_root_files(id, group_id) {
        const params = { group_id }
        return await this.SendApi(id, "get_group_root_files", params)
    },

    /**
     * 获取群子目录文件列表
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {string} folder_id - 文件夹ID 参考 Folder 对象
     */
    async get_group_files_by_folder(id, group_id, folder_id) {
        const params = { group_id, folder_id }
        return await this.SendApi(id, "get_group_files_by_folder", params)
    },

    /**
     * 获取群文件资源链接
     * @param {string} id - 机器人QQ
     * @param {number} group_id - 群号
     * @param {string} file_id - 文件ID 参考 File 对象
     * @param {number} busid - 文件类型 参考 File 对象
     */
    async get_group_file_url(id, group_id, file_id, busid) {
        const params = { group_id, file_id, busid }
        return await this.SendApi(id, "get_group_file_url", params)
    },

    /**
     * 上传私聊文件（未实现）
     * @param {string} id - 机器人QQ
     * @param {number} user_id - 对方 QQ 号
     * @param {string} file - 本地文件路径
     * @param {string} name - 文件名称
     */
    async upload_private_file(id, user_id, file, name) {
        const params = { user_id, file, name }
        return await this.SendApi(id, "upload_private_file", params)
    },



    /** 发送请求事件 */
    async SendApi(id, action, params) {
        const bot = Bot.shamrock.get(String(id))
        if (!bot) return common.log(id, "不存在此Bot")
        const echo = randomUUID()
        return new Promise((resolve) => {
            bot.socket.on("message", (res) => {
                const data = JSON.parse(res);
                if (data?.echo === echo) {
                    resolve(data?.data || data);
                }
            })
            bot.socket.send(JSON.stringify({ echo, action, params }))
        })
    }
}

export default api