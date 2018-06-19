var app = angular.module('instantsearch',[]);

app.config(function ($httpProvider) {
  $httpProvider.defaults.headers.common = {};
  $httpProvider.defaults.headers.post = {};
  $httpProvider.defaults.headers.put = {};
  $httpProvider.defaults.headers.patch = {};
  $httpProvider.defaults.headers.get = {};
});
 
app.controller('instantSearchCtrl',function($scope,$http){
	$http.get('https://raw.githubusercontent.com/mdjhoel/gameof5/master/blog/data/blog.json').success(function(data, status, headers, config) {
		//$scope.items = data.reverse();
		$scope.items = data;

    console.log($scope.items);

	}).error(function(data, status, headers, config) {
		console.log("No data found..");
  });
});
 

function loadJSON(callback) {   
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'https://raw.githubusercontent.com/mdjhoel/gameof5/master/blog/data/blog.json', true);
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);  
}
