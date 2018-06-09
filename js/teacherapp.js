var app = angular.module('teacherpages', ['ngRoute','ngSanitize']);
    
  app.run(function($rootScope,$location) {

    // get url so URL can be put back when users click on modals
    $rootScope.url = $location.url();

    // show the spinner
    $rootScope.filePath = "includes/spinner.html";

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
              $rootScope.signinText = "Engage Students. Organize Yourself. Gamify.";
              $rootScope.filePath = "includes/admin_signin.html";
            } else {
              $rootScope.signinText = "Sign in to Google to access your course. Earn as you learn.";
              $rootScope.filePath = "includes/admin_signin.html";
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
                //$rootScope.admin = {courses:[],"name":"","email":"","photoUrl":"","uid":""};
                $rootScope.admin = {"courses":[{"desc":"Example of how to structure a course and helpful hints","descname":"Example course, lessons and gamification","name":"Example"}],"email":"tyler.durden@gmail.com","name":"Tyler Durden","photoUrl":"images/tyler-durden.jpg","uid":"9KXHxUezF3PDUdZgoG4optm4p6V2"};
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

                  var msg = "Welcome " + user.displayName + ".";
                  Materialize.toast(msg, 2000, 'black');
                  setTimeout(function(){ Materialize.toast("Edit or add a new course.", 2000, 'black'); }, 2000); 

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
                // see if API data can be used to find data
                var testref = $rootScope.database.ref("teachers/" + args["teacher"] + "/courses/" + args["cname"]);
                testref.once("value").then(function(snapshot) {
                	if (snapshot.val() == null) { // nope, something is wrong
                		$rootScope.$apply(function () { $rootScope.error = "Invalid API data."; $rootScope.filePath = "includes/404.html"; return; });
                    } else { // yep, you have a match with this API teacher and cname
                   		console.log("No user data matching API retrieved from Firebase. Creating new user");
                		var newuser = {confirmed:false,email:user.email,name: user.displayName,photoUrl:user.photoURL,uid:user.uid};
                		$rootScope.user = newuser;
                		$rootScope.refUser.update(newuser).then(function(){
                  			console.log("New user data saved successfully.");
                  			$rootScope.$apply(function () { $rootScope.error = "New request sent."; $rootScope.filePath = "includes/404.html"; return; });
                		}).catch(function(error) {
                  			console.log("New user data could not be saved." + error);
                  			$rootScope.$apply(function () { $rootScope.error = "Data could not be saved"; $rootScope.filePath = "includes/404.html"; return; });
                		}); // end update
                    } // end check API
                }); // end testref
              } // else student not found
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
  
  $rootScope.helpToast = function(msg,time,color) {
    Materialize.toast(msg, time, color);
  }

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

    // Check edits of admin - if changes have been made, send a message
    if (!checkedits($rootScope.o_admin,$rootScope.admin)) {
      askit = confirm("Please save your work.");
      if (askit == false) {
        return;
      }
    }

    // Important variable for include screens
    $rootScope.cname = cname;

    var msg = "To access tools. Click the red button."
    Materialize.toast(msg, 5000, 'black');

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
          if (cname == "Example") {
             $rootScope.readonly = {"badges":[{"id":"idea","name":"Bright idea","value":1},{"id":"star","name":"Super-star","value":1},{"id":"clock","name":"Late","value":-1},{"id":"bubble","name":"Participation","value":1}],"daily":[{"id":{"desc":"What is a file? What types or files are there? How should they be managed and edited?","id":1,"img":"","keywords":["file","edit","manage","folders","sub-folders"],"name":"Files","segments":[{"segimg":"","seglink":"","text":"How can data be stored? Outside of a computer, what does a file look like?","title":"What is a file?"}],"show":true}},{"id":{"desc":"This is an introduction to the course. In this lesson you will learn about who the teacher is, expectations and the final exam. Full extent.","expectations":["c1 Ontario Ministry of Education","a101 International Baccalaureate"],"id":0,"img":"https://s33.postimg.cc/rgel88g4v/Screenshot_from_2018-05-28_09_53_25.png","keywords":["Introduction","Teacher","Final examination","Expectations"],"name":"Introduction","segments":[{"segimg":"","seglink":"http://www.greaterfool.ca","text":"There is a final exam that is reflective of the course. This means you will have to prove that you have learned through the entire year.","title":"Final examination"},{"segimg":"","seglink":"","text":"The most important thing. How will I be evaluated? Report cards? Tests, assignment ratios? Adding some more stuff to this segment will make","title":"Evaluation?"},{"segimg":"","seglink":"http://www.cnn.com","text":"What behavioral and other expectations are there? Adding some more stuff to this segment will make this more relevant and help to see what .","title":"Expectations?"},{"segimg":"","seglink":"","text":"This course is a test of the gameof5 software. We shall see how it does. Adding some more stuff to this segment will make the PDF look good.","title":"This course?"},{"segimg":"images/tyler-durden.jpg","seglink":"http://www.cbc.ca","text":"cool young amazing teacher. Adding some more stuff to this segment will make this add a bunch of useless information imagination can't get .","title":"Who am i?"}],"show":true}},{"id":{"desc":"","id":2,"img":"","name":"Holy Trinity","show":true}}],"lessons":[{"desc":"What types or files are there? How should they be managed and edited?","expectations":["e-1 National standards","e-2 National standards"],"id":1,"img":"https://svgshare.com/i/6xz.svg","keywords":["file","edit","manage","folders","sub-folders"],"name":"Files","segments":[{"segimg":"","seglink":"","text":"","title":"How can files be organized?"},{"segimg":"","seglink":"","text":"","title":"What type of files are there?"},{"segimg":"","seglink":"","text":"How can data be stored? Outside of a computer, what does a file look like?","title":"What is a file?"}],"show":true},{"desc":"This lesson will provide you with the basics of this course.","expectations":["c101","c102"],"id":2,"img":"https://svgshare.com/i/6zX.svg","keywords":["Thing1","Basic1"],"name":"The basics","segments":[{"segimg":"","seglink":"","text":"How do I start learning about this?","title":"How to start?"}],"show":true},{"desc":"This is an introduction to the course. In this lesson you will learn about who the teacher is, expectations and the final exam.","expectations":["c100 Ministry of Education","a101 International Baccalaureate"],"id":0,"img":"https://svgshare.com/i/6z2.svg","keywords":["Introduction","Teacher","Final exam","Expectations"],"name":"Introduction","segments":[{"segimg":"","seglink":"","text":"There is a final exam that is reflective of the course. This means you will have to prove that you have learned through the entire year.","title":"Final examination?"},{"segimg":"","seglink":"","text":"The most important thing. How will I be evaluated? Report cards? Test vs assignment ratios?","title":"Evaluation?"},{"segimg":"","seglink":"https://en.wikipedia.org/wiki/Golden_Rule","text":"What behavioral and other expectations are there? Adding some more stuff to this segment will make this more relevant and help to see what .","title":"Expectations?"},{"segimg":"","seglink":"","text":"This course is a test of the gameof5 software. We shall see how it does. Adding some more stuff to this segment will make the PDF look good.","title":"This course?"},{"segimg":"images/tyler-durden.jpg","seglink":"https://www.imdb.com/title/tt0137523/","text":"Cool young amazing teacher. Formerly ran a private club that you may have heard of.","title":"Who am i?"}],"show":true}],"levels":[{"desc":"Now you are getting interesting. Looking forward to seeing what you can accomplish.","high":45,"low":31,"name":"Trainee","number":0,"priv":"Remove a bad quiz"},{"desc":"Just starting to learn.","high":30,"low":16,"name":"Acolyte","number":1,"priv":"Mini chocolate bar"},{"desc":"Deer in the headlights.","high":15,"low":0,"name":"Newbie","number":2,"priv":"Mini chocolate bar"}],"quizzes":[{"name":"Control structures"},{"name":"Math"},{"name":"Basics"}]};
          } else {
             $rootScope.readonly = {lessons:[],badges:[],levels:[],quizzes:[],daily:[]};
          }
`         console.log("No data from Firebase, default stored in $rootScope.readonly.");
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
          if (cname == "Example") {
            $rootScope.users = {"9KXHxUezF3PDUdZgoG4optm4p6V8":{"badges":{"star":3},"badgestotal":3,"confirmed":true,"daily":[{"badge":"star","desc":"Homework was used as an exemplar","grade":4,"value":1},{"badge":"star","desc":"Homework is steller","grade":4,"value":1},{"badge":"star","desc":"Best work in class today","grade":4,"value":1}],"dailytotal":12,"dateconfirmed":"9/5/2018 (DDMMYYYY)","email":"jdoe@gmail.com","level":{"desc":"Just starting to learn.","high":30,"low":16,"name":"Acolyte","number":1,"priv":"Mini chocolate bar"},"name":"John Doe","photoUrl":"https://svgshare.com/i/6yL.svg","pointstotal":22,"quiztotal":7,"quizzes":[{"grade":30,"name":"if","xp":0},{"grade":75,"name":"math","xp":3},{"grade":99,"name":"basics","xp":4}],"uid":"9KXHxUezF3PDUdZgoG4optm4p6V8"},"tVbsSHC28EPlha9FMYjMsbz5jhx8":{"badgestotal":0,"confirmed":true,"daily":[{"badge":0,"desc":"Normal day, nothing to report","grade":3,"value":0},{"badge":0,"desc":"Normal day, nothing to report","grade":3,"value":0},{"badge":0,"desc":"Normal day, nothing to report","grade":3,"value":0}],"dailytotal":9,"dateconfirmed":"9/5/2018 (DDMMYYYY)","email":"jane.doe@gmail.com","level":{"desc":"Just starting to learn.","high":30,"low":16,"name":"Acolyte","number":1,"priv":"Mini chocolate bar"},"name":"Jane Doe","photoUrl":"https://svgshare.com/i/6ys.svg","pointstotal":20,"quiztotal":11,"quizzes":[{"grade":90,"name":"if","xp":4},{"grade":86,"name":"math","xp":4},{"grade":75,"name":"basics","xp":3}],"uid":"tVbsSHC28EPlha9FMYjMsbz5jhx8"}};
            console.log("No users data from Firebase yet, $rootScope.users using default.");
          } else {
            console.log("No users data from Firebase yet, $rootScope.users remaining undefined.");
          }
        }

        $rootScope.$apply(function () {  
          if ($rootScope.users != undefined) {
            $rootScope.alldata = $rootScope.alldata + ", 'users':" + angular.toJson($rootScope.users) + "}}}";
          } else {
            $rootScope.alldata = $rootScope.alldata + "}}}";
          }
          //$rootScope.alldata = $rootScope.alldata + "}";
          $rootScope.share = "https://gameof5.com/#!/?teacher=" + $rootScope.admin.uid + "&cname=" + cname; 
        });
      },
      function(error) {
        // The Promise was rejected.
        $rootScope.$apply(function () { $rootScope.error = "Data could not be accessed"; $rootScope.filePath = "includes/404.html"; });
        console.error(error);
      });
    //} // end check for undefined


    refSVG = $rootScope.database.ref("svgs");
    refSVG.once("value").then(function(snapshot) {
    	if (snapshot.val() != undefined) {
        	$rootScope.admin.badgelist = snapshot.val();
            console.log("Data from Firebase, now stored in $rootScope.admin.badgelist.");
        } else {
            $rootScope.admin.badgelist = [ "balance", "book", "bubble", "calendar", "clock", "codetalk", "folder", "idea", "monkey", "phones", "question", "skull", "star", "stop", "world" ];
            console.log("No data from Firebase, stored in $rootScope.admin. Using default $rootScope.admin.badgelist");
        }
    },
    function(error) {
    	$rootScope.admin.badgelist = [ "balance", "book", "bubble", "calendar", "clock", "codetalk", "folder", "idea", "monkey", "phones", "question", "skull", "star", "stop", "world" ];
        console.log("No data from Firebase. Using default $rootScope.admin.badgelist");
        console.error(error);
    });


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
            user.level.number = l;
          }
        }
      } else {
        user.level = {name:"Option not enabled",desc:"",number:0,low:0,high:0,priv:""};
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
    if (lesson.segments != undefined) {
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
        doc.setFontStyle("normal");
        y = y + .5;
      }
      x = x - .1; // unindent
    }

    // Keywords
    if (lesson.keywords != undefined) {
      y = y + .15
      doc.setFontSize(.25);
      doc.setFontStyle("bold");
      doc.text("Keywords:", x, y);
      y = y + .25
      doc.setFontSize(.2);
      doc.setFontStyle("italic");
      var keywords = doc.splitTextToSize(lesson.keywords.join(','), 5);
      doc.text(keywords, x, y);
      doc.setFontStyle("normal");
      y = y + .5;
    }

    // Curriculum expectations
    if (lesson.expectations != undefined) {
      doc.setFontSize(.25);
      doc.setFontStyle("bold");
      doc.text("Curriculum expectations:", x, y);
      y = y + .25;
      doc.setFontStyle("italic");
      doc.setFontSize(.2);
      var expects = doc.splitTextToSize(lesson.expectations.join(','), 5);
      doc.text(expects, x, y);
    }

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
    $rootScope.readonly.levels.unshift({name: "", desc: "", low: 0, high: 0, priv: "", number:0})
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

  });  // end app.run
