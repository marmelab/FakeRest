const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    mode: 'development',
    entry: {
        FakeRest: './src/FakeRest.js',
        "FakeRest.min": './src/FakeRest.js'
    },
    devtool: "source-map",
    resolve:{
        modules: [
            'node_modules',
            path.join(__dirname, "src")
        ]
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }]
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            include: /\.min\.js$/
        })]
    },
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: '[name].js',
        library: 'FakeRest',
        libraryTarget: 'umd'
    }
};
