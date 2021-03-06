/*! elastic.js - v1.1.1 - 2013-05-24
 * https://github.com/fullscale/elastic.js
 * Copyright (c) 2013 FullScale Labs, LLC; Licensed MIT */

/*jshint browser:true */
/*global angular:true */
'use strict';

/*
Angular.js service wrapping the elastic.js API. This module can simply
be injected into your angular controllers.
*/
angular.module('elasticjs.service', ['elasticsearch'])
  .factory('ejsResource', ['esFactory', function (esFactory) {

  return function (config) {

    var

    // use existing ejs object if it exists
    ejs = window.ejs || {}, esClient = window.esClient || undefined;

    if(!ejs.config) {
        ejs.config = {
            host: config.elasticsearch,
            apiVersion: config.api_version,
            sniffOnStart: config.sniff,
            requestTimeout: config.request_timeout
        };
    }

    if(!esClient) {
        window.esClient = esFactory(ejs.config);
        esClient = window.esClient;
    }

    ejs.getEsVersion = function() {
        if(config.api_version == '0.9') {
            return esClient.cluster.nodeInfo({all:true});
        } else {
            return esClient.nodes.info();
        }
    };

    ejs.doSearch = function(indices, searchBody, size, routing) {
      if (size === undefined) {
        size = 0
      }
      if (routing === '') {
        routing = undefined
      }
      return esClient.search({
        index: indices,
        body: searchBody,
        size: size,
        routing: routing,
        ignoreUnavailable: true
        });
    };

    ejs.doCount = function(indices, searchBody) {
        return esClient.search({
          index: indices,
          body: searchBody,
          size: 0
        });
    };

    ejs.doIndex = function(index, type, id, indexBody, ttl) {
        if(ttl) {
            return esClient.index({
                index: index,
                type: type,
                id: id,
                body: indexBody,
                ttl: ttl
            });
        }
        return esClient.index({
            index: index,
            type: type,
            id: id,
            body: indexBody
        });
    };

    ejs.doDelete = function(index, type, id) {
        return esClient.delete({
            index: index,
            type: type,
            id: id
        });
    };

    ejs.getAlias = function(indices) {
        return esClient.indices.getAlias({
          index: indices,
          ignoreUnavailable: true
        });
    };

    ejs.getAliases = function(indices) {
        return esClient.indices.getAliases({
          index: indices,
          ignoreUnavailable: true
        });
    };

    ejs.getMapping = function(indices) {
        return esClient.indices.getMapping({
          index: indices,
          ignoreUnavailable: true
        });
    };

    ejs.getFieldMapping = function(indices, field) {
        return esClient.indices.getFieldMapping({
          index: indices,
          field: field,
          ignoreUnavailable: true
        });
    };

    ejs.getSource = function(index, type, id) {
        var result = esClient.getSource({
            index: index,
            type: type,
            id: id
        });
        return result;
    };

    return ejs;
  };
}]);
