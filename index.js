const fs = require('fs')
const { unique, downloadImg } = require('@imgcook/cli-utils')
const chalk = require('chalk')
const upload = require('./lib/upload')
const uploadInstance = new upload()

/**
 * 图片url正则规则
 */
const imageRegex =  /(https?):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|](\.png|\.jpg)/g

/**
 * 上传结果数据
 * @param {*} file 文件
 * @param {*} filePath 文件路径
 * @param {*} option 配置选项
 */
const uploadCallbackData = (file, option) => {
  return new Promise((resolve) => {
    uploadInstance.uploadUrl = option.uploadUrl
    uploadInstance.fetchUpload(file)
      .then((res) => {
        resolve(res.data)
      })
      .catch((err) => {
        if (err) {
          console.log(JSON.stringify(err))
        }
      })
  })
}

/**
 * 组件逻辑处理
 * @param {*} option 
 * @returns 
 */
const pluginHandler = async (option) => {
  let imageArray = []
  let { data } = option
  const { filePath, config } = option
  if (!data.code) {
    return null
  }
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath)
  }
  let index = 0
  const moduleData = data.moduleData
  if (moduleData.cover && imageRegex.test(moduleData.cover)) {
    const coverImagePath = `${filePath}/cover`
    if (!fs.existsSync(coverImagePath)) {
      fs.mkdirSync(coverImagePath)
    }
    let coverSuffix = moduleData.cover.split('.')
    coverSuffix = coverSuffix[coverSuffix.length - 1]
    const coverImageName = `cover_${moduleData.id}.${coverSuffix}`
    const converItemImagePath = `${coverImagePath}/${coverImageName}`
    if (!fs.existsSync(converItemImagePath)) {
      downloadImg(moduleData.cover,converItemImagePath)
    }
  }
  const panelDisplay = data.code.panelDisplay || []
  for (const item of panelDisplay) {
    let fileValue = item.panelValue
    imageArray = fileValue.match(imageRegex)
    if (imageArray && imageArray.length > 0) {
      imageArray = unique(imageArray)
      const imagePath = `${filePath}/images`
      let imageObjects = []
      const imageRc = `${imagePath}/.imagesrc`
      if (fs.existsSync(imageRc)) {
        let imageConfig = fs.readFileSync(imageRc, 'utf-8')
        imageObjects = JSON.parse(imageConfig) || []
      }
      for (let position = 0; position < imageArray.length; position++) {
        if (!fs.existsSync(imagePath)) {
          fs.mkdirSync(imagePath)
        }
        let suffix = imageArray[position].split('.')
        suffix = suffix[suffix.length - 1]
        const imageName = `image_${moduleData.id}_${index}_${position}.${suffix}`
        const itemImagePath = `${imagePath}/${imageName}`
        let currrentImageObj = {}
        for (const imageItem of imageObjects) {
          if (imageItem.aliImageUrl === imageArray[position]) {
            currrentImageObj = imageItem
          }
        }
        const regex = new RegExp(imageArray[position], 'g')
        if (!currrentImageObj.localImagePath) {
          await downloadImg(imageArray[position], itemImagePath)
          let remoteImageUrl = ''
          if (option.config &&option.config.uploadUrl && option.config.uploadUrl !== 'undefined') {
            const uploadRes = await uploadCallbackData(itemImagePath,option.config) || {}
            if (uploadRes.url) {
              fileValue = fileValue.replace(regex, uploadRes.url)
              remoteImageUrl = uploadRes.url
            }
          } else {
            fileValue = fileValue.replace(regex, `./images/${imageName}`)
          }
          imageObjects.push({
            imageUrl: remoteImageUrl,
            aliImageUrl: imageArray[position],
            localImagePath: `./images/${imageName}`,
          })
        } else {
          if (option.config && option.config.uploadUrl && option.config.uploadUrl !== 'undefined') {
            fileValue = fileValue.replace(regex, currrentImageObj.imageUrl)
          } else {
            fileValue = fileValue.replace(regex,currrentImageObj.localImagePath)
          }
        }
      }
      if (imageObjects.length > 0) {
        fs.writeFileSync(imageRc, JSON.stringify(imageObjects), 'utf-8')
      }
    }
    item.panelValue = fileValue
    index++
  }
  let result = {}
  return { data, filePath, config, result }
}

/**
 * 导出
 * @param  {...any} args
 * @returns
 */
module.exports = (...args) => {
  return pluginHandler(...args).catch((err) => {
    console.log(chalk.red(err))
  })
}
