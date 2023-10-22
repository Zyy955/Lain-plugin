import fs from "fs"
import { Group } from "icqq/lib/group.js"
import { User } from "icqq/lib/friend.js"
import common from "../../../lib/common/common.js"

const old = {
    sendMsg: Group.prototype.sendMsg,
    User_sendMsg: User.prototype.sendMsg,
    getGroupMemberInfo: Bot.getGroupMemberInfo
}

/** 劫持修改sendMsg方法 */
Group.prototype.sendMsg = async function (content, source, anony = false) {
    const info = this._info
    /** 判断是否为频道 */
    if (info?.guild_id && info?.channel_id) {
        const { id, group_id, guild_id, channel_id, group_name } = info
        const data = {
            id: id,
            msg: {
                group_id: group_id,
                guild_id: guild_id,
                channel_id: channel_id
            },
            eventType: "MESSAGE_CREATE",
            group_name: group_name
        }
        const guild = (await import("../model/guild.js")).default
        return await (new guild).reply(data, content, anony)
    }
    /** 带@ = PC微信HOOK */
    else if (info?.group_id && String(info?.group_id).includes("@")) {
        const data = {
            detail_type: "group",
            group_id: info.group_id,
        }
        const Yunzai = (await import("../../WeChat-plugin/model/Yunzai.js")).Yunzai
        return await Yunzai.reply(content, data)
    }
    /** web等待完成... */
    /** icqq主动消息 */
    else if (!info) {
        try {
            const _info = Bot.gl.get(`qq_${this.gid}`)
            pickGroup_msg(_info.uin, _info.group_id, content)
        } catch (err) {
            /** 调用原始的 sendMsg 方法 */
            return old.sendMsg.call(this, content, source, anony)
        }
    }
    else {
        /** 调用原始的 sendMsg 方法 */
        return old.sendMsg.call(this, content, source, anony)
    }
}

User.prototype.sendMsg = async function (content, source) {
    /** ICQQ */
    if (!this.client.fl.get(this.uid)) {
        try {
            const info = Bot.fl.get(`qq_${this.uid}`)
            return pickUser_msg(info.uin, this.uid, content)
        } catch (err) {
            /** 加个捕获 */
            return old.User_sendMsg.call(this, content, source)
        }
    } else {
        return old.User_sendMsg.call(this, content, source)
    }
}

/** 群聊主动消息 */
async function pickGroup_msg(uin, group_id, content) {
    Bot[uin].pickGroup(group_id).sendMsg(content)
}

/** 好友主动消息 */
async function pickUser_msg(uin, group_id, content) {
    Bot[uin].pickUser(group_id).sendMsg(content)
}

/** 劫持修改getGroupMemberInfo方法 */
Bot.getGroupMemberInfo = async function (group_id, user_id) {
    let result
    try {
        result = await old.getGroupMemberInfo.call(this, group_id, user_id)
    } catch (error) {
        let nickname
        if (error?.stack?.includes('ws-plugin')) {
            nickname = 'chronocat'
        } else {
            nickname = String(group_id).includes("qg_") ? "QQGuild-Bot" : "WeChat-Bot"
        }
        result = {
            group_id,
            user_id,
            nickname,
            card: "",
            sex: "female",
            age: 6,
            join_time: "",
            last_sent_time: "",
            level: 1,
            role: "member",
            title: "",
            title_expire_time: "",
            shutup_time: 0,
            update_time: "",
            area: "南极洲",
            rank: "潜水",
        }
    }
    return result
}

/** 转发消息 加个捕获而已 */
common.makeForwardMsg = async function (e, msg = [], dec = '', msgsscr = false) {
    if (!Array.isArray(msg)) msg = [msg]
    let name = msgsscr ? e.sender.card || e.user_id : Bot.nickname
    let id = msgsscr ? e.user_id : Bot.uin

    if (e.isGroup) {
        try {
            let info = await e.bot.getGroupMemberInfo(e.group_id, id)
            name = info.card || info.nickname
        } catch (err) {
            logger.error(err.message)
        }
    }

    let userInfo = {
        user_id: id,
        nickname: name
    }

    let forwardMsg = []
    for (const message of msg) {
        if (!message) continue
        forwardMsg.push({
            ...userInfo,
            message: message
        })
    }


    /** 制作转发内容 */
    if (e?.group?.makeForwardMsg) {
        forwardMsg = await e.group.makeForwardMsg(forwardMsg)
    } else if (e?.friend?.makeForwardMsg) {
        forwardMsg = await e.friend.makeForwardMsg(forwardMsg)
    } else {
        return msg.join('\n')
    }

    if (dec) {
        /** 处理描述 */
        if (typeof (forwardMsg.data) === 'object') {
            let detail = forwardMsg.data?.meta?.detail
            if (detail) {
                detail.news = [{ text: dec }]
            }
        } else {
            forwardMsg.data = forwardMsg.data
                .replace(/\n/g, '')
                .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
                .replace(/___+/, `<title color="#777777" size="26">${dec}</title>`)
        }
    }

    return forwardMsg
}