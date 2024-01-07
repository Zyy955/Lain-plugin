import Cfg from '../lib/config/config.js'
import common from '../lib/common/common.js'

export class admin extends plugin {
  constructor () {
    super({
      name: 'Lain设置',
      dsc: '',
      event: 'message',
      priority: 1,
      rule: [
        {
          reg: /^#铃音设置.*/,
          fnc: 'admin',
          permission: 'master'
        }
      ]
    })
  }

  async admin () {
    let data = {
      head: this.head('Lain管理面板', '铃音设置'),
      box: this.box(this.adminUl()),
      copyright: this.copyright()
    }

    return await this.reply(segment.image(await common.Rending(data, 'admin/index')))
  }

  adminUl () {
    const ul = []
    const Server = Cfg.Server
    const Shamrock = Cfg.Shamrock
    const other = Cfg.Other

    /** HTTPServer设置 */
    ul.push({
      title: 'HTTP设置',
      li: [
        {
          line: 'HTTP端口',
          hint: '#铃音设置端口2955',
          status: Server.port ? '已设置' : '未设置',
          desc: 'HTTP端口，ComWeChat、Shamrock、QQBot临时文件使用'
        },
        {
          line: '服务器公网IP',
          hint: '#铃音设置IP 127.0.0.1',
          status: Server.baseIP ? '已设置' : '未设置',
          desc: '临时文件服务器IP，与下方 baseUrl 二选一，可填域名：www.lain.com'
        },
        {
          line: '服务器Url',
          hint: '#铃音设置url http://127.0.0.1:2955',
          status: Server.baseUrl ? '已设置' : '未设置',
          desc: '临时文件服务器访问url，QQBot使用。推荐端口转发使用：http://lain.com:2956'
        },
        {
          line: '文件过期时间',
          hint: '#铃音设置过期时间 30',
          status: Server.InvalidTime,
          desc: '临时文件服务器文件生成后的过期时间，单位秒'
        }
      ]
    })

    /** 适配器设置 */
    ul.push({
      title: '标准输入',
      li: [
        {
          line: '开关',
          hint: '#铃音设置标准输入 开启/关闭',
          status: other.Stdin.state
        },
        {
          line: '名称',
          hint: '#铃音设置标准输入名称 标准输入',
          status: other.Stdin.name,
          desc: '椰奶状态、土块状态中显示名称'
        }
      ]
    })

    ul.push({
      title: 'Shamrock',
      li: [
        {
          line: '主动HTTP Url',
          hint: '#铃音设置三叶草url http://127.0.0.1:5700',
          status: Shamrock.baseUrl ? '已设置' : '未设置',
          desc: '暂未实现'
        },
        {
          line: '鉴权Token',
          hint: '#铃音设置三叶草token abc123',
          status: Shamrock.token ? '已设置' : '未设置',
          desc: 'HTTP请求鉴权token，如果开放公网强烈建议配置'
        },
        {
          line: 'Github Token',
          hint: '#铃音设置三叶草Github abc123',
          status: Shamrock.githubKey ? '已设置' : '未设置',
          desc: 'Github personal access token, 用于查看和下载shamrock版本信息'
        }
      ]
    })

    ul.push({
      title: 'ComWeChat',
      li: [
        {
          line: '名称',
          hint: '#铃音设置PC微信名称 ComWeChat',
          status: other.ComWeChat.name ? other.ComWeChat.name : '未设置',
          desc: '椰奶状态、土块状态中显示名称'
        },
        {
          line: '自动同意好友',
          hint: '#铃音设置PC微信自动同意好友 开启/关闭',
          status: other.ComWeChat.autoFriend,
          desc: 'Windows版本的微信适配器'
        }
      ]
    })

    ul.push({
      title: 'WeXin',
      li: [
        {
          line: '名称',
          hint: '#铃音设置微信名称 ComWeChat',
          status: other.WeXin.name ? other.WeXin.name : '未设置',
          desc: '椰奶状态、土块状态中显示名称'
        },
        {
          line: '自动同意好友',
          hint: '#铃音设置微信自动同意好友 开启/关闭',
          status: other.WeXin.autoFriend,
          desc: 'Web(网页版)版本的微信适配器'
        }
      ]
    })

    return ul
  }

  head (label, title) {
    return `    <div class="info_box">
      <div class="head-box type">
        <div class="label">${label}</div>
        <div class="title">${title}</div>
      </div>
    </div>`
  }

  box (ul) {
    const config = []
    ul.forEach(i => {
      const box = []
      box.push(`    <div class="cfg-box">
      <div class="cfg-group">${i.title}</div>
      <ul class="cfg-ul">`)
      i.li.forEach(li => {
        let status = li.status ? '已开启' : '已关闭'
        if (typeof li.status !== 'boolean') status = li.status
        if (typeof li.status === 'string' && li.status.includes('未设置')) li.status = false
        box.push(`        <li class="cfg-li">
          <div class="cfg-line"> ${li.line}
            <span class="cfg-hint"> ${li.hint}
            <div class="cfg-status${li.status ? '' : ' status-off'}">${status}</div>
          </div>
          ${li.desc ? `<div class="cfg-desc">${li.desc}</div>` : ''}
        </li>`)
      })
      box.push(`</ul>
    </div>`)
      config.push(box.join('\n'))
    })
    return config
  }

  copyright () {
    return `<div class="copyright">Created By Miao-Yunzai<span class="version">${Cfg.YZPackage.version}</span> & Lain-Plugin<span class="version">${Cfg.package.version}</span></div>`
  }
}
