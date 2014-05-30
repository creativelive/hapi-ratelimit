'use strict';

var eslint = require('gulp-eslint');

module.exports = function(gulp, conf) {
  gulp.task('eslint', function() {
    return gulp.src(conf.build.get('/lint'))
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failOnError())
      .on('error', function() {
        // record that there have been errors
        gulp.fail = true;
      });
  });
};
