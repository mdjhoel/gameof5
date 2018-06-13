function loadJSON(callback) {   
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'localhost:8000/blog/data/blog.json', true);
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
    };
    xobj.send(null);  
 }

 function init() {
 	loadJSON(function(response) {
  	
  		// Parse JSON string into object
    	var actual_JSON = JSON.parse(response);
    	var url = window.location.href;
    	var n = url.indexOf("?");
    	if (n != -1) { n = url.substr(n+6) }
    
    	var slab = [];
    	slab.push("<header><title>" + actual_JSON[n].name + "</title>");
    	slab.push("<link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css'>");
    	slab.push("<link href='website.css' rel='stylesheet'>");
        slab.push("<meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1'>");
    	slab.push("</header>");
    	slab.push("<div align='center'><svg width='200' viewBox='0 0 150 100' xmlns='http://www.w3.org/2000/svg'><circle cx='115' cy='40' r='30' stroke='#2196f3' stroke-width='5' fill='#8bc34a'/><circle cx='87' cy='40' r='15' stroke='none' stroke-width='none' fill='#fff'/><text x='0' y='50' font-size='40' font-family='Helvetica' font-weight='bold' stroke='none' fill='#2196f3'>g</text><text x='22' y='50' font-size='40' font-family='Helvetica' font-weight='bold' stroke='none' fill='#ffeb3b'>a</text><text x='42' y='50' font-size='40' font-family='Helvetica' font-weight='bold' stroke='none' fill='#e91e63'>m</text><text x='75' y='50' font-size='40' font-family='Helvetica' font-weight='bold' stroke='none' fill='#ff9800'>e</text><text x='103' y='57' font-size='50' font-family='Helvetica' font-weight='bold' stroke='none' fill='white'>5</text></svg></div>");
    	slab.push("<div class='container'>");
        slab.push("<hr style='color: #2196f3; background-color: #2196f3; height: 3px; width: 100%;'>");
    	slab.push("<h3>" + actual_JSON[n].name + "</h3>");
        slab.push("<p><i class='icon-large icon-search'></i><span class='glyphicon glyphicon-time'></span> Posted by " + actual_JSON[n].author + " on " + actual_JSON[n].date + "</p><hr>");
    	
        for (i in actual_JSON[n].segments) {
    		if (actual_JSON[n].segments[i].img != "") { 
    			slab.push("<a href=data/images/" + actual_JSON[n].segments[i].img + " target='_blank'>");
    			slab.push("<img src=data/images/" + actual_JSON[n].segments[i].img + " width='100%'></a>"); 
    			slab.push("<figcaption><i>" + actual_JSON[n].segments[i].caption + "</i></figcaption>");
    			slab.push("</figure>");
    			slab.push("<hr>");
    		}
    		if (actual_JSON[n].segments[i].paragraph != "") { 
    			slab.push("<p>" + actual_JSON[n].segments[i].paragraph + "</p>");
    			slab.push("<hr>");
    		}   		
    	}
        
        var keywords = actual_JSON[n].keywords.split(",");
        slab.push("<div style='padding-bottom:30px;'>");
        for (i in keywords) {
            //slab.push("<span class='label label-primary'>" + keywords[i] + "</span>  ");
            slab.push("<span id='keyword'><div class='label label-primary'>" + keywords[i] + "</div></span>");
        }
        slab.push("</div>");

    	slab.push("<footer><div>");
 		slab.push("<p>Copyright &copy; Hoels 2017</p>");
        slab.push("</div></footer>");

    	slab.push("</div>");

    	var myhtml = slab.join("");
    	document.write(myhtml);

 	});
 }
