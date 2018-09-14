define([
  'angular',
  'lodash',
  'config',
  'kbn'
], function (angular, _, config, kbn) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('clickhouseFilterSrv', function(dashboard, $rootScope, $timeout) {
    // Create an object to hold our service state on the dashboard
    dashboard.current.services.filter = dashboard.current.services.filter || {};

    // Defaults for it
    var _d = {
      list : {},
      ids : []
    };

    // Save a reference to this
    var self = this;

    // Call this whenever we need to reload the important stuff
    this.init = function() {
      // Populate defaults
      _.defaults(dashboard.current.services.filter,_d);

      _.each(dashboard.current.services.filter.list,function(f) {
        self.set(f,f.id,true);
      });

    };

    this.ids = function() {
      return dashboard.current.services.filter.ids;
    };

    this.list = function() {
      return dashboard.current.services.filter.list;
    };

    // This is used both for adding filters and modifying them.
    // If an id is passed, the filter at that id is updated
    this.set = function(filter,id,noRefresh) {
      var _r;

      _.defaults(filter,{
        mandate:'must',
        active: true
      });

      if(!_.isUndefined(id)) {
        if(!_.isUndefined(dashboard.current.services.filter.list[id])) {
          _.extend(dashboard.current.services.filter.list[id],filter);
          _r = id;
        } else {
          _r = false;
        }
      } else {
        if(_.isUndefined(filter.type)) {
          _r = false;
        } else {
          var _id = nextId();
          var _filter = {
            alias: '',
            id: _id,
            mandate: 'must'
          };
          _.defaults(filter,_filter);
          dashboard.current.services.filter.list[_id] = filter;
          dashboard.current.services.filter.ids.push(_id);
          _r = _id;
        }
      }
      if(!$rootScope.$$phase) {
        $rootScope.$apply();
      }
      if(noRefresh !== true) {
        $timeout(function(){
          dashboard.refresh();
        },0);
      }
      dashboard.current.services.filter.ids = dashboard.current.services.filter.ids =
        _.intersection(_.map(dashboard.current.services.filter.list,
          function(v,k){return parseInt(k,10);}),dashboard.current.services.filter.ids);
      $rootScope.$broadcast('filter');

      return _r;
    };

    this.remove = function(id,noRefresh) {
      var _r;
      if(!_.isUndefined(dashboard.current.services.filter.list[id])) {
        delete dashboard.current.services.filter.list[id];
        // This must happen on the full path also since _.without returns a copy
        dashboard.current.services.filter.ids = dashboard.current.services.filter.ids = _.without(dashboard.current.services.filter.ids,id);
        _r = true;
      } else {
        _r = false;
      }
      if(!$rootScope.$$phase) {
        $rootScope.$apply();
      }
      if(noRefresh !== true) {
        $timeout(function(){
          dashboard.refresh();
        },0);
      }
      $rootScope.$broadcast('filter');
      return _r;
    };

    this.removeByType = function(type,noRefresh) {
      var ids = self.idsByType(type);
      _.each(ids,function(id) {
        self.remove(id,true);
      });
      if(noRefresh !== true) {
        $timeout(function(){
          dashboard.refresh();
        },0);
      }
      return ids;
    };

    this.buildWhereClauseFromQueries = function(queries) {
      var clauses = [], clauses2 = []
      _.each(queries,function(q) {
          clauses.push(q.query)
      });

      _.each(clauses, function(c){
        clauses2.push('('+c+')')
      })
      return clauses2.join(' OR ')
    }
    this.buildWhereClause = function(ids) {
      var clauses = [], clauses2 = []
      _.each(ids,function(id) {
        if(dashboard.current.services.filter.list[id].active) {
          switch(dashboard.current.services.filter.list[id].mandate)
          {
          case 'mustNot':
            clauses.push('NOT (' + self.getWhereClause(id) + ')')
            break;
          case 'either':
            break;
          default:
            clauses.push(self.getWhereClause(id))
          }
        }
      });

      _.each(clauses, function(c){
        clauses2.push('('+c+')')
      })
      return clauses2.join(' AND ')
    }

    this.getWhereClause = function(id) {
      return self.toWhereClause(dashboard.current.services.filter.list[id]);
    };

    this.toWhereClause = function (filter) {
      if(!filter.active) {
        return '';
      }
      switch(filter.type)
      {
      case 'time':
        var from = kbn.parseDate(filter.from).valueOf() / 1000
        var to = kbn.parseDate(filter.to).valueOf() / 1000
        return '"' + filter.field + '" >= toDateTime(' + from + ') AND "' + filter.field + '" <= toDateTime(' + to +')'
      case 'range':
        return '"' + filter.field + '" >= ' + filter.from + ' AND "' + filter.field + '" <= '+filter.to
      case 'querystring':
        return tihs.convertQuery(filter.query)
      case 'field':
        return '"' + filter.field + '" = ' + "'" + filter.query + "'"
      case 'terms':
        return '"' + filter.field + '" = ' + "'" + filter.value + "'"
      default:
        return '';
      }
    };

    this.convertQuery = function(query) {
      return query
    }

    this.getByType = function(type,inactive) {
      return _.pick(dashboard.current.services.filter.list,self.idsByType(type,inactive));
    };

    this.idsByType = function(type,inactive) {
      var _require = inactive ? {type:type} : {type:type,active:true};
      return _.pluck(_.where(dashboard.current.services.filter.list,_require),'id');
    };

    // TOFIX: Error handling when there is more than one field
    this.timeField = function() {
      return _.pluck(self.getByType('time'),'field');
    };

    // Parse is used when you need to know about the raw filter
    this.timeRange = function(parse) {
      var _t = _.last(_.where(dashboard.current.services.filter.list,{type:'time',active:true}));
      if(_.isUndefined(_t)) {
        return false;
      }
      if(parse === false) {
        return {
          from: _t.from,
          to: _t.to
        };
      } else {
        var
          _from = _t.from,
          _to = _t.to || new Date();

        return {
          from : kbn.parseDate(_from),
          to : kbn.parseDate(_to)
        };
      }
    };

    var nextId = function() {
      var idCount = dashboard.current.services.filter.ids.length;
      if(idCount > 0) {
        // Make a sorted copy of the ids array
        var ids = _.sortBy(_.clone(dashboard.current.services.filter.ids),function(num){
          return num;
        });
        return kbn.smallestMissing(ids);
      } else {
        // No ids currently in list
        return 0;
      }
    };

    // Now init
    self.init();
  })

});
