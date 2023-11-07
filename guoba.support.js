import fs from "fs"
import Yaml from "yaml"
import yaml from "./model/yaml.js"
import common from "../../lib/common/common.js"

/**
 *  支持锅巴
 *  锅巴插件：https://gitee.com/guoba-yunzai/guoba-plugin.git
 *  组件类型，可参考 https://vvbin.cn/doc-next/components/introduction.html
 *  https://antdv.com/components/overview-cn/
 */



// function guildList() {
const guilds = []
const channels = []
const prefixBlack = []
/** 延迟10秒加载数据，防止某些数据没有加载 */
setTimeout(async () => {
    while (true) {
        /** 防止为空 */
        if (Bot?.lain?.guilds) {
            const list = Bot.lain.guilds
            for (let id in list) {
                /** 频道 */
                guilds.push({ label: list[id].name, value: `qg_${id}` })
                /** 这里是子频道 */
                for (let i in list[id].channels) {
                    channels.push({ label: list[id].name + "-" + list[id].channels[i], value: i })
                }
            }
            break
        } else {
            await common.sleep(1000)
        }
    }

    const cfg = new yaml("./plugins/Lain-plugin/config/bot.yaml")
    const config = cfg.data()
    for (const i in config) {
        prefixBlack.push({ label: Bot?.[i]?.name || "未知", value: config[i].appID })
    }
}, 10000)

