module.exports = {
  publicPath: '',
  filenameHashing: false,
  chainWebpack: config => {
    config.plugin('html').tap(options => {
      options[0].minify = { 
        removeComments: false,
        collapseWhitespace: false,
        removeAttributeQuotes: false,
        collapseBooleanAttributes: false,
        removeScriptTypeAttributes: false
      }
      return options
    })
  }
}