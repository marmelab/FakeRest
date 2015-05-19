module.exports = {
    entry: {
        FakeRest: './src/FakeRest.js'
    },
    resolve:{
        modulesDirectories: [
            'node_modules',
            'src'
        ]
    },
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader?stage=1&optional[]=runtime'
        }]
    },
    output: {
        path: './dist',
        filename: '[name].js',
        library: 'FakeRest',
        libraryTarget: 'umd'
    }
};
