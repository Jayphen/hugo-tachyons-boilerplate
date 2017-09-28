import gulp from "gulp";
import {spawn} from "child_process";
import hugoBin from "hugo-bin";
import gutil from "gulp-util";
import gulpif from "gulp-if";
import yargs from "yargs";
import postcss from "gulp-postcss";
import cssnext from "postcss-cssnext";
import cssnano from "gulp-cssnano";
import atImport from "postcss-import";
import atExtend from "postcss-extend";
import mqpacker from "css-mqpacker";
import sourcemaps from "gulp-sourcemaps";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";

const browserSync = BrowserSync.create();
const argv = yargs.argv;

// Hugo arguments
const hugoArgsDefault = ["-d", "../dist", "-s", "site", "-v"];
const hugoArgsPreview = ["--baseUrl=/", "--cleanDestinationDir", "--buildDrafts", "--buildFuture"];

// Development tasks
gulp.task("hugo", (cb) => buildSite(cb));
gulp.task("hugo-preview", (cb) => buildSite(cb, hugoArgsPreview));

// Build/production tasks
gulp.task("build", ["css", "js"], (cb) => buildSite(cb, [], "production"));
gulp.task("build-preview", ["css", "js"], (cb) => buildSite(cb, hugoArgsPreview, "production"));

// Compile CSS with PostCSS
gulp.task("css", () => (
  gulp.src("./src/css/*.css")
    .pipe(gulpif(!argv.production, sourcemaps.init()))
    .pipe(postcss(
      [
        atImport({from: "./src/css/main.css"}), 
        atExtend(),
        cssnext(),
        mqpacker()
      ]
    ))
    .pipe(gulpif(!argv.production, sourcemaps.write()))
    .pipe(gulpif(argv.production, cssnano()))
    .pipe(gulp.dest("./site/static/css"))
    .pipe(browserSync.stream())
));

// Compile Javascript
gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      colors: true,
      progress: true
    }));
    browserSync.reload();
    cb();
  });
});

// Development server with browsersync
gulp.task("server", ["hugo-preview", "css", "js"], () => {
  browserSync.init({
    server: {
      baseDir: "./dist",
    },
    //host: 'sitename.test',
    //open: 'external'
  });
  gulp.watch("src/js/**/*.js", ["js"]);
  gulp.watch("src/css/**/*.css", ["css"]);
  gulp.watch("site/**/*", ["hugo-preview"]);
});

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = "development") {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}
