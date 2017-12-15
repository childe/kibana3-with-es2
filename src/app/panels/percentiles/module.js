/*

  ## Percentiles Module

  ### Parameters
  * format :: The format of the value returned. (Default: number)
  * style :: The font size of the main number to be displayed.
  * mode :: The aggergate value to use for display
  * spyable ::  Dislay the 'eye' icon that show the last elasticsearch query

*/
define([
  'angular',
  'app',
  'lodash',
  'jquery',
  'kbn',
  'numeral',
  'config'
], function (
  angular,
  app,
  _,
  $,
  kbn,
  numeral,
  config
) {

  'use strict';

  var module = angular.module('kibana.panels.percentiles', []);
  app.useModule(module);

  module.controller('percentiles', function ($scope, querySrv, dashboard, filterSrv, $http, esVersion) {

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
      status: 'Beta',
      description: 'A percentiles panel for displaying aggregations using the Elastic Search percentiles aggregation query.'
    };

    $scope.modes = ['25','50','75','80','85','90','95','99'];

    var defaults = {
      queries     : {
        mode        : 'all',
        ids         : []
      },
      style   : { "font-size": '24pt'},
      format: 'number',
      mode: 'count',
      display_breakdown: 'yes',
      sort_field: '',
      sort_reverse: false,
      label_name: 'Query',
      value_name: 'Value',
      spyable     : true,
      compression : '',
      show: {
        '25': true,
        '75': true,
        '80': true,
        '85': true,
        '95': true,
        '99': true,
      }
    };

    _.defaults($scope.panel, defaults);

    $scope.init = function () {
      $scope.ready = false;
      $scope.$on('refresh', function () {
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.add_dash_to_modes = function(modes){
      var newmodes = modes.slice();
      newmodes.unshift('-');
      return newmodes;
    }

    $scope.set_sort = function(field) {
      if($scope.panel.sort_field === field && $scope.panel.sort_reverse === false) {
        $scope.panel.sort_reverse = true;
      } else if($scope.panel.sort_field === field && $scope.panel.sort_reverse === true) {
        $scope.panel.sort_field = '';
        $scope.panel.sort_reverse = false;
      } else {
        $scope.panel.sort_field = field;
        $scope.panel.sort_reverse = false;
      }
    };

    $scope.get_data = function () {
      if(dashboard.indices.length === 0) {
        return;
      }

      $scope.panelMeta.loading = true;

      var request,
        results,
        boolQuery,
        queries;

      request = $scope.ejs.Request();
      boolQuery = $scope.ejs.BoolQuery()
        .filter(filterSrv.getBoolFilter(filterSrv.ids()));
      request = $scope.ejs.Request().query(boolQuery);

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      queries = querySrv.getQueryObjs($scope.panel.queries.ids);

      var percents = _.keys($scope.panel.show);

      if ($scope.panel.mode !== '-'){
        var sub_aggs = $scope.ejs.PercentilesAggregation('stats')
        .field($scope.panel.field)
        .percents([$scope.panel.mode]).hdr(3);

        if ($scope.panel.compression !== ''){
          sub_aggs.compression($scope.panel.compression);
        }

        var allQueries = $scope.ejs.BoolQuery().minimumShouldMatch(1);
        $.each(queries, function (i, q) {
          allQueries.should(querySrv.toEjsObj(q));
        });
        request = request
        .aggregation(
          $scope.ejs.FilterAggregation('stats')
          .filter(allQueries)
          .aggregation(sub_aggs)
        ).size(0);
      }

      $.each(queries, function (i, q) {
        var qname = 'stats_'+i;

        var sub_aggs = $scope.ejs.PercentilesAggregation(qname)
          .field($scope.panel.field)
          .percents(percents).hdr(3);

        if ($scope.panel.compression!==''){
          sub_aggs.compression($scope.panel.compression);
        }

        request.aggregation(
          $scope.ejs.FilterAggregation(qname)
            .filter(querySrv.toEjsObj(q))
            .aggregation(sub_aggs)
          );
      });

      $scope.inspector = request.toJSON();

      results = $scope.ejs.doSearch(dashboard.indices, request,
        0, dashboard.current.index.routing);

      results.then(function(results) {
        $scope.panelMeta.loading = false;
        esVersion.gte('1.3.0').then(function(is) {
          if (is) {
            if ($scope.panel.mode !== '-'){
              var value = results.aggregations.stats['stats']['values'][$scope.panel.mode+'.0'];
            }
            var rows = queries.map(function (q, i) {
              var alias = q.alias || q.query;
              var obj = _.clone(q);
              obj.label = alias;
              obj.Label = alias.toLowerCase(); //sort field
              obj.value = {};
              obj.Value = {};
              var data = results.aggregations['stats_'+i]['stats_'+i]['values'];
              for ( var keys in data ) {
                obj.value[parseInt(keys)] = data[keys];
                obj.Value[parseInt(keys)] = data[keys]; //sort field
              };
              return obj;
            });

            $scope.data = {
              value: value,
              rows: rows
            };
          } else {
            esVersion.gte('1.1.0').then(function(is) {
              if (is) {
                if ($scope.panel.mode !== '-'){
                  var value = results.aggregations.stats['stats'][$scope.panel.mode+'.0'];
                }
                var rows = queries.map(function (q, i) {
                  var alias = q.alias || q.query;
                  var obj = _.clone(q);
                  obj.label = alias;
                  obj.Label = alias.toLowerCase(); //sort field
                  obj.value = {};
                  obj.Value = {};
                  var data = results.aggregations['stats_'+i]['stats_'+i];
                  for ( var keys in data ) {
                    obj.value[parseInt(keys)] = data[keys];
                    obj.Value[parseInt(keys)] = data[keys]; //sort field
                  };
                  return obj;
                });

                $scope.data = {
                  value: value,
                  rows: rows
                };
              }
            });
          };
        });
      },
      function(results){
        $scope.panel.error = $scope.parse_error(results.body);
        $scope.panelMeta.loading = false;
      }
      );
    };

    $scope.set_refresh = function (state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh =  false;
    };

  });

  module.filter('formatstats', function(){
    return function (value,format) {
      switch (format) {
      case 'money':
        value = numeral(value).format('$0,0.00');
        break;
      case 'bytes':
        value = numeral(value).format('0.00b');
        break;
      case 'float':
        value = numeral(value).format('0.000');
        break;
      default:
        value = numeral(value).format('0,0');
      }
      return value;
    };
  });

});
