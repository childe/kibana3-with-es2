/** @scratch /panels/5
 *
 * include::panels/histogram.asciidoc[]
 */

/** @scratch /panels/histogram/0
 *
 * == Histogram
 * Status: *Stable*
 *
 * The histogram panel allow for the display of time charts. It includes several modes and tranformations
 * to display event counts, mean, min, max and total of numeric fields, and derivatives of counter
 * fields.
 *
 */
define([
  'angular',
  'app',
  'jquery',
  'lodash',
  'kbn',
  'moment',
  './timeSeries',
  'numeral',
  'jquery.flot',
  'jquery.flot.events',
  'jquery.flot.selection',
  'jquery.flot.time',
  'jquery.flot.byte',
  'jquery.flot.stack',
  'jquery.flot.stackpercent'
],
function (angular, app, $, _, kbn, moment, timeSeries, numeral) {

  'use strict';

  var module = angular.module('kibana.panels.chhistogram', []);
  app.useModule(module);

  module.controller('chhistogram', function($scope, kbnIndex, querySrv, dashboard, filterSrv, clickhouseFilterSrv) {
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
        {
          title:'Style',
          src:'app/panels/chhistogram/styleEditor.html'
        },
        {
          title:'Queries',
          src:'app/panels/chhistogram/queriesEditor.html'
        },
      ],
      status  : "Stable",
      description : "A bucketed time series chart of the current query or queries. Uses the "+
        "Elasticsearch date_histogram facet. If using time stamped indices this panel will query"+
        " them sequentially to attempt to apply the lighest possible load to your Elasticsearch cluster"
    };

    // Set and populate defaults
    var _d = {
      /** @scratch /panels/histogram/3
       *
       * === Parameters
       * ==== Axis options
       * mode:: Value to use for the y-axis. For all modes other than count, +value_field+ must be
       * defined. Possible values: count, mean, max, min, total.
       */
      mode          : 'count',

      arithmetic    : 'none',
      /** @scratch /panels/histogram/3
       * time_field:: x-axis field. This must be defined as a date type in Elasticsearch.
       */
      time_field    : 'datetime',
      /** @scratch /panels/histogram/3
       * value_field:: y-axis field if +mode+ is set to mean, max, min or total. Must be numeric.
       */
      value_field   : null,

      value_field2   : null,
      /** @scratch /panels/histogram/3
       * x-axis:: Show the x-axis
       */
      'x-axis'      : true,
      /** @scratch /panels/histogram/3
       * y-axis:: Show the y-axis
       */
      'y-axis'      : true,
      /** @scratch /panels/histogram/3
       * scale:: Scale the y-axis by this factor
       */
      scale         : 1,
      /** @scratch /panels/histogram/3
       * y_format:: 'none','bytes','short '
       */
      y_format    : 'none',
      /** @scratch /panels/histogram/5
       * grid object:: Min and max y-axis values
       * grid.min::: Minimum y-axis value
       * grid.max::: Maximum y-axis value
       */
      grid          : {
        max: null,
        min: 0
      },
      /** @scratch /panels/histogram/5
       *
       * ==== Queries
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries     : {
        mode        : 'all',
        ids         : []
      },
      /** @scratch /panels/histogram/3
       *
       * ==== Annotations
       * annotate object:: A query can be specified, the results of which will be displayed as markers on
       * the chart. For example, for noting code deploys.
       * annotate.enable::: Should annotations, aka markers, be shown?
       * annotate.query::: Lucene query_string syntax query to use for markers.
       * annotate.size::: Max number of markers to show
       * annotate.field::: Field from documents to show
       * annotate.sort::: Sort array in format [field,order], For example [`@timestamp',`desc']
       */
      annotate      : {
        enable      : false,
        query       : "*",
        size        : 20,
        field       : '_type',
        sort        : ['_score','desc']
      },
      /** @scratch /panels/histogram/3
       * ==== Interval options
       * auto_int:: Automatically scale intervals?
       */
      auto_int      : true,
      /** @scratch /panels/histogram/3
       * resolution:: If auto_int is true, shoot for this many bars.
       */
      resolution    : 100,
      /** @scratch /panels/histogram/3
       * interval:: If auto_int is set to false, use this as the interval.
       */
      interval      : '5m',
      /** @scratch /panels/histogram/3
       * interval:: Array of possible intervals in the *View* selector. Example [`auto',`1s',`5m',`3h']
       */
      intervals     : ['auto','1s','1m','5m','10m','30m','1h','3h','12h','1d','1w','1y'],
      /** @scratch /panels/histogram/3
       * ==== Drawing options
       * lines:: Show line chart
       */
      lines         : false,
      /** @scratch /panels/histogram/3
       * fill:: Area fill factor for line charts, 1-10
       */
      fill          : 0,
      /** @scratch /panels/histogram/3
       * linewidth:: Weight of lines in pixels
       */
      linewidth     : 3,
      /** @scratch /panels/histogram/3
       * points:: Show points on chart
       */
      points        : false,
      /** @scratch /panels/histogram/3
       * pointradius:: Size of points in pixels
       */
      pointradius   : 5,
      /** @scratch /panels/histogram/3
       * bars:: Show bars on chart
       */
      bars          : true,
      /** @scratch /panels/histogram/3
       * stack:: Stack multiple series
       */
      stack         : true,
      /** @scratch /panels/histogram/3
       * spyable:: Show inspect icon
       */
      spyable       : true,
      /** @scratch /panels/histogram/3
       * zoomlinks:: Show `Zoom Out' link
       */
      zoomlinks     : true,
      /** @scratch /panels/histogram/3
       * options:: Show quick view options section
       */
      options       : true,
      /** @scratch /panels/histogram/3
       * legend:: Display the legond
       */
      legend        : true,
      /** @scratch /panels/histogram/3
       * show_query:: If no alias is set, should the query be displayed?
       */
      show_query    : true,
      /** @scratch /panels/histogram/3
       * interactive:: Enable click-and-drag to zoom functionality
       */
      interactive   : true,
      /** @scratch /panels/histogram/3
       * legend_counts:: Show counts in legend
       */
      legend_counts : true,
      /** @scratch /panels/histogram/3
       * ==== Transformations
       * timezone:: Correct for browser timezone?. Valid values: browser, utc
       */
      timezone      : 'browser', // browser or utc
      /** @scratch /panels/histogram/3
       * percentage:: Show the y-axis as a percentage of the axis total. Only makes sense for multiple
       * queries
       */
      percentage    : false,
      /** @scratch /panels/histogram/3
       * zerofill:: Improves the accuracy of line charts at a small performance cost.
       */
      zerofill      : true,
      /** @scratch /panels/histogram/3
       * derivative:: Show each point on the x-axis as the change from the previous point
       */

      derivative    : false,
      /** @scratch /panels/histogram/3
       * tooltip object::
       * tooltip.value_type::: Individual or cumulative controls how tooltips are display on stacked charts
       * tooltip.query_as_alias::: If no alias is set, should the query be displayed?
       */
      tooltip       : {
        value_type: 'cumulative',
        query_as_alias: true
      }
    };

    _.defaults($scope.panel,_d);
    _.defaults($scope.panel.tooltip,_d.tooltip);
    _.defaults($scope.panel.annotate,_d.annotate);
    _.defaults($scope.panel.grid,_d.grid);



    $scope.init = function() {
      // Hide view options by default
      $scope.options = false;

      // Always show the query if an alias isn't set. Users can set an alias if the query is too
      // long
      $scope.panel.tooltip.query_as_alias = true;

      $scope.get_data();

    };

    $scope.set_interval = function(interval) {
      if(interval !== 'auto') {
        $scope.panel.auto_int = false;
        $scope.panel.interval = interval;
      } else {
        $scope.panel.auto_int = true;
      }
    };

    $scope.interval_label = function(interval) {
      return $scope.panel.auto_int && interval === $scope.panel.interval ? interval+" (auto)" : interval;
    };

    /**
     * The time range effecting the panel
     * @return {[type]} [description]
     */
    $scope.get_time_range = function () {
      var range = $scope.range = filterSrv.timeRange('last');
      return range;
    };

    $scope.get_interval = function () {
      var interval = $scope.panel.interval,
                      range;
      if ($scope.panel.auto_int) {
        range = $scope.get_time_range();
        if (range) {
          interval = kbn.secondsToHms(
            kbn.calculate_interval(range.from, range.to, $scope.panel.resolution, 0) / 1000
          );
        }
      }
      $scope.panel.interval = interval || '10m';
      return $scope.panel.interval;
    };

    /**
     * Fetch the data for a chunk of a queries results. Multiple segments occur when several indicies
     * need to be consulted (like timestamped logstash indicies)
     *
     * The results of this function are stored on the scope's data property. This property will be an
     * array of objects with the properties info, time_series, and hits. These objects are used in the
     * render_panel function to create the historgram.
     *
     * @param {number} segment   The segment count, (0 based)
     * @param {number} query_id  The id of the query, generated on the first run and passed back when
     *                            this call is made recursively for more segments
     */

    $scope.get_data = function() {
      delete $scope.panel.error
      $scope.panelMeta.loading = true
      $scope.inspector = ''

      var timeField = _.uniq(_.pluck(filterSrv.getByType('time'),'field'));
      if(timeField.length > 1) {
        $scope.panel.error = "Time field must be consistent amongst time filters";
        return;
      } else if(timeField.length === 0) {
        $scope.panel.error = "A time filter must exist for this panel to function";
        return;
      } else {
        timeField = timeField[0];
      }

      var _range = $scope.get_time_range(),
        _interval = $scope.get_interval(_range),
        _interval_int = kbn.interval_to_ms(_interval)

      var whereClause = clickhouseFilterSrv.buildWhereClause(clickhouseFilterSrv.ids())

      $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
      var queries = querySrv.getQueryObjs($scope.panel.queries.ids);

      $scope.legend = []
      $scope.hits = 0
      var data = []
      var query_ids = []
      $scope.query_ids = []

      _.each(queries, function(q, i){
        var query = clickhouseFilterSrv.convertQuery(q.query)

        var c
        if (query !== '') {
          c = '{0} AND ({1})'.format(whereClause,query)
        }else{
          c = whereClause
        }

        var stmt
        if ($scope.mode === 'count') {
          stmt = 'SELECT {0} as count, (intDiv(toUInt32({1})*1000,{2})) as t FROM {3} WHERE {4} GROUP BY t ORDER BY t FORMAT JSON'.format('count(1)', timeField, _interval_int, dashboard.indices.join(' '), c)
        } else {
          stmt = 'SELECT {0} as count, {5}({6}) as value, (intDiv(toUInt32({1})*1000,{2})) as t FROM {3} WHERE {4} GROUP BY t ORDER BY t FORMAT JSON'.format('count(1)', timeField, _interval_int, dashboard.indices.join(' '), c, $scope.panel.mode, $scope.panel.value_field)
        }

        $scope.inspector += stmt + '\n'

        query_ids[i] = $scope.query_ids[i] = new Date().getTime();
        $scope.chclient.query(stmt).then(
          function(response){
            if (query_ids[i] !== $scope.query_ids[i]) return

            if ($scope.panel.queries.ids.length == i+1){
              $scope.panelMeta.loading = false
            }

            var tsOpts = {
              interval: _interval,
              start_date: _range && _range.from,
              end_date: _range && _range.to,
              fill_style: $scope.panel.derivative ? 'null' : $scope.panel.zerofill ? 'minimal' : 'no'
            },
            time_series = new timeSeries.ZeroFilled(tsOpts),
            counters = {},

            query_results = response.data

            var hits = buildResult(query_results.data, time_series, counters, _interval_int);

            $scope.legend[i] = {query:q, hits:hits};

            data[i] = {
              info: q,
              time_series: time_series,
              hits: hits,
              counters: counters
            };
            $scope.$emit('render', data)
          },
          function(response){
            if (query_ids[i] !== $scope.query_ids[i]) return

            if ($scope.panel.queries.ids.length == i+1){
              $scope.panelMeta.loading = false
            }

            $scope.panel.error = $scope.parse_error(response.data);
          })
      })
    };

    function buildResult(query_results, time_series, counters, _interval_int, timeshift){
      var hits = 0

      timeshift = _.isUndefined(timeshift) ? 0 : timeshift;

      // push each entry into the time series, while incrementing counters
      _.each(query_results, function (entry) {
        var value,
          count = parseInt(entry.count),
          _value = parseFloat(entry.value)

        hits += count // The series level hits counter
        $scope.hits += count // Entire dataset level hits counter
        counters[_interval_int * entry.t] = count

        if ($scope.panel.mode === 'count') {
          value = count
        } else {
          value = _value
        }
        time_series.addValue(_interval_int * entry.t + timeshift, value);
      })

      return hits;
    }

    // function $scope.zoom
    // factor :: Zoom factor, so 0.5 = cuts timespan in half, 2 doubles timespan
    $scope.zoom = function(factor) {
      var _range = filterSrv.timeRange('last');
      var _timespan = (_range.to.valueOf() - _range.from.valueOf());
      var _center = _range.to.valueOf() - _timespan/2;

      var _to = (_center + (_timespan*factor)/2);
      var _from = (_center - (_timespan*factor)/2);

      // If we're not already looking into the future, don't.
      if(_to > Date.now() && _range.to < Date.now()) {
        var _offset = _to - Date.now();
        _from = _from - _offset;
        _to = Date.now();
      }

      if(factor > 1) {
        filterSrv.removeByType('time');
      }
      filterSrv.set({
        type:'time',
        from:moment.utc(_from).toDate(),
        to:moment.utc(_to).toDate(),
        field:$scope.panel.time_field
      });
    };

    // I really don't like this function, too much dom manip. Break out into directive?
    $scope.populate_modal = function(request) {
      return
      $scope.inspector = request.toJSON();
    };

    $scope.set_refresh = function (state) {
      $scope.refresh = state;
    };

    $scope.close_edit = function() {
      if($scope.refresh) {
        $scope.get_data();
      }
      $scope.refresh =  false;
      $scope.$emit('render');
    };

    $scope.render = function() {
      $scope.$emit('render');
    };

  });

  module.directive('chhistogramChart', function(dashboard, filterSrv) {
    return {
      restrict: 'A',
      template: '<div></div>',
      link: function(scope, elem) {
        var data, plot;

        scope.$on('refresh',function(){
          scope.get_data();
        });

        // Receive render events
        scope.$on('render',function(event,d){
          data = d || data;
          render_panel(data);
        });

        var scale = function(series,factor) {
          return _.map(series,function(p) {
            return [p[0],p[1]*factor];
          });
        };

        var scaleSeconds = function(series,interval) {
          return _.map(series,function(p) {
            return [p[0],p[1]/kbn.interval_to_seconds(interval)];
          });
        };

        var derivative = function(series) {
          return _.map(series, function(p,i) {
            var _v;
            if(i === 0 || p[1] === null) {
              _v = [p[0],null];
            } else {
              _v = series[i-1][1] === null ? [p[0],null] : [p[0],p[1]-(series[i-1][1])];
            }
            return _v;
          });
        };

        // Function for rendering panel
        function render_panel(data) {
          // IE doesn't work without this
          try {
            elem.css({height:scope.panel.height||scope.row.height});
          } catch(e) {return;}

          // Populate from the query service
          try {
            _.each(data, function(series) {
              series.label = series.info.alias;
              series.color = series.info.color;
            });
          } catch(e) {return;}

          // Set barwidth based on specified interval
          var barwidth = kbn.interval_to_ms(scope.panel.interval);

          var stack = scope.panel.stack ? true : null;

          // Populate element
          try {
            var options = {
              legend: { show: false },
              series: {
                stackpercent: scope.panel.stack ? scope.panel.percentage : false,
                stack: scope.panel.percentage ? null : stack,
                lines:  {
                  show: scope.panel.lines,
                  // Silly, but fixes bug in stacked percentages
                  fill: scope.panel.fill === 0 ? 0.001 : scope.panel.fill/10,
                  lineWidth: scope.panel.linewidth,
                  steps: false
                },
                bars:   {
                  show: scope.panel.bars,
                  fill: 1,
                  barWidth: barwidth/1.5,
                  zero: false,
                  lineWidth: 0
                },
                points: {
                  show: scope.panel.points,
                  fill: 1,
                  fillColor: false,
                  radius: scope.panel.pointradius
                },
                shadowSize: 1
              },
              yaxis: {
                show: scope.panel['y-axis'],
                min: scope.panel.grid.min,
                max: scope.panel.percentage && scope.panel.stack ? 100 : scope.panel.grid.max
              },
              xaxis: {
                timezone: scope.panel.timezone,
                show: scope.panel['x-axis'],
                mode: "time",
                min: _.isUndefined(scope.range.from) ? null : scope.range.from.getTime(),
                max: _.isUndefined(scope.range.to) ? null : scope.range.to.getTime(),
                timeformat: time_format(scope.panel.interval),
                label: "Datetime",
                ticks: elem.width()/100
              },
              grid: {
                backgroundColor: null,
                borderWidth: 0,
                hoverable: true,
                color: '#c8c8c8'
              }
            };

            if (scope.panel.y_format === 'bytes') {
              options.yaxis.mode = "byte";
              options.yaxis.tickFormatter = function (val, axis) {
                return kbn.byteFormat(val, 0, axis.tickSize);
              };
            }

            if (scope.panel.y_format === 'short') {
              options.yaxis.tickFormatter = function (val, axis) {
                return kbn.shortFormat(val, 0, axis.tickSize);
              };
            }

            if(scope.panel.annotate.enable) {
              options.events = {
                clustering: true,
                levels: 1,
                data: scope.annotations,
                types: {
                  'annotation': {
                    level: 1,
                    icon: {
                      width: 20,
                      height: 21,
                      icon: "histogram-marker"
                    }
                  }
                }
                //xaxis: int    // the x axis to attach events to
              };
            }

            if(scope.panel.interactive) {
              options.selection = { mode: "x", color: '#666' };
            }

            // when rendering stacked bars, we need to ensure each point that has data is zero-filled
            // so that the stacking happens in the proper order
            var required_times = [];
            if (data.length > 1) {
              required_times = Array.prototype.concat.apply([], _.map(data, function (query) {
                return query.time_series.getOrderedTimes();
              }));
              required_times = _.uniq(required_times.sort(function (a, b) {
                // decending numeric sort
                return a-b;
              }), true);
            }


            for (var i = 0; i < data.length; i++) {
              var _d = data[i].time_series.getFlotPairs(required_times);
              if(scope.panel.derivative) {
                _d = derivative(_d);
              }
              if(scope.panel.scale !== 1) {
                _d = scale(_d,scope.panel.scale);
              }
              if(scope.panel.scaleSeconds) {
                _d = scaleSeconds(_d,scope.panel.interval);
              }
              data[i].data = _d;
            }

            plot = $.plot(elem, data, options);

          } catch(e) {
            // Nothing to do here
          }
        }

        function time_format(interval) {
          var _int = kbn.interval_to_seconds(interval);
          if(_int >= 2628000) {
            return "%Y-%m";
          }
          if(_int >= 86400) {
            return "%Y-%m-%d";
          }
          if(_int >= 60) {
            return "%H:%M<br>%m-%d";
          }

          return "%H:%M:%S";
        }

        var $tooltip = $('<div>');
        elem.bind("plothover", function (event, pos, item) {
          var group, value, timestamp, interval;
          interval = " per " + (scope.panel.scaleSeconds ? '1s' : scope.panel.interval);
          if (item) {
            if (item.series.info.alias || scope.panel.tooltip.query_as_alias) {
              group = '<small style="font-size:0.9em;">' +
                '<i class="icon-circle" style="color:'+item.series.color+';"></i>' + ' ' +
                (item.series.info.alias || item.series.info.query)+
              '</small><br>';
            } else {
              group = kbn.query_color_dot(item.series.color, 15) + ' ';
            }
            value = (scope.panel.stack && scope.panel.tooltip.value_type === 'individual') ?
              item.datapoint[1] - item.datapoint[2] :
              item.datapoint[1];
            if(scope.panel.y_format === 'bytes') {
              value = kbn.byteFormat(value,2);
            }
            if(scope.panel.y_format === 'short') {
              value = kbn.shortFormat(value,2);
            } else {
              value = numeral(value).format('0,0[.]000');
            }
            timestamp = scope.panel.timezone === 'browser' ?
              moment(item.datapoint[0]).format('YYYY-MM-DD HH:mm:ss') :
              moment.utc(item.datapoint[0]).format('YYYY-MM-DD HH:mm:ss');
            $tooltip
              .html(
                group + value + interval + " @ " + timestamp
              )
              .place_tt(pos.pageX, pos.pageY);
          } else {
            $tooltip.detach();
          }
        });

        elem.bind("plotselected", function (event, ranges) {
          filterSrv.set({
            type  : 'time',
            from  : moment.utc(ranges.xaxis.from).toDate(),
            to    : moment.utc(ranges.xaxis.to).toDate(),
            field : scope.panel.time_field
          });
        });
      }
    };
  });

});
