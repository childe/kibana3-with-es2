/**
 * Bootstrap require with the needed config, then load the app.js module.
 */
require.config({
  baseUrl: 'app',
  urlArgs: 'r=@REV@',
  //urlArgs: 'bust=' + (new Date().getTime()),
  paths: {
    config:                   '../config',
    settings:                 'components/settings',
    kbn:                      'components/kbn',

    vendor:                   '../vendor',
    css:                      '../vendor/require/css',
    text:                     '../vendor/require/text',
    moment:                   '../vendor/moment',
    blob:                     '../vendor/blob',
    filesaver:                '../vendor/filesaver',
    chromath:                 '../vendor/chromath',
    angular:                  '../vendor/angular/angular',
    'angular-cookies':        '../vendor/angular/angular-cookies',
    'angular-dragdrop':       '../vendor/angular/angular-dragdrop',
    'angular-strap':          '../vendor/angular/angular-strap',
    'angular-sanitize':       '../vendor/angular/angular-sanitize',
    'angular-resource':       '../vendor/angular/angular-resource',
    'angular-route':          '../vendor/angular/angular-route',
    'angular-loader':         '../vendor/angular/angular-loader',
    'ui-utils':               '../vendor/angular/ui-utils',
    timepicker:               '../vendor/angular/timepicker',
    datepicker:               '../vendor/angular/datepicker',
    bindonce:                 '../vendor/angular/bindonce',

    lodash:                   'components/lodash.extended',
    'lodash-src':             '../vendor/lodash',
    'underscore.string':      '../vendor/underscore.string',
    'simple_statistics':      '../vendor/simple_statistics',
    bootstrap:                '../vendor/bootstrap/bootstrap',

    jquery:                   '../vendor/jquery/jquery-1.8.0',
    'jquery-ui':              '../vendor/jquery/jquery-ui-1.10.3',

    'extend-jquery':          'components/extend-jquery',

    'jquery.flot':            '../vendor/jquery/jquery.flot',
    'jquery.flot.pie':        '../vendor/jquery/jquery.flot.pie',
    'jquery.flot.events':     '../vendor/jquery/jquery.flot.events',
    'jquery.flot.selection':  '../vendor/jquery/jquery.flot.selection',
    'jquery.flot.stack':      '../vendor/jquery/jquery.flot.stack',
    'jquery.flot.stackpercent':'../vendor/jquery/jquery.flot.stackpercent',
    'jquery.flot.time':       '../vendor/jquery/jquery.flot.time',
    'jquery.flot.byte':       '../vendor/jquery/jquery.flot.byte',
    'jquery.flot.threshold':  '../vendor/jquery/jquery.flot.threshold',
     multiselect:             '../vendor/jquery/jquery.multiselect',


    modernizr:                '../vendor/modernizr-2.6.1',
    numeral:                  '../vendor/numeral',
    jsonpath:                 '../vendor/jsonpath',
    elasticjs:                '../vendor/elasticjs/elastic-angular-client',
    elasticsearch:            '../vendor/elasticsearch.angular',
    clickhouse:               '../vendor/clickhouse/client',
    strings:                  '../vendor/strings'
  },
  shim: {
    angular: {
      deps: ['jquery','config'],
      exports: 'angular'
    },

    bootstrap: {
      deps: ['jquery']
    },

    modernizr: {
      exports: 'Modernizr'
    },

    jsonpath: {
      exports: 'jsonPath'
    },

    jquery: {
      exports: 'jQuery'
    },

    // simple dependency declaration
    //
    'jquery-ui':            ['jquery'],
    'jquery.flot':          ['jquery'],
    'jquery.flot.byte':     ['jquery', 'jquery.flot'],
    'jquery.flot.pie':      ['jquery', 'jquery.flot'],
    'jquery.flot.events':   ['jquery', 'jquery.flot'],
    'jquery.flot.selection':['jquery', 'jquery.flot'],
    'jquery.flot.stack':    ['jquery', 'jquery.flot'],
    'jquery.flot.stackpercent':['jquery', 'jquery.flot'],
    'jquery.flot.time':     ['jquery', 'jquery.flot'],
    'jquery.flot.threshold':['jquery', 'jquery.flot'],

    'angular-sanitize':     ['angular'],
    'angular-cookies':      ['angular'],
    'angular-dragdrop':     ['jquery','jquery-ui','angular'],
    'angular-loader':       ['angular'],
    'angular-mocks':        ['angular'],
    'angular-resource':     ['angular'],
    'angular-touch':        ['angular'],
    'angular-route':        ['angular'],
    'bindonce':             ['angular'],
    'angular-strap':        ['angular', 'bootstrap','timepicker', 'datepicker'],

    'ui-utils':             ['angular'],
    timepicker:             ['jquery', 'bootstrap'],
    datepicker:             ['jquery', 'bootstrap'],
    elasticsearch:          ['angular'],
    elasticjs:              ['elasticsearch', '../vendor/elasticjs/elastic'],
    clickhouse:              ['angular']
  },
  waitSeconds: 60,
});
