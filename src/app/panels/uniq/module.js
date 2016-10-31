/** @scratch /panels/5
 *
 * include::panels/uniq.asciidoc[]
 */

/** @scratch /panels/uniq/0
 *
 * == uniq
 * Status: *Stable*
 *
 * A metric based on the results of an Elasticsearch CardinalityAggregation.
 *
 */
define([
  'angular',
  'app',
  'lodash',
  'jquery',
  'kbn'
],
function (angular, app, _, $, kbn) {
  'use strict';

  var module = angular.module('kibana.panels.uniq', []);
  app.useModule(module);

  module.controller('uniq', function($scope, querySrv, dashboard, filterSrv, fields) {
    $scope.panelMeta = {
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      editorTabs : [
        {title:'Queries', src:'app/partials/querySelect.html'}
      ],
      status  : "Stable",
      description : "Displays the results of an elasticsearch CardinalityAggregation as a metric."
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/uniq/5
       * === Parameters
       *
       * field:: The field on which to computer the aggregation
       */
      field   : '_type',
      style   : { "font-size": '10pt'},
      /** @scratch /panels/terms/5
       * lables:: In pie chart mode, draw labels in the pie slices
       */
      labels  : true,
      /** @scratch /panels/terms/5
       * spyable:: Set spyable to false to disable the inspect button
       */
      spyable     : true,
      /** @scratch /panels/terms/5
       *
       * ==== Queries
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries     : {
        mode        : 'all',
        ids         : []
      }
    };

    _.defaults($scope.panel,_d);

    $scope.init = function () {
      $scope.hits = 0;

      $scope.$on('refresh',function(){
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.get_data = function() {
      delete $scope.panel.error;

      // Make sure we have everything for the request to complete
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;
      var request, results, boolQuery, queries, aggs;

      //$scope.field = _.contains(fields.list,$scope.panel.field+'.raw') ?
        //$scope.panel.field+'.raw' : $scope.panel.field;

      request = $scope.ejs.Request();

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      queries = querySrv.getQueryObjs($scope.panel.queries.ids);

      // This could probably be changed to a BoolFilter
      boolQuery = $scope.ejs.BoolQuery().minimumShouldMatch(1)
        .filter(filterSrv.getBoolFilter(filterSrv.ids()));
      _.each(queries,function(q) {
        boolQuery = boolQuery.should(querySrv.toEjsObj(q));
      });

      aggs = $scope.ejs.CardinalityAggregation('uniq')
          .field($scope.panel.field);

      request = request.query(boolQuery).agg(aggs);

      // Populate the inspector panel
      $scope.inspector = request.toJSON();

      results = $scope.ejs.doSearch(dashboard.indices, request, 0);

      // Populate scope when we have results
      results.then(function(results) {
        if(!(_.isUndefined(results.error))) {
          $scope.panel.error = $scope.parse_error(results.error);
        }
        $scope.panelMeta.loading = false;
        //$scope.hits = results.hits.total;

        $scope.results = results;
        $scope.uniqValue = results.aggregations.uniq.value;
      });
    };

    $scope.set_refresh = function (state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh = false;
    };
  });
});
