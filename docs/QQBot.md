`请给予机器人基础的权限...什么权限都没有的发个鬼消息啊= =`

 ![Visitor Count](https://profile-counter.glitch.me/Zyy955-Lain-plugin/count.svg)

## 1.获取QQ机器人

...我也不知道咋获取，因为我没有...

感谢 **@云** 提供的bot测试

## 2.机器人指令配置

如果你没有在登录QQ，可以在控制台使用[标准输入](./stdin.md)来执行指令，直接像QQ一样输入指令！

添加机器人(删除机器人同理)：
```
#QQ群设置 沙盒:私域:移除at:appID:appToken:secret 是=1 否=0
```

查看机器人：
```
#QQ频道账号
```

## 使用例子

<details><summary>展开/收起</summary>

是否沙盒：`是`

是否私域：`是`

移除at：`是`

开发者ID：`123456789`

appToken：`abcdefghijklmnopqrstuvwxyz123456`

secret：`abcdefghijklmnopqrstuvwxyz`


添加机器人：
```
#QQ群设置 1:1:1:123456789:abcdefghijklmnopqrstuvwxyz123456:abcdefghijklmnopqrstuvwxyz
```

删除机器人：
```
#QQ群设置 1:1:1:123456789:abcdefghijklmnopqrstuvwxyz123456:abcdefghijklmnopqrstuvwxyz
```

</details>

## 其他

- 如果需要发送自定义图片，请自行更改配置文件中的公网ip，服务器放行http端口！
