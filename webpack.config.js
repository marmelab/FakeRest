const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const NpmDtsPlugin = require("npm-dts-webpack-plugin");

module.exports = {
  mode: "development",
  entry: {
    FakeRest: "./src/index.ts",
    "FakeRest.min": "./src/index.ts",
  },
  devtool: "source-map",
  resolve: {
    modules: ["node_modules", path.join(__dirname, "src")],
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new NpmDtsPlugin({
        output: "./dist/FakeRest.d.ts",
      }),
      new TerserPlugin({
        include: /\.min\.js$/,
      }),
    ],
  },
  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "[name].js",
    globalObject: "this",
    library: {
      name: "FakeRest",
      type: "umd",
    },
  },
};
