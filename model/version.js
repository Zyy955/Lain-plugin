import fs from 'fs'
import lodash from 'lodash'

let packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const getLine = function (line) {
  line = line.replace(/(^\s*\*|\r)/g, '')
  if (/###/.test(line)) line = '`' + line + '`'
  line = line.replace(/(shamrock|QQBot|QQGuild|ComWechat|WeXin|stdin)/gi, '`$1`')
  line = line.replace(/fix[：:]/, '`fix:`').replace(/feat[：:]/, '`feat:`')
  line = line.replace(/\(\[([^\]]+)\]\([^)]+\)\)/, '[$1]').replace(/\[|\]/g, '**')
  line = line.replace(/\s*`([^`]+`)/g, '<span class="cmd">$1')
  line = line.replace(/`\s*/g, '</span>')
  line = line.replace(/\s*\*\*([^\*]+\*\*)/g, '<span class="strong">$1')
  line = line.replace(/\*\*\s*/g, '</span>')
  line = line.replace(/ⁿᵉʷ/g, '<span class="new"></span>')
  return line
}

const readLogFile = function (root, versionCount = 5) {
  let logPath = `${root}/CHANGELOG.md`
  let logs = {}
  let changelogs = []
  let currentVersion

  try {
    if (fs.existsSync(logPath)) {
      logs = fs.readFileSync(logPath, 'utf8') || ''
      logs = logs.split('\n')

      let temp = {}
      let lastLine = {}
      lodash.forEach(logs, (line) => {
        if (versionCount <= -1) {
          return false
        }
        let versionRet = /#{2,3}\s*\[([0-9a-zA-Z\\.~\s]+)\]\(.*?\)\s*\(\s*(\d{4}-\d{2}-\d{2})\s*\)\s*$/.exec(line)
        if (versionRet && versionRet[1]) {
          let v = versionRet[1].trim()
          if (!currentVersion) {
            currentVersion = v
          } else {
            changelogs.push(temp)
            // if (/0\s*$/.test(v) && versionCount > 0) {
            //   versionCount = 0
            // } else {
            versionCount--
            // }
          }

          temp = {
            version: v,
            logs: []
          }
        } else {
          if (!line.trim()) {
            return
          }
          if (/^###/.test(line)) {
            lastLine = {
              title: getLine(line),
              logs: []
            }
            temp.logs.push(lastLine)
          } else if (/\* /.test(line)) {
            lastLine.logs.push(getLine(line))
          }
        }
      })
    }
  } catch (e) {
    // do nth
  }
  return { changelogs, currentVersion }
}

const { changelogs, currentVersion } = readLogFile(`${process.cwd()}/plugins/Lain-plugin/`)

const yunzaiVersion = packageJson.version
const isMiao = packageJson.dependencies.sequelize ? true : false

let Version = {
  isMiao,
  get version () {
    return currentVersion
  },
  get yunzai () {
    return yunzaiVersion
  },
  get changelogs () {
    return changelogs
  },
  readLogFile
}

export default Version
