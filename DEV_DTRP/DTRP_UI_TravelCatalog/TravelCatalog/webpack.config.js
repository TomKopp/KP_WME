const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/main.js'
    , mode: 'development'
    , module: {
        rules: [
            {
                test: /\.(js|jsx)$/
                , exclude: /(node_modules|bower_components)/
                , loader: 'babel-loader'
                , options: { presets: ['@babel/preset-react'] }
            }
            , {
                test: /\.css$/
                , use: ['style-loader', 'css-loader']
            }
        ]
    }
    , resolve: {
        extensions: [
            '*'
            , '.js'
            , '.jsx'
        ]
    }
    , output: {
        path: path.resolve(__dirname, 'dist/')
        , publicPath: '/dist/'
        , filename: 'TravelCatalog.js'
    }
    , devServer: {
        contentBase: path.join(__dirname, 'public/')
        , port: 8080
        , publicPath: 'http://localhost:8080/dist/'
        , hotOnly: true
    }
    // , devtool: 'eval-source-map'
    , plugins: [new webpack.HotModuleReplacementPlugin()]
};
