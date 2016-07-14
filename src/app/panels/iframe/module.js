/** @scratch /panels/5
 *
 * include::panels/iframe.asciidoc[]
 */

/** @scratch /panels/iframe/0
 * == iframe
 * Status: *Stable*
 *
 * The iframe panel is used for 
 * iframe.
 *
 */
define([
  'angular',
  'app',
  'lodash',
  'require'
],
function (angular, app, _, require) {
  'use strict';

  var module = angular.module('kibana.panels.iframe', []);
  app.useModule(module);

  module.controller('iframe', function($scope) {
    $scope.panelMeta = {
      status  : "Stable",
      description : "iframe panel"
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/iframe/5
       *
       * === Parameters
      /** @scratch /panels/text/5
       * content:: The content of your panel, written in the mark up specified in +mode+
       */
      url : "",
      height: "150px"
    };
    _.defaults($scope.panel,_d);

    $scope.init = function() {
        console.log(1);
    };

  });
});
