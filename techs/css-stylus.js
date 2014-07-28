/**
 * css-stylus
 * ==========
 *
 * Собирает *css*-файлы вместе со *styl*-файлами по deps'ам, обрабатывает инклуды и ссылки, сохраняет в виде `?.css`.
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию `?.css`.
 * * *Object* **variables** — Дополнительные переменные окружения для `stylus`.
 * * *String* **filesTarget** — files-таргет, на основе которого получается список исходных файлов
 *   (его предоставляет технология `files`). По умолчанию — `?.files`.
 *
 * **Пример**
 *
 * ```javascript
 * nodeConfig.addTech(require('enb-stylus/techs/css-stylus'));
 * ```
 */
var Vow = require('vow');
var stylus = require('stylus');

module.exports = require('enb/techs/css').buildFlow()
    .name('css-stylus')
    .defineOption('variables')
    .useFileList(['css', 'styl'])
    .builder(function (sourceFiles) {
        var _this = this;
        var promise = Vow.promise();

        var css = sourceFiles.map(function (file) {
            var path = file.fullname;
            if (file.name.indexOf('.styl') !== -1) {
                return '/* ' + path + ':begin */\n' +
                    '@import "' + path + '";\n' +
                    '/* ' + path + ':end */\n';
            } else {
                return '@import "' + path + '";';
            }
        }).join('\n');

        var targetName = _this._target;
        var renderer = stylus(css)
            .define('url', function (url) {
                if (arguments.length > 1) {
                    // Если url в исходном styl-файле передан без кавычек,
                    // то он попадает в коллбек не одним параметром,
                    // а бьется парсером на отдельные айтемы.
                    url.val = Array.prototype.slice.call(arguments).map(function(a) {
                        return a.string;
                    }).join('');
                }

                return new stylus.nodes.Literal('url(' + _this._resolveCssUrl(url.val, url.filename) + ')');
            });
        if (this._variables) {
            var variables = this._variables;
            Object.keys(variables).forEach(function (key) {
                renderer.define(key, variables[key]);
            });
        }

        _this._configureRenderer(renderer)
            .render(function (err, css) {
                if (err) {
                    promise.reject(err);
                } else {
                    promise.fulfill(css);
                }
            });

        return promise.then(function (css) {
            return _this._processIncludes(css, _this.node.resolvePath(targetName));
        });
    })
    .methods({
        _resolveCssUrl: function (data, filename) {
            return this._getCssPreprocessor()._resolveCssUrl(data, filename);
        },
        _configureRenderer: function (renderer) {
            return renderer;
        }
    })
    .createTech();
