const fs = require('fs')
const request = require('request')
const { Stream } = require('stream')

/**
 * 上传对象
 */
class Upload {
  /**
   * 构造器
   * @param {*} option 选项
   */
  constructor(option) {
    this.option = option
    this.uploadUrl = ''
  }

  /**
   * 发起上传
   * @param {*} file 文件路径或者文件流
   * @param {*} option 选项
   * @param {*} callback 上传结果回调
   */
  fetchUpload(file, callback) {
    let stream = null
    if (typeof file === 'string') {
      stream = fs.createReadStream(file)
    } else if (file instanceof Stream) {
      stream = file
    } else {
      throw TypeError(
        'Only incoming file path or stream instances are supported'
      )
    }
    const paths = stream.path.split('/')
    const originFileName = paths[paths.length - 1]
    const targetUploadUrl = this.uploadUrl

    let resolveCallback, rejectCallback

    const promise = new Promise((resolve, reject) => {
      resolveCallback = resolve
      rejectCallback = reject
    })
    if (!callback) {
      callback = (err, body) => {
        if (err) {
          rejectCallback(err)
        } else {
          resolveCallback(body)
        }
      }
    }
    request.post(
      {
        url: targetUploadUrl,
        json: true,
        formData: {
          file: stream,
        },
      },
      (err, res, body) => {
        if (typeof callback === 'function') {
          callback(err, body)
        }
      }
    )
    return promise
  }
}

module.exports = Upload
