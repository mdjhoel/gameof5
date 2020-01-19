var app = angular.module('adminpages', ['ngRoute','ngSanitize','chart.js']);
  
  // HOEL added chart.js July 11, 2019
  // Parse API - /#!/?teacher=98765897v&cname=ics4u

  app.service('service', function($http){
    this.getData = function(url) {
      return $http({
        method: 'GET',
        url: url,
        // cache will ensure calling ajax only once
        cache: true
      }).then(function (data) {
        // this will ensure that we get clear data in our service response
        return data.data;
      });
    };
  });

  app.filter('searchFor', function(){
      return function(arr, searchString){
          if(!searchString){
              return arr;
          }
          var result = [];
          angular.forEach(arr, function(item){
              if (item.keywords != undefined){
                  keywords = item.keywords.toString().toLocaleLowerCase();
                  if(keywords.indexOf(searchString) !== -1){
                      result.push(item);
                  }
              }
          });
          return result;
      };
  });

  app.run(function($rootScope,$location,service) {
	  
    // get url so URL can be put back when users click on modals
    $rootScope.url = $location.url();

    // 1. check to see if user logged in
    firebase.auth().onAuthStateChanged(function(user) {

      // 2. Detect authenication 
      if (user == null) {
          
          var provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithRedirect(provider).then(function(result) {  
          });
          
      } else {
                              
          // 3. Determine who is accessing and set interface
          var userId = user.uid;

          // 4. Connect to Firebase

          var dbstring = "teachers/";  
          $rootScope.database = firebase.database();
                         
          $rootScope.refTeachers = $rootScope.database.ref('/teachers');
          
          // GET STUDENT INFO
          $rootScope.refTeachers.once("value").then(function(snapuser) {
              if (snapuser.val() != undefined) {        
                console.log("Teachers data retreived.");
                $rootScope.$apply(function () { 
                    $rootScope.teachers = snapuser.val();
                });

              } else {
                console.log("No lessons data retrieved from Firebase. $rootScope.readonly is undefined");               
              			}
              }); // query Firebase for lessons
        } // user exists
    }); // if authorization changes
      
  // ---------------------------------------------//
  // FUNCTIONS
  // ---------------------------------------------//
    
  $rootScope.setTeacher = function(teacher) {
    $rootScope.curr_teacher = $rootScope.teachers[teacher].admin.name;
    $rootScope.courses = $rootScope.teachers[teacher].admin.courses;
  }

  $rootScope.test = function(myresponse,id) {
      var js_time = Date.now();
      var ref = $rootScope.refCommentsStr + "/" + $rootScope.user.uid + "/response/" + id;
      if (myresponse == "") {
        $rootScope.comments[id] = undefined;
        $rootScope.database.ref(ref).set({}); 
      } else {
        $rootScope.database.ref(ref).set({comment: myresponse, time: js_time}); 
      }
  }
  
  function helpToast(msg,time,color) {
    Materialize.toast(msg, time, color);
  }
      
  
  $rootScope.test2 = function(id) {
      
     var ref = $rootScope.reflCommentsStr + "/" + id + "/" + $rootScope.user.uid + "/";
      
      var js_time = Date.now();
      if ($rootScope.lcomments != undefined) {
          if ($rootScope.lcomments[id][$rootScope.user.uid].hlink != undefined) {
            $rootScope.database.ref(ref).set({comment: $rootScope.lcomments[id][$rootScope.user.uid].comment, time: js_time, clarity: $rootScope.lcomments[id][$rootScope.user.uid].clarity, hlink: $rootScope.lcomments[id][$rootScope.user.uid].hlink});
          } else {
            $rootScope.database.ref(ref).set({comment: $rootScope.lcomments[id][$rootScope.user.uid].comment, time: js_time, clarity: $rootScope.lcomments[id][$rootScope.user.uid].clarity});              
          }
      } else {
          var myresponse = document.getElementById('respond' + id).value;
          var myclarity = document.getElementById('rate' + id).value;
          var myhlink = document.getElementById('hlink').value;
          if (myhlink != undefined) {
              $rootScope.database.ref(ref).set({comment: myresponse, time: js_time, clarity: myclarity, hlink: myhlink});  
          } else {
              $rootScope.database.ref(ref).set({comment: myresponse, time: js_time, clarity: myclarity});
          }

      }
      helpToast("Data submitted to the cloud",2000,"pink")
  }
   
  $rootScope.signin = function() {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithRedirect(provider).then(function(result) {  
      });
  }
    
  $rootScope.setUrl = function() {
    $location.url($rootScope.url);
  }

  $rootScope.helpToast = function(msg,time,color) {
    Materialize.toast(msg, time, color);
  }


	   

  // upload data from modal
  $rootScope.uploadData = function(uploadtype) {
	$location.url($rootScope.url);
	if (uploadtype == 'badge') {
		var myupload = document.getElementById("myupload");
		var jsondata = myupload.value;
		if (jsondata != "") {
			$rootScope.readonly.badges = JSON.parse(jsondata);
		}
	} else {
		var myuplevel = document.getElementById("myuplevel");
		var jsondata = myuplevel.value;
		if (jsondata != "") {
	  	  $rootScope.readonly.levels = JSON.parse(jsondata);
		}
	}
  }
 
  // show selected data in table
  $rootScope.viewtable = function() {
      
      // set variables for processing
      var data = $rootScope.users;
      const nums = Object.keys($rootScope.selIds);
      $rootScope.selIds = {}; // reset
      const mykeys = Object.keys(data)
      
      // start table
      mytab = "<table class='highlight'>";
      
      for (const key of mykeys) { // loop through all students
        var total = 0; // total number of points
        mytab = mytab + "<tr>"
        mytab = mytab + "<td>" + data[key].name + "</td>";
        for (const num of nums) { // loop through selected ids
            mygrade = (parseInt(data[key].daily[num].grade) + parseInt(data[key].daily[num].value));
            total = total + mygrade;                
            mycolor = "#dee2e8";
            if (parseInt(data[key].daily[num].grade) > 3) {
                mycolor = "green";
            } else {
                mycolor = "red";
            }

            if (data[key].daily[num].desc == "Normal day, nothing to report") {
                //console.log(data[key].daily[i].desc);
                //mytab = mytab + "<td style='color:#dee2e8;'>Normal</td>"
                mytab = mytab + "<td><img id='badgie' src='images/badges/0.svg' width='35px' title='Normal day, nothing to report' style='color:#dee2e8;'></td>";
            } else {
                //mytab = mytab + "<td style='color:" + mycolor + "'>" + data[key].daily[num].desc + "</td>"
                mytab = mytab + "<td><img id='badgie' src='images/badges/" + data[key].daily[num].badge + ".svg' width='35px' title='" + data[key].daily[num].desc + "' style='color:" + mycolor + "'></td>"
            }
                }
            mytab = mytab + "<td><b>" + total + "</b></td>";
            mytab = mytab + "</tr>"                
        }
        mytab = mytab + "</table>" // complete the table
              
      mydiv = document.getElementById("tablediv");
      mydiv.innerHTML = mytab;
      
  }
	  
  $rootScope.navUser3 = function(index) {
    var username = Object.keys($rootScope.listArray)[index];
    $rootScope.user = $rootScope.listArray[username];
    $rootScope.view = $rootScope.share + "&user=" + $rootScope.user.uid;
  }
  
  $rootScope.navUser2 = function(index) {
    var username = Object.keys($rootScope.listArray)[index];
    $rootScope.user = $rootScope.listArray[username];
    $rootScope.filePath = "includes/student_view.html";
    $rootScope.navPath = "includes/nav_ad_stud.html";
  }

  $rootScope.navUser = function(index) {
    var username = Object.keys($rootScope.data.users)[index];
    $rootScope.user = $rootScope.data.users[username];
    $rootScope.filePath = "includes/student_view.html";
  }

  $rootScope.setData = function(index) {
      //id2index = index;
    var id2index = 0;
    for (i=0;i<$rootScope.readonly.lessons.length;i++) {
        if ($rootScope.readonly.lessons[i].id == index) {
            id2index = i;
        }
    }
    if (!$rootScope.readonly.lessons[id2index].show) {return; }
    $rootScope.lesson = $rootScope.readonly.lessons[id2index];
    $rootScope.filePath = "includes/lessons_one.html";
  }
  
  $rootScope.setDataById = function(index) {
    //if (!$rootScope.readonly.lessons[index].show) {return; }
    for (i=0;i<$rootScope.readonly.lessons.length; i++) {
        if ($rootScope.readonly.lessons[i].id == index) {
            $rootScope.lesson = $rootScope.readonly.lessons[i];
            break;
        }
    }
    $rootScope.filePath = "includes/lessons_one.html";
  }
  
  $rootScope.checkCname = function(cname,index) {
  	var first = cname.split(" ")[0];
  	var cname = removeBadChars(first);
  	$rootScope.admin.courses[index].name = cname;
  }
  
  
  $rootScope.sortUser = function(data,col) {
    var someArray = $rootScope.listArray;
    someArray.sort(generateSortFn(col, true));
    $rootScope.listArray = someArray;
  }

  function generateSortFn(prop, reverse) {
    return function (a, b) {
        if (a[prop] < b[prop]) return reverse ? 1 : -1;
        if (a[prop] > b[prop]) return reverse ? -1 : 1;
        return 0;
    };
  }
	  
  $rootScope.checkWindow = function() {
     if (window.innerWidth > 1000) {
         return true;
     }
     return false;
  }
  
  // finishLoading - work around for label input overlap bug
  $rootScope.finishLoading = function() {
        // need to wait 2 milliseconds for this to work
        setTimeout(function(){ Materialize.updateTextFields(); }, 2); 
  }
  
});  // end app.run

