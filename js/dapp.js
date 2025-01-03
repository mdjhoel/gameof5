var app = angular.module('dpages', ['ngRoute','ngSanitize','chart.js']);
  
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

  // d.html
  app.filter('searchKeys', function(){
      return (arr, searchString)=>{
          if(!searchString){
              return arr;
          }
          var result = [];
          angular.forEach(arr, function(keyword){
            if (keyword != undefined) {
                if(keyword.indexOf(searchString) !== -1){
                    result.push(keyword);
                }
            }
          });
          return result;
      };
  });
  

  app.run(function($rootScope,$location,service) {
	  
    // get url so URL can be put back when users click on modals
    $rootScope.url = $location.url();
      
    // d.html
    $rootScope.filePath = "includes/spinner.html";
            
    // 1. check to see if user logged in
    firebase.auth().onAuthStateChanged(function(user) {

      // 2. Detect authenication 
      if (user == null) {
          
	var provider = new firebase.auth.GoogleAuthProvider();
            //firebase.auth().signInWithRedirect(provider).then(function(result) { });
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
          $rootScope.cname = args["cname"];
          
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
                                
                                // d.html
                                keywords = []
                                for (i=0;i<$rootScope.readonly.lessons.length; i++) {
                                    keywords = [].concat(keywords,$rootScope.readonly.lessons[i].keywords);
                                }
                                keywords = Array.from(new Set(keywords))
                                $rootScope.keywords = keywords;
                                
                                // combine daily and quiz comments
                                $rootScope.allcomms = combineComments();
                                
                                // sort skills and remove undefined
                                $rootScope.allskills = sortSkills();
                                
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
                                
                                /*
                                if ($rootScope.readonly.daily != undefined) {
                                    console.log($rootScope.readonly.daily);
                                    $rootScope.dailies = $rootScope.readonly.daily.reverse();
                                    console.log($rootScope.dailies);
                                }
                                */
                                
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
                            events: ['click'],
                            onClick: function(e) {
                                  var elem = this.getElementAtEvent(e);
                                  var daily = $rootScope.user.daily[elem[0]._index]
                                  if (elem.length) {
                                     stuff = document.getElementById("dailyinfo");
                                     myhtml = "<b>" + daily.name + "</b> (" + daily.mydate + ")<br>";
                                     if (daily.grade == -99) {
                                        myhtml = myhtml + " Excused for valid reason"
                                     } else {
                                        myhtml = myhtml + daily.desc + "<br>"
                                        myhtml = myhtml + "XP: " + daily.grade;
                                     }
                                     
                                     stuff.innerHTML = myhtml;
                                  }
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
                                enabled: false,
                                mode: 'index',
                                position: 'average',
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
                            
                            //labels.push("xp: " + $rootScope.user.quizzes[key].xp);
                            labels.push($rootScope.user.quizzes[key].name);
                            
                        }
                        
                        $rootScope.quizpercent = Math.round(($rootScope.user.quiztotal / ($rootScope.user.quizzes.length * 4)) * 100);
                        $rootScope.quizlabels = labels; 
                        $rootScope.quizdata = grades; 
                        $rootScope.quizseries = ['Series A'];
                        $rootScope.quizColorBar = colors; 
                    
                        
                        $rootScope.quizoptions = {
                            events: ['click'],
                            onClick: function(e) {
                                  var elem = this.getElementAtEvent(e);
                                  var quiz = $rootScope.user.quizzes[elem[0]._index]
                                  if (elem.length) {
                                     stuff = document.getElementById("quizinfo");
                                     myhtml = "<b>" + quiz.name + "</b> (" + quiz.date + ")<br>";
                                     if (quiz.xp == -99) {
                                        myhtml = myhtml + " Excused for valid reason"
                                     } else {
                                        myhtml = myhtml + quiz.desc + "<br>"
                                        myhtml = myhtml + "XP: " + quiz.xp;
                                     }
                                     
                                     stuff.innerHTML = myhtml;
                                  }
                            },
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
                                
                                enabled: false,
                                mode: 'index',
                                position: 'average',
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

          // d.html
          $rootScope.filePath = "includes/dmain.html";
          
          } // student
    }); // if authorization changes
      
  // ---------------------------------------------//
  // FUNCTIONS
  // ---------------------------------------------//
    
  function getBP(avg,stdev) {
      //var factor1 = .7
      //var factor2 = 1.5
      var factor1 = .7
      var factor2 = 1.25
      
      var high = avg + stdev * factor1;
      var high2 = avg + stdev * factor2;
      var low = avg - stdev * factor1;
      var low2 = avg - stdev * factor2;
      
      return [avg,high,high2,low,low2];
  }
      
  function getAdj() {
      s = $rootScope.readonly.settings;
      inputlist = [s.impactadj,s.totaladj,s.dailyadj,s.quizadj];
      for (i=0; i<inputlist.length;i++) {
        if (inputlist[i]==undefined) {
          inputlist[i] = ["low, below average, average, above average, excellent"];
        } else {
          inputlist[i] = inputlist[i].split(",");
          if (inputlist[i].length != 5) {
              inputlist[i] = ["low, below average, average, above average, excellent"];
          }
        }
      }
      return inputlist;
  }  
      
  function getMyadj(adjArray,bpArray) {
      myratio = $rootScope.user.badgeratio; mypts = $rootScope.user.pointstotal; mydaily = $rootScope.user.dailytotal; myquiz = $rootScope.user.quiztotal;
      
      // myadjlist - [imp,pts,daily,quiz]["low, below average, average, above average, excellent"]
      // bpArray - [imp,pts,daily,quiz][avg,high,high2,low,low2]
      
      mydata = [myratio,mypts,mydaily,myquiz];
      myadjlist = [];
      
      for (i=0;i<4;i++) {
        if (mydata[i] > bpArray[i][1]) { // test for better than averge
            temp = adjArray[i][3]; 
            if (mydata[i] > bpArray[i][2]) { temp = adjArray[i][4]; } // way better
        } else if (mydata[i] < bpArray[i][3]) {
            temp = adjArray[i][1]; // test for worse
            if (mydata[i] < bpArray[i][4]) { temp = adjArray[i][0]; } // way worse
        } else {
            temp = adjArray[i][2]; // average
        }
        myadjlist.push(temp);
      }
          
      return myadjlist;
      
  }
      
      
 function getReport(name,myadjlist,bpArray) {
      myratio = $rootScope.user.badgeratio; mypts = $rootScope.user.pointstotal; mydaily = $rootScope.user.dailytotal; myquiz = $rootScope.user.quiztotal;
      
      // myadjlist - [imp,pts,daily,quiz]["low, below average, average, above average, excellent"]
      // bpArray - [imp,pts,daily,quiz][avg,high,high2,low,low2]
      
      report = "During the second term, " + name + "'s impact on the classroom environment was usually " + myadjlist[0] + " when compared to his peers. "
      badges = Object.keys($rootScope.user.badges);
      for (i=0;i<badges.length;i++) {
          if (badges[i] == "calendar") { 
              if ($rootScope.user.badges['calendar'] >=3) {
                  report = "During the second term, " + name + " missed a number of classes, reducing his impact on the classroom environment. "
              } 
          }
      }
      
      if ((myratio < bpArray[0][3]) && (mypts < bpArray[1][2])) { // ratio high && low pts
          report = report + "Unfortunately, not all of his impact was positive as "
      } else if ((myratio < bpArray[0][1]) && (mypts < bpArray[1][1])) { // ratio low, low pts
          report = report + "In general, he seemed content to quietly observe proceedings and  "
      } else {
          report = report + "Overall, " // not high ratio/low pts, not low ratio low pts
      }
      report = report + "he demonstrated " + myadjlist[1] + " engagement in day to day course work."
      
      
      if ((mydaily >= bpArray[2][0] && myquiz >= bpArray[3][0]) || (mydaily < bpArray[2][0] && myquiz < bpArray[3][0])) {
          report = report + " His contributions during lessons tended to be " + myadjlist[2] + " and his quiz and check-in marks were " + myadjlist[3] + "."
      } else {
          report = report + " More specifically, his contributions during lessons tended to be " + myadjlist[2] + " but his quiz and check-in marks were " + myadjlist[3] + "."
      }
       
      report = report + " Academically, " + name + " sometimes/usually/always met expectations (TBD). He was particularly strong in design criteria a/b/c/d. " + name + "'s quality of work declined/remained the same/improved in the final term. ";
      report = report + "He is encouraged to continue his design and coding education in the future."
      
      return report;
      
  }
      
  $rootScope.genReport = function() {
     
    // sort and remove extreme data (top and bottom)
    var sortedratio = Array_Sort_Numbers($rootScope.user.ratioArray)
    sortedratio.pop(); sortedratio.shift()
      
    // get breakpoints
    var bpArray = [];
    var data = [sortedratio,$rootScope.user.pointsArray,$rootScope.user.dailyArray,$rootScope.user.quizArray];
    for (i=0;i<4;i++) {
        bpArray.push(getBP(Array_Average(data[i]),Array_Stdev(data[i])));
    }
      
    // get adjectives, make sure there are 5
    var adjlist = getAdj();
      
    // generate my adjectives
    var myadjlist = getMyadj(adjlist,bpArray)
    
    // generate report comment
    var name = $rootScope.user.name.split(" ")[0];
    $rootScope.report = getReport(name,myadjlist,bpArray);
    console.log($rootScope.report)
      
    $rootScope.myadjlist = myadjlist;
    $rootScope.bpArray = bpArray;
      
    // create histogram
    histogram();
      
  }
  
  function histogram() {
    $rootScope.colors = ['#45b7cd', '#ff6384', '#ff8e72'];
    $rootScope.labels = ['-99', '0', '1', '2', '3', '4'];
    $rootScope.data = [
    $rootScope.histo,$rootScope.histo
    ];
    $rootScope.datasetOverride = [
      {
        label: "Bar chart",
        borderWidth: 1,
        type: 'bar'
      },
      {
        label: "Line chart",
        borderWidth: 1,
        hoverBackgroundColor: "rgba(255,99,132,0.4)",
        hoverBorderColor: "rgba(255,99,132,1)",
        type: 'line'
      }
    ];
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
      
  // function sorts and makes skills look good
  function sortSkills() {
      if ($rootScope.readonly.badges == undefined || $rootScope.readonly.badges == null || $rootScope.user.badges == undefined) {
	      return
      }
      skills = []; 
      explans = Object.values($rootScope.readonly.badges);
      keys = Object.keys($rootScope.user.badges);
      values = Object.values($rootScope.user.badges);
      
      for (i = 0; i < explans.length; i++) {
          for (j = 0; j < keys.length; j++) {
             if (explans[i].id == keys[j]) {
                 temp = {id: keys[j], name: explans[i].name, value: explans[i].value, number: values[j]};
                 skills.push(temp);                 
             }
          }
      }
      
      skills.sort(generateSortFn('number', true));
      return skills;
  }
      
  // function combines quizzes and comments - poor original design work around
  function combineComments() {
      if ($rootScope.user.daily == undefined && $rootScope.user.quizzes == undefined) {
          return;
      }
      if ($rootScope.user.quizzes == undefined) {
         comms = $rootScope.user.daily
      } else {
         comms = $rootScope.user.daily.concat($rootScope.user.quizzes) 
      }
	 
      pcomms = []
      histo = [0,0,0,0,0,0] // histo
      for (i=0;i<comms.length; i++) {
        if (comms[i].desc != "" && comms[i].desc != "Normal day, nothing to report") {
            if (comms[i].type == "daily") {
                date = comms[i].mydate;
                xp = comms[i].grade;
                //console.log($rootScope.readonly.daily[i].id);
                if ($rootScope.readonly.daily[i]) {
                  id = $rootScope.readonly.daily[i].id.id;  
                } else {
                  id = -99;
                }
                
            } else {
                date = comms[i].date;
                xp = comms[i].xp;
                id = -99;
            }
            if (comms[i].badge == undefined) {
                badge = 0; 
            } else {
                badge = comms[i].badge;
            }
            
            // collect data for histogram
            if (xp == 4) {
                histo[5] = histo[5] + 1;
            } else if (xp == 3) {
                histo[4] = histo[4] + 1;
            } else if (xp == 2) {
                histo[3] = histo[3] + 1;
            } else if (xp == 1) {
                histo[2] = histo[2] + 1;
            } else if (xp == 0) {
                histo[1] = histo[1] + 1;
            } else {
                histo[0] = histo[0] + 1;
            }
                
            comm = {date: date, desc: comms[i].desc, badge: badge, name: comms[i].name, xp: xp, id: id, type: comms[i].type}
            pcomms.push(comm)
        } 
      }      
      $rootScope.comm_meta = [comms.length,comms.length - pcomms.length,pcomms.length]; // histo
      histo[4] = histo[4] + comms.length - pcomms.length; // histo
      $rootScope.histo = histo; // histo
      pcomms.sort(function compare(a, b) {
	  if (a.date != undefined && b.date != undefined) {
		  var dateParts = a.date.split("/");
		  var dateA = new Date(dateParts[1] + "/" + dateParts[0] + "/" + dateParts[2]); 
		  var dateParts = b.date.split("/");
		  var dateB = new Date(dateParts[1] + "/" + dateParts[0] + "/" + dateParts[2]); 
		  return dateA - dateB;
	  }
      });
      pcomms.reverse();
      return pcomms;
      
  }
   
  $rootScope.setSearchString = function(keyword) {
      $rootScope.searchString = keyword;
  }      
        
  $rootScope.studentType = function() {
      
      console.log($rootScope.allcomms);
      console.log($rootScope.allskills);
      console.log("average total",$rootScope.user.avgpoints)
      console.log("points total",$rootScope.user.pointstotal)
      console.log("badges total",$rootScope.user.badgestotal)
      console.log("quiz total", $rootScope.user.quiztotal);
      console.log("top comments", $rootScope.comm_meta[2]);
      console.log("non descript", $rootScope.comm_meta[1]);
      console.log("total comments", $rootScope.comm_meta[0]);
      console.log("histo", $rootScope.histo);
      
      
      
      
      
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
    //$rootScope.filePath = "includes/lessons_one.html";
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

