process.stdout.write('\33c\33[3J')
const fs = require('fs')
const path = require('path')
const absPath = str => path.join(__dirname, str)
console.log('__dirname', __dirname)
console.log('process.cwd()', process.cwd())
const data = fs.readFileSync(absPath('./aardio/config/intellisense/kernel.txt'), 'utf8');
// const data = ''

const linesRaw = data || String.raw`

`

const reObj = { // 匹配模式库
  keyword: /\b(var|def|null|and|not|or|begin|end|false|true|if|else|elseif|select|case|for|in|while|do|break|continue|try|catch|class|ctor|function|return|namespace|import|with|this|owner|global|self)\b/,
  template: /^@/,
  commentBlock: /\/\*.*([\s\S]*).*\*\//,
  // commentLine: /\/\/.*[\r\n]*/,
  commentLine: /\/\/.*/,
  noDel: /(^\/\*+intellisense)/, // 匹配的注释不删除
  okLine: /^(.*?) *?\t*?= *\t*([\s\S]*)/, // 提示库文件中的有效行 去除空行、 注释行(不含等号)， 等号前后允许0个或多个空格或制表符
}

const lfTrim = str => {
  // 最多允许两个空行出现
  while (/\n\n\n/.test(str)) {
    str = str.replace(/\n\n\n/g, '\n\n')
  }
  str = str.trim()
  return str
}

const cursor__ = (str, isEmpty) => {
  // 把 __ 转换为光标插入位置 isEmpty: 只清空而不替换
  let index = 0
  // 处理 __
  if(isEmpty) {return str.replace(/__/g, '')}
  str = str.replace(/__/g, (...arg) => {
    return isEmpty ? '' : `$\{${++index}\}`
  })
  return str
}
const del_comment = (str, action = 'all') => {
  // 删除注释 action all 所有 block 块注释 line 行注释
  // 添加光标插入位置
  const all = action === 'all' ? true : false
  str = str.replace(/\\n/g, '\n') // 还原换行符

  if(reObj.noDel.test(str)) { // 不删除注释的内容
    return str
  } else {
    ;(all || (action === 'block')) && (str = str.replace(new RegExp(reObj.commentBlock, 'g'), ''))
    ;(all || (action === 'line')) && (str = str.replace(new RegExp(reObj.commentLine, 'g'), ''))
  }
  return str
}

const del_brackets = str => str.replace(/\((.)\(/g, '(')

const convert = linesRaw => {
  // 根据行返回对应的语法提示模版
  const resArr = []
  linesRaw = linesRaw.split(/[\r\n]/) // 拆分每一行
  // linesRaw = linesRaw.split('')
  // return []

  linesRaw.forEach(line => {

    const regRes = line.match(reObj.okLine)

    if (regRes) {
      const {1: $1, 2: $2} = regRes

      // console.log('res', regRes)
      resArr.push({
        $1,
        $2,
        completionItem: cursor__(del_brackets($1), true),
        kind: reObj.keyword.test($1) ? 'Keyword' : '',
        insertText: (() => { // 处理为 SnippetString
          let str = $1

          if (reObj.template.test($2)) {
            str = cursor__($2).replace(/^@/, '') // 删除@标志
          } else {
            str = cursor__($1)
          }
          str = del_comment(str, 'all')
          str = del_brackets(str) // 把 (.( 转为 (

          // { // 处理 ,)
          //   // res = res.replace(/, *\t*\)/, `, $\{${++index}\})`)
          // }

          // { // 把 insertText 中的参数注释转换为默认值
          //   let regRes = res.match(/(.*)}(.*\/\*.*\*\/)(.*)/)
          //   regRes && (res = `${$1}:${$2}}${regRes[3]}`)
          // }

          str = lfTrim(str)
          return str
        })(),
        documentation: (() => { // 提示文档
          let str = $2
          str = str.replace(/\\n/g, '\n') // 转义处理， 否则无法在 vs 中显示换行效果
          str = lfTrim(str)
          str = str.replace(/^@/, '[Template]\n\n') // 删除@标志、 添加模版标记
          return str
        })(),
      })
    }
  })
  // console.log('resArr', resArr.map(item => item.completionItem))
  // console.log('resArr', resArr.map(item => item.insertText))
  console.log('resArr', resArr)
  return resArr
}

exports.convert = convert(linesRaw)
