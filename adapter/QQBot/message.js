import common from "../../model/common.js"

export default new class message {
    /** 转换格式给云崽 */
    async msg(e, isGroup) {
        /** 回复 */
        const reply = e.reply

        /** 快速撤回 */
        e.recall = async () => { return }

        /** 获取对应用户头像 */
        e.getAvatarUrl = (id = user_id) => {
            return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
        }

        /** 构建场景对应的方法 */
        if (isGroup) {
            const member = {
                info: {
                    group_id: e.group_id,
                    user_id: e.user_id,
                    nickname: "",
                    last_sent_time: "",
                },
                group_id: e.group_id,
                is_admin: false,
                is_owner: false,
                /** 获取头像 */
                getAvatarUrl: () => {
                    return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${e.user_id}`
                },
                mute: async (time) => {
                    return
                },
            }

            e.member = member
            e.group_name = e.group_id

            e.group = {
                pickMember: (id) => {
                    return {
                        member,
                        getAvatarUrl: (userId = id) => `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`
                    }
                },
                getChatHistory: async (msg_id, num, reply) => {
                    return ["test"]
                },
                recallMsg: async (msg_id) => {
                    return
                },
                sendMsg: async (msg, quote) => {
                    return reply(msg, quote)
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, false)
                },
                /** 戳一戳 */
                pokeMember: async (operator_id) => {
                    return
                },
                /** 禁言 */
                muteMember: async (group_id, user_id, time) => {
                    return
                },
                /** 全体禁言 */
                muteAll: async (type) => {
                    return
                },
                getMemberMap: async () => {
                    return
                },
                /** 退群 */
                quit: async () => {
                    return
                },
                /** 设置管理 */
                setAdmin: async (qq, type) => {
                    return
                },
                /** 踢 */
                kickMember: async (qq, reject_add_request = false) => {
                    return
                },
                /** 头衔 **/
                setTitle: async (qq, title, duration) => {
                    return
                },
                /** 修改群名片 **/
                setCard: async (qq, card) => {
                    return
                },
            }
        } else {
            e.friend = {
                sendMsg: async (msg, quote) => {
                    return reply(msg, quote)
                },
                recallMsg: async (msg_id) => {
                    return
                },
                makeForwardMsg: async (forwardMsg) => {
                    return await common.makeForwardMsg(forwardMsg, false)
                },
                getChatHistory: async (msg_id, num, reply = true) => {
                    return ["test"]
                },
                getAvatarUrl: async (userID = user_id) => {
                    return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userID}`
                }
            }
        }

        /** 将收到的消息转为字符串 */
        e.toString = () => {
            return e.raw_message
        }

        /** 添加适配器标识 */
        e.adapter = "QQBot"

        return e
    }
}