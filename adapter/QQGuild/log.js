import chalk from "chalk"
import common from "../../model/common"

export default class qg_log {
    /** 传入基本配置 */
    constructor(id) {
        /** 开发者id */
        this.id = id
    }

    /** 处理频道事件 */
    async event(data) {
        let logs
        const { msg } = data
        switch (data.eventType) {
            case "GUILD_CREATE":
                logs = `[${msg.name}(${msg.id})] 机器人加入频道(qg_${msg.id})，操作人：${msg.op_user_id}`

                /** 管理员 */
                let admin = false
                try {
                    /** 获取bot自身信息 */
                    const Member = (await Bot[this.id].client.guildApi.guildMember(msg.id, this.tiny_id)).data
                    admin = Member.roles.includes("2") ? true : false
                } catch (err) {
                    await common.logModule(this.id, `Bot无法在频道 ${qg.id} 中读取基础信息，请给予权限...\n错误信息：${err.message}`, true)
                }

                /** 获取对应频道的基础信息 */
                let qg
                try {
                    qg = (await Bot[this.id].client.guildApi.guild(msg.id)).data
                } catch (err) {
                    await common.logModule(this.id, `Bot无法在频道 ${msg.id} 中读取基础信息，请给予权限...\n错误信息：${err.message}`, true)
                }

                /** 保存所有bot的频道列表 */
                Bot.qg.guilds[qg.id] = {
                    ...qg,
                    admin,
                    id: this.id,
                    channels: {}
                }

                /** 延迟下 */
                await common.sleep(200)
                try {
                    /** 添加频道列表到Bot.gl中，用于主动发送消息 */
                    const channelList = (await Bot[this.id].client.channelApi.channels(msg.id)).data
                    for (const i of channelList) {
                        /** 存一份给锅巴用 */
                        Bot.gl.set(`qg_${i.guild_id}-${i.id}`, {
                            id: this.id,
                            group_id: `qg_${i.guild_id}-${i.id}`,
                            group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
                            guild_id: i.guild_id,
                            guild_name: qg.name || i.guild_id,
                            channel_id: i.id,
                            channel_name: i.name || i.id
                        })
                        /** 存对应uin */
                        Bot[this.id].gl.set(`qg_${i.guild_id}-${i.id}`, {
                            id: this.id,
                            group_id: `qg_${i.guild_id}-${i.id}`,
                            group_name: `${qg.name || i.guild_id}-${i.name || i.id}`,
                            guild_id: i.guild_id,
                            guild_name: qg.name || i.guild_id,
                            channel_id: i.id,
                            channel_name: i.name || i.id
                        })
                        /** 子频道id和对应名称 */
                        Bot.qg.guilds[i.guild_id].channels[i.id] = i.name || i.id
                    }
                } catch (err) {
                    await common.logModule(this.id, `Bot无法在频道 ${qg.id} 中读取子频道列表，请给予权限...\n错误信息：${err.message}`, true)
                }
                break
            case "GUILD_UPDATE":
                logs = `[${msg.name}(${msg.id})] 频道(qg_${msg.id})信息变更，操作人：${msg.op_user_id}`
                break
            case "GUILD_DELETE":
                logs = `[${msg.name}(${msg.id})] 机器人被移除频道(qg_${msg.id})，操作人：${msg.op_user_id}`
                break
            case "CHANNEL_CREATE":
                logs = `[${msg.name}(${msg.id})] 子频道(${msg.guild_id})被创建，操作人：${msg.op_user_id}`
                break
            case "CHANNEL_UPDATE":
                logs = `[${msg.name}(${msg.id})] 子频道(${msg.id})信息变更，操作人：${msg.op_user_id}`
                break
            case "CHANNEL_DELETE":
                logs = `[${msg.name}(${msg.id})] 子频道(${msg.id})被删除，操作人：${msg.op_user_id}`
                break
            case "GUILD_MEMBER_ADD":
                if (msg.user.bot) {
                    logs = `[${msg.name}(${msg.id})] 频道(${msg.guild_id})新增机器人${msg.user.username}(${msg.user.id})，操作人：${msg.op_user_id}`
                }
                else {
                    logs = `[${msg.name}(${msg.id})] 新用户加入频道(${msg.guild_id})：${msg.user.username}(${msg.user.id})`
                }
                break
            case "GUILD_MEMBER_REMOVE":
                if (msg.op_user_id === msg.user.id)
                    logger.info(`${this.name} 通知：[${Guild_name}]成员 ${msg.nick} 退出频道！`)
                else
                    logger.info(`${this.name} 通知：[${Guild_name}] 管理员 ${op_user_name} 已将 ${msg.nick} 移出频道！`)
                break

            case "MESSAGE_DELETE":
                if (msg.op_user.id === msg.message.author.id)
                    logger.info(`${this.name} 撤回消息：[${Guild_name}-${channel_name}] ${msg.message.id}`)
                else {
                    const op_name = `${op_user_name} 撤回了 ${user_name}`
                    logger.info(`${this.name} 撤回消息：[${Guild_name}-${channel_name}] ${op_name}的消息：${msg.message.id}`)
                }
                break

            /** 表情动态 */
            case "MESSAGE_REACTION_ADD":
                logger.info(`${this.name} 表情动态：[${Guild_name}-${channel_name}，${user_name}] 为消息 ${msg.target.id} 添加表情 [emoji:${msg.emoji.id}]`)
                break
            case "MESSAGE_REACTION_REMOVE":
                logger.info(`${this.name} 表情动态：[${Guild_name}-${channel_name}，${user_name}] 取消了消息 ${msg.target.id} 的表情 [emoji:${msg.emoji.id}]`)
                break

            case "DIRECT_MESSAGE_DELETE":
                if (msg.op_user.id === msg.message.author.id)
                    logger.info(`${this.name} 撤回消息：[${Guild_name}-私信，${user_name}] ${msg.message.id}`)
                else {
                    const op_name = `${op_user_name} 撤回了 ${user_name}`
                    logger.info(`${this.name} 撤回消息：[${Guild_name}-私信] ${op_name}的消息：${msg.message.id}`)
                }
                break
            case "PUBLIC_MESSAGE_DELETE":
                if (msg.op_user.id === msg.message.author.id)
                    logger.info(`${this.name} 撤回消息：[${Guild_name}-${channel_name}，${user_name}] ${msg.message.id}`)
                else {
                    const op_name = `${op_user_name} 撤回了 ${user_name}`
                    logger.info(`${this.name} 撤回消息：[${Guild_name}-${channel_name}] ${op_name}的消息：${msg.message.id}`)
                }
                break
            default:
                logger.mark(`${this.name} [${id}] 未知事件：`, JSON.stringify(data))
                break
        }
        await common.logModule(this.id, logs)
    }
}

/** 日志模块 */
export function logModule(id, log, err = false) {
    if (err) return logger.error(`${chalk.hex("#868ECC")(`[${Bot[id].nickname}]`)}${log}`)
    return logger.info(`${chalk.hex("#868ECC")(`[${Bot[id].nickname}]`)}${log}`)
}