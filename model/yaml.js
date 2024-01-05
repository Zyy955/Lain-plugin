import fs from 'fs'
import Yaml from 'yaml'
import lodash from 'lodash'

/** 捏，可以保留注释哦 */
export default class yaml {
  /**
   * @param {string} _path - 传入yaml文件路径
   */
  constructor (_path) {
    this._path = _path
    this.parse()
  }

  /** 解析yaml */
  parse () {
    this.document = Yaml.parseDocument(fs.readFileSync(this._path, 'utf8'))
  }

  /** 获取对象 */
  data () {
    return this.document.toJSON()
  }

  /**
 * 获取指定键的值
 * @param {string} key
 */
  get (key) {
    return lodash.get(this.data(), key)
  }

  /**
  * 检查指定键是否存在
  * @param {string} key
  */
  hasIn (key) {
    return this.document.hasIn([key])
  }

  /**
   * 检查指定的键是否存在对应的值
   * @param {string} key - 需要检查的键
   * @param {string} value - 需要检查的值
   */
  value (key, value) {
    const res = this.get(key)
    if (Array.isArray(res)) {
      return !!res.includes(value)
    }
    return !!res[value]
  }

  /* 修改键值 */
  set (key, value) {
    this.document.setIn([key], value)
    this.save()
  }

  /** 添加新的键值 不能是已有的键 */
  addIn (key, value) {
    this.document.addIn([key], value)
    this.save()
  }

  /** 给指定的键添加新的键值、值 */
  addVal (key, val) {
    let value = this.get(key)
    if (Array.isArray(value)) {
      value.push(val)
    } else if (value && typeof value === 'object') {
      value = { ...value, ...val }
    } else {
      value = [val]
    }

    this.set(key, value)
  }

  /* 删除指定的键 */
  del (key) {
    this.document.deleteIn([key])
    this.save()
  }

  /* 删除指定键的值 */
  delVal (key, val) {
    const value = this.get(key)
    if (Array.isArray(value)) {
      const index = value.indexOf(val)
      if (index !== -1) {
        value.splice(index, 1)
        this.set(key, value)
      } else {
        logger.error(`值 ${val} 不存在于数组中`)
      }
    } else if (typeof value === 'object' && value !== null) {
      delete value[val]
      this.set(key, value)
    } else {
      logger.error('无法从非对象或数组中删除键/值')
    }
  }

  /** Yaml */
  save () {
    try {
      fs.writeFileSync(this._path, this.document.toString(), 'utf8')
    } catch (err) {
      logger.error(`更新Yaml失败:${err?.message}`)
    }
  }
}
