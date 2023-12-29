 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

### 温馨提示：
- 目前`Shamrock`搭建难度较高，不推荐小白现阶段进行迁移。
- 目前本插件正在跟随上游`Shamrock`高速更新，追求稳定更建议您当前迁移至`QQNT`~

### 使用方法：

- shamrock安装教程：[快速开始](https://whitechi73.github.io/OpenShamrock/guide/getting-started.html)
- 安装好`Shamrock`并登录QQ之后，请打开`shamrock`，按照以下教程进行配置。
- 启动`Shamrock`，打开`被动WebSocket`
- 填写`被动WebSocket地址`：`ws://localhost:2955/Shamrock`
- 彻底关闭`QQ`，注意需要彻底关闭
- 彻底关闭`Shamrock`，注意需要彻底关闭
- 启动`Shamrock`
- 启动`QQ`
- 启动喵崽即可


解释一下`ws://localhost:2955/Shamrock`这个地址
- `ws://`这部分是固定的，无需更改
- `localhost`这个是本地地址，如果你的喵崽在`云服务器`，请更换为云服务器的`公网IP地址`
- `:2956`这部分是端口，需要使用`:`和`IP地址`连接起来，如需更改，请自行修改配置文件`config.yaml`或使用锅巴修改
- `/Shamrock`这部分是固定的，无需更改


如果加载资源失败不想重启喵崽，可尝试使用`#重载资源`指令进行重新加载好友、群聊等。

# 适配进度

没有注明的在下方的有需求并且我时间充裕的情况下会实现... 欢迎pr

- [√] 接收`文本`、`表情`、`at`、`图片`、`语音`、`视频`、`文件`消息
- [√] 发送`文本`、`表情`、`at`、`图片`、`语音`、`视频`、`戳一戳`消息
- [√] 好友主动消息`Bot[BotQQ号].pickUser(user_id).sendMsg("主动消息")`
- [√] 群聊主动消息`Bot[BotQQ号].pickGroup(group_id).sendMsg("主动消息")`
- [√] 撤回消息
- [ ] 临时会话消息收(√)发(×)
- [√] 聊天记录
- [√] 合并转发
- [√] 禁言
- [√] 戳一戳
- [√] 点赞
- [√] 群踢人、改群名片、设置精华消息、群头衔、设置群管理员
- [√] 进退群、群撤回、禁言等事件
- [√] cookie(`Bot[BotQQ号].cookies`)和bkn(`Bot[BotQQ号].bkn`)
- [ ] OCR
- [√] 查看群荣誉、群系统消息、群精华消息
- [√] 发送天气、音乐、位置和分享卡片
- [ ] 处理群申请和好友申请
- [√] 上传和发送文件

如需使用`yenai-plugin`，请使用为`shamrock`专门适配的椰奶：[yenai-plugin](https://github.com/yeyang52/yenai-plugin)