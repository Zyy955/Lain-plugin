// 提供全局变量供外部调用
import crypto from 'crypto'
import fs from 'fs'
import get_urls from 'get-urls'
import sizeOf from 'image-size'
import fetch from 'node-fetch'
import common from '../../model/common.js'

/**
* 传入文件，返回Buffer
* 可以是http://、file://、base64://、buffer
* @param {file://|base64://|http://|buffer} file
* @param {object} data
  - { http:true } 原样返回http
  - { file:true } 原样返回file
  - { base:true } 原样返回Base
  - { buffer:true } 原样返回Buffer
* @param {Promise<Buffer>} Buffer
*/
Bot.Buffer = async function (file, data) {
  if (Buffer.isBuffer(file) || file instanceof Uint8Array) {
    if (data?.buffer) return file
    return file
  } else if (file instanceof fs.ReadStream) {
    return await Bot.Stream(file)
  } else if (fs.existsSync(file.replace(/^file:\/\//, ''))) {
    if (data?.file) return file
    return fs.readFileSync(file.replace(/^file:\/\//, ''))
  } else if (fs.existsSync(file.replace(/^file:\/\/\//, ''))) {
    if (data?.file) return file.replace(/^file:\/\/\//, 'file://')
    return fs.readFileSync(file.replace(/^file:\/\/\//, ''))
  } else if (file.startsWith('base64://')) {
    if (data?.base) return file
    return Buffer.from(file.replace(/^base64:\/\//, ''), 'base64')
  } else if (/^http(s)?:\/\//.test(file)) {
    if (data?.http) return file
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
 * 传入文件，返回不带base64://格式的字符串
 * 可以是http://、file://、base64://、buffer
 * @param {file://|base64://|http://|buffer} file
 * @param {object} data
  - { http:true } 原样返回http
  - { file:true } 原样返回file
  - { base:true } 原样返回Base
  - { buffer:true } 原样返回Buffer
 * @returns {Promise<string>} base64字符串
 */
Bot.Base64 = async function (file, data) {
  if (Buffer.isBuffer(file) || file instanceof Uint8Array) {
    if (data?.buffer) return file
    return file.toString('base64')
  } else if (file instanceof fs.ReadStream) {
    return await Bot.Stream(file, { base: true })
  } else if (fs.existsSync(file.replace(/^file:\/\//, ''))) {
    if (data?.file) return file
    return fs.readFileSync(file.replace(/^file:\/\//, '')).toString('base64')
  } else if (fs.existsSync(file.replace(/^file:\/\/\//, ''))) {
    if (data?.file) return file.replace(/^file:\/\/\//, 'file://')
    return fs.readFileSync(file.replace(/^file:\/\/\//, '')).toString('base64')
  } else if (file.startsWith('base64://')) {
    if (data?.base) return file
    return file.replace(/^base64:\/\//, '')
  } else if (/^http(s)?:\/\//.test(file)) {
    if (data?.http) return file
    let res = await fetch(file)
    if (!res.ok) {
      throw new Error(`请求错误！状态码: ${res.status}`)
    } else {
      return Buffer.from(await res.arrayBuffer()).toString('base64')
    }
  } else {
    throw new Error('传入的文件类型不符合规则，只接受url、buffer、file://路径或者base64编码的图片')
  }
}

/**
 * 传入可读流，返回buffer、base64://
 * @param {ReadStream} file - 可读流
 * @param {object} data - 可选，默认返回buffer
  - { buffer:true } 返回buffer
  - { base:true } 返回Base://
 * @returns {Promise<string|Buffer>} buffer或base64字符串
 */
Bot.Stream = async function (file, data) {
  return new Promise((resolve, reject) => {
    const chunks = []
    file.on('data', (chunk) => chunks.push(chunk))
    file.on('end', () => data?.base ? resolve(Buffer.concat(chunks).toString('base64')) : resolve(Buffer.concat(chunks)))
    file.on('error', (err) => reject(err))
  })
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
Bot.uploadQQ = async function (file, uin = Bot.uin) {
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
Bot.FileToUrl = async function (file, type = 'image') {
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

/**
* 处理segment中的图片、语音、文件，获取对应的类型
* @param i 需要处理的对象
* 传入类似于 {type:"image", file:"file://...", url:"http://"}
*
* 返回 {type:<file|buffer|base64|http|error>, file=:<file://|buffer|base64://|http://|i.file>}
*
* error为无法判断类型，直接返回i.file
*/
Bot.toType = function (i) {
  if (i?.url) {
    if (i?.url?.includes('gchat.qpic.cn') && !i?.url?.startsWith('https://')) {
      i = 'https://' + i.url
    } else {
      i = i.url
    }
  } else if (typeof i === 'object') {
    i = i.file
  }

  let file
  let type = 'file'

  // 检查是否是Buffer类型
  if (i?.type === 'Buffer') {
    type = 'buffer'
    file = Buffer.from(i?.data)
  } else if (i?.type === 'Buffer' || i instanceof Uint8Array || Buffer.isBuffer(i?.data || i)) {
    type = 'buffer'
    file = i?.data || i
  } else if (i instanceof fs.ReadStream || i?.path) {
    // 检查是否是ReadStream类型
    if (fs.existsSync(i.path)) {
      file = `file://${i.path}`
    } else {
      file = `file://./${i.path}`
    }
  } else if (typeof i === 'string') {
    // 检查是否是字符串类型
    if (fs.existsSync(i.replace(/^file:\/\//, ''))) {
      file = i
    } else if (fs.existsSync(i.replace(/^file:\/\/\//, ''))) {
      file = i.replace(/^file:\/\/\//, 'file://')
    } else if (fs.existsSync(i)) {
      file = `file://${i}`
    } else if (/^base64:\/\//.test(i)) {
      // 检查是否是base64格式的字符串
      type = 'base64'
      file = i
    } else if (/^http(s)?:\/\//.test(i)) {
      // 如果是url，则直接返回url
      type = 'http'
      file = i
    } else {
      common.log('Lain-plugin', '未知格式，无法处理：' + i)
      type = 'error'
      file = i
    }
  } else {
    // 留个容错
    common.log('Lain-plugin', '未知格式，无法处理：' + i)
    type = 'error'
    file = i
  }

  return { type, file }
}

/**
* 传入字符串 提取url 返回数组
* @param {string} url 传入字符串，提取出所有url
* @param {array} exclude - 可选，需使用请传入数组，数组内为排除的url，即不返回数组内相近的url
*/
Bot.getUrls = function (url, exclude = []) {
  let urls = []
  /** 中文不符合url规范 */
  url = url.replace(/[\u4e00-\u9fa5]/g, '|')
  urls = get_urls(url, {
    exclude,
    /** 去除 WWW */
    stripWWW: false,
    /** 规范化协议 */
    normalizeProtocol: false,
    /** 移除查询参数 */
    removeQueryParameters: false,
    /** 移除唯一斜杠 */
    removeSingleSlash: false,
    /** 查询参数排序 */
    sortQueryParameters: false,
    /** 去除认证信息 */
    stripAuthentication: false,
    /** 去除文本片段 */
    stripTextFragment: false,
    /** 移除末尾斜杠 */
    removeTrailingSlash: false
  })
  return [...urls]
}
