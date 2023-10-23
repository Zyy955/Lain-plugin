/** 
 * 2023年10月23日：可自行调用
 * 除了比较冷门的 基本都在这了
 * https://bot.q.qq.com/wiki/develop/nodesdk
 */
export default new class Api {
    /* 获取当前用户信息 */
    async me(id) {
        let { data } = await Bot[id].client.meApi.me()
        return data
    }
    /* 获取频道列表 */
    async meGuilds(id) {
        let { data } = await Bot[id].client.meApi.meGuilds()
        return data
    }
    /* 获取频道详情 */
    async guild(id, guildId) {
        let { data } = await Bot[id].client.guildApi.guild(guildId)
        return data
    }
    /* 获取子频道列表 */
    async channels(id, guildId) {
        let { data } = await Bot[id].client.channelApi.channels(guildId)
        return data
    }
    /* 获取子频道详情 */
    async channel(id, channelId) {
        let { data } = await Bot[id].client.channelApi.channel(channelId)
        return data
    }
    /* 创建子频道 */
    async postChannel(id, guildId, channel) {
        let { data } = await Bot[id].client.channelApi.postChannel(guildId, channel)
        return data
    }
    /* 修改子频道 */
    async patchChannel(id, channelId, channel) {
        let { data } = await Bot[id].client.channelApi.patchChannel(channelId, channel)
        return data
    }
    /* 删除子频道 */
    async deleteChannel(id, channelId) {
        let { data } = await Bot[id].client.channelApi.deleteChannel(channelId)
        return data
    }
    /* 获取频道成员列表 */
    async guildMembers(id, guildId, queryParams) {
        let { data } = await Bot[id].client.guildApi.guildMembers(guildId, queryParams)
        return data
    }
    /* 获取频道成员详情 */
    async guildMember(id, guildId, userId) {
        try {
            let { data } = await Bot[id].client.guildApi.guildMember(guildId, userId)
            return data
        } catch (err) {
            console.log(err)
        }

    }
    /* 删除频道成员 */
    async deleteGuildMember(id, guildId, userId) {
        let { data } = await Bot[id].client.guildApi.deleteGuildMember(guildId, userId)
        return data
    }
    /* 获取语音子频道在线成员列表 */
    async guildVoiceMembers(id, channelID) {
        let { data } = await Bot[id].client.guildApi.guildVoiceMembers(channelID)
        return data
    }
    /* 获取频道身份组列表 */
    async roles(id, guildId) {
        let { data } = await Bot[id].client.roleApi.roles(guildId)
        return data
    }
    /** 创建频道身份组 */
    async postRole(id, guildId, roleInfo) {
        let { data } = await Bot[id].client.roleApi.postRole(guildId, roleInfo)
        return data
    }
    /* 修改频道身份组 */
    async dpatchRole(id, guildId, roleId, roleInfo) {
        let { data } = await Bot[id].client.roleApi.patchRole(guildId, roleId, roleInfo)
        return data
    }
    /* 删除频道身份组 */
    async deleteRole(id, guildId, roleId) {
        let { data } = await Bot[id].client.roleApi.deleteRole(guildId, roleId)
        return data
    }
    /* 创建频道身份组成员 */
    async memberAddRole(id, guildId, roleId, userId, channelId) {
        let { data } = await Bot[id].client.memberApi.memberAddRole(guildId, roleId, userId, channelId)
        return data
    }
    /* 删除频道身份组成员 */
    async memberDeleteRole(id, guildId, roleId, userId, channelId) {
        let { data } = await Bot[id].client.memberApi.memberDeleteRole(guildId, roleId, userId, channelId)
        return data
    }
    /* 获取子频道权限 */
    async channelPermissions(id, channelId, userId) {
        let { data } = await Bot[id].client.channelPermissionsApi.channelPermissions(channelId, userId)
        return data
    }
    /* 修改子频道权限 */
    async putChannelPermissions(id, channelId, userId, remove) {
        let { data } = await Bot[id].client.channelPermissionsApi.putChannelPermissions(channelId, userId, remove)
        return data
    }
    /* 获取子频道身份组权限 */
    async channelRolePermissions(id, channelId, roleId) {
        let { data } = await Bot[id].client.channelPermissionsApi.channelRolePermissions(channelId, roleId)
        return data
    }
    /* 修改子频道身份组权限 */
    async putChannelRolePermissions(id, channelId, roleId, remove) {
        let { data } = await Bot[id].client.channelPermissionsApi.putChannelRolePermissions(channelId, roleId, remove)
        return data
    }
    /* 获取指定消息 */
    async message(id, channelID, messageID) {
        let { data } = await Bot[id].client.messageApi.message(channelID, messageID)
        return data
    }
    /* 发送消息 */
    async postMessage(id, channelID, message) {
        let { data } = await Bot[id].client.messageApi.postMessage(channelID, message)
        return data
    }
    /* 撤回消息 */
    async deleteMessage(id, channelID, messageID, hideTip) {
        let { data } = await Bot[id].client.messageApi.deleteMessage(channelID, messageID, hideTip)
        return data
    }
    /* 创建私信会话 */
    async createDirectMessage(id, dmObj) {
        let { data } = await Bot[id].client.directMessageApi.createDirectMessage(dmObj)
        return data
    }
    /* 发送私信消息 */
    async postDirectMessage(id, guildId, msgObj) {
        const res = await Bot[id].client.directMessageApi.postDirectMessage(guildId, msgObj)
        return res
    }
    /* 发表表情表态 */
    async postReaction(id, channelId, reactionObj) {
        let { data } = await Bot[id].client.reactionApi.postReaction(channelId, reactionObj)
        return data
    }
    /* 删除表情表态 */
    async deleteReaction(id, channelId, reactionObj) {
        let { data } = await Bot[id].client.reactionApi.deleteReaction(channelId, reactionObj)
        return data
    }
    /* 拉取表情表态用户列表 */
    async getReactionUserList(id, channelId, reactionObj, options) {
        let { data } = await Bot[id].client.reactionApi.getReactionUserList(channelId, reactionObj, options)
        return data
    }
    /* 禁言全员 */
    async muteAll(id, guildID, options) {
        let { data } = await Bot[id].client.muteApi.muteAll(guildID, options)
        return data
    }
    /* 禁言指定成员 */
    async muteMember(id, guildID, userID, options) {
        let { data } = await Bot[id].client.muteApi.muteMember(guildID, userID, options)
        return data
    }
    /* 禁言批量成员 */
    async muteMembers(id, guildID, userIDList, options) {
        let { data } = await Bot[id].client.muteApi.muteMembers(guildID, userIDList, options)
        return data
    }
    /* 创建频道全局公告 */
    async postGuildAnnounce(id, guildId, channelId, messageId) {
        let { data } = await Bot[id].client.announceApi.postGuildAnnounce(guildId, channelId, messageId)
        return data
    }
    /* 创建频道公告推荐子频道 */
    async postGuildRecommend(id, guildId, recommendObj) {
        let { data } = await Bot[id].client.announceApi.postGuildRecommend(guildId, recommendObj)
        return data
    }
    /* 删除频道全局公告 */
    async deleteGuildAnnounce(id, guildId, messageId) {
        let { data } = await Bot[id].client.announceApi.deleteGuildAnnounce(guildId, messageId)
        return data
    }
    /* 创建子频道公告 */
    async postChannelAnnounce(id, channelId, messageId) {
        let { data } = await Bot[id].client.announceApi.postChannelAnnounce(channelId, messageId)
        return data
    }
    /* 删除子频道公告 */
    async deleteChannelAnnounce(id, channelId, messageId) {
        let { data } = await Bot[id].client.announceApi.deleteChannelAnnounce(channelId, messageId)
        return data
    }
    /* 获取精华消息 */
    async pinsMessage(id, channelId) {
        let { data } = await Bot[id].client.pinsMessageApi.pinsMessage(channelId)
        return data
    }
    /* 创建精华消息 */
    async putPinsMessage(id, channelId, messageId) {
        let { data } = await Bot[id].client.pinsMessageApi.putPinsMessage(channelId, messageId)
        return data
    }
    /* 删除精华消息 */
    async deletePinsMessage(id, channelId, messageId) {
        let { data } = await Bot[id].client.pinsMessageApi.deletePinsMessage(channelId, messageId)
        return data
    }
    /* 音频控制 */
    async postAudio(id, channelID, audioControl) {
        let { data } = await Bot[id].client.audioApi.postAudio(channelID, audioControl)
        return data
    }
    /* 机器人上麦 */
    async botOnMic(id, channelID) {
        let { data } = await Bot[id].client.audioApi.botOnMic(channelID)
        return data
    }
    /* 机器人下麦 */
    async botOffMic(id, channelID) {
        let { data } = await Bot[id].client.audioApi.botOffMic(channelID)
        return data
    }
    /* 获取频道可用权限列表 */
    async permissions(id, guildID) {
        let { data } = await Bot[id].client.guildPermissionsApi.permissions(guildID)
        return data
    }
    /* 创建频道 API 权限授权链接 */
    async postPermissionDemand(id, guildID, permissionDemandObj) {
        let { data } = await Bot[id].client.guildPermissionsApi.postPermissionDemand(guildID, permissionDemandObj)
        return data
    }
    /** 从消息体中提取频道id */
    async GuildId(msg) {
        let GuildId
        /** 私信消息 */
        if (msg?.src_guild_id) GuildId = msg.src_guild_id
        /** 频道消息 */
        else if (msg?.guild_id) GuildId = msg.guild_id
        /** 撤回私信消息 */
        else if (msg?.message?.src_guild_id) GuildId = msg.message.src_guild_id
        /** 撤回频道消息 */
        else if (msg?.message?.guild_id) GuildId = msg.message.guild_id
        /** 其他事件 */
        else if (msg?.id) GuildId = msg.id
        return GuildId
    }
    /** 从消息体中提取子频道id */
    async channel_id(msg) {
        let channel_id
        /** 子频道消息 */
        if (msg?.channel_id) channel_id = msg.channel_id
        /** 撤回子频道消息 */
        else if (msg?.message?.channel_id) channel_id = msg.message.channel_id
        return channel_id
    }
    /** 从消息体中提取操作人id */
    async op_user_id(msg) {
        /** 操作人 */
        let op_user_id
        if (msg?.op_user_id) op_user_id = msg.op_user_id
        else if (msg?.op_user?.id) op_user_id = msg?.op_user?.id
        else op_user_id = msg?.author?.id
        return op_user_id
    }
}
