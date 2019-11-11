const path = require('path');
const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.tsx',

  devtool: "source-map",
  devServer: {
    open: true,
    //contentBase: './dist',
    contentBase: '../src/main/resources/META-INF/resources',
    hot: true,
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },

  resolve: {
    modules: ['node_modules', './src'],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat'
      //,'prop-types': 'preact/compat'
    }
  },


  output: {
    filename: 'quarkus-ecs-example.js',
    //path: path.resolve(__dirname, 'dist')
    path: path.resolve(__dirname, '../src/main/resources/META-INF/resources')
  },

  plugins: [new HtmlWebpackPlugin({
    template: "./src/index.html",
    title: "Quarkus AWS ECS Example Application",
    filename: "index.html",
    appMountId: "quarkus-ecs-example-container",
    //favicon: "./src/fav.png"
  })],

  module: {
    rules: [

      {
        test: /\.ts(x?)$/,
        include: [path.resolve(__dirname, 'src')],
        loaders: ['ts-loader']
      },

      {
        enforce: "pre",
        test: /\.js$/,
        loader: "source-map-loader"
      },


      {
        test: /\.(jpg|png)$/,
        use: {
          loader: "file-loader",

          options: {
            name: "assets/[name].[ext]",
          },
        }
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ]
  },

  //package.json -> "sideEffects": false,
  optimization: {
    //usedExports: true
  },


};
