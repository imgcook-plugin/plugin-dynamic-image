const fs = require('fs')
const { unique, downloadImg } = require('@imgcook/cli-utils')
const chalk = require('chalk')
const upload = require('./lib/upload')
const uploadObj = new upload()

/**
 * 上传结果数据
 * @param {*} file 文件
 * @param {*} filePath 文件路径
 * @param {*} option 配置选项
 */
const uploadCallbackData = (file, filePath, option) => {
  return new Promise((resolve) => {
    uploadObj.uploadUrl = option.uploadUrl
    uploadObj
      .fetchUpload(file, { filepath: filePath })
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
 * @param option: { data, filePath, config }
 * - data: module and generate code Data
 * - filePath: Pull file storage directory
 * - config: cli config
 */
const pluginHandler = async (options) => {
  let imageArray = []
  let { data } = options
  const { filePath, config } = options
  if (!data.code) {
    return null
  }
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(filePath)
  }
  let index = 0
  const moduleData = data.moduleData
  const panelDisplay = data.code.panelDisplay || []
  for (const item of panelDisplay) {
    let fileValue = item.panelValue
    console.log('fileValue>>>>' + fileValue)
    const tempImages = `${(
      new Date().getTime() + Math.floor(Math.random() * 10000)
    ).toString(30)}`
    imageArray = fileValue.match(
      /(https?):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|](\.png|\.jpg)/g
    )
    if (imageArray && imageArray.length > 0) {
      imageArray = unique(imageArray)
      const imagePath = `${filePath}/images`
      let imageObjects = []
      const imageRc = `${imagePath}/.imagerc`
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
          if (imageItem.imgUrl === imageArray[position]) {
            currrentImageObj = imageItem
          }
        }
        const regex = new RegExp(imageArray[position], 'g')
        if (!currrentImageObj.imgPath) {
          await downloadImg(imageArray[index], itemImagePath)
          let remoteImageUrl = ''
          if (config && config.uploadUrl && config.uploadUrl !== 'undefined') {
            const uploadRes = await uploadCallbackData(
              itemImagePath,
              `imgcook-cli/${tempImages}/`,
              config
            )
            fileValue = fileValue.replace(regex, uploadRes.url)
            remoteImageUrl = uploadRes.url
          } else {
            fileValue = fileValue.replace(regex, `./images/${imageName}`)
          }
          imageObjects.push({
            remoteImageUrl,
            imgUrl: imageArray[position],
            imagePath: `./images/${imageName}`,
          })
        } else {
          if (config && config.uploadUrl && config.uploadUrl !== 'undefined') {
            fileValue = fileValue.replace(
              regex,
              currrentImageObj.remoteImageUrl
            )
          } else {
            fileValue = fileValue.replace(regex, currrentImageObj.imgPath)
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
