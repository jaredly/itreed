
var path = require('path')
var MODULE = path.join(__dirname, '..', 'node_modules')

module.exports = {
  entry: {
    basic: './basic',
  },

  output: {
    path: './build',
    filename: '[name].js',
  },

  externals: {
    react: 'React',
    'react/addons': 'React',
    less: 'less',
    babel: 'babel',
    // levelup: 'levelup',
    // bluebird: 'bluebird',
  },

  node: {
    fs: 'empty',
    net: 'empty',
  },

  resolve: {
    alias: {
      'babel-runtime': MODULE + '/babel-runtime',
    },
  },

  module: {

    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: MODULE + '/babel-loader?optional=runtime' },
      { test: /\.json$/, loader: MODULE + '/json-loader' },

      /*
      {
          test: /\.css$/,
          loader: ExtractTextPlugin.extract(MODULE + "/style-loader", MODULE + "/css-loader")
      },

      {
          test: /\.less$/,
          loader: ExtractTextPlugin.extract(MODULE + "/style-loader", "css-loader!less-loader")
      }
      */
    ],
  },

  devtool: 'eval',
  colors: true,

  plugins: [
      // new ExtractTextPlugin("[name]/build.css"),
      // new webpack.optimize.CommonsChunkPlugin("vendor", /* filename= */"vendor.js")
  ],
}

