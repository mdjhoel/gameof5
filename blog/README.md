# website
This blog software was made to investigate the use of Github as a platform for a data driven website. 

TECH STACK

1. Backend is a JSON file. I recommend http://www.jsoneditoronline.org/ to edit it.
2. XMLHttpRequest() is used to access the JSON
2. Javascript of course
3. AngularJS for searching, listing JSON objects
4. Bootstrap for responsive CSS components

API

When builder.html is run with ?page=0 API call, blog.json (in the data sub directory) is read by the code in website.js and a web page is built using Bootstrap, custom CSS and the data for the first blog post. If you want to see the second blog post, simply add ?page=1 to the URL.
