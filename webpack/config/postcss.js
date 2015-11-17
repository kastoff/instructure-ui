/* eslint no-var: 0 */

module.exports = function (options) {
  options = options || {}
  var plugins = [
    // Plugins seem to be first in last out
    // https://github.com/postcss/postcss#plugins
    require('webpack-postcss-tools').prependTildesToImports,

    require('autoprefixer')({ browsers: ['last 2 versions'] }),

    require('postcss-discard-comments')(),

    require('postcss-mixins')(),
    require('postcss-nested')(),
    require('postcss-simple-vars')(),
    require('postcss-color-function')(),

    require('postcss-calc')(),

    require('postcss-url')({
      url: 'inline'
    })
  ]
  if (options.minify === true) {
    plugins = plugins.concat([
      require('csswring'),
      require('postcss-discard-duplicates')()
    ])
  }
  return plugins
}
