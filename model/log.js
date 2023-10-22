import Api from "./api.js"
export default new class log_msg {
    /** 处理简单事件 */
    async event(data) {
        /** 机器人id */
        const { id, msg } = data
        /** 机器人名称 */
        this.name = Bot[id].name
        /** 频道id */
        let GuildId = await Api.GuildId(msg)
        /** 子频道id */
        let channel_id = GuildId ? await Api.channel_id(msg) : null
        /** 操作人id */
        let op_user_id = GuildId ? await Api.op_user_id(msg) : null

        /** 获取频道名称 */
        let Guild_name = GuildId ? (Bot.qg.guilds?.[GuildId]?.name || GuildId) : GuildId
        /** 获取子频道名称 */
        let channel_name = GuildId && channel_id ? (Bot.qg.guilds?.[GuildId].channels[channel_id] || channel_id) : channel_id
        /** 操作人名称 */
        let op_user_name = op_user_id ? (await Api.guildMember(id, GuildId, op_user_id))?.nick || op_user_id : op_user_id
        /** 用户名称 */
        let user_name = msg.author?.username || msg.message?.author?.username || msg.user?.username || Bot[id].name
        if (!user_name || user_name === "") {
            let user_Id = msg.author?.id || msg.message?.author.id || msg?.user_id
            try {
                user_name = (await Api.guildMember(id, GuildId, user_Id)).nick
            } catch (err) {
                user_name = "未知"
                logger.error(err)
            }
        }

        switch (data.eventType) {
            case "GUILD_CREATE":
                logger.info(`${this.name} 通知：[${msg.name}，操作人:${op_user_name}] Bot已加入频道：${msg.name}`)
                break
            case "GUILD_UPDATE":
                logger.info(`${this.name} 通知：[${Guild_name}] 管理员 ${op_user_name} 更改了频道资料`)
                break
            case "GUILD_DELETE":
                logger.info(`${this.name} 通知：[${msg.name}] 管理员 ${op_user_name} 将 ${this.name} 从频道 ${msg.name} 中移除了!`)
                break
            case "CHANNEL_CREATE":
                logger.info(`${this.name} 通知：[${Guild_name}] 管理员 ${op_user_name} 已创建子频道：${msg.name}`)
                break
            case "CHANNEL_UPDATE":
                logger.info(`${this.name} 通知：[${Guild_name}] 管理员 ${op_user_name} 已更新子频道 ${msg.name} 的资料`)
                break
            case "CHANNEL_DELETE":
                logger.info(`${this.name} 通知：[${Guild_name}] 管理员 ${op_user_name} 已删除子频道：${msg.name}`)
                break
            case "GUILD_MEMBER_ADD":
                if (msg.user.bot)
                    logger.info(`${this.name} 通知：[${Guild_name}] 管理员 ${op_user_name} 已添加机器人：${msg.nick}`)
                else
                    logger.info(`${this.name} 通知：[${Guild_name}]成员 ${msg.nick} 加入频道！`)
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
    }
}