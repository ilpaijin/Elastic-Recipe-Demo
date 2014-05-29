window.MyOpenRecipes = angular.module('myOpenRecipes', ['elasticsearch'], ['$locationProvider',
    function($locationProvider) {
        $locationProvider.html5Mode(true);
    }
]);

MyOpenRecipes.controller('recipeCtrl', ['recipeService', '$scope', '$location',
    function(recipes, $scope, $location) {

        var initChoices = [
            "polenta",
            "rice",
            "hummus"
        ];

        var idx = Math.floor(Math.random() * initChoices.length);

        $scope.recipes = [];
        $scope.page = 0;
        $scope.allResults = false;

        $scope.searchTerm = $location.search().q || initChoices[idx];

        recipes.getAll().then(function(resp) {
            $scope.totalRecipes = resp.count;
        });

        $scope.search = function() {
            $scope.page = 0;
            $scope.recipes = [];
            $scope.allResults = false;
            $location.search({
                'q': $scope.searchTerm
            });
            $scope.loadMore();
        };

        $scope.loadMore = function() {

            recipes.search($scope.searchTerm, $scope.page++).then(function(results) {

                $scope.processTime = results.meta.esProcessTime;
                $scope.total = results.meta.total;
                $scope.count = results.hits.length;

                results = results.hits;

                if (results.length !== 10) {
                    $scope.allResults = true;
                }

                var ii = 0;

                for (; ii < results.length; ii++) {
                    results[ii].ingredients = results[ii].ingredients.replace(/(\r\n|\n|\r)/gm, "");
                    $scope.recipes.push(results[ii]);
                }
            });
        };

        $scope.loadMore();
    }
]);


MyOpenRecipes.factory('recipeService', ['$q', 'esFactory', '$location',
    function($q, elasticSearch, $location) {

        var client = elasticSearch({
            host: $location.host() + ':9200'
        });

        var getAll = function() {
            return client.count({
                index: 'recipes'
            });
        };

        var search = function(term, offset) {

            var deferred = $q.defer(),
                query = {
                    match: {
                        _all: term
                    }
                };

            client.search({
                index: 'recipes',
                type: 'recipe',
                body: {
                    size: 10,
                    from: (offset || 0) * 10,
                    query: query
                }
            }).then(function(result) {
                var ii = 0,
                    hits_in,
                    res = {
                        hits: [],
                        meta: {}
                    }

                hits_in = (result.hits || {}).hits || [];

                for (; ii < hits_in.length; ii++) {
                    res.hits.push(hits_in[ii]._source);
                }

                res.meta.total = result.hits.total;
                res.meta.esProcessTime = result.took;

                deferred.resolve(res);

            }, deferred.reject);

            return deferred.promise;
        };

        return {
            search: search,
            getAll: getAll
        };
    }
]);