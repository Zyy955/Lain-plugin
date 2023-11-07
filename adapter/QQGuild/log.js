import common from "../../model/common.js"

export default class qg_log {
    /** 传入基本配置 */
    constructor(id) {
        /** 开发者id */
        this.id = id
    }

    /** 处理频道事件 */
    async event(data) {
        const eventHandler = {
            GUILD_CREATE: async (msg) => {
                /** 新加入频道稍等服务器一会 */
                await common.sleep(2000)
                let admin = false
                try {
                    const Member = (await Bot[this.id].client.guildApi.guildMember(msg.id, this.tiny_id)).data
                    admin = Member.roles.includes("2") ? true : false
                } catch (err) {
                    await common.log(this.id, `Bot无法在频道 ${msg.id} 中读取基础信息，请给予权限...错误信息：${err.message}`, "error")
                }

                let qg
                try {
                    qg = (await Bot[this.id].client.guildApi.guild(msg.id)).data
                } catch (err) {
                    await common.log(this.id, `Bot无法在频道 ${msg.id} 中读取基础信息，请给予权限...错误信息：${err.message}`, "error")
                }

                Bot.lain.guilds[qg.id] = {
                    ...qg,
                    admin,
                    id: this.id,
                    channels: {}
                }

                await common.sleep(200)

                try {
                    const channelList = (await Bot[this.id].client.channelApi.channels(msg.id)).data
                    for (const i of channelList) {
                        /** 给锅巴用的 */
                        Bot.gl.set(`qg_${i.guild_id}-${i.id}`, {
                            id: this.id,
                            group_id: `qg_${i.guild_id}-${i.id}`,
                            group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
                            guild_id: i.guild_id,
                            guild_name: qg.name || i.guild_id,
                            channel_id: i.id,
                            channel_name: i.name || i.id
                        })
                        /** 添加频道列表到Bot.gl中，用于主动发送消息 */
                        Bot[this.id].gl.set(`qg_${i.guild_id}-${i.id}`, {
                            id: this.id,
                            group_id: `qg_${i.guild_id}-${i.id}`,
                            group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
                            guild_id: i.guild_id,
                            guild_name: qg.name || i.guild_id,
                            channel_id: i.id,
                            channel_name: i.name || i.id
                        })
                        /** 子频道名称 */
                        Bot.lain.guilds[i.guild_id].channels[i.id] = i.name || i.id
                    }
                } catch (err) {
                    await common.log(this.id, `Bot无法在频道 ${qg.id} 中读取子频道列表，请给予权限...错误信息：${err.message}`, "error")
                }
                return `[${msg.name}(qg_${msg.id})] 机器人加入频道，操作人：${msg.op_user_id}`
            },
            GUILD_UPDATE: (msg) => {
                return `[${msg.name}(${msg.id})] 频道信息变更，操作人：${msg.op_user_id}`
            },
            GUILD_DELETE: (msg) => {
                return `[${msg.name}(${msg.id})] 机器人被移除频道，操作人：${msg.op_user_id}`
            },
            CHANNEL_CREATE: (msg) => {
                return `[${msg.name}(${msg.id})] 子频道被创建，操作人：${msg.op_user_id}`
            },
            CHANNEL_UPDATE: (msg) => {
                return `[${msg.name}(${msg.id})] 子频道信息变更，操作人：${msg.op_user_id}`
            },
            CHANNEL_DELETE: (msg) => {
                return `[${msg.name}(${msg.id})] 子频道被删除，操作人：${msg.op_user_id}`
            },
            GUILD_MEMBER_ADD: async (msg) => {
                await common.sleep(2000)
                if (msg.user.bot) {
                    return `[${Bot.lain.guilds[msg.guild_id]?.name}(${msg.guild_id})] 频道新增机器人：${msg.user.username}(${msg.user.id})，操作人：${msg.op_user_id}`
                } else {
                    return `[${Bot.lain.guilds[msg.guild_id]?.name}(${msg.guild_id})] 新用户加入频道：${msg.user.username}(${msg.user.id})`
                }
            },
            GUILD_MEMBER_UPDATE: (msg) => {
                return `[${Bot.lain.guilds[msg.guild_id]?.name}(${msg.guild_id})] 用户的频道属性发生变化：${msg.user.username}(${msg.user.id})`
            },
            GUILD_MEMBER_REMOVE: (msg) => {
                if (msg.op_user_id === msg.user.id)
                    return `[${Bot.lain.guilds[msg.guild_id]?.name}(${msg.guild_id})] 用户退出频道：${msg.user.username}(${msg.user.id})`
                else
                    return `[${Bot.lain.guilds[msg.guild_id]?.name}(${msg.guild_id})] 用户被移除频道：${msg.user.username}(${msg.user.id})`
            },
            MESSAGE_REACTION_ADD: (msg) => {
                const guild_id = msg.guild_id
                const channel_id = msg.channel_id
                const group_name = Bot.lain.guilds[guild_id]?.name + "-" + Bot.lain.guilds[guild_id].channels[channel_id]
                let logs = `[${group_name}(qg_${guild_id}-${channel_id})] 表情表态：`
                logs += `\n消息ID：${msg.target.id}\n操作人：${msg.user_id}\n操作类型：添加表情动态\n表情ID：emoji:${msg.emoji.id}`
                return logs
            },
            MESSAGE_REACTION_REMOVE: (msg) => {
                const guild_id = msg.guild_id
                const channel_id = msg.channel_id
                const group_name = Bot.lain.guilds[guild_id]?.name + "-" + Bot.lain.guilds[guild_id].channels[channel_id]
                let logs = `[${group_name}(qg_${guild_id}-${channel_id})] 表情表态：`
                logs += `\n消息ID：${msg.target.id}\n操作人：${msg.user_id}\n操作类型：取消表情动态\n表情ID：emoji:${msg.emoji.id}`
                return logs
            },
            MESSAGE_DELETE: async (msg) => {
                return `[${Bot.lain.guilds[msg.message.guild_id]?.name}(${msg.message.guild_id})，${await this.recallMsg(msg)}`
            },
            DIRECT_MESSAGE_DELETE: async (msg) => {
                return `[${Bot.lain.guilds[msg.message.src_guild_id]?.name}(${msg.message.src_guild_id})，${await this.recallMsg(msg)}`
            },
            PUBLIC_MESSAGE_DELETE: async (msg) => {
                return `[${Bot.lain.guilds[msg.message.guild_id]?.name}(${msg.message.guild_id})，${await this.recallMsg(msg)}`
            }
        }

        await common.log(this.id, await eventHandler[data.eventType](data.msg) || `未知事件：${JSON.stringify(data)}`)
    }

    async recallMsg(msg) {
        let recallMsg = ""
        const { author, channel_id, src_guild_id, guild_id, direct_message, id } = msg.message
        try {
            const content = await redis.get(id)
            recallMsg += `用户撤回消息:`
            recallMsg += `\n操作人:${msg.op_user.id}`
            recallMsg += `\n频道ID：${src_guild_id || guild_id}`
            recallMsg += `\n子频道ID：${direct_message ? "私信" : channel_id}`
            recallMsg += `\n用户ID：${author.id}`
            recallMsg += `\n用户昵称：${author.username}`
            recallMsg += `\n用户是否为机器人：${author.bot}`
            recallMsg += `\n消息内容：${content || "未知内容"}`
            recallMsg += `\n消息ID：${id}`
        } catch (error) {
            recallMsg = `撤回消息：${id}`
        }
        return recallMsg
    }
}