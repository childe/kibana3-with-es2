'use strict';

angular.module('clickhouse.service', [])
  .factory('chClient', [ '$http', function ($http) {

  return function (config) {

    var chclient = window.chclient || {};
    chclient.config = config

    chclient.query = function(stmt) {
      var url = chclient.config.host
      var params = {query:stmt}
      return $http.get(url, {params:params})
    }

    window.chclient = chclient
    return chclient
  };
}])
