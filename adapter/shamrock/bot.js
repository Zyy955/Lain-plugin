import fs from 'fs'
import path from 'path'
import common from '../../model/common.js'
import api from './api.js'
import { message, toRaw } from './message.js'
import SendMsg from './sendMsg.js'

/** 加载资源状态 */
let resList = false

export default class bot {
  constructor (id) {
    /** 机器人QQ号 */
    this.id = Number(id)
    this.loadRes()
  }


}