export function supportGuoba() {
    /** 添加url链接白名单 */
    const addUrlPromptProps = {
        content: "请输入URL：",
        placeholder: "请输入URL",
        okText: "添加",
        rules: [
            { required: true, message: "URL得填上才行哦~" },
            { pattern: "^https?://\\S+", message: "请输入合法的URL" },
            { max: 255, message: "URL太长了……" },
        ],
    }

    return {
        pluginInfo: {
            name: "铃音插件",
            title: "Lian-plugin",
            author: "@Lain.",
            authorLink: "https://gitee.com/Zyy955",
            link: "https://gitee.com/Zyy955/Lain-plugin",
            isV3: true,
            isV2: false,
            description: "主要为云崽提供QQ频道、PC微信、网页版微信机器人等功能",
            // 显示图标，此为个性化配置
            // 图标可在 https://icon-sets.iconify.design 这里进行搜索
            icon: "mdi: image-filter-drama-outline",
            // 图标颜色，例：#FF0000 或 rgb(255, 0, 0)
            iconColor: "#6bb9dd",
            // 如果想要显示成图片，也可以填写图标路径（绝对路径）
            iconPath: process.cwd() + "/plugins/Lain-plugin/resources/icon.png",
        },
        // 配置项信息
        configInfo: {
            // 配置项 schemas
            schemas: [
                {
                    component: "Divider",
                    label: "PC微信设置"
                },
                {
                    field: "port",
                    label: "端口",
                    bottomHelpMessage: "请输入HTTP服务器端口(Shamrock共用)",
                    component: "InputNumber",
                    required: true,
                    componentProps: {
                        type: "number",
                        placeholder: "请输入HTTP服务器端口(Shamrock共用)",
                        min: 1,
                        max: 65535,
                    },
                },
                {
                    field: "autoFriend",
                    label: "自动同意加好友",
                    component: "RadioGroup",
                    bottomHelpMessage: "是否自动同意加好友",
                    componentProps: {
                        options: [
                            { label: "不处理", value: 0 },
                            { label: "自动同意", value: 1 }
                        ]
                    }
                },
                {
                    field: "name",
                    label: "椰奶状态名称",
                    bottomHelpMessage: "自定义椰奶状态名称",
                    component: "Input",
                    required: true,
                    componentProps: {
                        placeholder: "请输入自定义椰奶状态名称",
                    },
                },
                {
                    component: "Divider",
                    label: "QQ频道设置"
                },
                {
                    field: "prefix",
                    label: "前缀转换",
                    bottomHelpMessage: "是否开启前缀“/”转换为“#”",
                    component: "Switch",
                },
                {
                    field: "prefixBlack",
                    label: "前缀转换黑名单",
                    bottomHelpMessage: "在这里添加机器人的开发者id(appID)则不会转换该机器人的前缀",
                    component: "Select",
                    componentProps: {
                        allowAdd: true,
                        allowDel: true,
                        mode: "multiple",
                        options: prefixBlack
                    }
                },
                {
                    field: "forwar",
                    label: "分片转发",
                    bottomHelpMessage: "是否使用分片发送转发消息",
                    component: "Switch",
                },
                {
                    field: "isLog",
                    label: "黑白名单日志",
                    bottomHelpMessage: "关闭后未通过黑白名单的日志将会转为debug日志",
                    component: "Switch",
                },
                {
                    field: "recallQR",
                    label: "二维码撤回时间",
                    bottomHelpMessage: "url转换成二维码后的撤回时间 0表示不撤回",
                    component: "Input",
                    required: true,
                    componentProps: {
                        type: "number",
                        placeholder: "请输入纯数字",
                        min: 1,
                        max: 120,
                    },
                },
                {
                    field: "ImageSize",
                    label: "图片压缩阈值",
                    bottomHelpMessage: "超过此大小的图片发送前会进行压缩",
                    component: "Input",
                    required: true,
                    componentProps: {
                        type: "number",
                        placeholder: "请输入纯数字",
                        min: 1,
                        max: 5,
                    },
                },
                {
                    field: "width",
                    label: "压缩图片-宽度",
                    bottomHelpMessage: "压缩后的图片宽度像素大小",
                    component: "Input",
                    required: true,
                    componentProps: {
                        type: "number",
                        placeholder: "请输入压缩后的图片宽度像素大小",
                        min: 1,
                        max: 3000,
                    },
                },
                {
                    field: "quality",
                    label: "压缩图片-质量",
                    bottomHelpMessage: "压缩后的图片质量",
                    component: "Input",
                    required: true,
                    componentProps: {
                        type: "number",
                        placeholder: "请输入压缩后的图片质量",
                        min: 1,
                        max: 100,
                    },
                },
                {
                    field: "whitelist_Url",
                    label: "白名单url",
                    bottomHelpMessage: "url白名单，在白名单中的链接不会转为二维码",
                    component: "GTags",
                    componentProps: {
                        placeholder: "请输入链接",
                        allowAdd: true,
                        allowDel: true,
                        showPrompt: true,
                        promptProps: addUrlPromptProps,
                        valueFormatter: ((value) => String(value)).toString(),
                    },
                },
                {
                    field: "whitelist",
                    label: "白名单频道",
                    bottomHelpMessage: "配置此项后，只有在配置中的频道能响应消息",
                    component: "Select",
                    componentProps: {
                        allowAdd: true,
                        allowDel: true,
                        mode: "multiple",
                        options: guilds
                    }
                },
                {
                    field: "blacklist",
                    label: "黑名单频道",
                    bottomHelpMessage: "顾名思义",
                    component: "Select",
                    componentProps: {
                        allowAdd: true,
                        allowDel: true,
                        mode: "multiple",
                        options: guilds
                    }
                },
                {
                    field: "channel_whitelist",
                    label: "白名单子频道",
                    bottomHelpMessage: "配置此项后，只有在配置中的子频道能响应消息",
                    component: "Select",
                    componentProps: {
                        allowAdd: true,
                        allowDel: true,
                        mode: "multiple",
                        options: channels
                    }
                },
                {
                    field: "channel_blacklist",
                    label: "黑名单子频道",
                    bottomHelpMessage: "顾名思义",
                    component: "Select",
                    componentProps: {
                        allowAdd: true,
                        allowDel: true,
                        mode: "multiple",
                        options: channels
                    }
                },
                {
                    component: "Divider",
                    label: "Shamrock设置"
                },
                {
                    field: "baseUrl",
                    label: "主动http端口",
                    bottomHelpMessage: "Shamrock主动http端口，例如http://localhost:5700。若填写将通过此端口进行文件上传等被动ws不支持的操作。未开启端口不要填写",
                    component: "Input",
                    required: false,
                    componentProps: {
                        placeholder: "请输入shamrock主动http端口",
                    },
                },
                {
                    field: "token",
                    label: "鉴权token",
                    bottomHelpMessage: "Shamrock鉴权token，如果开放公网强烈建议配置",
                    component: "InputPassword",
                    required: false,
                    componentProps: {
                        placeholder: "请输入shamrock鉴权token",
                    },
                },
            ],
            // 获取配置数据方法（用于前端填充显示数据）
            getConfigData() {
                return Bot.lain.cfg
            },
            // 设置配置的方法（前端点确定后调用的方法）
            setConfigData(data, { Result }) {
                const _path = Bot.lain._path + "/config.yaml"
                let cfg = Yaml.parseDocument(fs.readFileSync(_path, "utf8"))
                for (const key in data) {
                    let value = data[key]
                    switch (key) {
                        case "port":
                            cfg.setIn([key], Number(value))
                            break
                        case "path":
                            cfg.setIn([key], String(value))
                            break
                        case "autoFriend":
                            cfg.setIn([key], Number(value))
                            break
                        case "name":
                            cfg.setIn([key], String(value))
                            break
                        case "prefix":
                            cfg.setIn([key], Boolean(value))
                            break
                        case "forwar":
                            cfg.setIn([key], Boolean(value))
                            break
                        case "isLog":
                            cfg.setIn([key], Boolean(value))
                            break
                        case "ImageSize":
                            cfg.setIn([key], Number(value))
                            break
                        case "width":
                            cfg.setIn([key], Number(value))
                            break
                        case "quality":
                            cfg.setIn([key], Number(value))
                            break
                        case "recallQR":
                            cfg.setIn([key], Number(value))
                            break
                        default:
                            if (!value) break
                            if (!Array.isArray(value)) value = [value]
                            cfg.setIn([key], value)
                            break
                    }
                }
                fs.writeFileSync(_path, cfg.toString(), "utf8")
                return Result.ok({}, "保存成功~")
            },
        },
    }
}
