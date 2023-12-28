// 提供全局变量供外部调用
import fs from 'fs'
import sizeOf from 'image-size'
import crypto from 'crypto'
import fetch from 'node-fetch'

/**
* 传入文件，返回Buffer
* 可以是http://、file://、base64://、buffer
* @param {file://|base64://|http://|buffer} file
* @param {Promise<Buffer>} Buffer
*/
async function bufferToFile (file) {
  if (Buffer.isBuffer(file) || file instanceof Uint8Array) {
    return file
  } else if (fs.existsSync(file.replace(/^file:\/\//, ''))) {
    return fs.readFileSync(file.replace(/^file:\/\//, ''))
  } else if (fs.existsSync(file.replace(/^file:\/\/\//, ''))) {
    return fs.readFileSync(file.replace(/^file:\/\/\//, ''))
  } else if (file.startsWith('base64://')) {
    return Buffer.from(file.replace(/^base64:\/\//, ''), 'base64')
  } else if (/^http(s)?:\/\//.test(file)) {
    let res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      return Buffer.from(await res.arrayBuffer())
    }
  } else {
    throw new Error('传入的文件类型不符合规则，只接受url、buffer、file://路径或者base64编码的图片')
  }
}

/**
* QQ图床
* 支持http://、file://、base64://、buffer
* @param file  * 处理传入的图片文件，转为url
* @param uin botQQ 可选，未传入则调用Bot.uin
* @returns {Promise<Object>} 包含以下属性的对象：
*   - {number} width - 图片宽度
*   - {number} height - 图片高度
*   - {string} url - QQ图床url
*   - {string} md5 - 文件的MD5哈希值
*/
async function uploadQQ (file, uin = Bot.uin) {
  uin = Number(uin)
  const buffer = await Bot.Buffer(file)
  try {
    const { message_id } = await Bot[uin].pickUser(uin).sendMsg([segment.image(buffer)])
    await Bot[uin].pickUser(uin).recallMsg(message_id)
  } catch { }
  const { width, height } = sizeOf(buffer)
  const md5 = crypto.createHash('md5').update(buffer).digest('hex').toUpperCase()
  const url = `https://gchat.qpic.cn/gchatpic_new/0/0-0-${md5}/0?term=2`
  return { width, height, url, md5 }
}

/**
* 传入文件，转为服务器公网url
* 可以是http://、file://、base64://、buffer
* @param {string|Buffer} file - 传入的图片文件
* @param {image|audio|video} type - 可选，不传为图片
* @returns {Promise<Object>} 包含以下属性的对象：
*   - {number} width - 图片宽度
*   - {number} height - 图片高度
*   - {string} url - 服务器后的公网URL
*   - {string} md5 - 文件的MD5哈希值
*/
async function FileToUrl (file, type = 'image') {
  const buffer = await Bot.Buffer(file)
  const time = `${Date.now()}.${type === 'image' ? 'jpg' : (type === 'audio' ? 'mp3' : 'mp4')}`
  fs.writeFileSync(process.cwd() + `/plugins/Lain-plugin/resources/QQBotApi/${time}`, buffer)

  let width = 0
  let height = 0
  if (type === 'image') ({ width, height } = sizeOf(buffer))

  const { port, QQBotImgIP, QQBotPort, QQBotImgToken } = Bot.lain.cfg
  const url = `http://${QQBotImgIP}:${QQBotPort || port}/api/QQBot?token=${QQBotImgToken}&name=${time}`
  const md5 = crypto.createHash('md5').update(buffer).digest('hex').toUpperCase()
  return { width, height, url, md5 }
}

/** 赋值给全局Bot */
Bot.Buffer = bufferToFile
Bot.uploadQQ = uploadQQ
Bot.FileToUrl = FileToUrl
