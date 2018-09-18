define([
  'angular',
  'lodash',
  'config'
],
function (angular, _, config) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('fields', function(dashboard, $rootScope, $http, esVersion, alertSrv, ejsResource) {

    // Save a reference to this
    var self = this;

    var ejs = ejsResource(config);


    this.list = ['_type'];
    this.types = [];
    this.indices = [];

    // Stop tracking the full mapping, too expensive, instead we only remember the index names
    // we've already seen.
    //
    $rootScope.$watch(function(){return dashboard.indices;},function(n) {
      if(!_.isUndefined(n) && n.length && dashboard.current.index.warm_fields) {
        // Only get the mapping for indices we don't know it for
        var indices = _.difference(n,_.keys(self.indices));
        // Only get the mapping if there are new indices
        if(indices.length > 0) {
          self.map(indices).then(function(result) {
            self.indices = _.union(self.indices,_.keys(result));
            self.types = mapTypes(result);
            self.list = mapFields(result);
          });
        }
      }
    });

    var mapTypes = function (m) {
      var types = [];
      _.each(m, function(t) {
        types = _.union(types, _.keys(t));
      });
      return _.without(types, '_default_');
    };

    var mapFields = function (m) {
      var fields = [];
      _.each(m, function(types) {
        _.each(types, function(type) {
          fields = _.difference(_.union(fields,_.keys(type)),
            ['_parent','_routing','_size','_ttl','_all','_uid','_version','_boost','_source']);
        });
      });
      return fields;
    };

    this.map = function(indices) {
      var request = ejs.getMapping(indices);

      // Flatten the mapping of each index into dot notated keys.
      return request.then(function(p) {
        var mapping = {};
          _.each(p, function(indexMap,index) {
            mapping[index] = {};
            _.each(indexMap.mappings, function (typeMap,type) {
              mapping[index][type] = flatten(typeMap);
            });
          });
          return mapping;
      }, function(data, status) {
          if(status === 0) {
            alertSrv.set('Error',"Could not contact Elasticsearch at "+ejs.config.host+
              ". Please ensure that Elasticsearch is reachable from your system." ,'error');
          } else {
            alertSrv.set('Error',"No index found at "+ejs.config.host+"/" +
              indices.join(',')+"/_mapping. Please create at least one index."  +
              "If you're using a proxy ensure it is configured correctly.",'error');
          }
        });
    };

    // This should understand both the 1.0 format and the 0.90 format for mappings. Ugly.
    var flatten = function(obj,prefix) {
      var propName = (prefix) ? prefix :  '',
        dot = (prefix) ? '.':'',
        ret = {};
      for(var attr in obj){
        if(attr === 'dynamic_templates' || attr === '_default_') {
          continue;
        }
        // For now only support multi field on the top level
        // and if there is a default field set.
        if(obj[attr]['type'] === 'multi_field') {
          ret[attr] = obj[attr]['fields'][attr] || obj[attr];
          var keys = _.without(_.keys(obj[attr]['fields']),attr);
          for(var key in keys) {
            ret[attr+'.'+keys[key]] = obj[attr]['fields'][keys[key]];
          }
        } else if (attr === 'properties' || attr ==='fields') {
          _.extend(ret,flatten(obj[attr], propName));
        } else if(typeof obj[attr] === 'object' &&
          (!_.isUndefined(obj[attr].type) || !_.isUndefined(obj[attr].properties))){
          _.extend(ret,flatten(obj[attr], propName + dot + attr));
        } else {
          if(propName !== '') {
            ret[propName] = obj;
          }
        }
      }
      return ret;
    };

  });

});
