插件名称来源于我的一位朋友，本插件也可称为`铃音插件`(啊哈哈哈哈)。

QQ交流群~欢迎加入：`884587317`
- 如果您对这个项目感到满意并认为它对你有所帮助，请给我一个`Star`！
- 您的认可是我持续更新的动力~非常感谢您的支持！
- 目前插件已不再支持原版云崽、喵版云崽，仅支持喵云崽

 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)


### 这里特别声明：

如果你的喵崽不想使用QQ，并继续使用本插件，启动一次喵崽之后，本插件会在目录生成一个`apps.js`，你可以使用`node apps`启动喵崽来跳过登录QQ！

如果你无法启动喵崽，即无法成功登录QQ，你可以在喵崽根目录执行`node plugins/Lain-plugin/model/app.js`来生成`apps.js`，随后即可使用`node apps`启动喵崽来跳过登录QQ！

#### 适配进度
- [√] 标准输入
- [√] 跳过登录QQ
- [√] QQ频道适配器
- [√] PC微信适配器
- [ ] 网页版微信适配器
- [√] `shamrock适配器`

## 1.安装插件

在`Miao-Yunzai`根目录执行，任选其一

Gitee：
```
git clone --depth=1 https://gitee.com/Zyy955/Lain-plugin ./plugins/Lain-plugin
```

Github：
```
git clone --depth=1 https://github.com/Zyy955/Lain-plugin ./plugins/Lain-plugin
```

## 2.安装依赖

```
pnpm install -P
```

`安装失败再用这个：`
```
pnpm config set sharp_binary_host "https://npmmirror.com/mirrors/sharp" && pnpm config set sharp_libvips_binary_host "https://npmmirror.com/mirrors/sharp-libvips" && pnpm install -P
```

## 3.使用适配器

请点击查看对应教程~

- [标准输入](./docs/stdin.md)
- [QQ频道](./docs/QQGuild.md)
- [PC微信](./docs/WeChat.md)
- [Shamrock](./docs/Shamrock.md)

## 4.设置主人

- 使用方法
  - 方法1：发送`#设置主人`，随后复制发送控制台的验证码即可成为主人
  - 方法2：发送`#设置主人@用户`，需要你是主人的情况下，指定此用户成为主人

主人可通过`#取消主人@用户`或者`#删除主人@用户`

# 插件更新
不区分大小写：
  - #铃音更新
  - #Lain更新
  - #QQ频道更新`(暂时保留，后续会去除)`

## 其他

- 插件更新日志：[点击查看](./CHANGELOG.md)
- `QQ频道适配器`更新日志：[点击查看](./CHANGELOG.md)

<details><summary>最后请个爱发电~您的支持是我更新的动力</summary>

![爱发电](https://cdn.jsdelivr.net/gh/Zyy955/imgs/img/202308271209508.jpeg)

</details>

## 特别鸣谢

- Miao-Yunzai：[Gitee](https://gitee.com/yoimiya-kokomi/Miao-Yunzai) | [GitHub](https://github.com/yoimiya-kokomi/Miao-Yunzai)
- 索引库：[Gitee](https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index) | [GitHub](https://github.com/yhArcadia/Yunzai-Bot-plugins-index)
- [ComWeChat`(PC微信)`](https://github.com/JustUndertaker/ComWeChatBotClient)
- [wechat4u`(网页版微信)`](https://github.com/nodeWechat/wechat4u/blob/master/run-core.js)

## 免责声明：
使用此插件产生的一切后果与本人均无关

请不要用于任何商业性行为

插件所有资源都来自互联网，侵删