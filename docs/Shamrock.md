 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

### 温馨提示：
- 目前`Shamrock`搭建难度较高，不推荐小白现阶段进行迁移。
- 目前本插件也是只实现了简单的图文收发，更建议您当前迁移至`QQNT`~

### 使用方法：
- 由于测试阶段，目前本插件关于`Shamrock`部分的端口暂不支持自行更改，正式合并至主分支后会自定义~
- 启动`Shamrock.apk`，打开`被动WebSocket`
- 填写`被动WebSocket地址`：`ws://localhost:2956/Shamrock`
- 重启`Shamrock.apk`
- 启动QQ
- 启动喵崽即可

# 适配进度

没有注明的在下方的有需求并且我时间充裕的情况下会实现...

- [√] 接收`文本`、`表情`、`at`、`图片`消息，语音、视频、文件消息需测试。
- [√] 发送`文本`、`表情`、`at`、`图片`消息，语音、视频消息需测试。
- [√] 好友主动消息`Bot[BotQQ号].pickUser(user_id).sendMsg("主动消息")`
- [√] 群聊主动消息`Bot[BotQQ号].pickGroup(group_id).sendMsg("主动消息")`
- [ ] 合并转发`(上游未实现)`
- [ ] 适配禁言
- [ ] 适配戳一戳
- [ ] 适配点赞
- [ ] 适配群踢人
- [ ] 适配群申请
- [ ] 适配发送文件
