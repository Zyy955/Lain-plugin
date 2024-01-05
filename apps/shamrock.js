import fs from 'fs'
import path from 'path'
import common from '../lib/common/common.js'
import Cfg from '../lib/config/config.js'
import Render from '../model/render.js'
import { ShamrockRepoClient } from '../model/shamrock/shamrock.js'

export class shamrock extends plugin {
  constructor () {
    super({
      name: '铃音Shamrock版本信息',
      priority: -50,
      rule: [
        {
          reg: /^#(shamrock|三叶草)(版本|更新日志)$/gi,
          fnc: 'version'
        },
        {
          reg: /^#(shamrock|三叶草)(发布|测试)?(安装包|apk|APK)$/gi,
          fnc: 'apk'
        }
      ]
    })
  }

  async version (e) {
    if (e.adapter !== 'shamrock') {
      return false
    }
    try {
      let version = Bot[e.self_id].version.version
      let qqVer = Bot[e.self_id].apk.version
      let client = new ShamrockRepoClient(Cfg.Shamrock.githubKey)
      let versionBehindBeta = await client.getVersionBehind(version, 'beta')
      let versionBehindRelease = await client.getVersionBehind(version, 'release')
      let releases = await client.getRelease(3, true)
      let commits = await client.getCommits(10, false)
      let repo = await client.getRepoStatus()
      return await Render.render('shamrock/index', {
        elem: 'anemo',
        releases,
        commits,
        repo,
        versionBehind: {
          beta: versionBehindBeta.length,
          release: versionBehindRelease.length
        },
        version,
        qqVer
      }, { e, scale: 1.2 })
    } catch (err) {
      console.error(err)
      await e.reply(err.message, true)
    }
  }

  async apk (e) {
    // 不用shamrock也能用吧？
    // if (e.adapter !== 'shamrock') {
    //   return false
    // }
    let filePath
    if (!e.msg.includes('测试')) {
      // release
      let client = new ShamrockRepoClient(Cfg.Shamrock.githubKey)
      let releases = await client.getRelease(1, true)
      let release = releases[0]
      let allAssets = release.assets.find(a => a.name.includes('all'))
      let url = allAssets.browser_download_url
      let name = allAssets.name
      const _path = process.cwd()
      let dest = path.join(_path, 'data', 'lain', 'shamrock', 'release', name)
      if (fs.existsSync(dest)) {
        filePath = dest
      } else {
        await e.reply('开始下载安装包 ' + name, true)
        try {
          filePath = await common.downloadFile(url, 'shamrock/release/' + name)
        } catch (err) {
          console.error(err)
          await e.reply('安装包下载错误：' + err.message)
          return
        }
      }
    } else {
      // beta
      if (!Cfg.Shamrock.githubKey) {
        await e.reply('未配置github access token无法下载最新测试版shamrock')
        return
      }
      let client = new ShamrockRepoClient(Cfg.Shamrock.githubKey)
      let actions = await client.getActions(10)
      let latestAll = actions.artifacts.find(a => a.name.includes('all'))
      let url = latestAll.archive_download_url
      let name = latestAll.name
      const _path = process.cwd()
      let dest = path.join(_path, 'data', 'lain', 'shamrock', 'beta', name + '.zip')
      if (fs.existsSync(dest)) {
        filePath = dest
      } else {
        await e.reply('开始下载安装包 ' + name + '.zip', true)
        // todo move to client
        try {
          filePath = await common.downloadFile(url, 'shamrock/beta/' + name + '.zip', { Authorization: `bearer ${Cfg.Shamrock.githubKey}` })
        } catch (err) {
          console.error(err)
          await e.reply('安装包下载错误：' + err.message)
          return
        }
      }
    }
    if (!filePath) {
      console.error('获取安装包下载地址失败')
      await e.reply('获取安装包下载地址失败')
      return
    }
    if (e.isGroup || e.group) {
      await e.group.sendFile(filePath)
    } else {
      await e.friend.sendFile(filePath)
    }
    // 30分钟后删除
    setTimeout(() => {
      if (filePath) {
        fs.unlinkSync(filePath)
      }
    }, 30 * 60 * 1000)
  }
}
