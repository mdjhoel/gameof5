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
            //firebase.auth().signInWithRedirect(provider).then(function(result) {  });
	    firebase.auth().signInWithPopup(provider).then(function(result) { });
          
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
          $rootScope.refCommentsStr = dbstring + "/comments";
          $rootScope.reflCommentsStr = dbstring + "/lcomments";
          $rootScope.refComments = $rootScope.database.ref(dbstring + "/comments/" + userId + "/response/");
          $rootScope.reflComments = $rootScope.database.ref(dbstring + "/lcomments/");
          $rootScope.refAllComments = $rootScope.database.ref(dbstring + "/lcomments/");
          $rootScope.allComments = [];
          $rootScope.avgComments = {};
          
          // GET STUDENT INFO
          $rootScope.refUser.once("value").then(function(snapuser) {
              if (snapuser.val() != undefined) {
                          
                $rootScope.user = snapuser.val();
                  
                $rootScope.refUsers.once("value").then(function(snapusers) {
                    $rootScope.users = snapusers.val(); // added for leaderboard
                    // removed listarray
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
                                if ($rootScope.readonly.settings.leadnumber == undefined) {
                                    $rootScope.readonly.settings.leadnumber = 5;
                                } 
				    
				if ($rootScope.readonly.settings.quizname == undefined || $rootScope.readonly.settings.quizname == "") {
                                    $rootScope.readonly.settings.quizname = "Quiz XP";
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
                  
                $rootScope.refComments.once("value").then(function(snapcomments) {
                    if (snapcomments.val() != undefined) {
                        var comments = snapcomments.val();
                        $rootScope.$apply(function () {
                            $rootScope.comments = comments;
                            console.log("Current user comments accessed from Firebase.");
                        });
                    } else {
                       $rootScope.$apply(function () { 
                           $rootScope.comments = {};
                       });
                       console.log("No comments for this user");
                    }
                });
                  
                $rootScope.reflComments.once("value").then(function(snapcomments) {
                    if (snapcomments.val() != undefined) {
                        var lcomments = snapcomments.val();
                        $rootScope.$apply(function () {
                            $rootScope.lcomments = lcomments;
                            console.log("Current user lesson comments accessed from Firebase.");
                        });
                    } else {
                       $rootScope.$apply(function () { 
                           $rootScope.lcomments = {};
                       });
                       console.log("No comments for this user");
                    }
                });
                  
                // listener for new lesson comments
                $rootScope.listener = $rootScope.refAllComments.on('value', function(updatesnap) {
                    //setTimeout(function(){ 
                    //$rootScope.$apply(function () { 
                            $rootScope.allComments = updatesnap.val();
                            $rootScope.avgComments = {};
                            if ($rootScope.allComments != null) {
                                //console.log($rootScope.allComments);
                                
                                for (lesson in $rootScope.allComments) {
                                    
                                    for (user in $rootScope.allComments[lesson]) {
                                        
                                        clarity = parseInt($rootScope.allComments[lesson][user]['clarity']);
                                        
                                        //console.log(clarity);
                                        
                                        if ($rootScope.avgComments[lesson] == undefined) {
                                            $rootScope.avgComments[lesson] = {total: parseInt(clarity), number: 1}
                                            //console.log($rootScope.avgComments);
                                        } else {
                                            oldtotal = parseInt($rootScope.avgComments[lesson]['total']);
                                            //console.log(oldtotal);
                                            newtotal = clarity;
                                            //console.log(newtotal);
                                            
                                            oldnum = parseInt($rootScope.avgComments[lesson]['number']);
                                            
                                            $rootScope.avgComments[lesson] = {total: oldtotal + newtotal, number: oldnum + 1};
                                            
                                        }
                                    }
                                    
                                    avg = $rootScope.avgComments[lesson]['total'] / $rootScope.avgComments[lesson]['number'];
                                    
                                    if (avg <= 2) {
                                        c = "#e91e63"; // red
                                        t = "Redo lesson please!";
                                    } else if (avg > 2 && avg < 4) {
                                        c = "#ff9800"; // blue
                                        t = "Thorough review please.";
                                    } else {
                                        c = "#8bc34a"; // green
                                        t = "Quick review. Let's go!";
                                    }
                                    
                                    $rootScope.avgComments[lesson]['average'] = avg;
                                    $rootScope.avgComments[lesson]['color'] = c;
                                    $rootScope.avgComments[lesson]['tip'] = t;

                                }
                            }
                    // apply changes now!
                    //$rootScope.$apply(function () { 
                    setTimeout(function(){
                         $rootScope.avgComments = $rootScope.avgComments;  
			 $rootScope.lcomments = $rootScope.lcomments;
                    }, 0); 

                }); 

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
                                                        
                            // this is to catch for old way of entering quizzes HOEL
                            if ($rootScope.user.quizzes[key].grade == -99 && $rootScope.user.quizzes[key].xp == 0) {
                                $rootScope.user.quizzes[key].xp = -99;                          
                            }
                                
                            if ($rootScope.user.quizzes[key].xp == 0 ) {
                                grades.push(1);
                                colors.push('#000');
                            } else if ($rootScope.user.quizzes[key].xp == -99 || $rootScope.user.quizzes[key].xp == undefined) {
                                $rootScope.user.quizzes[key].xp = -99;
                                $rootScope.user.quizzes[key].desc = "";
                                grades.push(1);
                                colors.push('#e91e63');
                            } else {
                                grades.push($rootScope.user.quizzes[key].xp);
                                colors.push('#ffffff');
                            }
                            
                            labels.push("xp: " + $rootScope.user.quizzes[key].xp);
                            
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
                                callbacks: { // HOEL
                                  label: function(tooltipItem, data) {
                                    if ($rootScope.user.quizzes[tooltipItem.index].xp == -99) {
                                        var label = "name: " +$rootScope.user.quizzes[tooltipItem.index].name + " - Excused";  
                                    } else {
                                        // code to account for new way of entering quizzes
                                        if ($rootScope.user.quizzes[tooltipItem.index].desc == undefined) {
                                            $rootScope.user.quizzes[tooltipItem.index].desc = "";
                                        }
                                        
                                        if ($rootScope.user.quizzes[tooltipItem.index].desc != "") {
                                            var label = "name: " +$rootScope.user.quizzes[tooltipItem.index].name + " - " +  $rootScope.user.quizzes[tooltipItem.index].desc;
                                        } else {
                                            var label = "name: " +$rootScope.user.quizzes[tooltipItem.index].name;
                                        }
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
      
  $rootScope.getColor = function(id) {
      var info = document.getElementById("sliderinfo");
      
      if ($rootScope.user == undefined) { return; }
      if ($rootScope.lcomments == undefined || $rootScope.lcomments[id] == undefined) { return; }
      
      if ($rootScope.lcomments[id][$rootScope.user.uid].clarity == 0) {
          info.innerHTML = "Very unclear, please redo lesson.";
      } else if ($rootScope.lcomments[id][$rootScope.user.uid].clarity == 1) {
          info.innerHTML = "Unclear, please conduct thorough review.";
      } else if ($rootScope.lcomments[id][$rootScope.user.uid].clarity == 2) {
          info.innerHTML = "Unclear, please conduct review.";
      } else if ($rootScope.lcomments[id][$rootScope.user.uid].clarity == 3) {
          info.innerHTML = "Somewhat clear, I would benefit from quick review.";
      } else if ($rootScope.lcomments[id][$rootScope.user.uid].clarity == 4) {
          info.innerHTML = "Mostly clear, please move on.";
      } else if ($rootScope.lcomments[id][$rootScope.user.uid].clarity == 5) {
          info.innerHTML = "Perfectly clear, let's go!";
      }
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

