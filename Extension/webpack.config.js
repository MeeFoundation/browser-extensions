import CopyPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const browser = env.chrome ? "chrome" : "safari";
  const isProduction = argv.mode == "production";

  return {
    name: "mee",
    entry: {
      background: "./background.js",
      content: "./content.js",
      popup: "./popup.js",
    },
    output: {
      filename: "[name].js",
      path:
        browser === "safari"
          ? path.resolve(
              __dirname,
              `../MeeExtensionMac/Shared (Extension)/Resources`
            )
          : path.resolve(__dirname, `${isProduction ? "dist" : "dev"}/`),
    },
    devServer: {
      open: true,
      host: "localhost",
    },
    optimization: {
      minimize: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loader: "string-replace-loader",
          options: {
            search: /\$BROWSER/g,
            replace: browser,
          },
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|svg|jpe?g|gif)$/,
          loader: "file-loader",
          options: {
            outputPath: "images/",
            publicPath: "images/",
            name: "[name].[ext]",
          },
        },
      ],
    },

    plugins: [
      new CleanWebpackPlugin(),
      new CopyPlugin({
        patterns: [
          {
            context: path.resolve(__dirname),
            from: "images",
            to: "images",
          },
        ],
      }),
      new CopyPlugin({
        patterns: [
          {
            context: path.resolve(__dirname),
            from: "_locales",
            to: "_locales",
          },
        ],
      }),
      new CopyPlugin({
        patterns: [
          {
            context: path.resolve(__dirname),
            from: "_metadata",
            to: "_metadata",
          },
        ],
      }),
      new CopyPlugin({
        patterns: [
          {
            context: path.resolve(__dirname),
            from: "gpc-scripts",
            to: "gpc-scripts",
          },
        ],
      }),
      new CopyPlugin({
        patterns: [
          {
            context: path.resolve(__dirname),
            from: "manifest.json",
            to: "manifest.json",
          },
        ],
      }),
      new CopyPlugin({
        patterns: [
          {
            context: path.resolve(__dirname),
            from: "rules.json",
            to: "rules.json",
          },
        ],
      }),

      new HtmlWebpackPlugin({
        filename: "popup.html",
        template: "popup.html",
        chunks: ["popup"],
      }),
    ],
  };
};
