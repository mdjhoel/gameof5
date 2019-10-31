var app = angular.module('studentpages', ['ngRoute','ngSanitize','chart.js']);
  
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
          
          // Apply function is required to sync Angular after leaving Angular environment
          //$rootScope.$apply(function () {
            
          //});
          
      } else {
                    
          // check to see if API is correct
          var args = $location.search();
          if (!args["teacher"] || !args["cname"]) {
              console.log("API incorrect. Missing teacher, and/or course name information.");
              window.location.replace("404.html");
              return;
          }
          
          var dbstring = "teachers/" + args["teacher"] + "/courses/" + args["cname"];  
          
          // 3. Determine who is accessing and set interface
          var userId = user.uid;
          if (args["user"]) {
             userId = args["user"];
          }

          // 4. Connect to Firebase
          $rootScope.database = firebase.database();
                         
          $rootScope.refUser = $rootScope.database.ref(dbstring + "/users/" + userId);
          $rootScope.refUsers = $rootScope.database.ref(dbstring + "/users");
          $rootScope.refLessons = $rootScope.database.ref(dbstring + "/readonly");
          
          // GET STUDENT INFO
          $rootScope.refUser.once("value").then(function(snapuser) {
              if (snapuser.val() != undefined) {
                          
                $rootScope.user = snapuser.val();
                  
                $rootScope.refUsers.once("value").then(function(snapusers) {
                    $rootScope.users = snapusers.val(); // added for leaderboard
                });
                  
                $rootScope.refLessons.once("value").then(function(snaplessons) {
              		if (snaplessons.val() != undefined) {
                		$rootScope.readonly = snaplessons.val();
                		console.log("Data from Firebase, now stored in $rootScope.readonly.");
                            	$rootScope.$apply(function () {
                                	$rootScope.readonly = snaplessons.val();
                                	
					// account for new setting for leaderboard
					$rootScope.listArray = Object.values($rootScope.users);
					$rootScope.listArray.sort(generateSortFn('pointstotal', true));
					if ($rootScope.readonly.settings == undefined) {
					    $rootScope.readonly.settings = {leadnumber:5};
					} else {
					    if ($rootScope.readonly.settings.leadnumber == undefined) {
						$rootScope.readonly.settings.leadnumber = 5;  
					    } 
					}
					$rootScope.listArray = $rootScope.listArray.slice(0,$rootScope.readonly.settings.leadnumber);
					// end leaderboard
					
					if ($rootScope.readonly.daily != undefined) {
                                   		$rootScope.readonly.daily.reverse(); 
                                	}
                            	});
              			} else {
                			console.log("No lessons data retrieved from Firebase. $rootScope.readonly is undefined");                
              			}
                }); // query Firebase for lessons 
                
                // Sync angular after going to database  
                $rootScope.$apply(function () {  // prep for user view   
                  
                  if ($rootScope.user.confirmed == false) {  
                      window.location.replace("wait.html");
                      return;
                  } else {
  
                    // HOEL - updates for s.html - July 11, 2019
                    // https://jtblin.github.io/angular-chart.js/

                    // DAILY ---------------------------------------------------
                    if ($rootScope.user.daily != undefined) {
                        $rootScope.user.daily = $rootScope.user.daily.reverse();
                        
                        // XP
                        labels = [];
                        grades = [];
                        colors = [];
                        for (key in $rootScope.user.daily) {
			    if ($rootScope.user.daily[key].grade != -99 || $rootScope.user.daily[key].grade != undefined) {
                               labels.push("xp: " + $rootScope.user.daily[key].grade);
                               grades.push($rootScope.user.daily[key].grade);
                               colors.push('#ffffff'); 
			    }
                        }

                        $rootScope.dailypercent = Math.round(($rootScope.user.dailytotal / ($rootScope.user.daily.length * 4)) * 100);
                        $rootScope.dailylabels = labels; 
                        $rootScope.dailydata = grades; 
                        $rootScope.dailyseries = ['Series A'];
                        $rootScope.dailyColorBar = colors; 

                        $rootScope.dailyoptions = {
                            responsive: true,
                            legend: {
                                display: false
                            },
                            scales:{
                                xAxes: [{
                                    display: false //this will remove all the x-axis grid lines
                                }],
                                yAxes: [{
                                    ticks: {
                                        min: 0,
                                        max: 4
                                    },
                                    display: false //this will remove all the y-axis grid lines
                                }]
                            },
                            tooltips: {
                                enabled: true,
                                displayColors: false,
                                mode: 'single',
                                callbacks: {
                                  label: function(tooltipItem, data) {
                                    //var label = $rootScope.user.daily[tooltipItem.index].grade;
                                    var label = $rootScope.user.daily[tooltipItem.index].desc
                                    //return 'xp: ' + label;
                                    return label;
                                  }
                                }
                            }
                        }; 
                                                
                    } else {
                        $rootScope.dailypercent = 0;
                        $rootScope.dailydata = [0];
                        $rootScope.dailyoptions = {
                            responsive: true,
                            scales:{
                                xAxes: [{
                                    display: false //this will remove all the x-axis grid lines
                                }],
                                yAxes: [{
                                    display: false //this will remove all the y-axis grid lines
                                }]
                            }
                        };
                        
                    
                    } // end check for daily
                      
                    // ---------------------------------------------------------------
                      
                    if ($rootScope.user.quizzes != undefined) {
                        $rootScope.user.quizzes = $rootScope.user.quizzes.reverse();
                        
                        // Quizzes
                        labels = [];
                        grades = [];
                        colors = [];
                        for (key in $rootScope.user.quizzes) {
                            labels.push($rootScope.user.quizzes[key].name);
                            if ($rootScope.user.quizzes[key].xp == 0 && $rootScope.user.quizzes[key].grade != -99) { 
                                grades.push(1);
                                colors.push('#000');
                            } else if ($rootScope.user.quizzes[key].grade == -99) {
                                grades.push(1);
                                colors.push('#e91e63');
                            } else {
                                grades.push($rootScope.user.quizzes[key].xp);
                                colors.push('#ffffff');
                            }
                            
                        }

                        $rootScope.quizpercent = Math.round(($rootScope.user.quiztotal / ($rootScope.user.quizzes.length * 4)) * 100);
                        $rootScope.quizlabels = labels; 
                        $rootScope.quizdata = grades; 
                        $rootScope.quizseries = ['Series A'];
                        $rootScope.quizColorBar = colors; 

                        $rootScope.quizoptions = {
                            responsive: true,
                            legend: {
                                display: false
                            },
                            scales:{
                                xAxes: [{
                                    display: false //this will remove all the x-axis grid lines
                                }],
                                yAxes: [{
                                    ticks: {
                                        min: 0,
                                        max: 4
                                    },
                                    display: false //this will remove all the y-axis grid lines
                                }]
                            },
                            tooltips: {
                                enabled: true,
                                displayColors: false,
                                mode: 'single',
                                callbacks: {
                                  label: function(tooltipItem, data) {
                                    if ($rootScope.user.quizzes[tooltipItem.index].grade == -99) {
                                        label = 'Did not take test';
                                    } else {
                                        var label = $rootScope.user.quizzes[tooltipItem.index].grade + '%';
                                    }
                                    return label;
                                  }
                                }
                            }
                        };
                      
                    } else {
                        $rootScope.quizdata = [0];
                        $rootScope.quizpercent = 0;
                        $rootScope.quizoptions = {
                            responsive: true,
                            scales:{
                                xAxes: [{
                                    display: false //this will remove all the x-axis grid lines
                                }],
                                yAxes: [{
                                    display: false //this will remove all the y-axis grid lines
                                }]
                            }
                        };
                    }// end check for quizzes
                      
                    // Horizontal ----------------------------------------
                    if ($rootScope.user.quizzes != undefined && $rootScope.user.daily != undefined && 
                    $rootScope.user.level != undefined) {
                        
                        var totals = (($rootScope.user.daily.length) * 4) + (($rootScope.user.quizzes.length) * 4);

                        total_pts_now = Math.round(($rootScope.user.pointstotal * 100) / totals);
                        avgpct = Math.round(($rootScope.user.avgpoints * 100) / totals);

                        $rootScope.pointlabels = ['me','class']; 
                        $rootScope.pointdata = [$rootScope.user.pointstotal,$rootScope.user.avgpoints]; 
                        $rootScope.pointseries = ['Series A'];
                        $rootScope.pointColorBar = ['#ffffff','#2196f3']; 
                        $rootScope.levelname = $rootScope.user.level.name;

                        $rootScope.pointoptions = {
                            barThickness: 'flex',
                            responsive: true,
                            legend: {
                                display: false
                            },
                            tooltips: {
                                enabled: true,
                                displayColors: false,
                                callbacks: {
                                  label: function(tooltipItem, data) {
                                    return $rootScope.pointdata[tooltipItem.index];
                                  }
                                }
                            },
                            scales:{
                                xAxes: [{
                                    display: false, //this will remove all the x-axis grid lines
                                    ticks: {
                                        min: 0,
                                        max: 100
                                    }
                                }],
                                yAxes: [{
                                    display: false //this will remove all the y-axis grid lines
                                }]
                            }
                        }; 
                        
                    } else {
                       //$rootScope.user.level.name = "My level"
                       $rootScope.levelname = "My level";
                       $rootScope.pointdata = [0];
                       $rootScope.pointoptions = {
                            responsive: true,
                            scales:{
                                xAxes: [{
                                    display: false, //this will remove all the x-axis grid lines

                                }],
                                yAxes: [{
                                    display: false //this will remove all the y-axis grid lines
                                }]
                            }
                       };
                    }// end for horizontal level bars
                                     
                  } // if user is found
                    
                }); // sync angular

              // if there is no user ...
              } else {
                  
                // see if API data can be used to find data
                var testref = $rootScope.database.ref("teachers/" + args["teacher"] + "/courses/" + args["cname"]);
                testref.once("value").then(function(snapteachers) {
                	if (snapteachers.val() == null) { // nope, something is wrong
                		console.log("API incorrect. Teacher, and/or course name invalid.");
                        window.location.replace("404.html");
                        return;
                    } else { // yep, you have a match with this API teacher and cname
                   		console.log("No user data matching API retrieved from Firebase. Creating new user");
                		var newuser = {confirmed:false,email:user.email,name: user.displayName,photoUrl:user.photoURL,uid:user.uid};
                		$rootScope.user = newuser;
                        
                        $rootScope.refUser.update(newuser).then(function(){
                  			console.log("New user data saved successfully.");
                            window.location.replace("wait.html");
                            return;                              
                		}).catch(function(error) {
                  			console.log("New user data could not be saved." + error);
                  			window.location.replace("404.html");
                            return;
                		}); // end update
                    } // end check API
                }); // end testref
              } // else student not found
            }); // query Firebase

          } // student
    }); // if authorization changes

  // ---------------------------------------------//
  // FUNCTIONS
  // ---------------------------------------------//
      
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

  // Pick which ng-include to show
  $rootScope.nav = function(path) {
    $rootScope.filePath = path;
  }
  
  // Pick which ng-include to show
  $rootScope.nav2 = function(path,navpath) {
    $rootScope.filePath = path;
    $rootScope.navPath = navpath;
  }

  // Create listArray so sorts will work
  $rootScope.navList = function(path) {
    // do not need undefined check any more  
    //if ($rootScope.listArray == undefined) {
       $rootScope.listArray = Object.values($rootScope.users);
    //}
    $rootScope.filePath = path;
    $rootScope.navPath = "includes/nav_admin.html";
  } 
	    
  // Create listArray so sorts will work
  $rootScope.navListStudent = function(path) {   
    if ($rootScope.users == undefined) {
        console.log($rootScope.users + " undefined")
        return;
    } else {
       $rootScope.listArray = Object.values($rootScope.users); 
       $rootScope.listArray.sort(generateSortFn('pointstotal', true));
       $rootScope.listArray = $rootScope.listArray.slice(0,5); // slice top 5
       $rootScope.filePath = path;
       $rootScope.navPath = "includes/nav_student.html";
    }
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
    if (!$rootScope.readonly.lessons[index].show) {return; }
    $rootScope.lesson = $rootScope.readonly.lessons[index];
    $rootScope.filePath = "includes/lessons_one.html";
  }
  
  $rootScope.setDataById = function(index) {
    console.log(index);
    //if (!$rootScope.readonly.lessons[index].show) {return; }
    for (i=0;i<$rootScope.readonly.lessons.length; i++) {
        console.log($rootScope.readonly.lessons[i].id);
        if ($rootScope.readonly.lessons[i].id == index) {
            $rootScope.lesson = $rootScope.readonly.lessons[i];
            console.log($rootScope.lesson);
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
  
  
	  
});  // end app.run
