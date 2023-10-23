先开个仓...后续填坑~

这个仓的作用：整合我个人目前所有适配器插件

为什么要整合：方便维护并且整合到一起并不会增加占用。同时维护多个属实没什么精力。

QQ交流群~欢迎加入：`884587317`

- 如果您对这个项目感到满意并认为它对你有所帮助，请给我一个`Star`！

- 您的认可是我持续更新的动力~非常感谢您的支持！

使用[NodeJS-SDK](https://github.com/tencent-connect/bot-node-sdk)进行连接

![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

### 不推荐换源强制更新...

# 使用必读

<details><summary>展开/收起</summary>

`目前插件已经不再继续兼容Yunzai-Bot，因为某一次更新，删了点文件，我也不再想继续维护了，请更换喵崽吧！`


#### 可选安装
在`Yunzai`根目录执行，可更改启动命令为`node apps`来跳过登录QQ直接使用微信机器人，不影响原先的`node app`
```
curl -o "./apps.js" "https://gitee.com/Zyy955/Yunzai-Bot-plugin/raw/main/apps.js"
```
</details>

`请给予机器人基础的权限...什么权限都没有的发个鬼消息啊= =`

## 1.获取频道机器人

前往[QQ开放平台](https://q.qq.com/#/) -> 登录 -> 应用管理 -> 创建机器人 -> 创建完成

前往应用管理 -> 选择你注册的机器人 -> 开发 -> 开发设置 -> 获取`开发者ID(appID)`、`机器人令牌`。

## 2.安装插件

在`Yunzai-Bot`根目录执行，任选其一

Gitee：
```
git clone --depth=1 https://gitee.com/Zyy955/Lain-plugin ./plugins/Lain-plugin
```

Github：
```
git clone --depth=1 https://github.com/Zyy955/Lain-plugin ./plugins/Lain-plugin
```

#### 安装依赖

```
pnpm install -P
```

`安装失败再用这个：`
```
pnpm config set sharp_binary_host "https://npmmirror.com/mirrors/sharp" && pnpm config set sharp_libvips_binary_host "https://npmmirror.com/mirrors/sharp-libvips" && pnpm install -P
```



## 3.机器人指令配置

<details><summary>展开/收起</summary>

这里的指令可以在`控制台`输入，例如输入`#QQ频道设置...`

添加机器人(删除机器人同理)：
```
#QQ频道设置 是否沙盒:是否私域:开发者ID:机器人令牌 是=1 否=0
```

查看机器人：
```
#QQ频道账号
```
</details>

## 使用例子

<details><summary>展开/收起</summary>

是否沙盒：`是`

是否私域：`是`

开发者ID：`123456789`

机器人令牌：`abcdefghijklmnopqrstuvwxyz123456`


添加机器人：
```
#QQ频道设置 1:1:123456789:abcdefghijklmnopqrstuvwxyz123456
```

删除机器人：
```
#QQ频道设置 1:1:123456789:abcdefghijklmnopqrstuvwxyz123456
```

查看机器人：
```
#QQ频道账号
```
</details>

## 设置主人

- 使用方法
  - 方法1：发送`#设置主人`，随后复制发送控制台的验证码即可成为主人
  - 方法2：发送`#设置主人@用户`，需要你是主人的情况下，指定此用户成为主人

主人可通过`#取消主人@用户`或者`#删除主人@用户`

## 其他

更换所有指令前缀：请执行在 `config/config.yaml`` 配置文件开启将`/`转换为`#`

#### 适配进度

- [√] QQ频道
- [ ] ComWeChat
- [ ] WebWeiXin

## 其他指令

```
#QQ频道解除私信  // 解除私信3条后等待回复问题...机器人每天仅可发送两次私信主动消息
#QQ频道设置分片转发开启
#QQ频道设置分片转发关闭
#QQ频道更新
#QQ频道强制更新
#QQ频道更新日志
#我的id | #我的信息 | #ID | #信息  // 获取个人id、频道id
```


## 已知问题

目前如果两个机器人在同一个频道，并且其中一个非管理员，在非管理员不可见的频道触发指令后，会导致管理员的机器人报错`11263`，根据官方文档，这是系统错误，暂无法解决。

更新日志：[点击查看](./CHANGELOG.md)

## 爱发电

感谢各位的支持~

<details><summary>展开/收起</summary>

![爱发电](https://cdn.jsdelivr.net/gh/Zyy955/imgs/img/202308271209508.jpeg)

</details>

## 鸣谢
[QQ机器人](https://q.qq.com/)    

[QQ机器人文档](https://bot.q.qq.com/wiki) 

[NodeJS-SDK](https://github.com/tencent-connect/bot-node-sdk)

喵版Yunzai：[☞Gitee](https://gitee.com/yoimiya-kokomi/Miao-Yunzai) 

喵版Yunzai-Github： [☞GitHub](https://github.com/yoimiya-kokomi/Miao-Yunzai)

Yunzai-Bot索引库：[☞Gitee](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index) 

Yunzai-Bot索引库-Github：[☞GitHub](https://github.com/yhArcadia/Yunzai-Bot-plugins-index)

## 免责声明：
使用此插件产生的一切后果与本人均无关

请不要用于任何商业性行为

插件所有资源都来自互联网，侵删