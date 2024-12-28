var app = angular.module('teacherpages', ['ngRoute','ngSanitize','chart.js']);
  
  // HOEL added chart.js July 11, 2019

  
  app.service('service', function($http){
    this.getData = function(url) {
      return $http({
        method: 'GET',url: url,
        // cache will ensure calling ajax only once
        cache: true
      }).then(function (data) {
        // this will ensure that we get clear data in our service response
        return data.data;
      });
    };
  });
  
  
  app.filter('unique', function() {
    // we will return a function which will take in a collection
    // and a keyname
    return function(collection, keyname) {
      // we define our output and keys array;
      var output = [], 
          keys = [];
      
      // we utilize angular's foreach function
      // this takes in our original collection and an iterator function
      angular.forEach(collection, function(item) {
          // we check to see whether our object exists
          var key = item[keyname];
          // if it's not already part of our keys array
          if(keys.indexOf(key) === -1) {
              // add it to our keys array
              keys.push(key); 
              // push this item to our final output array
              output.push(item);
          }
      });
      // return our array which should be devoid of
      // any duplicates
      return output;
   };
  });
  
  app.run(function($rootScope,$location,service) {
	  
    // get url so URL can be put back when users click on modals
    $rootScope.url = $location.url();

    // show the spinner
    $rootScope.filePath = "includes/spinner.html";

    // 1. Check to see if user logged in
    firebase.auth().onAuthStateChanged(function(user) {
      
        // 2. detect authenication 
        if (user == null) {
            
            // Apply function is required to sync Angular after leaving Angular environment
            $rootScope.$apply(function () {
                $rootScope.signinText = "Engage Students. Organize Yourself. Gamify.";
                $rootScope.filePath = "includes/admin_signin.html";
                $rootScope.navPath = "includes/nav_signin.html";
            });
            
        // if there is a user ...
        } else {

            // Set photoUrl so it is available across teacher and students
            $rootScope.photoUrl = user.photoURL;
            $rootScope.email = user.email;
            $rootScope.name = user.displayName;

            // 3. Set database references 
            var dbstring = "teachers/" + user.uid; // get everything for this teacher
            $rootScope.database = firebase.database();
            $rootScope.refAdmin = $rootScope.database.ref(dbstring + "/admin");

            // 4. Connect to Firebase and get admin data, else set admin to default
            $rootScope.refAdmin.once("value").then(function(snapadmin) {
                
                if (snapadmin.val() != undefined) {
                    $rootScope.admin = snapadmin.val();
                    console.log("Data from Firebase, now stored in $rootScope.admin.");
                } else {
                    $rootScope.admin = {"courses":[{"name":"Example"}],"email": user.email,"name": user.displayName,"photoUrl": user.photoURL,"uid": user.uid};
                    console.log("No data from Firebase, stored in $rootScope.admin. Using default $rootScope.admin."); 
                     
                    // show modal reassuring user that they are approved
                    $(document).ready(function(){
                        $('#modalschool').modal();
                        var val = $('#modalschool').modal('open'); 
                    });   
                }

                // Add admin data
                $rootScope.admin.name = user.displayName;
                $rootScope.admin.email = user.email;
                $rootScope.admin.photoUrl = user.photoURL;
                $rootScope.admin.uid = user.uid;

                // Keep a record of initial admin, to see if user makes changes
                $rootScope.o_admin = angular.toJson(angular.copy($rootScope.admin));

                $rootScope.user = user.uid;
                $rootScope.selIds = {};  // added for admin_daily selected days for reports
                
		$rootScope.$apply(function () { 
                    if ($rootScope.admin.schoolname == undefined) {
                        $rootScope.filePath = "includes/admin_teacher.html";
                    } else {
                        $rootScope.filePath = "includes/admin_edit.html";
                    }
                    $rootScope.navPath = "includes/nav_basic.html";
                });

                var msg = "Welcome " + user.displayName + ".";
                Materialize.toast(msg, 1000, 'black');

            },
            // The Promise was rejected.
            function(error) {
                $rootScope.$apply(function () { 
                    $rootScope.error = "Data could not be saved"; 
                    $rootScope.filePath = "includes/404.html"; 
                });
                console.error(error);
            });

        } // user is logged in
              
    }); // user authenication?
    

    // ---------------------------------------------//
    // FUNCTIONS
    // ---------------------------------------------//
      
    $rootScope.makeCSV = function() {
        // remove worst ratio - could be teacher
        var users = Object.values($rootScope.cdata.users)
        var sortedratio = Array_Sort_Numbers(users[0].ratioArray);
        sortedratio.pop();
        ptsArray = users[0].pointsArray;
        dailyArray = users[0].dailyArray;
        quizArray = users[0].quizArray;       
        badgenames = $rootScope.cdata.readonly.badges;
        
        /*
        data = [sortedratio,ptsArray,dailyArray,quizArray];
        ranks = [];
        for (i = 0; i<4; i++) {
            avg = Array_Average(data[i]);
            std = Array_Stdev(data[i]);
            std = std * .3
            //console.log(avg,std);
            ranks.push([avg,std]);
        }
        //console.log(ranks);
        */
        
        csv = "<b>email,impact,points,daily,quiz,badge,badgelist</b><br>";
        for (i = 0; i<users.length; i++) {
            u = users[i];
            imp = percentRank2(sortedratio,u.badgeratio) * 100;
            if ((imp*100) > 50) {
                flip = 100 - imp;
                imp = 0 + flip
            } else {
                imp = 100 - imp
            }
            pts = percentRank2(ptsArray,u.pointstotal)*100;
            daily = percentRank2(dailyArray,u.dailytotal)*100;
            quiz = percentRank2(quizArray,u.quiztotal)*100;
            badges = u.badgestotal;
            badgelist = u.badges;
            delete badgelist.undefined;
            keys = Object.keys(badgelist);
            mylist = {};
            for (b=0;b<keys.length;b++) {
                key = keys[b];
                val = badgelist[key];
                if (val >= 3) {
                    for (n=0;n<badgenames.length;n++) {
                        if (badgenames[n]['id'] == key) {
                            mylist[badgenames[n]['name']] = badgelist[key] * [badgenames[n]['value']];
                            break;
                        }
                    }
                }
            }
            str = JSON.stringify(mylist);
            blist = str.replace(/,/g, "/");

            mydata = [u.badgeratio,u.pointstotal,u.dailytotal,u.quiztotal];
            //std = stdrank(ranks,mydata);
            sigdig = 0
            //csv = csv + u.email + "," + imp.toFixed(sigdig) + "," + pts.toFixed(sigdig) + "," + daily.toFixed(sigdig) + "," + quiz.toFixed(sigdig) + "," + std[0] + "," + std[1] + "," + std[2] + "," + std[3] + "<br>";
            
            csv = csv + u.email + "," + imp.toFixed(sigdig) + "," + pts.toFixed(sigdig) + "," + daily.toFixed(sigdig) + "," + quiz.toFixed(sigdig) + "," + badges + "," + blist + "<br>";
            
        }
        $rootScope.csv = csv;
    }
     
    function stdrank(ranks,mydata) {
        arr = [];
        
        // take care of badgeratio 
        avglow = (ranks[0][0] - ranks[0][1]);
        avghigh = (ranks[0][0] + ranks[0][1]);
        
        if (mydata[0] >= avglow && mydata[0] <= avghigh) {
            num = 0; // average band
        } else if (mydata[0] > avghigh) { // less than 1 stdev
            num = -1;
        } else if (mydata[0] > (2*avghigh)) { // less than 2 stdev
            num = -2;
        } else if (mydata[0] < avglow) {
            num = 1;
        } else {
            num = 2;
        }
        console.log(avglow,ranks[0][0],avghigh);
        arr.push(num)
        
        
        //return arr;
        
        for (r=1;r<4;r++) {
            avglow = (ranks[r][0] - ranks[r][1]);
            avghigh = (ranks[r][0] + ranks[r][1]);   
            if (mydata[r] >= avglow && mydata[0] <= avghigh) {
                num = 0; // average band
            } else if (mydata[r] > avghigh) { // less than 1 stdev
                num = 1;
            } else if (mydata[r] > (2*avghigh)) { // less than 2 stdev
                num = 2;
            } else if (mydata[r] < avglow) {
                num = -1;
            } else {
                num = -2;
            }
            arr.push(num)
        }
        return arr;
    }
        
    // https://gist.github.com/IceCreamYou/6ffa1b18c4c8f6aeaad2        
    function percentRank2(array, n) {
        var L = 0;
        var S = 0;
        var N = array.length

        for (var i = 0; i < array.length; i++) {
            if (array[i] < n) {
                L += 1
            } else if (array[i] === n) {
                S += 1
            } else {

            }
        }

        var pct = (L + (0.5 * S)) / N

        return pct
    }
    
    // added for analysis
    function Quartile(data, q) {
      data=Array_Sort_Numbers(data);
      var pos = ((data.length) - 1) * q;
      var base = Math.floor(pos);
      var rest = pos - base;
      if( (data[base+1]!==undefined) ) {
        return data[base] + rest * (data[base+1] - data[base]);
      } else {
        return data[base];
      }
    }

    function Array_Sort_Numbers(inputarray){
      return inputarray.sort(function(a, b) {
        return a - b;
      });
    }

    function Array_Sum(t){
       return t.reduce(function(a, b) { return a + b; }, 0); 
    }

    function Array_Average(data) {
      return Array_Sum(data) / data.length;
    }

    function Array_Stdev(tab){
       var i,j,total = 0, mean = 0, diffSqredArr = [];
       for(i=0;i<tab.length;i+=1){
           total+=tab[i];
       }
       mean = total/tab.length;
       for(j=0;j<tab.length;j+=1){
           diffSqredArr.push(Math.pow((tab[j]-mean),2));
       }
       return (Math.sqrt(diffSqredArr.reduce(function(firstEl, nextEl){
                return firstEl + nextEl;
              })/tab.length));  
    }
	  
	 
    // Save admin school settings
    $rootScope.saveSchool = function() {

       $rootScope.refAdmin.update($rootScope.admin).then(function(){
            console.log("Teacher data saved successfully.");
            var msg = "Teacher data saved successfully.";
            Materialize.toast(msg, 1000, 'pink');
            $rootScope.$apply(function () { 
              $rootScope.filePath = "includes/admin_edit.html";
            });
        }).catch(function(error) {
            console.log("Teacher data could not be saved." + error);
            $rootScope.$apply(function () { 
                $rootScope.error = "Teacher data could not be saved"; 
                $rootScope.filePath = "includes/404.html"; 
            });
        });
    }

    $rootScope.signin = function() {
      var provider = new firebase.auth.GoogleAuthProvider();
      //firebase.auth().signInWithRedirect(provider).then(function(result){});
      firebase.auth().signInWithPopup(provider).then(function(result){});
    }

    $rootScope.signout = function(){
      firebase.auth().signOut().then(function() {
        $location.url($rootScope.url);
        }).catch(function(error) {
      });
    }

    // RECENTS - replaced remDate() and adddate()
    $rootScope.doCheck = function(index) {
        if (!$rootScope.cdata.readonly.lessons[index].date) {
            return false;
        }
        return true;
    }
    
    $rootScope.doDate = function(index) {
        cbox = document.getElementById("deleteme" + index).checked;
        if (cbox) {
            var d = new Date();
            $rootScope.cdata.readonly.lessons[index].date = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
        } else {
            if ($rootScope.cdata.readonly.lessons[index].date == undefined || $rootScope.cdata.readonly.lessons[index].date == null) {
                cbox.checked = true;
            }
            $rootScope.cdata.readonly.lessons[index].date = "";
        }
    }

    // RECENTS
    function timeDifference(current, previous) {

      var msPerMinute = 60 * 1000;
      var msPerHour = msPerMinute * 60;
      var msPerDay = msPerHour * 24;
      var msPerMonth = msPerDay * 30;
      var msPerYear = msPerDay * 365;

      var elapsed = current - previous;
      return Math.round(elapsed/msPerDay) 


      if (elapsed < msPerMinute) {
           return Math.round(elapsed/1000) + ' seconds ago';   
      }

      else if (elapsed < msPerHour) {
           return Math.round(elapsed/msPerMinute) + ' minutes ago';   
      }

      else if (elapsed < msPerDay ) {
           return Math.round(elapsed/msPerHour ) + ' hours ago';   
      }

      else if (elapsed < msPerMonth) {
          return 'approximately ' + Math.round(elapsed/msPerDay) + ' days ago';   

      }

      else if (elapsed < msPerYear) {
          return 'approximately ' + Math.round(elapsed/msPerMonth) + ' months ago';   
      }

      else {
          return 'approximately ' + Math.round(elapsed/msPerYear ) + ' years ago';   
      }
  }

    // setUrl - sets url of gameof5.com - remove modals from url field
    $rootScope.setUrl = function() {
        $location.url($rootScope.url);
    }

    // finishLoading - work around for label input overlap bug
    $rootScope.finishLoading = function() {
        // need to wait 2 milliseconds for this to work
        setTimeout(function(){ Materialize.updateTextFields(); }, 2); 
    }
	  
    $rootScope.prettify = function() {
      var pp = JSON.stringify($rootScope.cdata, null, 4);
      var aFileParts = [pp];
      var oMyBlob = new Blob(aFileParts, {type : 'text/plain'}); 
      window.open(URL.createObjectURL(oMyBlob));
    }
	  
  $rootScope.archiveme = function() {
      
    var person = prompt("You are about to archive and reset user information. This is serious! Please enter your course id and confirm.");
    if (person == null || person == "") {
        return;
    } else {
        if (person == $rootScope.cname) {
            var d = new Date();
            var fulldate = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + "-" + d.getHours() + ":" + d.getMinutes();

            if ($rootScope.myarchive != undefined) {
              if (confirm("An archive already exists. Do you wish to over-write it?")) {
                Materialize.toast("Over-writing archive", 5000, 'pink');
                $rootScope.myarchive = $rootScope.cdata;
                //$rootScope.myarchive.fulldate = fulldate;
                //$rootScope.myarchive = JSON.stringify($rootScope.myarchive);
                resetUsers();
              } else {
                console.log("You pressed Cancel. Nothing will happen.");
              }
            } else {
              Materialize.toast("Created archive", 5000, 'pink');
              $rootScope.myarchive = $rootScope.cdata;
              //$rootScope.myarchive.fulldate = fulldate;
              //$rootScope.myarchive = JSON.stringify($rootScope.myarchive);
              resetUsers();
            }
        } else {
            Materialize.toast("Incorrect course id", 5000, 'pink');
        }
      } 
  } // end function
  
  function resetUsers() {
      var usernames = Object.keys($rootScope.cdata.users);
      var uservalues = Object.values($rootScope.cdata.users)
      var users = {};
      for (i = 0; i < usernames.length; i++) {
          users[usernames[i]] = {
              uid: usernames[i],
              photoUrl: uservalues[i].photoUrl,
              name: uservalues[i].name,
              email: uservalues[i].email,
              dateconfirmed: uservalues[i].dateconfirmed,
              confirmed: uservalues[i].confirmed,
	      section: uservalues[i].section
          };
      }
      //var allusers = users;
      //console.log(allusers);
      $rootScope.cdata.readonly.daily = [];
      $rootScope.cdata.readonly.quizzes = [];
      $rootScope.cdata.users = users;
  }
  
  $rootScope.courses = function() {
               
        // prep current
	var c = angular.toJson(angular.copy($rootScope.cdata.readonly));

	// check edits
        if (!checkedits($rootScope.o_readonly,c)) {
            askit = confirm("You are leaving without saving. Cancel to save, or OK to lose edits.");
            if (askit == false) {
                return;
            } 
        }

        // return to course menu, users and readonly should be undefined
        $rootScope.cdata.users = undefined;
        $rootScope.cdata.readonly = undefined;
        
        // turn off listener on current database
        $rootScope.currDBref.off("value", $rootScope.listener);
        $rootScope.newusers = undefined;
        console.log("Turning off listener on /users node.");

        $rootScope.filePath = "includes/admin_edit.html";
        $rootScope.navPath = "includes/nav_basic.html";
    } 

  function checkedits(original,current) {
    
    if (original == current) {
      return true;
    } else {
      return false;
    }

  }

  window.onbeforeunload = function (e) {

    if ($rootScope.user != undefined) {return;}
    var message = "Please save your work.";
    if ($rootScope.navPath == "includes/nav_courses.html") {
      if (checkedits($rootScope.o_readonly,$rootScope.cdata.readonly)) {
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
    var bpath = path.split("/")[1].split(".")[0];
    if ((bpath == "admin_daily" || bpath == "admin_quiz" || bpath == "admin_list" || bpath == "admin_users") && $rootScope.cdata.users == null) {
        var msg = "No users yet."
        Materialize.toast(msg, 5000, 'pink');
        return;
    }
    // Create a sorted array and then rebuild object to replace users with sorted users
    if ($rootScope.cdata.users != null) {
        $rootScope.listArray = Object.values($rootScope.cdata.users);
        $rootScope.listArray.sort(generateSortFn('section', true));   

        var input = $rootScope.listArray;
        var output = {};
        for (i = 0; i<input.length; i++){
          output[input[i].uid] = input[i];
        }
        $rootScope.cdata.users = output;

    }
    $rootScope.filePath = path;
  }
  	  	  
  // navAdmin - Edit a particular course
  $rootScope.navAdmin = function(cname) {

    // Important variable for include screens
    $rootScope.cname = cname;
        
    // Check to see if a new course has been added, if so write to database
    a = angular.toJson($rootScope.admin);  // make sure admin is in proper format to be compared
    if (!checkedits($rootScope.o_admin,a)) {  
        // if new course added write it to Firebase
        var cRef = $rootScope.database.ref("teachers/" + $rootScope.admin.uid + "/admin/courses");
        var courses = angular.toJson($rootScope.admin.courses); // get rid of Angular $$ data
        courses = JSON.parse(courses); // put data back into object form
        
        // write to admin.courses
        cRef.set(courses).then(function(){
            console.log("Admin courses data saved successfully.");
        }).catch(function(error) {
            console.log("Admin courses data could not be saved." + error);
        });   
    }
      
    // Connect to Firebase and get course information
    var dbstring = "teachers/" + $rootScope.admin.uid + "/courses/" + cname;
    $rootScope.refCourse = $rootScope.database.ref(dbstring);
    
    // Initialize cdata so promises don't try to update something that doesn't exist!
    $rootScope.cdata = {};
      
    // Retreive data for current course from Firebase
    $rootScope.refCourse.once("value").then(function(snapshot) {  
        if (snapshot.val() != undefined) {
	
	  var snapval = snapshot.val();
          $rootScope.myarchive = snapval.myarchive;
          snapval.myarchive = {};
          $rootScope.cdata = snapval;

          if ($rootScope.cdata.users == undefined) { $rootScope.cdata.users = {}; }
          console.log("Data from Firebase, now stored in $rootScope.cdata.");  
        } else {
          $rootScope.cdata.readonly = {saved: false, lessons:[],badges:[],levels:[],quizzes:[],daily:[]};
          $rootScope.cdata.users = {};
          console.log("No data from Firebase, default stored in $rootScope.cdata.readonly.");
        }
        
        // set original readonly to check for edits later
        $rootScope.o_readonly = angular.toJson(angular.copy($rootScope.cdata.readonly));  

        $rootScope.alldata = "{ 'admin':" + angular.toJson($rootScope.admin) + ", 'courses': {'" + cname + "':{ 'readonly':" + angular.toJson($rootScope.cdata.readonly);
        
        $rootScope.$apply(function () {
            // Show toast to user
            var msg = "Share your class, use navbar share button."
            Materialize.toast(msg, 5000, 'black');
		
	    // check for quiz name
            if ($rootScope.cdata.readonly.settings == undefined) { 
              $rootScope.cdata.readonly.settings = {show: true, hlink: false, lcomments: false, leadnumber: 5, quizname: "Quiz XP", newui: false, report: false, impactadj: "high, above average, average, below average, low", totaladj: "poor, mediocre, on par, very good, superb", dailyadj: "quite modest, modest, as expected, high, very high", quizadj: "disapointing,below expectations,in order,very good, superior"};
            }
            if ($rootScope.cdata.readonly.settings == undefined || $rootScope.cdata.readonly.settings.quizname == undefined || $rootScope.cdata.readonly.settings.quizname == "") {
              $rootScope.cdata.readonly.settings.quizname = "Quiz XP";
              console.log($rootScope.cdata.readonly.settings.quizname);
            }
      
            $rootScope.alldata = $rootScope.alldata + "}}}";

	    var domain = window.location.host;
	    if ($rootScope.cdata.readonly.settings.newui == true) {
               $rootScope.share = domain + "/gameof5/d.html#!/?teacher=" + $rootScope.admin.uid + "&cname=" + cname; 
            } else {
               $rootScope.share = domain + "/gameof5/s.html#!/?teacher=" + $rootScope.admin.uid + "&cname=" + cname;
            }

            $rootScope.navPath = "includes/nav_admin.html"; // reload tools
            $rootScope.filePath = "includes/admin_lessons.html"; 
        });

      },
      function(error) {
        // The Promise was rejected.
        $rootScope.$apply(function () { 
            $rootScope.error = "Data could not be accessed.";      
            $rootScope.filePath = "includes/404.html"; 
        });
        console.error(error);
      });

		        
      // listener for new users
      var dbstring = "teachers/" + $rootScope.admin.uid + "/courses/" + cname;
      $rootScope.currDBref = firebase.database().ref(dbstring + '/users')
      $rootScope.listener = $rootScope.currDBref.on('value', function(updatesnap) {

            setTimeout(function(){ 
            //$rootScope.$apply(function () { // this seems to cause inprog error
                
                $rootScope.cdata.users = updatesnap.val();
                if ($rootScope.newusers == undefined) {
                    $rootScope.newusers = 0;
                } else {
	            console.log($rootScope.listAray);
		    console.log($rootScope.view);
                    $rootScope.newusers = $rootScope.newusers + 1;
                    console.log("Users database has been modified.");
                    var msg = "Users database has been modified. Check users to verify.";
                    Materialize.toast(msg, 5000, 'blue');
                    $rootScope.navPath = "includes/nav_admin.html";
                    $rootScope.filePath = "includes/admin_list.html";
                }  
    
            }, 0); 
            //});

      },
      function(error) {
         // The Promise was rejected.
         $rootScope.$apply(function () {
            $rootScope.error = "Data could not be accessed"; 
            $rootScope.filePath = "includes/404.html"; 
         });
         console.error(error);
      });
      

      refSVG = $rootScope.database.ref("svgs");
      refSVG.once("value").then(function(snapsvg) {
    	 if (snapsvg.val() != undefined) {
        	$rootScope.admin.badgelist = snapsvg.val();
            console.log("Badges data from Firebase, now stored in $rootScope.admin.badgelist.");
         } else {
            $rootScope.admin.badgelist = [ "balance", "book", "bubble", "calendar", "clock", "codetalk", "folder", "idea", "monkey", "phones", "question", "skull", "star", "stop", "world" ];
            console.log("No badges data from Firebase, stored in $rootScope.admin. Using default $rootScope.admin.badgelist");
         }
    },
    function(error) {
    	$rootScope.admin.badgelist = [ "balance", "book", "bubble", "calendar", "clock", "codetalk", "folder", "idea", "monkey", "phones", "question", "skull", "star", "stop", "world" ];
        console.log("No data from Firebase. Using default $rootScope.admin.badgelist");
        console.error(error);
    });
    

  } // end of navAdin function
  
	  
  // upload data from modal
  $rootScope.uploadData = function(uploadtype) {
	$location.url($rootScope.url);
	if (uploadtype == 'badge') {
		var myupload = document.getElementById("myupbadge");
		var jsondata = myupload.value;
		if (jsondata != "") {
			$rootScope.cdata.readonly.badges = JSON.parse(jsondata);
		}
	} else if (uploadtype == 'level') {
		var myuplevel = document.getElementById("myuplevel");
		var jsondata = myuplevel.value;
		if (jsondata != "") {
	  	  $rootScope.cdata.readonly.levels = JSON.parse(jsondata);
		}
	} else {
                var myupall = document.getElementById("myupall");
		var jsondata = myupall.value;
		if (jsondata != "") {
	  	  $rootScope.cdata = JSON.parse(jsondata);
	}
    }
  }
    
  // show selected data in table
  $rootScope.viewtable = function() {
      
      // set variables for processing
      var data = $rootScope.cdata.users;
      const nums = Object.keys($rootScope.selIds);
      $rootScope.selIds = {}; // reset
      const mykeys = Object.keys(data)
      
      csvstudent = "";
      for (const key of mykeys) { // loop through all students
        
        var total = 0; // total number of points

        for (const num of nums) { // loop through selected ids
            if (data[key].daily == undefined) { // added just in case students are added later
              continue;
            }

            mygrade = (parseInt(data[key].daily[num].grade) + parseInt(data[key].daily[num].value));
            total = total + mygrade;                

            if (data[key].daily[num].desc.includes(",")) { 
                  var desc = data[key].daily[num].desc.replace(/,/g,"");
            } else {
                  var desc = data[key].daily[num].desc;
            }
            csvstudent = csvstudent + data[key].email + ",'" + $rootScope.cdata.readonly.lessons[num].name + "','" + desc + "'," + mygrade + "<br>";
             
        }
      }
              
      // Popup a message to remind user
      mydiv = document.getElementById("tablediv");
      mydiv.innerHTML = csvstudent;
      
        $(document).ready(function(){
            $('#modaltable').modal();
            $('#modaltable').modal('open'); 
        });
  }
	  
  // save - use to write out to Firebase
  $rootScope.save = function() {
  	
    // remove modal from url
  	$location.url($rootScope.url);

    if ($rootScope.cdata.users == null) {
        $rootScope.newusers = undefined;
    }
      
    // if modal checkbox checked, then set totals for users
    //if (document.getElementById('usertotals').checked) {
    if ($rootScope.cdata.users != null) {
        setUserTotals(); 
    }
    //}
    
        
    // set flag on class
    $rootScope.cdata.readonly.saved = true;

    // get rid of Angular $$ data
    cdata = JSON.parse(angular.toJson($rootScope.cdata));    
    $rootScope.o_readonly = JSON.stringify(angular.copy(cdata.readonly)); // make o_readonly a string
    users = cdata.users;
      
    // .saveusers is set if all users are deleted, remove all records from database
    if ($rootScope.saveusers != undefined) { 
       	var users = {};
    } 
    
    // write to the database - have to separate users and readonly as they have diff permissions
    var dbstring = "teachers/" + $rootScope.admin.uid + "/courses/" + $rootScope.cname;
    var refusers = $rootScope.database.ref(dbstring + "/users");
    var refro = $rootScope.database.ref(dbstring + "/readonly");
      
    if ($rootScope.myarchive != undefined) {
       myarchive = JSON.parse(angular.toJson($rootScope.myarchive)); 
       var refarchive = $rootScope.database.ref(dbstring + "/myarchive");
       refarchive.set(myarchive).then(function(){
         console.log("Archive data saved successfully.");
       }).catch(function(error) {
         console.log("Archive data could not be saved." + error);
       });
    }
	  
    refusers.set(users).then(function(){
        console.log("Users data saved successfully.");
    }).catch(function(error) {
        console.log("Users could not be saved." + error);
    });
      
    refro.set(cdata.readonly).then(function(){
        console.log("Readonly data saved successfully.");
    }).catch(function(error) {
        console.log("Readonly could not be saved." + error);
    });

  }

  function setUserTotals() {
            
    //var users = $rootScope.cdata.users;
      
    var delhash = angular.toJson($rootScope.cdata.users); // get rid of Angular $$ data
    var users = JSON.parse(delhash);
      
    var userlist = [];
      
    // d.html
    var badgeArray = [];
    var quizArray = [];
    var pointsArray = [];
    var dailyArray = [];
    var badgeRatio = []; // d.html

       
    if (users == null || users == undefined) {
      console.log("No user updates can be made. $rootScope.cdata.users is null or undefined.");
      return;  
    }
      
    $rootScope.newusers = undefined;
      
    // d.html - added for reporting
      
    
    // HOEL - add totals for all
    var pointsforall = 0;
    var userslength = Object.keys(users).length;
    var lessons = $rootScope.cdata.readonly.lessons; // RECENTS
      
    for (key in users) {
      var pointstotal = 0;
      var quiztotal = 0;
      var dailytotal = 0;
      var user = users[key];
      var daily = user.daily;
      var quizzes = user.quizzes;
      var badgelist = [];
      var badgestotal = 0;
      var excused = 0;
      var count3 = 0; // d.html
      var countMore = 0;

      // if there are no preferences, then add false      
      if (user.preferences == undefined) {
          user.preferences = {"dailychk": false,"badgechk": false, "levelchk": false};
      }
        
      user.confirmed = true;
        
      var d = new Date();
      user.dateconfirmed = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + "-" + d.getHours() + ":" + d.getMinutes();   

      if (daily != undefined) {
        if (daily.length == undefined) { // if user added later, process
          var newdaily = []; 
          for (dailykey in daily) {
            newdaily.unshift(daily[dailykey]); 
          }
          daily = newdaily;
        } 

        for (j = 0; j<daily.length; j++) {

          if (daily[j].grade == undefined) { daily[j].grade = -99; }

          if (daily[j].grade != -99) {
            dailytotal = dailytotal + daily[j].grade;
          }
            
        if (daily[j].desc != "Normal day, nothing to report") { // d.html
            countMore = countMore + 1; 
        } else {
            count3 = count3 + 1; 
        }
            
          if (daily[j].badge != 0 || daily[j].badge != "") {
            badgelist.push(daily[j].badge);
            // if not a normal day
            if (daily[j].grade !=3) {
              badgestotal = badgestotal + daily[j].value;
            }
          }
            
        }
      }
        
      if (quizzes != undefined) {
        
        if (quizzes.length == undefined) { // if user added later, process
          var newquiz = []; 
          for (quizkey in quizzes) {
            newquiz.unshift(quizzes[quizkey]); 
          }
          quizzes = newquiz;
        }

        for (k = 0; k<quizzes.length; k++) {

          if (user.quizzes[k].grade == -99) { 
              user.quizzes[k].xp = -99; 
          }
            
          if (user.quizzes[k].xp != -99) {
            quiztotal = quiztotal + user.quizzes[k].xp;
          } else {
            excused = excused + 1;
          }

        if (user.quizzes[k].desc != "") { // d.html
            countMore = countMore + 1; 
        } else {
            count3 = count3 + 1; 
        }
        
        if (user.quizzes[k].badge != "" || user.quizzes[k].badge != 0) {
            badgelist.push(user.quizzes[k].badge);
             
            
            // if not a normal day
            if (user.quizzes[k].xp >3) {
              badgestotal = badgestotal + 1;
            } else if (user.quizzes[k].xp <3) {
              badgestotal = badgestotal - 1;
            }
	      } 
          
            
        }
      }
     
      // RECENTS
        
        var recents = [];
        var current = Date.parse(d);

        
        for (i = 0; i < 3; i++) {
            
            if (daily != undefined && daily[i] != undefined && daily[i].mydate != undefined) {
                    var p = daily[i].mydate.split("/");
                    var previous = Date.parse(p[1] + "/" + p[0] + "/" + p[2]);
                    td = timeDifference(current, previous)
                    if (td < 7) {
                        daily[i].name = $rootScope.cdata.readonly.daily[i].id.name;
                        daily[i].type = "daily";
                        daily[i].past = td;
                        recents.push(daily[i]);
                    }
            }

            if (quizzes != undefined && quizzes[i] != undefined && quizzes[i].date != undefined) {
                  var p = quizzes[i].date.split("/");
                  var previous = Date.parse(p[1] + "/" + p[0] + "/" + p[2]);
                  td = timeDifference(current, previous)
                  if (td < 7) {
                    quizzes[i].type = "quiz";
                    quizzes[i].past = td;
                    recents.push(quizzes[i]);                        
                  }
            }

	    if (lessons != undefined && lessons[i] != undefined) {
		    if (lessons[i].date != undefined && lessons[i] != undefined && lessons[i].date != undefined) {
			  var p = lessons[i].date.split("/");
			  var previous = Date.parse(p[1] + "/" + p[0] + "/" + p[2]);
			  td = timeDifference(current, previous)
			  if (td < 7) {
			    lessons[i].type = "lesson";
			    lessons[i].past = td;
			    recents.push(lessons[i]);                        
			  }
		    }
	    }
            
        }

        user.recents = recents;

      var counts = {};
      badgelist.forEach(function(x) { counts[x] = (counts[x] || 0)+1; });
      pointstotal = dailytotal + quiztotal + badgestotal;
      user.badges = counts;
      user.dailytotal = dailytotal;
      user.quiztotal = quiztotal;
      user.badgestotal = badgestotal;
      user.pointstotal = pointstotal;
      //console.log(count3 + " " + countMore + " ratio:" + count3/countMore + " name:" + user.name);
      user.badgeratio = count3/countMore;
      badgeRatio.push(count3/countMore); // d.html
        
      
      badgeArray.push(badgestotal);
      dailyArray.push(dailytotal);
      quizArray.push(quiztotal);
      pointsArray.push(pointstotal); 
      
            
      var levels = $rootScope.cdata.readonly.levels;
      if (levels != undefined) {
        for (l = levels.length -1; l>=0; l--) {
          if (pointstotal >= levels[l].low && pointstotal <= levels[l].high) {
            // check to see if we should send a message
            if (user.level == undefined) {
                user.level = {name:"Option not enabled",desc:"",number:0,low:0,high:0,priv:""};
            }

            user.level = levels[l];
            user.level.number = l;
            break; // get out once level is found
          }
        }
      }
        
      // HOEL 
      pointsforall = pointsforall + pointstotal;
                
      // Set user updates to $rootScope
      $rootScope.cdata.users[key] = user;   
        
    }
     
    // HOEL 
    if (daily != undefined && quizzes != undefined) { // fix for archive  
       avgpoints = Math.round((daily.length + (quizzes.length - excused)) * 3);
    } else {
       avgpoints = 0;
    }
    
    //avgpoints = Math.round(pointsforall/userslength);      
    for (key in $rootScope.cdata.users) {
      $rootScope.cdata.users[key].avgpoints = avgpoints;
      $rootScope.cdata.users[key].badgeArray = badgeArray;
      $rootScope.cdata.users[key].quizArray = quizArray;
      $rootScope.cdata.users[key].dailyArray = dailyArray;
      $rootScope.cdata.users[key].pointsArray = pointsArray;
      $rootScope.cdata.users[key].ratioArray = badgeRatio;
    }
    console.log('updated users with average point total ' + avgpoints);
      
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
  
  $rootScope.navUser3 = function(index) {
    var username = Object.keys($rootScope.listArray)[index];
    console.log($routeScope.listArray);
    console.log($routeScope.share);
    $rootScope.user = $rootScope.listArray[username];
    $rootScope.view = $rootScope.share + "&user=" + $rootScope.user.uid;
    console.log($routeScope.view);
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
    if (!$rootScope.cdata.readonly.lessons[index].show) {return; }
    $rootScope.lesson = $rootScope.cdata.readonly.lessons[index];
    $rootScope.filePath = "includes/lessons_one.html";
  }
  
  $rootScope.setDataById = function(index) {
    console.log(index);
    //if (!$rootScope.cdata.readonly.lessons[index].show) {return; }
    for (i=0;i<$rootScope.cdata.readonly.lessons.length; i++) {
        console.log($rootScope.cdata.readonly.lessons[i].id);
        if ($rootScope.cdata.readonly.lessons[i].id == index) {
            $rootScope.lesson = $rootScope.cdata.readonly.lessons[i];
            console.log($rootScope.lesson);
            break;
        }
    }
    $rootScope.filePath = "includes/lessons_one.html";
  }
  
  // reverse student lessons     
  $rootScope.revLessons = function() {
    $rootScope.cdata.readonly.lessons.reverse();
    if ($rootScope.rev || ($rootScope.rev == undefined)) { 
    	$rootScope.rev = false;
    } else {
    	$rootScope.rev = true;
    }
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
    if ($rootScope.admin.courses.length < 10) {
      $rootScope.admin.courses.unshift({name: "", descname: "", desc: ""});
    }    
  }

  // Remove some data from the rootScope
  $rootScope.removecourse = function (index) {
    	$rootScope.admin.courses.splice(index, 1);
  }
  
  // Remove some data from the rootScope
  $rootScope.remcourseDB = function (index) {
    askit = confirm("You are about to unregister course. Are you sure?");
    if (askit == false) {
        return;
    }
    $rootScope.admin.courses.splice(index, 1);
    
    var cRef = $rootScope.database.ref("teachers/" + $rootScope.admin.uid + "/admin/courses");
    var courses = angular.toJson($rootScope.admin.courses); // get rid of Angular $$ data
    courses = JSON.parse(courses); // put data back into object form
        
    // write to admin.courses
    cRef.set(courses).then(function(){
        console.log("Admin courses data saved successfully.");
    }).catch(function(error) {
        console.log("Admin courses data could not be saved." + error);
    });
      
  }

  // Remove some data from the rootScope
  $rootScope.removeuser = function (val,index) {
      $rootScope.listArray.splice(index,1);
      delete $rootScope.cdata.users[val];
      // when user deletes all users, set users to empty object so that saving removes from Firebase
      if (Object.keys($rootScope.cdata.users).length == 0) {
      	$rootScope.cdata.users = undefined;
 		   $rootScope.saveusers = true;
      	$rootScope.cdata.readonly.daily = {};
      }
  }

  // Add some new data to the rootScope
  $rootScope.addbadge = function () {
    if ($rootScope.cdata.readonly.badges == undefined) { $rootScope.cdata.readonly.badges = []; }
    $rootScope.cdata.readonly.badges.unshift({name:"",value:1,id:""});
  }

  // Remove some data from the rootScope
  $rootScope.removebadge = function (index) {
    $rootScope.cdata.readonly.badges.splice(index, 1)
  }

  // Add some new data to the rootScope
  $rootScope.addlevel = function () {
    if ($rootScope.cdata.readonly.levels == undefined) { $rootScope.cdata.readonly.levels = []; }
    $rootScope.cdata.readonly.levels.unshift({name: "", desc: "", low: 0, high: 0, priv: "", number:0})
  }

  // Remove some data from the rootScope
  $rootScope.removelevel = function (index) {
    $rootScope.cdata.readonly.levels.splice(index, 1)
  }

  // Add some new data to the rootScope
    // Add some new data to the rootScope
  $rootScope.addlesson = function () {
     
    if ($rootScope.cdata.readonly.lessons == undefined) { $rootScope.cdata.readonly.lessons = []; }
			
	// max record number for next record to fix bug of duplicates
	var max = 0;
	for (i = 0; i < $rootScope.cdata.readonly.lessons.length; i++) {
		if (parseInt($rootScope.cdata.readonly.lessons[i].id) > max) {
			max = parseInt($rootScope.cdata.readonly.lessons[i].id);
		}
	}
	max = max + 1;

	// RECENTS
	var newrecord = {id:max,show:false,unit:"",name:"",desc:"",img:"",keywords:[],expectations:[],segments:[]}
	$rootScope.cdata.readonly.lessons.unshift(newrecord)
  }
	  	  
  // Add some new data to the rootScope
  $rootScope.uplesson = function (index) {
    var curlesson = $rootScope.cdata.readonly.lessons[index];
    var uplesson = $rootScope.cdata.readonly.lessons[index -1];
    $rootScope.cdata.readonly.lessons[index - 1] = curlesson;
    $rootScope.cdata.readonly.lessons[index] = uplesson;
  }

  // Add some new data to the rootScope
  $rootScope.downlesson = function (index) {
    var curlesson = $rootScope.cdata.readonly.lessons[index];
    var uplesson = $rootScope.cdata.readonly.lessons[index + 1];
    $rootScope.cdata.readonly.lessons[index + 1] = curlesson;
    $rootScope.cdata.readonly.lessons[index] = uplesson
  }

  // Add some new data to the rootScope
  $rootScope.addsegment = function (parent) {

    if ($rootScope.cdata.readonly.lessons[parent].segments == undefined) { $rootScope.cdata.readonly.lessons[parent].segments = []; }
    //if ($rootScope.cdata.readonly.lessons[parent].segments.length <5) { // only allowed 5! gameof5!
      $rootScope.cdata.readonly.lessons[parent].segments.unshift({title:"",text:"",segimg:"",seglink:""});
    //}
  }

  // Remove some data from the rootScope
  $rootScope.removelesson = function (index) {
    $rootScope.cdata.readonly.lessons.splice(index, 1)
  }

  // Remove some data from the rootScope
  $rootScope.removesegment = function (parent,index) {
    $rootScope.cdata.readonly.lessons[parent].segments.splice(index, 1)
  }


 $rootScope.selectBadge = function(index,design) {

    var divbadge = document.getElementById("badgeselect");
    divbadge.innerHTML = "";
    $rootScope.cdata.readonly.badges[index].design = design;

 }

// Add some new data to the rootScope
$rootScope.addquiz = function(item) {
      
    if ($rootScope.cdata.readonly.quizzes == undefined) { 
      $rootScope.cdata.readonly.quizzes = []; 
    }
    $rootScope.cdata.readonly.quizzes.unshift({name:""});
  
 // RECENTS  
    var d = new Date();
    var quizdate = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + "-" + d.getHours() + ":" + d.getMinutes();  
      
    for (key in $rootScope.cdata.users) {    
      var user = $rootScope.cdata.users[key];
      if (user.quizzes == undefined) { user.quizzes = []; }
      user.quizzes.unshift({xp: 3, desc: "", name: "", date: quizdate}); // RECENTS
      $rootScope.cdata.users[key] = user;
    }

  }
  // called from admin_quiz, receives item.name and $index
  $rootScope.quizUsers = function(name,index) {
    for (key in $rootScope.cdata.users) {
      var user = $rootScope.cdata.users[key];
      if (user.quizzes) {
        if (user.confirmed) { // check to see if user is confirmed yet
            if (user.quizzes[index].name == '') {
              user.quizzes[index].name = name;
            } 
        } 
      }
      $rootScope.cdata.users[key] = user;
    }
  }

  // Remove some data from the rootScope
  $rootScope.removequiz = function (index) {
    // remove from readonly
    $rootScope.cdata.readonly.quizzes.splice(index, 1);
    // remove from each user
    for (key in $rootScope.cdata.users) {
      var user = $rootScope.cdata.users[key];
      if (user.confirmed) { // account for new users added after quiz
        user.quizzes.splice(index, 1);
        $rootScope.cdata.users[key] = user;
      }
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
        
    var username = Object.keys($rootScope.cdata.users)[index];
    user.daily[parent].desc = "Enter a message ...";

    // check for badge in case a user is added later, if so, set badge to 0
    if (user.daily[parent].badge == undefined) { user.daily[parent].badge = 0; }
    
    // set value attribute
    if (user.daily[parent].grade == 4) {
      user.daily[parent].value = 1;
    } else if (user.daily[parent].grade == 3) {
      user.daily[parent].value = 0;
    } else {
      user.daily[parent].value = -1;
    }    

    // set user updates back to $rootScope
    $rootScope.cdata.users[username] = user;

  }

  // Add some new data to the rootScope
  $rootScope.adddaily = function () {

    if ($rootScope.cdata.readonly.daily == undefined) { $rootScope.cdata.readonly.daily = []; }
    $rootScope.cdata.readonly.daily.unshift({});
    
    // RECENTS
    var d = new Date();
    var dailydate = d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + "-" + d.getHours() + ":" + d.getMinutes();

    for (key in $rootScope.cdata.users) {
      
      var user = $rootScope.cdata.users[key];
      if (user.daily == undefined) { user.daily = []; }
      user.daily.unshift({grade: 3, desc: "Normal day, nothing to report", badge: 0, value:0, mydate: dailydate});

      $rootScope.cdata.users[key] = user;
    }
  }

  // Remove some data from the rootScope
  $rootScope.removedaily = function (index) {
    $rootScope.cdata.readonly.daily.splice(index, 1); // remove from admin list
    for (key in $rootScope.cdata.users) { // remove from each user
      user = $rootScope.cdata.users[key];
      if (user.daily != undefined) { // account for users added after daily
         $rootScope.cdata.users[key].daily.splice(index, 1); 
      }
    }
  }
  
  // set user to confirmed
  $rootScope.confirmUser = function(uid,index) {
    console.log($rootScope.cdata.users[uid]);
    user = $rootScope.cdata.users[uid] 
    user.confirmed = true;
  }
  
  // sort based on a column, make sure to bring unconfirmed to top
  $rootScope.sortUser = function(data,col) {
    var someArray = $rootScope.listArray;
	  
    if (col == "confirmed") { // added to move unconfirmed to top
      someArray.sort(generateSortFn(col, false));  
    } else {
      someArray.sort(generateSortFn(col, true));
    }  
	  
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
