'use strict'

const webpack = require('../../node_modules/webpack')
// ^ import from parent project so we don't have to install it here!
const path = require('path')

const development = false // test prd only

module.exports = {
  json: true,
  profile: true,
  context: path.join(__dirname),
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(development ? 'development' : 'production')
    })
  ],
  entry: [
    path.join(__dirname, 'src', 'index.js')
  ],
  output: {
    filename: path.join(__dirname, 'build', 'index.js')
  }
}
