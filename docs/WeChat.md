微信应用端只支持在`Windows`环境运行，仅支持`Miao-Yunzai`

如果需要linux运行，请查看我的另外一个项目 [Gitee](https://gitee.com/Zyy955/WeChat-Web-plugin)  |  [Github](https://github.com/Zyy955/WeChat-Web-plugin)

 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)


## 温馨提示

没有`Windows`环境，请使用[WeXin.md](./WeChat.md)

# 使用必读

应用端和云崽都可以单独启动，并没有必须先启动谁的说法

应用端显示`远程计算机拒绝访问`是因为云崽这边没有启动或者没有安装插件。

## 1.下载微信
仅支持`3.7.0.30`版本，[点击下载](https://ghproxy.com/https://github.com/tom-snow/wechat-windows-versions/releases/download/v3.7.0.30/WeChatSetup-3.7.0.30.exe)

如果担心和电脑现有的高版本冲突可在下载安装包之后`直接解压exe安装包`，运行`WeChat.exe`即可

## 2.下载禁用更新补丁

[点击跳转下载页面](https://cup.lanzoui.com/pcwxnoupdate)，下载后启动禁用即可

## 3.微信机器人应用端

两个下载源任选其一

[点击下载(无加速环境推荐使用)](https://ghproxy.com/https://github.com/JustUndertaker/ComWeChatBotClient/releases/download/v0.0.8/ComWeChat-Client-v0.0.8.zip)

[初始源](https://github.com/JustUndertaker/ComWeChatBotClient/releases/v0.0.8)

下载后得到`ComWeChat-Client-v0.0.8.zip`

解压`ComWeChat-Client-v0.0.8.zip`

#### 请严格按照我所给出的配置进行修改！

使用记事本打开`.env`文件，需要修改两个配置
```
websocekt_type = "Unable"
修改为
websocekt_type = "Backward"


websocket_url = ["ws://127.0.0.1:8080/onebot/v12/ws/"]
修改为
websocket_url = ["ws://localhost:2955/ComWeChat"]

可选：
`如果经常发生连接已关闭，请增加缓冲区大小``
# 反向 WebSocket 的缓冲区大小，单位(Mb)
websocket_buffer_size = 4

```
修改完成保存


## 5.管理员运行`install.bat`

注：如运行`install.bat`报错或者`闪退`，如下：
![报错](https://user-images.githubusercontent.com/74231782/230714709-95faea89-ac18-44fb-a704-fb114c675800.png)

请安装[vc_redist.x86](https://download.microsoft.com/download/6/D/F/6DF3FF94-F7F9-4F0B-838C-A328D1A7D0EE/vc_redist.x86.exe)

## 6.管理员启动应用端

管理员运行`ComWeChat-Client-v0.0.8.exe`随后登录你的微信小号即可


## 其他

- 好友申请：
  - 推荐使用锅巴设置，默认自动通过好友申请，如果关闭请前往配置修改`plugins/WeChat-plugin/config.yaml`

- 修改椰奶状态显示名称
  - `#微信修改名称<新名称>`