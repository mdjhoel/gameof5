
var app = angular.module('teacherpages', ['ngRoute','ngSanitize']);
    
  app.run(function($rootScope,$location) {

    // get url so URL can be put back when users click on modals
    $rootScope.url = $location.url();

    // show the spinner
    $rootScope.filePath = "includes/spinner.html";

/*
    var data = { 'admin':{"courses":[{"desc":"","descname":"","name":"Test123"}],"email":"mdjhoel@gmail.com","name":"Mark Hoel","photoUrl":"https://lh5.googleusercontent.com/-TrcFPjwS9Ww/AAAAAAAAAAI/AAAAAAAAAE4/DBXT4vG7GrU/photo.jpg","uid":"9KXHxUezF3PDUdZgoG4optm4p6V2"}, 'courses': {'Test123':{ 'readonly':{"badges":[{"id":"bubble","name":"participation","value":1}],"daily":[{"id":0,"lesson":0}],"lessons":[{"desc":"This is an introduction to the course. In this lesson you will find out ...","expectations":["c1","c2"],"id":0,"img":"images/banner.jpg","keywords":["intro"],"name":"Introduction","segments":[{"segimg":"","seglink":"","text":"The most important thing. How will I be evaluated? Report cards? Tests, assignment ratios?","title":"Evaluation?"},{"segimg":"","seglink":"http://www.cnn.com","text":"What behavioral and other expectations are there?","title":"Expectations?"},{"segimg":"","seglink":"","text":"This course is a test of the gameof5 software. We shall see how it does.","title":"This course?"},{"segimg":"images/tyler-durden.jpg","seglink":"http://www.cbc.ca","text":"cool young amazing teacher","title":"Who am i?"}],"show":true}],"levels":[{"color":"#2196f3","desc":"","high":20,"low":0,"name":"newbie","priv":"choc","textcolor":"#000"}],"quizzes":[{"name":"basics"}]}, 'users':{"9KXHxUezF3PDUdZgoG4optm4p6V2":{"badges":{"bubble":1},"badgestotal":1,"confirmed":true,"daily":[{"badge":"bubble","desc":"Enter a message ...","grade":4,"value":1}],"dailytotal":4,"dateconfirmed":"25/4/2018 (DDMMYYYY)","email":"mdjhoel@gmail.com","level":{"color":"#2196f3","desc":"","high":20,"low":0,"name":"newbie","priv":"choc","textcolor":"#000"},"name":"Mark Hoel","photoUrl":"https://lh5.googleusercontent.com/-TrcFPjwS9Ww/AAAAAAAAAAI/AAAAAAAAAE4/DBXT4vG7GrU/photo.jpg","pointstotal":9,"quiztotal":4,"quizzes":[{"grade":99,"name":"basics","xp":4}],"uid":"9KXHxUezF3PDUdZgoG4optm4p6V2"}}}}};
    
    $rootScope.photoUrl = data.admin.photoUrl;
    $rootScope.cname = "Test123";
    $rootScope.lesson = data.courses[$rootScope.cname].readonly.lessons[0];

$rootScope.filePath = "includes/lessons_one.html";
$rootScope.navPath = "includes/nav_admin.html";

return;

*/
    // check to see if user logged in
    firebase.auth().onAuthStateChanged(function(user) {

      // 1. Parse API - /#!/?teacher=98765897v&cname=ics4u
      var theme = "teacher"; // default to teacher
      if ($location.search()["teacher"] && $location.search()["cname"]) { theme = "student"; } // switch to student if API used
      
      // 2. Detect authenication 
      if (user == null) {
          // Apply function is required to sync Angular after leaving Angular environment
          $rootScope.$apply(function () {
            if (theme == "teacher") {
              $rootScope.filePath = "includes/admin_signin.html";
            } else {
              $rootScope.filePath = "includes/student_signin.html";
            }
            $rootScope.navPath = "includes/nav_signin.html";
          });
      } else {
          
          // Set photoUrl so it is available across teacher and students
          $rootScope.photoUrl = user.photoURL;

          // 3. Determine who is accessing and set interface
          var userId = user.uid;

          // 4. Connect to Firebase
          $rootScope.database = firebase.database();

          // 5. Set database references, retrieve data and set interface for teachers
          if (theme == "teacher") {  
          	var dbstring = "teachers/" + userId; // get everything for this teacher
            $rootScope.refAdmin = $rootScope.database.ref(dbstring + "/admin");

            $rootScope.refAdmin.once("value").then(function(snapshot) {
              if (snapshot.val() != undefined) {
                $rootScope.admin = snapshot.val();
                console.log("Data from Firebase, now stored in $rootScope.admin.");
              } else {
                $rootScope.admin = {courses:[],"name":"","email":"","photoUrl":"","uid":""};
                console.log("No data from Firebase, stored in $rootScope.admin. Using default $rootScope.admin.");
              }

              $rootScope.$apply(function () { // apply syncs Angular and Firebase

                  // Add admin data
                  $rootScope.admin.name = user.displayName;
                  $rootScope.admin.email = user.email;
                  $rootScope.admin.photoUrl = user.photoURL;
                  $rootScope.admin.uid = user.uid;

                  // Just in case user leaves without saving
                  var o = angular.copy($rootScope.admin);
                  $rootScope.o_admin = angular.toJson(o);

                  $rootScope.user = userId;
                  $rootScope.navPath = "includes/nav_courses.html";
                  $rootScope.filePath = "includes/admin_courses.html";
              });

            },
            function(error) {
                // The Promise was rejected.
                $rootScope.$apply(function () { $rootScope.error = "Data could not be saved"; $rootScope.filePath = "includes/404.html"; });
                console.error(error);
            });

          } else { // student

            // example: localhost:8000/#!/teacher=9KXHxUezF3PDUdZgoG4optm4p6V2&cname=Test123
            var args = $location.search();
            var dbstring = "teachers/" + args["teacher"] + "/courses/" + args["cname"];             
            $rootScope.refUser = $rootScope.database.ref(dbstring + "/users/" + userId);
            $rootScope.refLessons = $rootScope.database.ref(dbstring + "/readonly");

            $rootScope.refUser.once("value").then(function(snapshot) {
              if (snapshot.val() != undefined) {
                $rootScope.user = snapshot.val();
                console.log("Data from Firebase, now stored in $rootScope.user.");
                $rootScope.$apply(function () {  // prep for user view   
                  if ($rootScope.user.confirmed == false) {
                    $rootScope.error = "Not confirmed yet.";
                    $rootScope.filePath = "includes/404.html";
                  } else {
                    $rootScope.navPath = "includes/nav_student.html";
                    $rootScope.filePath = "includes/student_view.html";  

 					        $rootScope.refLessons.once("value").then(function(snapshot) {
              			if (snapshot.val() != undefined) {
                			$rootScope.readonly = snapshot.val();
                			console.log("Data from Firebase, now stored in $rootScope.readonly.");
              			} else {
                			console.log("No lessons data retrieved from Firebase. $rootScope.readonly is undefined");                
              			}
            		}); // query Firebase for lessons

                  } // if user is found
                }); // sync angular


              } else {
                
                console.log("No users data retrieved from Firebase. Creating new user");
                var newuser = {confirmed:false,email:user.email,name: user.displayName,photoUrl:user.photoURL,uid:user.uid};
                $rootScope.user = newuser;
                $rootScope.refUser.update(newuser).then(function(){
                  console.log("Data saved successfully. " + JSON.stringify(newuser));
                  $rootScope.$apply(function () { $rootScope.error = "New request sent."; $rootScope.filePath = "includes/404.html"; return; });
                }).catch(function(error) {
                  console.log("Data could not be saved." + error);
                  $rootScope.$apply(function () { $rootScope.error = "Data could not be saved"; $rootScope.filePath = "includes/404.html"; return; });
                });
              }
            }); // query Firebase

          } // student
      } // if user is not null
    }); // if authorization changes


  // ---------------------------------------------//
  // FUNCTIONS
  // ---------------------------------------------//

    $rootScope.signin = function() {
      var provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithRedirect(provider).then(function(result) {  
      });
    }

    $rootScope.signout = function(){
      firebase.auth().signOut().then(function() {
        //window.location.replace("#/");
        $location.url($rootScope.url);
        //location.reload();
        }).catch(function(error) {
      });
    }

  $rootScope.setUrl = function() {
    $location.url($rootScope.url);
  }

  // Work around for label input overlap bug
  $rootScope.finishLoading = function() {
    // need to wait a millisecond for this to work
    setTimeout(function(){ Materialize.updateTextFields(); }, 1); 
  }
  

  $rootScope.courses = function() {

    // check edits
    if (!checkedits($rootScope.o_readonly,$rootScope.readonly)) {
      askit = confirm("Please save your work.");
      if (askit == false) {
        return;
      }
    }

    $rootScope.filePath = "includes/admin_courses.html";
    $rootScope.navPath = "includes/nav_courses.html";
  }

  function checkedits(original,current) {

    var c = angular.toJson(current);
    var o = original;
    
    if (o == c) {
      return true;
    } else {
      return false;
    }

  }

  window.onbeforeunload = function (e) {

    if ($rootScope.user != undefined) {return;}
    var message = "Please save your work.";
    if ($rootScope.navPath == "includes/nav_courses.html") {
      if (checkedits($rootScope.o_readonly,$rootScope.readonly)) {
        return;
      }
    } else {
      if (checkedits($rootScope.o_admin,$rootScope.admin)) {
        return;
      }
    }

    e = e || window.event;
      // For IE and Firefox
    if (e) {
        e.returnValue = message;
    }
        // For Safari
    return message;
  
  };

  // Pick which ng-include to show
  $rootScope.nav = function(path) {
    $rootScope.filePath = path;
  }

  // Create listArray so sorts will work
  $rootScope.navList = function(path) {
    $rootScope.listArray = Object.values($rootScope.users);
    $rootScope.filePath = path;
  } 

  // Edit a particular course
  $rootScope.navAdmin = function(cname) {

    // Important variable for include screens
    $rootScope.cname = cname;

    // Check edits of admin - if changes have been made, send a message
    if (!checkedits($rootScope.o_admin,$rootScope.admin)) {
      askit = confirm("Please save your work.");
      if (askit == false) {
        return;
      }
    }

    $rootScope.readonly = undefined;
    $rootScope.users = undefined;

    // Connect to Firebase and get specific course data
    //if ($rootScope.readonly == undefined) {
      
      var dbstring = "teachers/" + $rootScope.admin.uid + "/courses/" + cname;
      $rootScope.refro = $rootScope.database.ref(dbstring + "/readonly" );

      $rootScope.refro.once("value").then(function(snapshot) {
        if (snapshot.val() != undefined) {
          $rootScope.readonly = snapshot.val();
          console.log("Data from Firebase, now stored in $rootScope.readonly.");
        } else {
          $rootScope.readonly = {lessons:[],badges:[],levels:[],quizzes:[],daily:[]};
          console.log("No data from Firebase, default stored in $rootScope.readonly.");
        }

        $rootScope.$apply(function () { 
          var o = angular.copy($rootScope.readonly); // set original readonly to check for edits later
          $rootScope.o_readonly = angular.toJson(o);  

          $rootScope.alldata = "{ 'admin':" + angular.toJson($rootScope.admin) + ", 'courses': {'" + cname + "':{ 'readonly':" + angular.toJson($rootScope.readonly);

        });

      },
      function(error) {
        // The Promise was rejected.
        $rootScope.$apply(function () { $rootScope.error = "Data could not be accessed."; $rootScope.filePath = "includes/404.html"; });
        console.error(error);
      });
    //} // end check for undefined

    // Connect to Firebase and get specific course data
    //if ($rootScope.users == undefined) {
      
      var dbstring = "teachers/" + $rootScope.admin.uid + "/courses/" + cname;
      $rootScope.refUsers = $rootScope.database.ref(dbstring + "/users" );

      $rootScope.refUsers.once("value").then(function(snapshot) {
        if (snapshot.val() != undefined) {
          $rootScope.users = snapshot.val();
          console.log("Data from Firebase, now stored in $rootScope.users.");
          $rootScope.$apply(function () { $rootScope.navPath = "includes/nav_admin.html"}); // reload so all tools are visible
        } else {
          console.log("No users data from Firebase yet, $rootScope.users remaining undefined.");
        }

        $rootScope.$apply(function () {  
          if ($rootScope.users != undefined) {
            $rootScope.alldata = $rootScope.alldata + ", 'users':" + angular.toJson($rootScope.users) + "}}}";
          } else {
            $rootScope.alldata = $rootScope.alldata + "}}}";
          }
          //$rootScope.alldata = $rootScope.alldata + "}";
          $rootScope.share = "http://gameof5.com/#!/?teacher=" + $rootScope.admin.uid + "&cname=" + cname; 
        });

      },
      function(error) {
        // The Promise was rejected.
        $rootScope.$apply(function () { $rootScope.error = "Data could not be accessed"; $rootScope.filePath = "includes/404.html"; });
        console.error(error);
      });
    //} // end check for undefined

    $rootScope.filePath = "includes/admin_splash.html";
    $rootScope.navPath = "includes/nav_admin.html";

  } // end of navAdin function

  // SAVE function - use to write out to Firebase
  $rootScope.save = function() {
  	// remove modal from url
  	$location.url($rootScope.url);
    if (document.getElementById('usertotals').checked) {
      if ($rootScope.users != undefined) {setUserTotals();}
    }

    var admin = angular.toJson($rootScope.admin); // get rid of Angular $$ data
    admin = JSON.parse(admin);
    $rootScope.o_admin = JSON.stringify(admin);

    // If you are editing a specific course ...
    if ($rootScope.readonly != undefined) {

      var readonly = angular.toJson($rootScope.readonly); // get rid of Angular $$ data
      readonly = JSON.parse(readonly);
      $rootScope.o_readonly = readonly; 

      $rootScope.refAdmin.update(admin).then(function(){
        console.log("Admin data saved successfully.");
      }).catch(function(error) {
        console.log("Data could not be saved." + error);
      });

      if ($rootScope.readonly != undefined) {
        $rootScope.refro.update(readonly).then(function(){
          console.log("Readonly data saved successfully.");
        }).catch(function(error) {
          console.log("Data could not be saved." + error);
        });
      }

       if ($rootScope.users != undefined || $rootScope.saveusers) {

       	if ($rootScope.saveusers) { // if all users are deleted, remove all records from database
       		var users = {};
       	} else {
       		var users = angular.toJson($rootScope.users); // get rid of Angular $$ data
        	users = JSON.parse(users);
       	}

        $rootScope.refUsers.set(users).then(function(){
            console.log("User data saved successfully.");
        }).catch(function(error) {
            console.log("Data could not be saved." + error);
        });
      }
      
    } else {

      $rootScope.refAdmin.update(admin).then(function(){
        console.log("Admin data saved successfully.");
      }).catch(function(error) {
        console.log("Data could not be saved." + error);
      });

    }

  }

function setUserTotals() {
    
    var users = $rootScope.users;
    var userlist = [];

    // changed for update from array to object for Firebase
    //for (i = 0; i<users.length; i++) {
    for (key in users) {

      var pointstotal = 0;
      var quiztotal = 0;
      var dailytotal = 0;

      //var daily = users[i].daily;
      var user = users[key];
      var daily = user.daily;
      var badgelist = [];
      var badgestotal = 0;

      // house keeping
      user.confirmed = true;
      var d = new Date();
      user.dateconfirmed = d.getDate() + "/" + d.getMonth() + "/" + d.getFullYear() + " (DDMMYYYY)";   

      if (daily != undefined) {
        for (j = 0; j<daily.length; j++) {

          if (daily[j].grade == null) { daily[j].grade = -99; }

          if (daily[j].grade != -99) {
            dailytotal = dailytotal + daily[j].grade;
          }
          
          if (daily[j].badge != 0) {
            badgelist.push(daily[j].badge);
            // if not a normal day
            if (daily[j].grade !=3) {
              badgestotal = badgestotal + daily[j].value;
            }
          }
        }
      }

      var quizzes = user.quizzes;
      //var quizzes = users[i].quizzes;
      if (quizzes != undefined) {
        for (k = 0; k<quizzes.length; k++) {

          if (user.quizzes[k].grade == null) { user.quizzes[k].grade = -99; }
          if (user.quizzes[k].grade != -99) {
            quiztotal = quiztotal + user.quizzes[k].xp;
          }
        }
      }

      var counts = {};
      badgelist.forEach(function(x) { counts[x] = (counts[x] || 0)+1; });

      pointstotal = dailytotal + quiztotal + badgestotal;
      user.badges = counts;
      user.dailytotal = dailytotal;
      user.quiztotal = quiztotal;
      user.badgestotal = badgestotal;
      user.pointstotal = pointstotal;

      var levels = $rootScope.readonly.levels;
      if (levels != undefined) {
        for (l = 0; l<levels.length; l++) {
          if (pointstotal >= levels[l].low && pointstotal <= levels[l].high) {
            user.level = levels[l];
          }
        }
      }

      // Set user updates to $rootScope
      $rootScope.users[key] = user; 

    }
  }

  $rootScope.makePDF = function(lesson) {

    var doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [8.5,11]
    })

    // Create gameof5 logo
    doc.setLineWidth(.05);
    doc.setDrawColor(33,150,243);  
    doc.setFillColor(139, 195, 74);  
    doc.circle(4.75, 1, .5,'FD');
    doc.setFillColor(255, 255, 255);  
    doc.circle(4.18, 1.05, .275,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(1.175);
    doc.text("5",4.5,1.3);
    doc.setFontSize(1);
    doc.setTextColor(255, 152, 0);
    doc.text("e",4.025,1.25);
    doc.setTextColor(233, 30, 99);
    doc.text("m",3.47,1.25);
    doc.setTextColor(255, 235, 59);
    doc.text("a",3.095,1.25);
    doc.setTextColor(33, 150, 243);
    doc.text("g",2.75,1.25);

    // HR
    doc.setDrawColor(33, 150, 243);
    doc.line(1,1.75,7.5,1.75);

    // Set locations on page
    var x = 1;
    var y = 2.2;

    // Title
    doc.setFontSize(.45);
    doc.setTextColor(0,0,0);
    doc.text(lesson.name, x, y);

    // Box
    y = y + .25
    doc.setDrawColor(0,0,0);
    doc.setLineWidth(.025);
    doc.roundedRect(1, y, 6.5, 8, .1,.1, 'D');

    // Lessons description
    x = x + .5
    doc.setFontSize(.25);
    y = y + .5;
    doc.setFontStyle("bold");
    doc.text("Lesson Description:",x,y);
    doc.setFontStyle("normal");
    lines = doc.splitTextToSize(lesson.desc, 5.5)
    y = y + .25;
    doc.setFontSize(.2);
    doc.setFontStyle("italic");
    doc.text(lines, x, y);
    doc.setFontStyle("normal");
    y = y + .7;

    // Lesson progression
    if (lesson.segments.length != undefined) {
      doc.setFontSize(.25);
      doc.setFontStyle("bold");
      doc.text("Lesson Progression:",x,y);
      doc.setFontStyle("normal");
      y = y + .35;
      x = x + .1
      var segs = lesson.segments.slice().reverse(); // start at the top
      for (i = 0; i<lesson.segments.length; i++) {
        doc.setFontSize(.25);
        doc.text(segs[i].title, x, y);
        y = y + .2;
        doc.setFontSize(.2);
        doc.setFontStyle("italic");
        lines = doc.splitTextToSize(segs[i].text, 5)
        doc.text(lines, x, y);
        //y = y + .2;
        //doc.setFontStyle("italic");
        //doc.text(lesson.segments[i].seglink, x, y);
        doc.setFontStyle("normal");
        y = y + .5;
      }
    }

    // Keywords
    y = y + .15
    x = x - .1;
    doc.setFontSize(.25);
    doc.setFontStyle("bold");
    doc.text("Keywords:", x, y);
    y = y + .25
    doc.setFontSize(.2);
    doc.setFontStyle("italic");
    var keywords = doc.splitTextToSize(lesson.keywords.join(','), 5);
    doc.text(keywords, x, y);
    doc.setFontStyle("normal");
    
    // Curriculum expectations
    doc.setFontSize(.25);
    doc.setFontStyle("bold");
    y = y + .5;
    doc.text("Curriculum expectations:", x, y);
    y = y + .25;
    doc.setFontStyle("italic");
    doc.setFontSize(.2);
    var expects = doc.splitTextToSize(lesson.expectations.join(','), 5);
    doc.text(expects, x, y);
    doc.save(lesson.name + ".pdf");

  } // end makePDF

  $rootScope.navUser = function(index) {
    var username = Object.keys($rootScope.data.users)[index];
    $rootScope.user = $rootScope.data.users[username];
    $rootScope.filePath = "includes/student_view.html";
  }

  $rootScope.setData = function(index) {
    $rootScope.lesson = $rootScope.readonly.lessons[index];
    $rootScope.filePath = "includes/lessons_one.html";
  }

  $rootScope.checkCname = function(cname,index) {
  	var first = cname.split(" ")[0];
  	var cname = removeBadChars(first);
  	$rootScope.admin.courses[index].name = cname;
  }
  function removeBadChars(string) {
    var userId = string.split(".").join("");
    userId = userId.split("[").join("");
    var userId = userId.split("]").join("");
    var userId = userId.split("$").join("");
    var userId = userId.split("/").join("");
    var userId = userId.split("#").join("");
    return userId;
  }

  // Add some new data to the rootScope
  $rootScope.addcourse = function () {
  	if ($rootScope.admin.courses == undefined) {
    	$rootScope.admin.courses = [];
    }
    if ($rootScope.admin.courses.length < 5) {
      $rootScope.admin.courses.unshift({name: "", descname: "", desc: ""});
    }    
  }

  // Remove some data from the rootScope
  $rootScope.removecourse = function (index) {
    	$rootScope.admin.courses.splice(index, 1);
  }

  // Add some new data to the rootScope
  $rootScope.adduser = function () {

    /*
    var quizlist = [];
    if ($rootScope.data.quizlist != undefined) {
      // if new user missed a quiz, add -99
      for (var missedquiz = 0; missedquiz < $rootScope.data.quizlist.length; missedquiz++){
        //quizlist.push({grade:-99});
        quizlist.unshift({grade:-99});
      }
    } 
    var dailylist = [];
    if ($rootScope.readonly.daily != undefined) {
      // if new user missed a quiz, add -99
      for (var misseddaily = 0; misseddaily < $rootScope.readonly.daily.length; misseddaily++){
        //dailylist.push({grade: -99, desc: "not member of class", badge: 0});
        dailylist.unshift({grade:-99, desc: "not a member of class", badge: 0});
      }
    } 

    if ($rootScope.data.users == undefined) { $rootScope.data.users = {}; }
    
    //$rootScope.data.users.unshift({"name":{name: "",quiztotal: "0",dailytotal: "0",badgestotal: "0",pointstotal: "0",quizzes: quizlist,daily: dailylist, badges: [""], level: 0}});
    //$rootScope.data.users[Object.keys($rootScope.data.users).length] = {name: "",quiztotal: "0",dailytotal: "0",badgestotal: "0",pointstotal: "0",quizzes: quizlist,daily: dailylist, badges: [""], level: 0};
    $rootScope.data.users[0] = {commited: false, email: "", photoUrl: "images/tyler-durden.jpg", name: "Tyler Durden", quiztotal: "0",dailytotal: "0",badgestotal: "0",pointstotal: "0",quizzes: quizlist,daily: dailylist, badges: [""], level: 0};
    */
    $rootScope.admin.users.unshift({commited: false, email: "", cname: $rootScope.cname});

  }

  // Remove some data from the rootScope
  $rootScope.removeuser = function (val,index) {

      //$rootScope.readonly.users.splice(index, 1);
      $rootScope.listArray.splice(index);
      delete $rootScope.users[val];

      // when user deletes all users, set users to empty object so that saving removes from Firebase
      if (Object.keys($rootScope.users).length == 0) {
      	$rootScope.users = undefined;
 		   $rootScope.saveusers = true;
      	$rootScope.readonly.daily = {};
      }
    
  }

  // Add some new data to the rootScope
  $rootScope.addbadge = function () {
    //$rootScope.data.badges.push({name: "", value: 1, id: "skull", design: "<svg id='skull' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m20.499437,23.518602c-0.333406,1.638453 -1.185024,3.204302 -1.242386,4.893839c0.076286,0.978264 -0.67985,1.503716 -1.715061,1.485199c-1.113358,1.001625 0.137468,2.584599 1.397202,2.988922c1.285648,0.748985 2.880569,-0.087906 4.154179,0.58392c1.691065,1.147327 2.39699,3.181492 1.813585,4.964855c-0.580027,1.472107 2.389299,0.936729 1.272455,-0.240082c-0.862648,-1.150219 1.626089,-0.769894 0.988997,0.322063c-0.120426,0.876614 0.744972,1.160389 0.359856,2.009628c1.003338,0.499283 -0.084158,0.778904 -0.695271,0.873192c-1.431116,0.619175 0.258846,-1.109127 -0.874899,-1.620338c-1.03821,0.19582 -0.334747,1.704716 -0.691069,1.530418c-0.733648,-0.498581 -0.733124,-2.36264 -1.964397,-1.146385c-0.408693,-1.498634 0.336948,-3.059448 -0.237425,-4.549438c0.235262,-1.11272 -1.788971,-1.496559 -1.532955,-0.205956c0.102058,1.969685 -0.587128,3.935493 -0.191578,5.895477c0.544746,1.208897 2.068346,1.753532 3.024626,2.686363c0.785374,0.719334 1.803467,1.488365 3.025867,1.261948c1.38641,-0.052185 2.775354,-0.163307 4.15546,0.027729c1.735989,0.047531 3.06118,-1.143341 4.542625,-1.755081c1.741528,-1.20023 1.467381,-3.343987 1.29372,-5.051601c-0.212902,-1.054268 0.254215,-2.109055 0.167213,-3.153461c-1.255539,-1.333309 -2.285732,1.0103 -1.928062,2.017155c-0.000069,1.266575 0.280182,2.898129 -1.111965,3.723156c-1.148884,-0.02515 -2.242279,0.337025 -3.399979,0.147686c-0.939413,0.484222 -2.461096,0.471695 -2.771172,-0.680862c-0.123755,-1.023563 0.410603,-2.096687 -0.315481,-3.051983c0.63792,0.476871 1.751005,-0.411827 1.130697,0.657288c-0.756653,0.870239 0.640659,2.211239 1.166636,0.926785c0.174501,-0.861889 -0.754833,-2.005726 0.772833,-1.821079c0.311619,0.303974 -1.063908,2.430386 0.816296,1.893044c1.340492,-0.254837 -0.238533,-2.079758 1.576775,-2.086136c0.878529,-0.897644 0.641964,-2.580097 1.985802,-3.261066c1.498306,-0.880081 3.837757,-0.244713 4.907215,-1.735077c0.911518,-0.762688 0.482601,-2.876556 -1.089493,-2.176151c-1.9646,0.166267 -0.405476,-2.309315 -0.460293,-3.236929c0.462959,-0.807917 -0.56208,-2.508589 -0.209122,-2.689034c0.666866,0.88559 0.905743,1.9214310000000001 0.762356,2.956408c-0.012329,0.877668 -0.441238,3.256365 0.964752,1.789959c0.476002,-1.021851 0.337509,-2.17935 0.676586,-3.242521c0.654068,-2.295403 -0.51701,-4.592039 -1.822468,-6.53623c-1.111851,-1.046638 -2.523361,-1.880941 -3.848942,-2.702438c-2.229519,-0.727726 -4.69138,-0.858141 -7.046206,-0.675777c-2.082872,0.313356 -4.285553,0.64369 -5.944889,1.876299c-1.61713,0.826942 -3.165882,1.925274 -3.805229,3.51432c-0.557119,1.280123 -1.53274,2.583752 -1.0893,4.005777c0.424028,1.18541 0.19919,2.416494 0.26782,3.628096c0.722916,1.384739 1.405405,-0.708601 1.337717,-1.400986c0.040026,-1.313065 0.838259,-2.475252 1.426371,-3.640911l0,0zm13.277792,2.816936c1.486576,0.092459 3.368835,0.810926 3.409397,2.308834c0.226109,1.503149 -1.173397,2.960157 -2.966908,2.812796c-1.629017,-0.116158 -2.670845,-1.337378 -2.562706,-2.710413c-0.545343,-0.984459 0.303364,-2.038883 1.442471,-2.265179c0.220833,-0.064438 0.447922,-0.112703 0.677746,-0.146038l0,0zm-10.032045,0.128033c1.724535,-0.266155 3.686625,0.662336 3.692404,2.319038c0.162012,1.601648 -1.797352,1.915449 -3.133841,2.31674c-0.924833,0.518242 -1.885483,0.035679 -2.65399,-0.4865c-0.997023,-0.905693 -0.703949,-2.730867 0.348774,-3.557619c0.510502,-0.327936 1.142487,-0.456823 1.746653,-0.59166zm5.901205,4.225292c0.834871,0.995863 1.83717,2.514593 0.757458,3.644896c-0.958418,0.66711 -1.079287,-0.948917 -2.085306,-0.187824c-0.943687,-0.717354 -0.073269,-2.177052 0.588873,-2.905807c0.218264,-0.209827 0.468004,-0.394569 0.738976,-0.551264z' /></svg>"})
    if ($rootScope.readonly.badges == undefined) { $rootScope.readonly.badges = []; }
    $rootScope.readonly.badges.unshift({name:"",value:1,id:""});
  }

  // Remove some data from the rootScope
  $rootScope.removebadge = function (index) {
    $rootScope.readonly.badges.splice(index, 1)
  }

  // Add some new data to the rootScope
  $rootScope.addlevel = function () {
    //$rootScope.data.badges.push({name: "", value: 1, id: "skull", design: "<svg id='skull' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m20.499437,23.518602c-0.333406,1.638453 -1.185024,3.204302 -1.242386,4.893839c0.076286,0.978264 -0.67985,1.503716 -1.715061,1.485199c-1.113358,1.001625 0.137468,2.584599 1.397202,2.988922c1.285648,0.748985 2.880569,-0.087906 4.154179,0.58392c1.691065,1.147327 2.39699,3.181492 1.813585,4.964855c-0.580027,1.472107 2.389299,0.936729 1.272455,-0.240082c-0.862648,-1.150219 1.626089,-0.769894 0.988997,0.322063c-0.120426,0.876614 0.744972,1.160389 0.359856,2.009628c1.003338,0.499283 -0.084158,0.778904 -0.695271,0.873192c-1.431116,0.619175 0.258846,-1.109127 -0.874899,-1.620338c-1.03821,0.19582 -0.334747,1.704716 -0.691069,1.530418c-0.733648,-0.498581 -0.733124,-2.36264 -1.964397,-1.146385c-0.408693,-1.498634 0.336948,-3.059448 -0.237425,-4.549438c0.235262,-1.11272 -1.788971,-1.496559 -1.532955,-0.205956c0.102058,1.969685 -0.587128,3.935493 -0.191578,5.895477c0.544746,1.208897 2.068346,1.753532 3.024626,2.686363c0.785374,0.719334 1.803467,1.488365 3.025867,1.261948c1.38641,-0.052185 2.775354,-0.163307 4.15546,0.027729c1.735989,0.047531 3.06118,-1.143341 4.542625,-1.755081c1.741528,-1.20023 1.467381,-3.343987 1.29372,-5.051601c-0.212902,-1.054268 0.254215,-2.109055 0.167213,-3.153461c-1.255539,-1.333309 -2.285732,1.0103 -1.928062,2.017155c-0.000069,1.266575 0.280182,2.898129 -1.111965,3.723156c-1.148884,-0.02515 -2.242279,0.337025 -3.399979,0.147686c-0.939413,0.484222 -2.461096,0.471695 -2.771172,-0.680862c-0.123755,-1.023563 0.410603,-2.096687 -0.315481,-3.051983c0.63792,0.476871 1.751005,-0.411827 1.130697,0.657288c-0.756653,0.870239 0.640659,2.211239 1.166636,0.926785c0.174501,-0.861889 -0.754833,-2.005726 0.772833,-1.821079c0.311619,0.303974 -1.063908,2.430386 0.816296,1.893044c1.340492,-0.254837 -0.238533,-2.079758 1.576775,-2.086136c0.878529,-0.897644 0.641964,-2.580097 1.985802,-3.261066c1.498306,-0.880081 3.837757,-0.244713 4.907215,-1.735077c0.911518,-0.762688 0.482601,-2.876556 -1.089493,-2.176151c-1.9646,0.166267 -0.405476,-2.309315 -0.460293,-3.236929c0.462959,-0.807917 -0.56208,-2.508589 -0.209122,-2.689034c0.666866,0.88559 0.905743,1.9214310000000001 0.762356,2.956408c-0.012329,0.877668 -0.441238,3.256365 0.964752,1.789959c0.476002,-1.021851 0.337509,-2.17935 0.676586,-3.242521c0.654068,-2.295403 -0.51701,-4.592039 -1.822468,-6.53623c-1.111851,-1.046638 -2.523361,-1.880941 -3.848942,-2.702438c-2.229519,-0.727726 -4.69138,-0.858141 -7.046206,-0.675777c-2.082872,0.313356 -4.285553,0.64369 -5.944889,1.876299c-1.61713,0.826942 -3.165882,1.925274 -3.805229,3.51432c-0.557119,1.280123 -1.53274,2.583752 -1.0893,4.005777c0.424028,1.18541 0.19919,2.416494 0.26782,3.628096c0.722916,1.384739 1.405405,-0.708601 1.337717,-1.400986c0.040026,-1.313065 0.838259,-2.475252 1.426371,-3.640911l0,0zm13.277792,2.816936c1.486576,0.092459 3.368835,0.810926 3.409397,2.308834c0.226109,1.503149 -1.173397,2.960157 -2.966908,2.812796c-1.629017,-0.116158 -2.670845,-1.337378 -2.562706,-2.710413c-0.545343,-0.984459 0.303364,-2.038883 1.442471,-2.265179c0.220833,-0.064438 0.447922,-0.112703 0.677746,-0.146038l0,0zm-10.032045,0.128033c1.724535,-0.266155 3.686625,0.662336 3.692404,2.319038c0.162012,1.601648 -1.797352,1.915449 -3.133841,2.31674c-0.924833,0.518242 -1.885483,0.035679 -2.65399,-0.4865c-0.997023,-0.905693 -0.703949,-2.730867 0.348774,-3.557619c0.510502,-0.327936 1.142487,-0.456823 1.746653,-0.59166zm5.901205,4.225292c0.834871,0.995863 1.83717,2.514593 0.757458,3.644896c-0.958418,0.66711 -1.079287,-0.948917 -2.085306,-0.187824c-0.943687,-0.717354 -0.073269,-2.177052 0.588873,-2.905807c0.218264,-0.209827 0.468004,-0.394569 0.738976,-0.551264z' /></svg>"})
    if ($rootScope.readonly.levels == undefined) { $rootScope.readonly.levels = []; }
    $rootScope.readonly.levels.unshift({name: "", desc: "", low: 0, high: 0, priv: "", color: "#2196f3", textcolor: "#000"})
  }

  // Remove some data from the rootScope
  $rootScope.removelevel = function (index) {
    $rootScope.readonly.levels.splice(index, 1)
  }

// Add some new data to the rootScope
  $rootScope.addlesson = function () {

    if (typeof $rootScope.readonly.lessons == undefined) { $rootScope.readonly.lessons = []; }
    $rootScope.readonly.lessons.unshift({id:$rootScope.readonly.lessons.length,show:true,name:"",desc:"",img:"",keywords:[],expectations:[],segments:[]});
  
  }

  // Add some new data to the rootScope
  $rootScope.uplesson = function (index) {
    var curlesson = $rootScope.readonly.lessons[index];
    var uplesson = $rootScope.readonly.lessons[index -1];
    $rootScope.readonly.lessons[index - 1] = curlesson;
    $rootScope.readonly.lessons[index] = uplesson;
  }

  // Add some new data to the rootScope
  $rootScope.downlesson = function (index) {
    var curlesson = $rootScope.readonly.lessons[index];
    var uplesson = $rootScope.readonly.lessons[index + 1];
    $rootScope.readonly.lessons[index + 1] = curlesson;
    $rootScope.readonly.lessons[index] = uplesson
  }

  // Add some new data to the rootScope
  $rootScope.addsegment = function (parent) {

    if ($rootScope.readonly.lessons[parent].segments == undefined) { $rootScope.readonly.lessons[parent].segments = []; }
    if ($rootScope.readonly.lessons[parent].segments.length <5) { // only allowed 5! gameof5!
      $rootScope.readonly.lessons[parent].segments.unshift({title:"",text:"",segimg:"",seglink:""});
    }
  }

  // Remove some data from the rootScope
  $rootScope.removelesson = function (index) {
    $rootScope.readonly.lessons.splice(index, 1)
  }

  // Remove some data from the rootScope
  $rootScope.removesegment = function (parent,index) {
    $rootScope.readonly.lessons[parent].segments.splice(index, 1)
  }


 $rootScope.selectBadge = function(index,design) {

    var divbadge = document.getElementById("badgeselect");
    divbadge.innerHTML = "";
    $rootScope.readonly.badges[index].design = design;

 }

// Add some new data to the rootScope
  $rootScope.addquiz = function (item) {

    if ($rootScope.readonly.quizzes == undefined) { 
      $rootScope.readonly.quizzes = []; 
    }

    //$rootScope.readonly.quizzes[item] = {}
    $rootScope.readonly.quizzes.unshift({name:""});

    //for (var i = 0; i < $rootScope.users.length; i++) {
    for (key in $rootScope.users) {
      //var user = $rootScope.users[key];
      var user = $rootScope.users[key];
      if (user.quizzes == undefined) {user.quizzes = [];}
      user.quizzes.unshift({name: "", grade: 0, xp: 0});
      $rootScope.users[key] = user;
    }

  }

  // Remove some data from the rootScope
  $rootScope.removequiz = function (index) {
    $rootScope.readonly.quizzes.splice(index, 1)
    for (key in $rootScope.users) {
      var user = $rootScope.users[key];
      user.quizzes.splice(index, 1);
      $rootScope.users[key] = user;
    }
  }

  // called on change
  $rootScope.setQuiz = function(grade,index) {
    var xp = 0;
    var percent = grade;
    if (percent > 80) {
      xp = 4;
    } else if (percent <= 80 && percent > 70) {
      xp = 3;
    } else if (percent <= 70 && percent > 60) {
      xp = 2;
    } else {
      xp = 0;
    }
    return xp;
  }

  // When making a daily other than 3, clear the message field
  $rootScope.emptyField = function (user,parent,index) {
        
    var username = Object.keys($rootScope.users)[index];
    user.daily[parent].desc = "Enter a message ...";
    
    // set value attribute
    if (user.daily[parent].grade == 4) {
      user.daily[parent].value = 1;
    } else if (user.daily[parent].grade == 3) {
      user.daily[parent].value = 0;
    } else {
      user.daily[parent].value = -1;
    }    

    // set user updates back to $rootScope
    $rootScope.users[username] = user;

  }

  // Add some new data to the rootScope
  $rootScope.adddaily = function () {

    if ($rootScope.readonly.daily == undefined) { $rootScope.readonly.daily = []; }
    $rootScope.readonly.daily.unshift({});

    for (key in $rootScope.users) {
      
      var user = $rootScope.users[key];
      if (user.daily == undefined) { user.daily = []; }
      user.daily.unshift({grade: 3, desc: "Normal day, nothing to report", badge: 0, value:0});

      $rootScope.users[key] = user;
    }
  }

  // Remove some data from the rootScope
  $rootScope.removedaily = function (index) {
    $rootScope.readonly.daily.splice(index, 1);
    for (key in $rootScope.users) {
      $rootScope.users[key].daily.splice(index, 1);
    }
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

 $rootScope.showSVG = function(index) {
    for (var i = 0; i < $rootScope.badgesvg.badges.length; i++) {
      var divbadge = document.getElementById($rootScope.badgesvg.badges[i].id+index+i);
      var details = divbadge.getAttribute("data-design");
      divbadge.innerHTML = details;
    }
  }

 $rootScope.badgesvg = 
  { "badges": [
    {
       "id": "skull",
       "design": "<svg id='skull' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m20.499437,23.518602c-0.333406,1.638453 -1.185024,3.204302 -1.242386,4.893839c0.076286,0.978264 -0.67985,1.503716 -1.715061,1.485199c-1.113358,1.001625 0.137468,2.584599 1.397202,2.988922c1.285648,0.748985 2.880569,-0.087906 4.154179,0.58392c1.691065,1.147327 2.39699,3.181492 1.813585,4.964855c-0.580027,1.472107 2.389299,0.936729 1.272455,-0.240082c-0.862648,-1.150219 1.626089,-0.769894 0.988997,0.322063c-0.120426,0.876614 0.744972,1.160389 0.359856,2.009628c1.003338,0.499283 -0.084158,0.778904 -0.695271,0.873192c-1.431116,0.619175 0.258846,-1.109127 -0.874899,-1.620338c-1.03821,0.19582 -0.334747,1.704716 -0.691069,1.530418c-0.733648,-0.498581 -0.733124,-2.36264 -1.964397,-1.146385c-0.408693,-1.498634 0.336948,-3.059448 -0.237425,-4.549438c0.235262,-1.11272 -1.788971,-1.496559 -1.532955,-0.205956c0.102058,1.969685 -0.587128,3.935493 -0.191578,5.895477c0.544746,1.208897 2.068346,1.753532 3.024626,2.686363c0.785374,0.719334 1.803467,1.488365 3.025867,1.261948c1.38641,-0.052185 2.775354,-0.163307 4.15546,0.027729c1.735989,0.047531 3.06118,-1.143341 4.542625,-1.755081c1.741528,-1.20023 1.467381,-3.343987 1.29372,-5.051601c-0.212902,-1.054268 0.254215,-2.109055 0.167213,-3.153461c-1.255539,-1.333309 -2.285732,1.0103 -1.928062,2.017155c-0.000069,1.266575 0.280182,2.898129 -1.111965,3.723156c-1.148884,-0.02515 -2.242279,0.337025 -3.399979,0.147686c-0.939413,0.484222 -2.461096,0.471695 -2.771172,-0.680862c-0.123755,-1.023563 0.410603,-2.096687 -0.315481,-3.051983c0.63792,0.476871 1.751005,-0.411827 1.130697,0.657288c-0.756653,0.870239 0.640659,2.211239 1.166636,0.926785c0.174501,-0.861889 -0.754833,-2.005726 0.772833,-1.821079c0.311619,0.303974 -1.063908,2.430386 0.816296,1.893044c1.340492,-0.254837 -0.238533,-2.079758 1.576775,-2.086136c0.878529,-0.897644 0.641964,-2.580097 1.985802,-3.261066c1.498306,-0.880081 3.837757,-0.244713 4.907215,-1.735077c0.911518,-0.762688 0.482601,-2.876556 -1.089493,-2.176151c-1.9646,0.166267 -0.405476,-2.309315 -0.460293,-3.236929c0.462959,-0.807917 -0.56208,-2.508589 -0.209122,-2.689034c0.666866,0.88559 0.905743,1.9214310000000001 0.762356,2.956408c-0.012329,0.877668 -0.441238,3.256365 0.964752,1.789959c0.476002,-1.021851 0.337509,-2.17935 0.676586,-3.242521c0.654068,-2.295403 -0.51701,-4.592039 -1.822468,-6.53623c-1.111851,-1.046638 -2.523361,-1.880941 -3.848942,-2.702438c-2.229519,-0.727726 -4.69138,-0.858141 -7.046206,-0.675777c-2.082872,0.313356 -4.285553,0.64369 -5.944889,1.876299c-1.61713,0.826942 -3.165882,1.925274 -3.805229,3.51432c-0.557119,1.280123 -1.53274,2.583752 -1.0893,4.005777c0.424028,1.18541 0.19919,2.416494 0.26782,3.628096c0.722916,1.384739 1.405405,-0.708601 1.337717,-1.400986c0.040026,-1.313065 0.838259,-2.475252 1.426371,-3.640911l0,0zm13.277792,2.816936c1.486576,0.092459 3.368835,0.810926 3.409397,2.308834c0.226109,1.503149 -1.173397,2.960157 -2.966908,2.812796c-1.629017,-0.116158 -2.670845,-1.337378 -2.562706,-2.710413c-0.545343,-0.984459 0.303364,-2.038883 1.442471,-2.265179c0.220833,-0.064438 0.447922,-0.112703 0.677746,-0.146038l0,0zm-10.032045,0.128033c1.724535,-0.266155 3.686625,0.662336 3.692404,2.319038c0.162012,1.601648 -1.797352,1.915449 -3.133841,2.31674c-0.924833,0.518242 -1.885483,0.035679 -2.65399,-0.4865c-0.997023,-0.905693 -0.703949,-2.730867 0.348774,-3.557619c0.510502,-0.327936 1.142487,-0.456823 1.746653,-0.59166zm5.901205,4.225292c0.834871,0.995863 1.83717,2.514593 0.757458,3.644896c-0.958418,0.66711 -1.079287,-0.948917 -2.085306,-0.187824c-0.943687,-0.717354 -0.073269,-2.177052 0.588873,-2.905807c0.218264,-0.209827 0.468004,-0.394569 0.738976,-0.551264z' /></svg>"
    },
    {
       "id": "calendar",
       "design": "<svg id='calendar' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m24.753231,30.087854c0.376881,-0.344723 0.492588,-0.565714 0.492588,-0.565714l0.029049,0c0,0 -0.014326,0.303904 -0.014326,0.60737l0,6.286661l-2.26021,0l0,1.185326l5.883141,0l0,-1.185326l-2.23126,0l0,-8.548126l-1.274591,0l-2.44825,2.261465l0.868191,0.855099l0.955669,-0.896755zm5.320923,6.769884c0,0.235523 0.029043,0.482845 0.072783,0.743759l6.591906,0l0,-1.185326l-5.069801,0c0.027634,-2.219807 4.910355,-2.715321 4.910355,-5.915703c0,-1.681732 -1.345619,-2.800398 -3.230347,-2.800398c-2.303469,0 -3.231155,1.847506 -3.231155,1.847506l1.056686,0.674915c0,0 0.724823,-1.241482 2.073105,-1.241482c1.071407,0 1.838696,0.647276 1.838696,1.612875c0,2.294367 -5.012226,2.791166 -5.012226,6.263853zm-5.028744,-20.235653l-2.416077,0l0,3.833599l2.416077,0l0,-3.833599zm13.287727,1.34013l0,3.644138l-4.831898,0l0,-3.644138l-7.247681,0l0,3.641937l-4.82958,0l0,-3.641937l-2.921999,0l0,24.90987l22.75,0l0,-24.90987l-2.918842,0zm1.711964,23.759224l-20.334042,0l0,-17.146719l20.334042,0l0,17.146719zm-2.91964,-25.099354l-2.416073,0l0,3.833599l2.416073,0l0,-3.833599z' /></svg>"

    },
    {
        "id": "clock",
        "design": "<svg id='clock' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m29.845047,21.878887c-0.508989,0 -0.919388,0.409267 -0.919388,0.913696l0,8.426723l-5.564217,2.416164c-0.465942,0.202885 -0.677635,0.741825 -0.473295,1.204418c0.150988,0.342674 0.488045,0.547306 0.842285,0.547306c0.123158,0 0.249275,-0.024757 0.369013,-0.077736l6.098227,-2.648319c0.00449,-0.001751 0.008015,-0.003494 0.011896,-0.005245l0.003525,-0.002098c0.013952,-0.005226 0.021341,-0.018108 0.03401,-0.022655c0.095819,-0.047745 0.185049,-0.103172 0.256975,-0.178116c0.031284,-0.031391 0.048794,-0.071484 0.072701,-0.107033c0.044163,-0.058571 0.092964,-0.116085 0.119728,-0.18652c0.021702,-0.054722 0.023796,-0.114315 0.034729,-0.172531c0.011978,-0.058578 0.035103,-0.11087 0.035103,-0.170135l0,-9.024929c0,-0.503723 -0.412502,-0.912991 -0.921291,-0.912991zm14.380898,1.55999c0,-3.502062 -2.857491,-6.340355 -6.385029,-6.340355c-1.783871,0 -3.392498,0.727533 -4.546528,1.898127c-1.10162,-0.291422 -2.253857,-0.461533 -3.448559,-0.461533c-1.227707,0 -2.41115,0.178118 -3.5403,0.485241c-1.158876,-1.183491 -2.775873,-1.921835 -4.569544,-1.921835c-3.526539,0 -6.385042,2.838293 -6.385042,6.340355c0,1.685852 0.66803,3.213764 1.749374,4.349855c-0.407553,1.27029 -0.630495,2.622524 -0.630495,4.028074c0,7.335285 5.988609,13.281715 13.376007,13.281715c7.387726,0 13.37598,-5.94643 13.37598,-13.281715c0,-1.439379 -0.23835,-2.820856 -0.664196,-4.119419c1.034298,-1.124939 1.668331,-2.616585 1.668331,-4.258511zm-14.380116,18.917187c-5.854225,0 -10.614777,-4.728062 -10.614777,-10.539257c0,-5.811871 4.760551,-10.540314 10.614777,-10.540314c5.854214,0 10.614117,4.727402 10.614117,10.540314c0,5.812935 -4.761665,10.539257 -10.614117,10.539257z' /></svg>"
    },
    {
        "id": "stop",
        "design": "<svg 'stop' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m27.574291,45.305016c-4.632526,-0.539921 -8.599043,-2.956253 -9.801231,-6.016647c-0.571796,-1.562107 -0.237022,-3.200977 -0.349676,-4.797009c-0.02125,-4.097319 -0.032148,-8.194622 -0.048065,-12.29196c0.5439,-1.271812 2.839781,-1.940762 4.586306,-1.311958c0.151926,-0.33407 0.040537,-0.933273 0.093815,-1.367292c-0.309727,-1.192934 0.956753,-2.406437 2.796301,-2.487171c1.055569,-0.004623 2.319447,0.534348 1.838345,-0.659157c-0.326197,-1.22923 1.109934,-2.629338 3.074085,-2.516052c1.876955,-0.117004 3.302385,1.166246 3.075861,2.355721c0.087322,0.710106 2.376114,-0.465269 3.176174,0.324165c1.020489,0.406866 1.718578,1.183214 1.525787,1.985897c0.059219,2.198767 -0.079636,4.411524 0.148861,6.599688c1.678356,-0.570763 4.069706,0.130581 4.413494,1.386257c-0.038036,3.901281 0.096916,7.805277 -0.102123,11.704264c-0.675636,4.010567 -6.353085,7.402004 -12.414225,7.161133c-0.671593,0.001205 -1.349152,0.005615 -2.013708,-0.069878l0,0zm4.144604,-1.065292c5.087837,-0.577629 9.090359,-3.882301 8.803738,-7.357288c0.03891,-3.358665 0.19709,-6.72225 0.011879,-10.078623c-0.118362,-1.227179 -3.146416,-0.930098 -2.950649,0.202238c-0.000904,2.4893 -0.001842,4.978561 -0.002754,7.467831c-0.942844,0.653172 -2.63026,0.259758 -3.760769,0.790573c-2.513264,0.736702 -4.110197,2.5406 -4.165022,4.356895c-1.355473,1.412052 -1.969175,-0.885948 -1.191645,-1.64304c0.898951,-2.283634 4.062027,-3.987541 7.536446,-4.2113c-0.028465,-5.253647 0.073601,-10.509203 -0.091225,-15.76137c-0.983784,-1.487717 -3.740284,-0.182825 -3.006622,1.119949c-0.072273,3.972012 -0.007538,7.944899 -0.108673,11.916632c-0.657066,0.706188 -1.902111,0.036453 -1.495972,-0.615263c-0.028103,-4.975479 -0.056198,-9.950989 -0.084217,-14.926493c-0.527191,-0.878681 -2.8629,-0.741407 -2.899654,0.223005c-0.028889,5.13463 -0.057741,10.269213 -0.086594,15.403809c-0.614614,0.581667 -1.877007,0.075958 -1.537077,-0.558952c-0.02268,-3.867714 0.063181,-7.737127 -0.086903,-11.603443c-0.038393,-1.150755 -2.906487,-1.122253 -2.94478,-0.055029c-0.057314,3.964554 0.015406,7.931257 -0.157328,11.894115c0.162575,1.009403 -1.953699,0.527925 -1.46603,-0.235643c-0.02594,-2.694052 0.070496,-5.391058 -0.093107,-8.082661c-0.964598,-1.660814 -3.849342,-0.28973 -3.044889,1.09071c0.009611,4.777199 -0.064831,9.556807 0.115026,14.332556c0.441156,3.669289 5.699211,6.690632 11.16922,6.449467c0.515951,-0.01442 1.030304,-0.054001 1.537601,-0.118675l0,0z' /></svg>"
    },
    {
        "id": "phones",
        "design": "<svg id='phones' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m41.627533,43.155888c0,0.433743 -0.321262,0.785099 -0.717892,0.785099l-4.596909,0c-0.396626,0 -0.717873,-0.351357 -0.717873,-0.785099l0,-10.681686c0,-0.433777 0.321247,-0.78532 0.717873,-0.78532l4.596909,0c0.396629,0 0.717892,0.351543 0.717892,0.78532l0,10.681686zm-17.019249,0c0,0.433743 -0.321348,0.785099 -0.717886,0.785099l-4.596985,0c-0.396555,0 -0.717873,-0.351357 -0.717873,-0.785099l0,-10.681686c0,-0.433777 0.321318,-0.78532 0.717873,-0.78532l4.596985,0c0.396538,0 0.717886,0.351543 0.717886,0.78532l0,10.681686zm5.55372,-28.964903c-8.318426,0 -15.071079,7.318724 -15.17477,16.389082l2.633526,0c0.085398,-7.496748 5.666698,-13.545443 12.541245,-13.545443c6.874628,0 12.45587,6.048695 12.540285,13.545443l2.633526,0c-0.102699,-9.070358 -6.857342,-16.389082 -15.173811,-16.389082zm-15.15345,24.697779l2.585787,0l0,-8.325222l-2.585787,0l0,8.325222zm27.672415,-8.326405l0,8.325237l2.681263,0l0,-8.325237l-2.681263,0z' /><svg>"
    },
    {
        "id": "bubble",
        "design": "<svg id='bubble' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m18.103428,20.458498l0,0c0,-1.923382 1.269676,-3.482557 2.83592,-3.482557l1.289036,0l0,0l6.187496,0l11.601553,0c0.752129,0 1.473446,0.366877 2.005352,1.020023c0.531788,0.653093 0.830643,1.538887 0.830643,2.462534l0,8.706074l0,0l0,5.223795l0,0c0,1.923244 -1.269676,3.482502 -2.835995,3.482502l-11.601553,0l-8.083155,8.855072l1.895658,-8.855072l-1.289036,0c-1.566244,0 -2.83592,-1.559258 -2.83592,-3.482502l0,0l0,-5.223795l0,0l0,-8.706074z'/><svg>"
    },
    {
        "id": "book",
        "design": "<svg id='book' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m16.915262,38.59819c-0.008537,-7.516354 -0.017065,-15.032625 -0.025595,-22.548887c7.717567,0.086399 15.467854,-0.20466 23.159363,0.221811c3.750671,0.974152 3.210178,7.03829 3.149208,11.567698c-0.16452,3.415716 2.191429,10.187033 -3.927769,11.20479c-3.050713,0.000118 -3.062744,0.953625 -2.751377,2.678486c0.361393,2.584015 -0.687656,8.372559 -5.699326,4.70356l-13.904505,-7.827457l0,0zm23.619551,-2.457161c0.012417,-6.756124 -0.091045,-12.520109 -0.60305,-16.971455c-4.549118,-1.514156 -10.696316,-0.777271 -15.843458,-0.800314c-2.023352,0.720123 4.799643,3.111162 6.246771,4.038904c5.493626,1.994816 7.132713,5.622646 6.184059,9.722633c0,1.594845 0,3.189728 0,4.784595c1.013081,-0.000919 3.109047,-0.368191 4.015678,-0.774364l0,0z'/></svg>"
    },
    {
        "id": "star",
        "design": "<svg id='star' width='60' viewBox='0 0 60 60'><circle cx='30' cy='30' r='25' fill='none' stroke='#000'/><path d='m14.5,25.638718l12.127514,0l3.747478,-11.888718l3.747524,11.888718l12.127483,0l-9.811348,7.347534l3.747684,11.888748l-9.811344,-7.347744l-9.811325,7.347744l3.747673,-11.888748l-9.81134,-7.347534l0,0z'/></svg>"
    },
    {
      "id": "codetalk",
      "design": "<svg id='codetalk' width='60' viewBox='0 0 60 60'><circle stroke='#000' stroke-width='3' fill='none' r='25' cy='30' cx='30'/><path d='m30.732487,17.308161c-8.802029,0 -15.9375,5.596745 -15.9375,12.499556c0,2.358761 0.84359,4.563152 2.294928,6.445904l-2.294928,5.261673l6.38986,-1.713997c2.662628,1.565929 5.961702,2.506866 9.54764,2.506866c8.802128,0 15.9375,-5.596779 15.9375,-12.500446s-7.135372,-12.499556 -15.9375,-12.499556l0,0zm-2.613773,17.299662l-2.661701,2.78117l-7.319664,-7.655771l7.318565,-7.657589l2.6628,2.78747l-4.65715,4.870119l4.65715,4.874601zm8.049713,2.777477l-2.660614,-2.784725l4.658413,-4.869152l-4.658413,-4.871059l2.660614,-2.784731l7.319702,7.650341l-7.319702,7.659327l0,0z' fill-opacity='null' stroke-opacity='null' stroke-width='1.5' stroke='null' fill='#000000'/></svg>"
    },
    { 
      "id": "world",
      "design": "<svg id='world' width='60' viewBox='0 0 60 60'><circle stroke='#000' stroke-width='3' fill='none' r='25' cy='30' cx='30'/><path d='m30.000002,3.5c-14.842976,0 -26.875002,12.060011 -26.875002,26.937498c0,14.87747 12.032026,26.93751 26.875002,26.93751c14.842962,0 26.874998,-12.06004 26.874998,-26.93751c0,-14.877487 -12.032036,-26.937498 -26.874998,-26.937498zm5.839499,40.410141c-0.146,0.11842 -0.338234,0.240723 -0.193981,0.383541c0.14426,0.144604 -0.16647,0.242874 -0.16647,0.315006s0.192226,0.456028 0.095921,0.622871c-0.095921,0.170376 -0.168201,0.41325 -0.240154,0.557854c-0.072308,0.142811 -0.242325,0.287018 -0.192211,0.504101c0.046192,0.214909 -0.192596,0.142803 -0.192596,0.359493c0,0.214958 0.214447,0.120544 0.166489,0.3857c-0.046196,0.266891 -0.166489,0.338997 -0.166489,0.52813c0,0.19268 0.118511,0.457806 0.118511,0.529942s-0.118511,0.315315 -0.286713,0.504105c-0.170025,0.193008 -0.2864,0.315304 -0.266296,0.431965c0.026085,0.120552 0.192204,0.266888 0.168236,0.341145c-0.024002,0.068573 -0.238407,0.311085 -0.214439,0.479729c0.0261,0.166843 0.238407,0.098248 0.286739,0.215267c0.047962,0.120186 -0.286739,0.218472 -0.144264,0.339001c0.144264,0.118813 0.338226,0.094402 0.288525,0.385712c-0.035282,0.207485 0.118156,0.301865 0.232769,0.366928c-1.647457,0.409363 -3.361519,0.652245 -5.13483,0.652245c-11.760483,0 -21.325773,-9.58757 -21.325773,-21.375376c0,-3.841957 1.02986,-7.441391 2.806701,-10.559006c0.146359,-0.077776 0.253568,-0.127625 0.316358,-0.114882c0.120265,0.024048 0.146032,0.193016 0.33823,0.241104c0.192575,0.048056 0.360801,-0.144604 0.481068,-0.217056c0.118145,-0.07214 0.214428,-0.361311 0.094157,-0.337255c-0.12024,0.024021 -0.432739,0 -0.432739,0s0.338582,-0.192682 0.338582,-0.313208s0.046209,-0.313238 0.238416,-0.385347c0.190459,-0.074232 0.190459,-0.02615 0.070203,0.263027c-0.120273,0.289169 0.242278,0.168629 0.384755,0.048435s0.240211,-0.024393 0.502954,-0.193048c0.264164,-0.168606 0.264164,-0.264772 0.40842,-0.264772c0.144228,0 0.408758,0.264772 0.553006,0.168623c0.142502,-0.096497 0.553026,0.120209 0.793203,0.120209c0.238432,0 1.007987,0.313213 1.15401,0.313213c0.144251,0 0.576635,0.166853 0.600969,0.480064c0.023998,0.313208 0.166473,0.289169 0.310402,0.289169s0.481039,0.120546 0.481039,0.2411c0,0.120543 -0.096275,0.602377 0.144266,0.722912c0.238432,0.118448 0.456749,0.313238 0.552673,0.264801c0.096287,-0.04808 0,-0.431644 -0.118166,-0.481852c-0.120262,-0.048069 -0.050076,-0.216692 -0.096275,-0.313208c-0.047953,-0.094376 0.144253,-0.094376 0.216202,0.072466c0.072292,0.168636 0.264511,0.481844 0.384796,0.481844c0.118137,0 0.384428,0.289186 0.310724,0.457804c-0.072319,0.168612 0.07192,0.409361 0.288481,0.409361c0.214439,0 0.480732,0.337597 0.576645,0.361643c0.096291,0.02405 0.216568,0.144587 0.216568,0.216692c0,0.074247 0.120243,0.481823 0.120243,0.650454c0,0.166876 -0.074055,0.841717 -0.098026,1.106499s0.192223,0.722946 0.432749,0.964014c0.238405,0.240742 0.454613,0.698555 0.598867,0.795048c0.146011,0.096516 0.240526,0.361292 0.456728,0.337259c0.216539,-0.024052 0.360811,0.144569 0.553024,0.481823c0.192194,0.337257 0.384418,0.889795 0.528687,0.93788c0.144234,0.048065 0.384766,0.217049 0.262764,0.337242c-0.11853,0.118782 -0.310743,0.385674 -0.094551,0.385674c0.216553,0 0.288496,-0.120544 0.456749,0.098286c0.166473,0.214922 0.384794,0.33547 0.359041,0.481817c-0.024342,0.14282 0.192202,0.190905 0.288139,0.214956c0.096285,0.024019 0.312481,0.457781 0.529024,0.26512c0.2162,-0.192678 -0.286724,-0.480076 -0.432739,-0.604151c-0.144253,-0.118776 0,-0.383907 -0.336472,-0.648687c-0.33646,-0.265133 -0.2885,-0.457804 -0.52902,-0.650822c-0.240171,-0.192642 -0.430645,-0.36129 -0.19223,-0.529911c0.240538,-0.168623 0.26454,0.168621 0.360817,0.38533c0.095917,0.2153 0.598848,0.650806 0.815416,0.841715c0.216198,0.192663 0.602747,0.867149 0.720913,0.867149s0.456707,0.385689 0.456707,0.385689s0.190458,0.311449 0.118519,0.407602c-0.072306,0.096495 0.098021,0.457781 0.266266,0.554291c0.166468,0.096514 0.841179,0.407608 0.937466,0.457809c0.096298,0.049835 0.28673,0.409704 0.553032,0.409704c0.262379,0 0.456722,0.025816 0.528666,0.097925c0.072296,0.070698 0.286732,0.359877 0.432745,0.193007c0.144266,-0.170731 0.166468,-0.242849 0.38442,-0.242849c0.21657,0 0.310736,0.168631 0.431017,0.289171c0.120262,0.120548 0.456724,0.435516 0.624964,0.411491c0.168228,-0.02404 0.38476,0.192642 0.504677,0.118431s0.312506,0.046295 0.407017,0.096497c0.099802,0.048065 0.432758,0.218834 0.410509,0.50412c-0.023952,0.290928 0.190472,0.361282 0.336487,0.433739c0.144245,0.072105 0.33647,0.240738 0.458494,0.36129c0.118515,0.116623 0.380909,0.142788 0.454956,0.214893c0.071968,0.072491 0.120277,0.217052 0.336483,0.096523c0.214447,-0.118774 0.170364,-0.335464 0.170364,-0.335464s0.238388,-0.048088 0.358692,0.04805c0.118153,0.092621 0.192173,0.407944 0.266258,0.456032c0.070187,0.048073 0.212685,0.409748 0.116398,0.670994c-0.0942,0.268673 -0.070198,0.529934 -0.168243,0.529934c-0.09626,0 -0.214413,0.315331 -0.360786,0.387428c-0.140358,0.072472 -0.526924,0.409714 -0.502945,0.530285c0.024357,0.116661 0.242298,0.477943 0.192574,0.648682c-0.046207,0.168652 -0.358692,0.361275 -0.284977,0.626415c0.07019,0.266914 0.577007,0.339008 0.597466,0.57835c0.025734,0.242516 0.386181,0.772751 0.43449,1.01173c0.046211,0.241108 0.454632,0.50412 0.454632,0.8396c0,0.341137 0.577011,0.556084 0.697292,0.57835c0.116367,0.02404 0.336449,0.242874 0.502926,0.314953s0.312492,0.214939 0.430965,0.409733s0.098064,0.483612 0.098064,0.55431c0,0.072147 -0.072285,0.815197 -0.144264,1.24894c-0.074043,0.435539 0.092407,0.773151 -0.050072,0.895462zm-15.517673,-22.391352c0.071949,0.024017 0.216204,0.168631 0.288509,0.168631c0.073696,0 0.432749,0.289158 0.528667,0.385674c0.098045,0.0965 0.098045,0.36128 -0.023964,0.385319s-0.192223,-0.264772 -0.216215,-0.385319c-0.024334,-0.120573 -0.264517,-0.120573 -0.384785,-0.192659c-0.120264,-0.072475 -0.388315,-0.428116 -0.192213,-0.361645zm30.961613,9.678747c-0.266277,0.337261 -0.24054,0.504097 -0.360794,0.529903c-0.118153,0.024055 0.120255,0.120564 0.166473,0.35952c0.040569,0.20752 -0.120235,0.415398 0.116386,0.606293c-0.898659,8.560966 -6.860176,15.631512 -14.822495,18.139309c-0.012718,-0.020489 -0.034908,-0.046299 -0.038799,-0.063255c-0.049717,-0.144264 -0.049717,-0.431652 0.118492,-0.52816c0.168243,-0.09827 0.577003,-0.431644 0.671192,-0.504108c0.096249,-0.074226 0.240505,-0.409359 0.168224,-0.457775c-0.07021,-0.048111 -0.428886,0 -0.480747,-0.072136c-0.047928,-0.072464 -0.047928,-0.170738 0.19223,-0.337227c0.240562,-0.168972 0.360798,-0.411491 0.456734,-0.482224c0.096275,-0.072113 0.286736,-0.216682 0.360806,-0.387066c0.07019,-0.166866 -0.075813,-0.072475 -0.218277,-0.072475s-0.216213,-0.263012 -0.216213,-0.383556s0.36042,0.048065 0.626736,0.096153c0.264488,0.044521 0.142464,-0.120201 0.118149,-0.263027c-0.024014,-0.144588 0.04829,-0.387421 0.194309,-0.314972c0.140369,0.072113 0.885582,-0.024025 0.981899,-0.048424c0.096294,-0.024025 0.358688,-0.455677 0.454948,-0.577991c0.098045,-0.120579 0.11816,-0.239323 0,-0.311451c-0.12027,-0.074215 -0.264519,-0.341129 -0.310696,-0.40971c-0.047958,-0.075989 -0.072315,-0.507652 -0.02401,-0.629959c0.046215,-0.117001 0,0.69854 0.334705,0.79681c0.338264,0.096512 0.528694,0.144585 0.841171,-0.144562c0.312477,-0.28743 0.551247,-0.481861 0.577026,-0.672729c0.023964,-0.192673 0.096275,-0.387474 0.216171,-0.456028c0.120293,-0.072132 0.192562,0.190857 0.336826,-0.120564c0.144272,-0.314987 0.288143,-0.290939 0.432415,-0.553936c0.142467,-0.266922 -0.240189,-0.60239 0.044441,-0.797184c0.290253,-0.190884 0.795311,-0.431622 0.795311,-0.431622s0.144268,-0.072498 0.432728,-0.144592c0.2864,-0.070332 0.598877,-0.026176 0.695152,-0.166859c0.095943,-0.146355 0.192211,-0.457806 0.336464,-0.626415c0.146015,-0.170761 0.3125,-0.433758 0.240555,-0.554314c-0.072281,-0.120552 0.192211,-0.652229 0.168236,-0.795055c-0.023983,-0.144596 -0.240517,-0.483604 0.120274,-0.771008s0.743122,-0.724705 0.769211,-0.841339c0.021862,-0.120571 0.312454,-0.626427 0.284584,-0.869274c-0.022186,-0.239372 -0.284584,-0.528152 -0.453186,-0.602383c-0.17001,-0.068581 -0.528702,-0.092621 -0.672935,-0.285629s-0.553001,-0.385349 -0.697258,-0.337261c-0.142139,0.048416 -0.384441,0.09473 -0.57666,-0.02758c-0.192551,-0.116989 -0.502895,-0.265125 -0.62318,-0.359863c-0.122028,-0.094387 -0.432777,-0.166515 -0.577034,-0.166515s-0.120255,-0.098278 -0.336456,0.190918c-0.216576,0.290936 0,0.387074 -0.384773,0.33725c-0.386227,-0.044571 0.046215,-0.070362 0.266251,-0.359543c0.212719,-0.287403 -0.025726,-0.457779 -0.266251,-0.383915c-0.240204,0.072472 -0.071945,0.217056 -0.45676,0.289196c-0.38266,0.070698 -0.38266,-0.17041 -0.14209,-0.216724c0.240139,-0.048088 0.671162,-0.265133 0.671162,-0.359524c0,-0.098274 -0.04797,-0.363422 -0.240551,-0.363422s-0.144241,-0.238945 -0.430611,-0.550423c-0.288513,-0.31498 -0.649319,-0.508015 -0.939545,-0.46133c-0.284664,0.048061 -0.502991,0.120182 -0.647232,-0.141068c-0.144253,-0.266891 -0.312469,-0.314972 -0.410526,-0.457802c-0.094151,-0.144585 -0.336452,0 -0.408424,-0.072094s-0.072289,-0.072491 -0.072289,-0.072491s-0.312489,0.072491 -0.14217,-0.144554c0.166176,-0.216698 0.238453,-0.626411 0.166176,-0.602356c-0.070198,0.024025 -0.192257,0.363411 -0.310417,0.339363c-0.1185,-0.024048 -0.026077,-0.074249 -0.266262,-0.217068c-0.240562,-0.144577 -0.623196,-0.024048 -0.623196,0.096504c0,0.120564 -0.120255,0.216702 -0.120255,0.216702s-0.072323,-0.070351 -0.144257,-0.216702c-0.071957,-0.144585 -0.408756,-0.168598 -0.577023,-0.024021c-0.166435,0.144585 -0.262386,-0.363419 -0.382656,-0.363419s-0.3587,0.120544 -0.480713,0.341133c-0.118523,0.214928 -0.070179,0.528122 -0.170334,0.504112c-0.092411,-0.024048 -0.116402,-0.431999 -0.092411,-0.578358c0.022198,-0.146343 0.286713,-0.385303 0.092411,-0.433735c-0.190464,-0.04808 -0.478622,0.241074 -0.597111,0.265125c-0.120266,0.02404 -0.36047,0.192657 -0.504704,0.387451c-0.142509,0.190891 -0.214466,0.31142 -0.360821,0.383526c-0.142155,0.072472 -0.356949,0 -0.30862,-0.072105c0.046196,-0.072449 -0.410522,-0.335472 -0.4828,-0.241089c-0.07373,0.096512 -0.286388,0.16864 -0.502956,0.266888c-0.216213,0.096504 -0.41053,-0.120529 -0.45673,-0.21669s-0.146019,-0.118771 -0.168251,-0.433743c-0.023987,-0.311455 0.050087,-0.650463 0.120285,-0.841347c0.070179,-0.193031 -0.360464,-0.578352 -0.528687,-0.556074c-0.168592,0.027552 -0.336817,0.194424 -0.5033,0.168613c-0.169975,-0.022266 -0.09593,-0.07036 -0.360445,-0.07036c-0.264517,0 -0.047966,-0.046659 0,-0.265114c0.046219,-0.214941 -0.096281,-0.506218 0.170004,-0.698893c0.262753,-0.192669 0.168583,-0.650465 0,-0.672741c-0.170004,-0.025801 -0.482485,0.072475 -0.696907,0.04808c-0.214436,-0.025805 -0.384789,0.168629 -0.31249,0.383917c0.071951,0.216694 -0.12027,0.361282 -0.19223,0.339027c-0.072302,-0.024042 -0.16646,-0.144602 -0.432732,0.048079c-0.26276,0.190891 -0.358677,0.118774 -0.623198,-0.096163c-0.26454,-0.218836 -0.553024,-0.433765 -0.600986,-0.771021c-0.047977,-0.33725 -0.074083,-0.674837 0.023966,-0.86751c0.09453,-0.192657 0.09453,-0.528147 -0.047979,-0.578327c-0.144247,-0.046312 0.166481,-0.287064 0.334721,-0.335499c0.169994,-0.048075 0.432751,-0.264772 0.480721,-0.361282c0.047955,-0.096506 0.288485,-0.07423 0.550886,-0.07423c0.264532,0 0.312502,0 0.577005,0.144596c0.264526,0.144579 0.312481,-0.072138 0.312481,-0.144596c0,-0.072128 0.096292,-0.216715 0.384821,-0.192654c0.288462,0.024021 0.695107,-0.096512 0.769194,-0.024061s0.214443,0.361311 0.358685,0.265154c0.146019,-0.094751 0.1922,-0.265154 0.242306,0.025791c0.0462,0.287416 0.166096,0.722925 0.384411,0.795042c0.214451,0.072472 0.096283,0.359531 0.31073,0.383558c0.212677,0.024405 0.314255,-0.455675 0.242317,-0.624294c-0.074081,-0.166859 -0.218323,-0.67308 -0.338596,-0.79328c-0.118168,-0.120537 -0.118168,-0.433744 0.118507,-0.530266c0.240192,-0.096144 0.817169,-0.578342 0.983654,-0.720808c0.17001,-0.14633 0.624981,-0.266897 0.482494,-0.459909c-0.143925,-0.192654 -0.192253,-0.311081 -0.192253,-0.457794s0.144291,-0.096157 0.216583,0s0.3587,-0.144239 0.286396,-0.26479c-0.070187,-0.118763 -0.047997,-0.287403 0.120266,-0.265135c0.168213,0.024052 0.214436,-0.120537 0.144253,-0.21669c-0.071968,-0.096518 0.168213,-0.21706 0.336449,-0.168985c0.170361,0.048433 0.600964,-0.024035 0.67329,-0.12019c0.070175,-0.096504 -0.144245,-0.193031 -0.144245,-0.385683c0,-0.192652 0.286385,-0.361284 0.456738,-0.385315c0.168224,-0.024059 0.382645,0 0.408421,-0.072496c0.022217,-0.072098 0.264484,-0.265106 0.286728,-0.096146c0.025749,0.168642 0,0.457796 0.192215,0.457796c0.192547,0 0.429237,-0.217047 0.502914,-0.239309c0.070576,-0.024042 0.529041,-0.120552 0.625004,-0.144602c0.096264,-0.024035 0.671513,-0.072109 0.600979,-0.240726c-0.07198,-0.166851 -0.144253,-0.335493 -0.217987,-0.407961c-0.072289,-0.072119 -0.142467,0.024038 -0.24054,0.144592c-0.094162,0.120541 -0.264488,0.120541 -0.310688,0.024025c-0.04797,-0.094379 0.022205,-0.383543 -0.144268,-0.28915c-0.170029,0.096495 -0.192188,0.193001 -0.290272,0.144571c-0.095905,-0.048077 -0.190437,-0.21669 -0.190437,-0.21669s0.238785,-0.118786 0.070206,-0.337263c-0.166142,-0.217049 -0.408428,-0.168619 -0.647205,-0.046305c-0.240173,0.118422 -0.217991,0.094391 -0.504711,0.16687s-0.432751,0.144585 -0.432751,0.144585s0.386543,-0.239328 0.55304,-0.385689c0.168179,-0.144581 0.386532,-0.216702 0.528675,-0.361288c0.144215,-0.144588 0.527279,0.072115 0.527279,0.072115s0.193989,-0.192648 0.193989,-0.072115s-0.049736,0.433418 0.094135,0.433418c0.14637,0 0.553009,-0.192682 0.388313,-0.24251c-0.171772,-0.048433 0.238792,0 0.405235,-0.120556c0.170017,-0.12056 0.358696,-0.12056 0.456745,-0.166853c0.095936,-0.048088 0.169987,-0.265137 0.336475,-0.265137c0.169971,0 0.240166,0.217049 0,0.361637s-0.264526,0.505882 -0.384796,0.602392c-0.118164,0.096142 -0.047947,0.216698 0.144257,0.192654c0.192551,-0.024044 0.358696,0.024044 0.529026,-0.024044s0.264168,0.048088 0.310741,0.120207c0.047951,0.072458 0.192181,-0.072119 0.192181,-0.072119s0.3125,-0.072113 0.40876,0.048061c0.097755,0.118773 0.170025,-0.072105 0.097755,-0.192656c-0.071983,-0.118408 -0.170029,-0.238974 -0.24025,-0.385311c-0.072262,-0.144598 -0.168182,-0.193027 -0.358643,-0.144598c-0.192593,0.048088 -0.240559,-0.048429 -0.360806,-0.118769c-0.119938,-0.074247 -0.217968,0.096497 -0.119938,-0.074247c0.097691,-0.166857 0.14389,-0.216698 0.216217,-0.361279c0.071934,-0.144592 0.386547,-0.409725 0.071934,-0.48008c-0.312447,-0.07423 -0.410175,-0.120541 -0.456715,-0.265129c-0.047966,-0.144583 -0.408409,-0.40937 -0.502964,-0.40937c-0.097679,0 -0.430603,0 -0.456703,-0.120537c-0.024002,-0.120567 -0.264153,-0.385689 -0.384457,-0.505878c-0.118496,-0.12055 -0.576984,-0.650814 -0.648911,-0.698887c-0.072315,-0.048086 -0.168274,-0.024054 -0.38483,0.265129c-0.214375,0.290949 -0.406654,0.339018 -0.576962,0.266903c-0.168243,-0.072474 -0.192242,-0.048435 -0.35693,-0.241093c-0.17178,-0.192657 0.166481,-0.216705 0.094517,-0.33725c-0.074074,-0.118797 -0.456753,-0.168652 -0.697289,-0.192665c-0.240177,-0.02405 -0.408417,-0.289194 -0.769188,-0.313208c-0.358673,-0.024416 -0.791473,0.048071 -0.911728,0.048071c-0.118141,0 -0.118141,0.168615 -0.166142,0.433756c-0.050053,0.265116 0.166142,0.337261 -0.050053,0.385326c-0.214439,0.048439 -0.312481,0.072479 -0.096291,0.168627c0.21653,0.096516 0.505054,0.482195 0.505054,0.482195s0,0.216702 -0.170368,0.337236c-0.166107,0.120554 -0.336464,0.240742 -0.43063,0.098278c-0.098026,-0.146702 -0.360779,-0.120548 -0.28672,0.024035c0.070198,0.144602 0.214458,0.216721 0.214458,0.361301c0,0.142811 0.216522,0.504101 0.072262,0.624636c-0.144245,0.120562 -0.310726,0.025829 -0.430984,0.048088s-0.242287,-0.192646 -0.144238,-0.240746c0.094528,-0.048433 -0.025749,-0.409712 -0.025749,-0.409712s-0.286758,0.409712 -0.264523,0.192665c0.0261,-0.216711 -0.118172,-0.240765 -0.118172,-0.409369c0,-0.168623 -0.146343,-0.241091 -0.359028,-0.193024c-0.217953,0.04842 -0.480701,-0.073879 -0.891241,-0.146336c-0.406645,-0.07213 -0.574884,-0.118452 -0.911337,-0.289167c-0.336824,-0.168625 -0.456755,-0.048092 -0.624973,-0.024052c-0.168598,0.024052 -0.0963,-0.337252 -0.312481,-0.383549c-0.214788,-0.050209 -0.334694,0.046297 -0.383038,-0.266916c-0.047955,-0.311449 0.072321,-0.385675 0.599218,-0.722933c0.528696,-0.33724 0.456738,-0.481829 0.865511,-0.529905c0.40666,-0.048435 0.600971,0.048077 0.600971,-0.072474s0.095938,-0.602377 0.095938,-0.361292s0.484596,0.2556 0.266285,0.424219c-0.214422,0.168972 -0.095922,0.193007 0.074068,0.193007c0.168234,0 0.478954,-0.168621 0.478954,-0.168621s0.38443,-0.168621 0.480717,-0.024385c0.098049,0.144587 0.098049,0.289169 0.266281,0.289169s0.526939,-0.192673 0.214439,-0.361273c-0.310726,-0.168642 -0.502956,-0.144608 -0.695148,-0.337276s-0.144253,-0.120539 -0.360811,-0.072449c-0.214437,0.048416 -0.214437,-0.072124 -0.28813,-0.072124s-0.192591,0.048073 -0.240549,-0.048077c-0.046206,-0.096497 0.025732,-0.120556 0.268036,-0.120556c0.238436,0 0.526934,0.072104 0.526934,0.072104s0.286713,-0.09614 0.358665,-0.120516c0.072296,-0.024048 0.456745,-0.072132 0.384781,-0.287064c-0.074043,-0.217052 -0.312485,-0.217052 -0.384781,-0.289165s0.144264,-0.166851 0.264538,-0.216715c0.120243,-0.048422 0.456726,0 0.456726,0s0.216572,0.024031 0.216572,-0.07246s-0.051857,-0.216719 0.094143,-0.144579s0,0.289173 0.216209,0.24107c0.214779,-0.04841 0.2645,0 0.382999,0.07214c0.119938,0.072453 -0.02396,0.361271 -0.142513,0.40971c-0.12022,0.046328 -0.312462,0.142826 -0.047943,0.166849c0.266319,0.025824 0.454659,0.025824 0.454659,0.025824s0.170338,-0.168631 0.242279,-0.31321c0.070225,-0.144596 0.192577,-0.0481 0.286758,0c0.096291,0.046303 0.456703,0.120537 0.120239,0.216688c-0.338547,0.096521 -0.408745,0.217056 -0.48069,0.337591c-0.070549,0.120209 -0.098053,0.192673 -0.408791,0.120209c-0.314274,-0.072113 -0.480709,-0.048073 -0.553013,0.072464c-0.071953,0.118439 -0.023979,0.505878 0.098045,0.457783c0.116375,-0.048052 0.238415,-0.048052 0.382668,-0.096481c0.144276,-0.048086 0.721294,0.048429 0.863747,0.024033c0.144253,-0.024033 0.386539,0.241089 0.458496,0.19302c0.072296,-0.048433 0.216213,0.096148 0.3587,0.192661c0.144272,0.096502 0.096264,-0.216705 0.358665,-0.024048c0.266296,0.192663 0.120304,0.192663 0.266296,0.192663c0.140724,0 0.454956,0.024036 0.454956,0.024036s0.025753,-0.238955 0.266277,-0.192652c0.24054,0.048075 0.452873,0.313208 0.428902,0.118427c-0.022251,-0.190901 0.023972,-0.335133 -0.166481,-0.479712c-0.192211,-0.144587 -0.502945,-0.241102 -0.552677,-0.313208c-0.047955,-0.072477 -0.096268,-0.168987 -0.02396,-0.21706c0.071953,-0.046314 0.408417,0.02404 0.598881,0.146362c0.192528,0.120531 0.360794,0.241089 0.505039,0.144581c0.142101,-0.096159 0.314232,-0.144581 0.38443,-0.216719c0.070171,-0.074224 0.240532,-0.289165 0.240532,-0.289165s-0.723038,-0.094393 -0.815434,-0.216711c-0.098042,-0.120539 -0.43449,-0.289162 -0.5308,-0.289162s-0.358688,0.168623 -0.454956,-0.072475s-0.095947,-0.529911 -0.193985,-0.553947c-0.092407,-0.024399 -1.103935,-0.168964 -1.246395,-0.241074c-0.144257,-0.072497 -0.72126,-0.241098 -0.937469,-0.361309s-0.529057,-0.289163 -0.719536,-0.289163c-0.192181,0 -0.985367,0.096166 -1.129631,0.072113c-0.144249,-0.024036 -0.576996,0.048422 -0.745234,0.072444c-0.168234,0.024058 0.216551,0.337266 -0.142498,0.409383c-0.360434,0.072476 -0.312483,0.120553 -0.240179,-0.240732c0.070194,-0.361642 -0.242287,-0.4578 -0.553003,-0.313208c-0.312492,0.144557 -0.817184,0.240732 -0.69692,0.409373c0.119919,0.168601 -0.022209,0.291285 0.216188,0.457773c0.240555,0.168642 0.338608,0.21707 0.647205,0.193029c0.314226,-0.024387 0.626709,0.046312 0.626709,0.046312s0,0.290936 -0.118139,0.33725c-0.12026,0.048071 -0.312483,0.048071 -0.36257,0.192661c-0.0462,0.144579 -0.286366,0.217039 -0.286366,0.144579s0.119902,-0.313208 -0.04833,-0.433758c-0.166483,-0.120197 -0.216187,-0.144577 -0.40843,-0.024027c-0.192564,0.120544 -0.214766,0.168615 -0.312481,-0.024036c-0.09627,-0.192669 -0.38476,-0.361313 -0.38476,-0.361313s-0.192221,-0.239311 -0.336491,-0.35987c-0.142466,-0.120173 -0.407009,-0.096151 -0.432743,0.024402c-0.023983,0.118429 0.047989,0.23896 0.14427,0.4578c0.096277,0.216711 0.1922,0.624289 0.02397,0.650455c-0.16824,0.024036 -0.192223,0.048069 -0.360458,0.096498c-0.168215,0.048077 -0.240538,-0.072462 -0.240538,-0.265133s-0.07407,-0.361641 -0.023966,-0.433744c0.047962,-0.072464 -0.192223,0.0502 -0.432756,0c-0.240189,-0.046322 -0.430618,0.096498 -0.192225,0.170393c0.240536,0.072472 0.290272,0.359512 0.071953,0.431986c-0.216194,0.072109 -1.0334,0 -1.297905,0s-0.647198,0.072109 -0.721254,-0.072474c-0.071947,-0.144596 0.218315,-0.238972 0.384783,-0.238972c0.168243,0 0.671183,0.022274 0.863398,-0.240734c0.192226,-0.265137 -0.240185,-0.313572 -0.430634,-0.313572c-0.192585,0 -0.338583,-0.072109 -0.553013,-0.287032c-0.21833,-0.217083 0.144239,-0.361646 0.096264,-0.457818c-0.048317,-0.096486 -0.288496,-0.026171 -0.503279,-0.026171c-0.216194,0 -0.552664,-0.166463 -0.552664,0.026171c0,0.192675 0.264498,0.74485 0.095921,0.624672c-0.168219,-0.118786 -0.143904,-0.289197 -0.26416,-0.433778c-0.12027,-0.144584 -0.310713,-0.120531 -0.553013,-0.096493c-0.238426,0.024034 -0.647192,0.096493 -0.767447,0.072469c-0.118151,-0.024038 -0.023998,-0.024038 -0.2885,-0.144603c-0.262396,-0.120519 -0.384445,-0.09649 -0.576654,-0.21704c-0.190439,-0.124104 -0.022219,-0.17039 -0.358688,-0.194433c-0.334713,-0.024042 -0.310713,0.166851 -0.647194,0.120525c-0.336815,-0.048416 -0.432735,0.024058 -0.769205,0c-0.336811,-0.024372 -0.503302,-0.048416 -0.553026,0.120216c-0.046188,0.168969 -0.144268,0.457808 -0.288523,0.457808c-0.142456,0 -0.312481,0.168601 0.144255,0.193003c0.456749,0.02404 0.193993,0.23896 0.600992,0.216702c0.408783,-0.024048 0.769232,-0.024048 0.865507,-0.216702c0.095942,-0.193003 0.168238,-0.193003 0.216221,-0.120553c0.046177,0.072117 0.406652,0.504125 0.406652,0.504125s0.242283,0.192654 0.33857,0.241076c0.094143,0.04809 -0.096287,0.264786 -0.288485,0.144234c-0.192245,-0.120203 -0.55302,-0.09437 -0.697292,-0.214931c-0.144241,-0.120537 -0.793201,-0.120537 -0.961439,-0.096149c-0.166447,0.02404 -0.456726,-0.072477 -0.553011,-0.072477c-0.09416,0 -0.408409,0.241093 -0.408409,0.241093s-0.120275,-0.194778 -0.190439,-0.290947c-0.072317,-0.096508 -0.192221,0.096169 -0.288515,0.120209c-0.096285,0.024387 -0.384787,-0.192659 -0.673294,-0.096149c-0.288139,0.096149 -0.192194,0.192659 -0.600626,0.168627s-0.503304,-0.096518 -0.647177,-0.072477c-0.146391,0.024387 -0.146391,0.024387 -0.146391,0.024387s0.024334,0.096161 -0.142139,0.192673c-0.168213,0.096144 -0.290258,0.216696 -0.410519,0.072107c-0.118513,-0.144577 -0.190451,-0.144577 -0.262764,-0.168619c-0.073709,-0.024038 -0.21796,-0.144588 -0.528666,-0.074234c-0.312502,0.074234 -0.793208,-0.094383 -0.88774,-0.094383c-0.07405,0 -0.578732,-0.027943 -0.907817,-0.061159c3.899702,-4.248142 9.474688,-6.931632 15.676743,-6.931632c3.934946,0 7.612864,1.091646 10.780348,2.961699c-0.216198,0.133285 -0.589699,0.111004 -0.717384,0.042418c-0.144249,-0.079539 -0.292381,-0.144578 -0.878536,-0.112751c-0.586189,0.033212 -1.229485,0.225881 -1.10006,0.418538c0.132973,0.193024 -0.262722,0.306146 -0.3643,0.209627c-0.101601,-0.096482 -0.571369,0.111369 -0.541744,0.305802c0.029621,0.192651 -0.072292,0.417142 -0.323795,0.368709c-0.247581,-0.049842 -0.423222,0.111347 -0.438049,0.270796c-0.013046,0.161192 -0.571331,0.272548 -0.613998,0.272548c-0.044441,0 -0.761829,-0.014851 -0.499054,0.176067c0.179153,0.127594 0.277214,0.049813 0.499054,0.096143c0.220055,0.048434 0.395702,0.402292 0.512432,0.450365c0.114651,0.048425 0.277214,0 0.349167,-0.096159c0.074066,-0.096517 0.175648,-0.433741 0.175648,-0.433741s0,0.320635 0.179531,0.385312c0.175648,0.065049 0.611938,-0.048088 0.730404,-0.031463c0.1185,0.014852 0.808029,0.113119 0.994965,0.20752c0.192207,0.096498 0.658127,0.1612 0.791416,0.369051c0.131199,0.209273 0.147781,0.93222 0.22007,1.011757c0.073734,0.07991 0.321655,-0.257353 0.378799,-0.337246c0.057487,-0.081665 0.366081,-0.033241 0.469818,0.077774c0.103657,0.113129 0.336433,0.385674 0.323387,0.498791c-0.018326,0.114899 -0.061012,0.289177 -0.14777,0.225883c-0.088917,-0.062889 -0.234913,-0.046303 -0.177418,-0.176033c0.059273,-0.127972 0.088501,-0.402279 -0.027859,-0.402279c-0.118141,0 -0.220089,0 -0.220089,0s-0.221848,-0.06472 -0.367851,0.176395s-0.02787,0.481819 0.074078,0.481819s0.339989,0 0.339989,0.062935c0,0.064682 -0.251469,0.25769 -0.236675,0.370825c0.016586,0.112759 0.203522,0.496664 0.266335,0.577986c0.057472,0.07991 0.364319,0.159443 0.451088,0.178181c0.090614,0.014835 -0.205326,0.031445 -0.129478,0.142464c0.074093,0.113125 0.188698,0.385677 0.349525,0.450373c0.160824,0.065023 0.615795,0.352446 0.671177,0.482189c0.059242,0.1276 0.410519,-0.096519 0.484585,-0.113132c0.074066,-0.014839 0.059235,0.337242 0.264538,0.353872c0.20348,0.014864 0.277214,-0.033226 0.452847,-0.177824s0.133331,-0.33724 0.146374,-0.481842c0.016571,-0.144581 0,-0.255928 0.1922,-0.209627c0.192207,0.04808 0.292019,-0.033209 0.277214,-0.192656c-0.014809,-0.16119 -0.175629,-0.353863 0.12944,-0.402302c0.308945,-0.048063 0.469772,-0.255589 0.660229,-0.255589c0.190468,0 0.719166,0.07955 0.774876,0c0.05888,-0.079906 0.308605,-0.450373 0.469406,-0.465227c0.124142,-0.013048 0.41441,-0.038887 0.71209,-0.077765c2.92522,3.493399 4.735565,7.939837 4.9426,12.797794c-0.218311,0.29446 -0.022205,0.565254 0.038799,0.756151c0.001747,0.055498 0.009174,0.10747 0.009174,0.162981c0,0.252028 -0.029282,0.498436 -0.03878,0.748743c-0.001759,0.003864 -0.001759,0.007408 -0.005322,0.011295zm-17.966007,-8.017963c-0.118515,0.024044 -0.312523,-0.09651 -0.312523,-0.26512s-0.168224,0.313208 -0.074051,0.457777c0.098053,0.144592 -0.192234,0.313208 -0.286751,0.313208s-0.168224,-0.214918 -0.144238,-0.431639c0.0261,-0.217041 -0.142128,-0.409695 -0.408417,-0.385683c-0.264523,0.026169 -0.384783,0.2411 -0.478954,0.313232c-0.098049,0.072451 -0.098049,0.480061 -0.074068,0.578331s0.023983,0.435532 -0.214422,0.409725c-0.218334,-0.024393 -0.169994,-0.431992 -0.14603,-0.578339c0.025751,-0.144594 -0.072304,-0.505873 0.025751,-0.696781c0.098059,-0.193018 0.382664,-0.265118 0.577003,-0.289173s0.599211,0.120199 0.671171,0.096155c0.074066,-0.025793 0.410545,-0.025793 0.577007,0c0.168243,0.020519 0.406643,0.454264 0.288521,0.478306zm0.430569,0.072111c0.074104,0.048424 0.575283,-0.072111 0.673344,0.048424c0.094166,0.120556 -0.099819,0.144596 -0.338619,0.240761c-0.238422,0.096508 -0.312466,0.072447 -0.408401,0.193014s-0.408779,0.166494 -0.553017,0.311092c-0.144241,0.1467 -0.40136,0.231888 -0.454971,0.120535c-0.07373,-0.144583 0.023979,-0.072109 0.046204,-0.144583c0.024338,-0.072104 0.453209,-0.238956 0.453209,-0.238956s0.510342,-0.578354 0.582253,-0.530287zm-1.92107,-0.843115c-0.070189,0.024035 -0.336472,-0.048086 -0.554785,-0.048086c-0.214422,0 -0.168217,-0.144577 -0.264517,-0.118782c-0.094168,0.024038 -0.31035,0.072472 -0.456726,0.144596c-0.1439,0.072115 -0.384439,0.05551 -0.384439,-0.074236c0,-0.192665 0.096292,-0.144577 0.408773,-0.264786c0.31251,-0.120535 0.650713,-0.457788 0.793205,-0.313208c0.144257,0.144241 0.408401,0.313208 0.576988,0.337261c0.17001,0.025795 -0.048311,0.313208 -0.1185,0.33724zm-2.457539,-7.47109c-0.146021,0.048062 -0.641542,0.257689 -0.593555,0.368711c0.018665,0.042776 0.144232,0.127958 0.351248,0.096517c0.209141,-0.033598 0.510344,-0.06507 0.656733,-0.0799c0.144224,-0.016617 0.175629,-0.25737 0.016554,-0.272223c-0.160812,-0.016602 -0.288481,-0.161182 -0.430979,-0.113106zm-1.776855,0.192643c-0.112854,0.048096 -0.449324,-0.079537 -0.624964,0.033587c-0.112854,0.070348 -0.048321,0.30368 0.129435,0.318517c0.175646,0.016629 0.478971,-0.110998 0.51034,-0.014836c0.033152,0.096505 0.144243,0.530257 0.432772,0.38568c0.288475,-0.144588 0.271553,-0.272573 0.351265,-0.289175c0.079361,-0.016605 -0.014828,-0.368726 -0.144272,-0.45038c-0.127651,-0.079531 -0.543831,-0.031447 -0.654575,0.016608zm-0.578773,-1.364164c0.031391,0.081644 -0.014812,0.144567 0.208809,0.176036c0.223957,0.033591 0.319878,0.065028 0.449337,0.065028c0.127665,0 0.077576,-0.209269 -0.033178,-0.352082c-0.112843,-0.144591 -0.079695,-0.12798 -0.367846,-0.209627c-0.288502,-0.079556 -0.577005,-0.079556 -0.769228,-0.064706c-0.192547,0.016619 -0.401354,-0.031446 -0.449314,0.192669c-0.024328,0.114882 0.129423,0.207501 0.32163,0.207501s0.60841,-0.094379 0.63979,-0.014819zm0.41795,0.882338c0.079369,0.176032 0.079369,0.094397 0.305075,0.113134c0.221838,0.016611 0.397486,-0.224486 0.414063,-0.304032c0.016562,-0.081656 -0.112879,-0.241067 -0.415821,-0.20929c-0.305439,0.031483 -1.233372,-0.048417 -1.361055,0.062956c-0.122009,0.107468 0,0.431628 -0.048306,0.465216c-0.047962,0.031454 0.016943,0.176042 0.142496,0.144569c0.127674,-0.031446 0.192215,-0.337604 0.290268,-0.337604c0.096287,0.002133 0.593582,-0.11099 0.673281,0.06505zm-3.012329,-0.657866c0.096277,0.079535 0.338575,0.014832 0.319889,-0.065047c-0.014809,-0.079542 0.098049,-0.401934 -0.094162,-0.416792c-0.192577,-0.014853 -0.462389,0.177808 -0.752644,0.274313c-0.186918,0.06117 -0.144251,0.240731 -0.016581,0.240731s0.449314,-0.113109 0.543497,-0.033205zm1.364555,0.289162c-0.160828,0.079539 -0.210564,0.127626 -0.353039,0.09615c-0.144258,-0.031463 -0.144258,-0.289159 -0.401367,-0.240732c-0.254993,0.048059 -0.303314,0.192644 -0.382654,0.257365s-0.257133,0.113104 -0.319885,0.079882c-0.062798,-0.031466 -0.432751,-0.238995 -0.432751,-0.238995s-0.769232,-0.03357 -0.800611,-0.129721c-0.031418,-0.096519 -0.159081,-0.255939 -0.512119,-0.224478s-0.961788,0.241092 -1.057709,0.241092c-0.096283,0 0.114613,0.192662 -0.016596,0.192662c-0.127647,0 -0.286724,-0.01484 -0.334703,0.127974c-0.033501,0.098266 0.144253,0.096153 0.349178,0.096153c0.207382,0 0.545609,0 0.641909,-0.048072c0.095909,-0.048081 0.576967,-0.161219 0.560051,-0.016616c-0.016569,0.146338 0.192574,0.368702 0.303305,0.337246c0.112873,-0.031461 0.33861,-0.240748 0.449343,-0.159452c0.112871,0.079906 0.129429,0.2708 0.240536,0.320645c0.112846,0.046329 0.417944,0.046329 0.562187,0c0.142136,-0.049846 0.543493,-0.049846 0.719137,-0.016613c0.175631,0.03324 0.689861,0.127985 0.737841,0.03324c0.047949,-0.097919 0.192211,-0.112799 0.207018,-0.209281s0.094513,-0.400177 0.094513,-0.400177s-0.094513,-0.178173 -0.253582,-0.098273zm8.108326,16.600851c-0.220051,0.038883 -0.168205,0.466984 0.096298,0.389225c0.264511,-0.077787 0.121998,-0.429878 -0.096298,-0.389225zm2.089714,-0.57444c-0.1922,-0.048088 -0.408768,0 -0.553001,0.024014c-0.144268,0.024044 -0.552673,0.385691 -0.552673,0.385691s0.264168,0.048082 0.430649,0.048082c0.169979,0 0.266258,0.094385 0.408749,0.166853c0.144249,0.073879 0.408436,-0.096518 0.502949,-0.096518c0.098011,0 0.218307,0.289183 0.242287,-0.024025c0.025761,-0.313217 -0.286724,-0.456039 -0.478958,-0.504097zm-6.69194,-15.609612c-0.079716,-0.192693 -0.478935,-0.257368 -0.562189,-0.064711c-0.070179,0.168622 0.641542,0.257723 0.562189,0.064711zm4.580036,14.428865c0.2645,-0.048075 0.118488,-0.266895 -0.097713,-0.24074c-0.218296,0.024042 -0.168598,0.288818 0.097713,0.24074zm3.19363,1.488281c-0.22007,0.04064 -0.170006,0.469124 0.094151,0.390984c0.2663,-0.077778 0.122051,-0.429865 -0.094151,-0.390984zm-2.90868,-0.717262c-0.166462,0.024042 -0.526913,-0.16687 -0.719471,-0.337246c-0.192204,-0.168633 -0.55265,-0.168633 -0.69693,-0.168633c-0.142483,0 -0.721237,0.168633 -0.721237,0.168633c-0.023981,0.241091 0.21619,0.168598 0.504684,0.168598s0.793579,-0.048061 0.885986,0.072493c0.09803,0.11842 0.528629,0.311081 0.650696,0.409363c0.118515,0.096519 0.502945,0.120533 0.526936,0.024038s-0.262405,-0.361284 -0.430664,-0.337246zm-2.864178,-15.375946c-0.240541,-0.016631 -0.545605,-0.016631 -0.737831,0c-0.192562,0.014856 -0.336824,-0.127954 -0.480724,-0.209265c-0.142469,-0.079905 -0.464132,-0.337243 -0.654572,-0.36907c-0.192575,-0.031468 -0.159082,-0.031468 -0.560425,-0.127619c-0.203526,-0.050181 -0.543495,-0.113137 -0.543495,-0.159435c0,-0.048441 -0.096291,0.224123 0.079353,0.305791c0.175615,0.079533 0.464142,0.224113 0.671154,0.304013c0.210918,0.079535 0.608387,0.096164 0.737818,0.257368c0.127697,0.15942 0.560446,0.289151 0.560446,0.289151l0.512096,0.048442c0,0 0.353046,-0.079916 0.721254,-0.048442c0.367865,0.031482 0.911348,0.079896 1.218538,0.065043c0.301216,-0.014824 0.349525,-0.113106 0.384457,-0.176062c0.029621,-0.065025 -0.562218,-0.19264 -0.708214,-0.176024c-0.140381,0.010964 -0.961435,0.010964 -1.199856,-0.003892zm0.894764,3.692066c-0.062763,0.072475 0.290272,0.176056 0.353405,0.07954c0.062775,-0.094398 -0.188694,-0.255585 -0.353405,-0.07954zm1.076439,0.335474c0.158695,-0.06468 0.079353,-0.257721 -0.146374,-0.192646c-0.255013,0.073854 -0.016575,0.257696 0.146374,0.192646z' fill-opacity='null' stroke-opacity='null' stroke-width='1.5' stroke='null' fill='#000000'/></svg>"
    },
    { "id": "idea",
      "design": "<svg id='idea' width='60' viewBox='0 0 60 60'><circle stroke='#000' stroke-width='3' fill='none' r='25' cy='30' cx='30'/><path d='m28.934668,45.783428c-2.087753,-0.469364 -3.297235,-2.398983 -3.154554,-4.149555c-0.053465,-2.286446 0.195444,-4.692356 -1.094669,-6.794781c-0.735394,-1.569736 -1.988104,-2.955685 -2.510902,-4.591528c-0.650511,-2.537876 0.153008,-5.414293 2.574163,-7.118053c2.730518,-1.982864 7.090883,-2.241295 10.096647,-0.556009c2.119919,1.237537 3.649555,3.278652 3.592674,5.506035c0.248783,1.664272 -0.52634,3.22974 -1.438091,4.660507c-0.653282,1.151997 -1.416203,2.279289 -2.009109,3.444145c-0.156315,2.388351 -0.066662,4.798637 -0.49062,7.166477c-0.70628,1.834812 -3.368006,3.082264 -5.565538,2.432762l0,0zm5.513948,-4.270481c-1.238998,-0.565968 -3.019487,-0.198002 -4.459621,-0.319866c-1.176409,0.199421 -3.266764,-0.408997 -3.892168,0.503658c1.430258,0.474159 3.111113,0.118729 4.633808,0.197197c1.218363,-0.099197 2.620073,0.094002 3.717981,-0.380989l0,0zm-0.092804,-1.06501c0.182365,-1.437958 -2.500854,-0.704224 -3.590818,-0.918251c-1.44273,0.247456 -3.738583,-0.52977 -4.64592,0.57505c0.537647,1.110325 2.935484,0.329483 4.194614,0.575848c1.342722,-0.040325 2.735785,0.040749 4.042124,-0.232647l0,0zm0.016712,-2.519474c0.354183,-2.801189 2.375153,-5.133591 3.545414,-7.695932c0.962112,-3.0679 -0.943367,-6.572857 -4.393253,-7.860657c-3.433891,-1.442251 -8.008894,-0.35272 -9.949497,2.473425c-1.869764,2.334476 -1.512943,5.506327 0.314535,7.776566c1.303917,1.984089 2.344324,4.21376 2.174809,6.522827c2.706671,0 5.41333,0 8.120054,0c0.062649,-0.405437 0.125278,-0.810852 0.187939,-1.216228zm-5.992136,-3.968529c-1.072412,-1.580265 -2.173283,-3.172686 -2.920065,-4.8853c0.671392,-0.736498 0.866711,-1.556925 1.075279,-2.422302c1.884411,-0.313707 -0.239897,1.819878 1.539286,1.867985c1.579227,0.582319 0.886427,-2.825605 2.198496,-1.59721c-0.941849,1.348114 1.85009,2.689304 1.952511,0.760729c-0.135326,-1.456171 1.687462,-1.183374 0.976856,0.13768c0.058601,0.679585 1.364182,0.874411 1.386524,1.420967c-0.939873,1.727736 -1.756844,3.511473 -2.869759,5.16551c-0.250547,-0.640392 0.985249,-2.245426 1.380135,-3.187813c0.761971,-0.814631 1.416733,-3.009972 -0.56963,-2.710709c-1.152279,1.523134 -2.702385,-0.960108 -3.830631,0.499607c-0.957769,0.242098 -2.464148,-1.405769 -2.741945,0.178688c0.721352,1.881926 2.2223,3.48576 3.007595,5.348217c-0.266449,-0.133121 -0.418188,-0.366726 -0.584652,-0.57605l0,0zm-1.505228,-6.89695c-0.521473,-0.215683 0.219801,1.146654 0,0l0,0zm3.116901,0.160952c-0.676979,-0.970924 -0.313913,1.177982 0,0zm3.021122,0c-0.676964,-0.970924 -0.3139,1.177982 0,0zm-14.064796,-7.174158c-1.196484,-1.029116 -2.519026,-1.994745 -3.559561,-3.129074c2.599489,1.823557 4.978729,3.87735 7.321358,5.936214c0.622063,0.724457 -1.085247,-0.676483 -1.402962,-0.911318c-0.795118,-0.624033 -1.579739,-1.257568 -2.358875,-1.895823l0.00004,0zm18.475849,2.942263c2.022346,-2.13546 3.909191,-4.374212 6.089592,-6.395947c-0.365116,0.870438 -1.54039,1.912016 -2.279388,2.808489c-1.234066,1.30114 -2.387562,2.676889 -3.798817,3.843508c-0.176094,0.157759 -0.439121,-0.215952 -0.011364,-0.25605l-0.000023,0l0,0zm-4.380436,-2.025909c0.698826,-1.693747 1.712334,-3.305967 2.843052,-4.821867c-0.026272,0.84096 -1.225506,2.434811 -1.801922,3.477516c-0.326099,0.41959 -0.601151,1.088753 -1.04113,1.344351zm-8.94788,-2.172125c-0.486717,-0.601721 -1.9519,-2.002697 -1.678297,-2.193737c1.412594,1.327354 2.84935,2.69742 3.8641,4.267179c-0.864153,-0.561722 -1.48596,-1.372978 -2.185802,-2.073442l0,0zm5.594017,-0.473537c-0.09853,-0.565069 0.207281,-3.262541 0.377115,-1.430883c0.000622,1.14757 0.141958,2.439507 -0.234955,3.484035c-0.16139,-0.671558 -0.122244,-1.370672 -0.14216,-2.053152l0,0z' fill-opacity='null' stroke-opacity='null' stroke-width='1.5' stroke='null' fill='#000000'/></svg>"
    },
    { "id": "balance",
      "design": "<svg id='balance' width='60' viewBox='0 0 60 60'><circle id='svg_1' stroke='#000' stroke-width='3' fill='none' r='25' cy='30' cx='30'/><path id='svg_8' d='m29.687866,15.094069c4.013752,0 7.26997,3.165655 7.26997,7.064043c0,3.898357 -3.256218,7.060955 -7.26997,7.060955c-4.013802,0 -7.270084,3.165668 -7.270084,7.064049c0,3.898392 3.256283,7.060951 7.270084,7.060951c8.027531,0 14.543079,-6.328232 14.543079,-14.125c0,-7.796776 -6.515549,-14.124998 -14.543079,-14.124998zm0,4.856491c-1.254967,0 -2.272835,0.988665 -2.272835,2.207552c0,1.218857 1.017868,2.207476 2.272835,2.207476c1.254944,0 2.272827,-0.988619 2.272827,-2.207476c0,-1.218887 -1.017883,-2.207552 -2.272827,-2.207552zm0,14.125097c1.254257,0 2.272827,0.989197 2.272827,2.207458c0,1.218239 -1.01857,2.207481 -2.272827,2.207481c-1.254333,0 -2.272835,-0.989243 -2.272835,-2.207481c0,-1.218262 1.018501,-2.207458 2.272835,-2.207458zm14.216969,-4.84761c0,7.791027 -6.502838,14.106853 -14.524454,14.106853c-8.021606,0 -14.524437,-6.315826 -14.524437,-14.106853c0,-7.790951 6.502831,-14.106785 14.524437,-14.106785c8.021616,0 14.524454,6.315834 14.524454,14.106785z' fill-opacity='null' stroke-opacity='null' stroke-width='1.5' stroke='null' fill='#000000'/></svg>"
    },
    { 
      "id": "monkey",
      "design": "<svg id='monkey' width='60' viewBox='0 0 60 60'><circle id='svg_1' stroke='#000' stroke-width='3' fill='none' r='25' cy='30' cx='30'/><path id='svg_13' d='m35.99403,16.674383c0,0 0,-0.937551 0.328045,-1.544436c0.187908,-0.342892 0.788235,-0.517156 0.788235,-0.517156c0,0 0.644749,-0.252054 1.425972,-0.198516c0.605244,0.0413 1.387783,0.389774 1.387783,0.389774c0,0 0.864761,0.023073 1.161522,0.494141c0.362335,0.579198 -0.209663,1.254828 -0.209663,1.254828c0,0 0.075848,0.39423 0.367767,0.725437c0.240479,0.272268 0.708252,0.497549 0.708252,0.497549c0,0 0.088676,0.068455 0.155132,0.198612c0.058773,0.118755 0.093006,0.304701 0.093006,0.304701c0,0 0.288269,0.22401 0.308136,0.501671c0.022038,0.296852 -0.224953,0.649452 -0.224953,0.649452c0,0 -0.112579,0.548637 -0.317146,0.944746c-0.13192,0.257187 -0.387581,0.421679 -0.387581,0.421679c0,0 -0.585999,0.522751 -1.301628,0.64349c-0.541374,0.091024 -1.264107,-0.211813 -1.264107,-0.211813c0,0 0.371342,1.234365 0.32946,2.491734c0.059265,1.973579 -1.357807,3.639606 -1.963928,5.862259c-0.214119,0.669678 -0.082191,1.448061 -0.082191,1.448061c0,0 -0.061432,1.95344 -0.28775,3.692896c-0.184498,1.429436 -0.538692,2.707001 -0.538692,2.707001c0,0 0.216782,0.772118 0.164108,1.269985c0.183697,0.126923 0.969685,0.682194 0.869602,1.126225c-0.150043,0.028008 -0.427868,-0.143703 -0.427868,-0.143703c0,0 -0.127247,0.157558 -0.284527,0.181538c-0.115608,0.018887 -0.223637,0.045685 -0.274231,-0.092094c-0.270866,0.068428 -0.751328,-0.184029 -0.751328,-0.184029c0,0 -0.369598,-0.312584 -0.544064,-0.645336c-0.094368,-0.178391 -0.243233,-0.013081 -0.049946,-0.480892c0.193291,-0.467789 -0.019867,-0.560299 -0.019867,-0.560299c0,0 -0.432026,0.24012 -0.719761,0.225666c-0.141483,-0.008213 -0.248058,-0.277283 -0.248058,-0.277283c0,0 0.051872,-0.561634 0.017597,-1.053806c-0.050575,-0.700203 -0.194195,-1.402943 -0.194195,-1.402943c0,0 -0.346016,-0.431751 -0.615807,-1.669258c-0.186657,-0.854301 -0.206524,-2.052116 -0.336979,-2.93412c-0.130619,-0.89716 -0.392921,-1.486683 -0.371399,-1.472933c-0.628807,0.930317 -1.417175,1.151163 -1.417175,1.151163c0,0 0.12862,1.413708 0.020416,2.566406c-0.103893,1.111393 -0.44424399999999997,1.962879 -0.44424399999999997,1.962879c0,0 -0.359671,1.025269 -0.467573,1.719398c-0.076801,0.494095 0.015324,0.615227 0.085346,0.738026c0.427343,0.580963 2.332712,-0.47419 2.785192,0.285461c0.046597,0.030281 0.14497,0.172729 0.258995,0.253368c0.121067,0.085705 0.360916,0.509262 0.288593,0.557194c-0.060123,0.041561 -0.189259,-0.005692 -0.189259,-0.005692c0,0 0.034767,0.258995 -0.045185,0.353561c-0.085396,0.09639 -0.28458,0.030861 -0.28458,0.030861c0,0 -0.129726,-0.119713 -0.37323,-0.153732c-0.231647,-0.032185 -0.579556,0.021389 -0.579556,0.021389c0,0 -0.945335,-0.400494 -1.779644,0.262203c-0.439844,0.267464 -0.776058,0.269096 -1.221609,0.333385c-0.248005,0.035931 -0.360403,-0.188427 -0.360403,-0.188427c0,0 -0.081831,0.12669 -0.245953,0.236332c-0.186741,0.122295 -0.386238,0.302525 -0.386238,0.302525c0,0 0.093615,0.134212 0.244072,0.229412c0.094898,0.057991 0.2742,0.094566 0.2742,0.094566c0,0 0.692362,0.125057 1.346741,-0.117901c0.108505,-0.007553 0.901737,0.488422 1.004799,0.594303c0.07864,0.079445 -0.076572,0.324482 -0.208401,0.38829c-0.672783,0.463558 -1.14904,-0.221336 -2.22665,0.253971c-0.994473,0.140232 -1.405586,-0.017639 -1.737116,-0.297447c-0.220076,-0.185333 -0.237989,-0.581165 -0.237989,-0.581165c0,0 -0.31859,-0.496021 -0.34383,-0.957359c-0.010969,-0.203548 0.420517,-0.927719 0.600859,-1.297047c0.148497,-0.301224 0.322838,-0.669926 0.322838,-0.669926c0,0 0.139311,-0.342884 0.233679,-0.780228c0.070442,-0.317738 0.083481,-0.692635 0.170282,-0.997093c0.103888,-0.373135 0.288313,-0.668056 0.288313,-0.668056c0,0 -0.498877,-0.460735 -0.88101,-1.037399c-0.473082,-0.716278 -0.846506,-1.575294 -0.846506,-1.575294c0,0 -1.231129,-1.060102 -2.150597,-2.335426c-0.581844,-0.805143 -1.014669,-2.050198 -1.014669,-2.050198c0,0 -0.215508,0.261393 -0.521381,0.592134c-2.173182,2.349909 -2.347107,7.129484 -3.030537,12.308813c-0.444651,3.368942 -1.505657,5.51947 -2.194048,6.217121c-0.626764,0.635914 -1.413164,0.668739 -1.413164,0.668739c0,0 -0.491579,0.009415 -0.54759,-0.108418c-0.053913,-0.109077 0.330181,-0.347919 0.330181,-0.347919c0,0 0.704863,-0.42065 1.147144,-1.086529c1.851847,-2.788486 2.038424,-10.874039 2.867958,-14.302311c0.419275,-1.732542 0.984444,-6.367756 4.928333,-8.89761c2.865807,-1.838409 9.059982,-3.078972 10.611671,-5.372271c0.311733,-0.460791 0.649574,-0.936882 0.649574,-0.936882z' fill-opacity='null' stroke-opacity='null' stroke-width='1.5' stroke='null' fill='#000000'/></svg>"
    },
    {
      "id": "question",
      "design": "<svg id='question' width='60' viewBox='0 0 60 60'><circle id='svg_1' stroke='#000' stroke-width='3' fill='none' r='25' cy='30' cx='30'/><path id='svg_14' d='m30.290159,15.922561c-8.905704,0 -16.124995,5.987527 -16.124995,13.374568c0,2.523888 0.853478,4.882566 2.321939,6.896158l-2.321939,5.630939l6.464906,-1.834843c2.694023,1.676365 6.031914,2.683178 9.660089,2.683178c8.905668,0 16.125006,-5.988468 16.125006,-13.375433s-7.219337,-13.374568 -16.125006,-13.374568l0,0zm1.131134,20.937455l-2.26807,0l0,-2.406288l2.26807,0l0,2.406288zm0,-4.975765l0,0.795818l-2.26807,0l0,-0.979612c0,-2.956331 3.042021,-3.424744 3.042021,-5.523876c0,-0.958321 -0.773951,-1.693031 -1.788702,-1.693031c-1.050499,0 -1.973011,0.856184 -1.973011,0.856184l-1.290199,-1.774572c0,0 1.271748,-1.468428 3.465757,-1.468428c2.084839,0 4.019886,1.42761 4.019886,3.832903c0.00111,3.366505 -3.207682,3.753292 -3.207682,5.954615l0,0z' fill-opacity='null' stroke-opacity='null' stroke-width='1.5' stroke='null' fill='#000000'/></svg>"
    },
    {
      "id": "folder",
      "design": "<svg id='folder' width='60' viewBox='0 0 60 60'><circle id='svg_1' stroke='#000' stroke-width='3' fill='none' r='25' cy='30' cx='30'/><path id='svg_21' d='m43.739925,24.606461c-0.004272,-2.624723 -1.804714,-4.75139 -4.026783,-4.75461l0,-0.001495l-12.342117,0c-0.508554,-1.92807 -2.025066,-3.33798 -3.831656,-3.341602l-2.895077,0c-2.223265,0.002354 -4.024403,2.130518 -4.028673,4.755159l0,16.8661c0.004271,2.622494 1.805408,4.749249 4.028673,4.753742l19.069677,0c2.220535,-0.004494 4.022861,-2.131248 4.026649,-4.753742l0,-13.523552l-0.000694,0zm-23.095633,-5.721434l2.895077,0c1.053307,-0.00458 1.930222,0.991776 1.996733,2.230175l0.058359,1.11364l14.119509,0c1.100895,0.002758 2.010796,1.077503 2.013115,2.377619l0,0.588711c-0.595436,-0.410023 -1.276802,-0.662155 -2.013943,-0.663506l-19.069563,0c-0.737146,0.00135 -1.419773,0.254349 -2.014017,0.664785l0,-3.933834c0.003098,-1.300632 0.913471,-2.374926 2.01473,-2.37759zm19.06885,21.62118l-19.06885,0c-1.100546,-0.002209 -2.010883,-1.079285 -2.01473,-2.37748l0,-8.841957l0.001133,0c0.001965,-1.301929 0.912338,-2.376154 2.013597,-2.378885l19.069677,0c1.100895,0.002731 2.005001,1.071108 2.013943,2.367067l0,8.852852c-0.003841,1.301445 -0.914234,2.376194 -2.014771,2.378403z' fill-opacity='null' stroke-opacity='null' stroke-width='1.5' stroke='null' fill='#000000'/></svg>"
    }
  ]};

  });  // end app.run
