      var map;
      var flightPlanCoordinates = [];
      var flightPaths = [];
      var markers = [];
      var theData;
      var waypoints = [];
      var trackTime = false;
      var accMarkerTime = 0.0;
      var accMarkerSec = 0.0
      var altitudesPerFlightLimit = 5;
      var markerPlottingThreshold = 10; // only considering put a flight point marker after this many points away from airport
      // load google map script
      var gmap = document.createElement('script');
      gmap.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDFtc8Ix25xIykMtvbSMBFkxZnW0Z19Wdw&callback=initMap';
      gmap.async = true;
      gmap.defer = true;
      document.head.appendChild(gmap);
      //Make the DIV element draggagle:
      dragElement(document.getElementById(("option-panel")));
      dragElement(document.getElementById(("floating-panel")));
      dragElement(document.getElementById(("floating-toolbox")));

      // call back after google map script is loaded
      function initMap() {
        //console.log("initMap got called");
        map = new google.maps.Map(document.getElementById('map'), {
          center: {lat: 37.343111, lng: -122.042324},
          zoom: 11
        });
        infoWindow = new google.maps.InfoWindow();
        infoWindowWaypoints = new google.maps.InfoWindow();
        start = Date.now();
        drawFlightPath(map);
        checktime('drawFlightPath', start);
        start = Date.now();
        loadWaypoints();
        checktime('loadWaypoints', start);
     } //function initMap
     function checktime(option, start){
        if (trackTime) {
          millis = Date.now() - start;
          console.log(option+" seconds :" + Math.floor(millis/1000));
        }
     }
     function toggleWaypoints(ele) {
        if (ele.checked) {
          waypoints.forEach(function(marker, index, arr) {
           marker.setMap(map);
          });
        } else {
          waypoints.forEach(function(marker, index, arr) {
            marker.setMap(null);
          });
        }
     }
    function loadJSON(file, callback) {   
      var xobj = new XMLHttpRequest();
      xobj.overrideMimeType("application/json");
      xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
      xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
          }
      };
      xobj.send(null);  
    }
 
    function loadWaypoints() {
      loadJSON("/data/waypoints.json", function(response) {
        var jwaypoints = JSON.parse(response);
        jwaypoints.forEach(function(waypoint) {
          //console.log(waypoint);
          var latLng = new google.maps.LatLng(waypoint.lat, waypoint.lng);
            // Creating a marker and putting it on the map
          var marker = new google.maps.Marker({
                position: latLng,
                title: waypoint.title
          });
          var infowincontent = document.createElement('div');
          var strong = document.createElement('strong');
          strong.textContent = waypoint.title;
          infowincontent.appendChild(strong);
          infowincontent.appendChild(document.createElement('br'));
          var text = document.createElement('text');
          text.textContent = waypoint.description;
          infowincontent.appendChild(text);
          marker.addListener('click', function() {
            infoWindowWaypoints.setContent(infowincontent);
            infoWindowWaypoints.open(map, marker);
          }); //addListener
          marker.setMap(map);
          waypoints.push(marker);
          });
      });
    }   
     //data.php?sdate=2006-12-01&stime=00:00:00&edate=2006-12-01&etime=23:59:59
     function drawFlightPath(map, datalink='20061210.xml') {
        //https://somehost.dns.name/somedirectory
        hostAddress= top.location.href.toString(); 
        startDownload = Date.now();
        setStatus("Loading flights...");
        downloadUrl(hostAddress+'data/'+datalink,
            function(data, status, startDownload)  { 
              checktime("download data", startDownload);
              var xml = data.responseXML;
              theData = new XMLSerializer().serializeToString(xml);
              //save the raw xml data for viewing
              //rawtext = document.getElementById('flight-data-xml');
              //rawtext.textContent = theData;
              startd = Date.now();
              var flights = xml.documentElement.getElementsByTagName('flight');
              checktime("parsing xml", startd);
              
              flightPlanCoordinates = [];
              var flightName = '';
              var flightSrc = '';
              var flightDes = '';
              var flightTime = '';
              var flightPointsMarked = 0; // the total counts for those marked in map with altitude
              var flightPointsCounted
              accMarkerTime = 0.0; // reset the accumulated set marker time
              accMarkerSec = 0.0;
              startf = Date.now();            
              Array.prototype.forEach.call(flights, 
                function(flightElem) {
                  flightName = flightElem.getAttribute('name');
                  flightSrc = flightElem.getAttribute('src');
                  flightDes = flightElem.getAttribute('des');
                  flightPointsMarked = 0;
                  flightPointsCounted = 0;
                  //flight time will be the last marker time where flights arrive at airports.
                  flightTime = flightElem.getAttribute('arr_time'); 
                  var markers = 	flightElem.children;
                  Array.prototype.forEach.call(markers, 
                    function(markerElem, idx) {
                      if (markerElem.nodeName == 'marker') {
                        var point = new google.maps.LatLng(
                         parseFloat(markerElem.getAttribute('lat')),
                         parseFloat(markerElem.getAttribute('lng')));
                         flightPlanCoordinates.push(point);
                         if ( idx >= markerPlottingThreshold) {
                           if (setMarker(point, markerElem.getAttribute('altx100ft'), flightName, flightSrc, flightDes, flightTime, flightPointsMarked)) {
                             flightPointsMarked = flightPointsMarked + 1;
                           }
                         }
                      } 
                    }  // func
                  ) ; 
                  var flightPath = new google.maps.Polyline({
                    path: flightPlanCoordinates,
                    geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 0.3,
                    strokeWeight: 1,
                    geodesic: true,
                  });
                  flightPath.setMap(map);
                  //console.log("flight:"+flightName+" with "+flightPointsMarked+" altitudes.");
                  setFlightPath(flightPath, flightName+' ('+flightSrc+'->'+flightDes+') Arrived at '+flightTime, flightPaths.length);
                  flightPlanCoordinates = [];
                  flightPaths.push(flightPath);
               } // func flightElem
           ); // forEach flight 
           if (trackTime) { 
             console.log("setting markers took " + accMarkerSec + ' seconds.');
           }
           checktime("flights analysis", startf);
               // update the statics
              //      <div><label id="label-total-flight">Total Flights: 0</label></div>
              document.getElementById('label-total-flight').innerHTML = 'Total Flights: '+ flightPaths.length;
              setStatus("Flights loaded: "+flightPaths.length);
        } // func data
      ); // download call
    } //drawFlightPath

     function setFlightPath(flightPath, info, index) {
      flightPath.addListener('mouseover', function(){
          //document.getElementById('label-status').innerHTML = info;
          setStatus(info);
      });
     }
   function setStatus(info) {
       document.getElementById('label-status').innerHTML = info;
   } 
   function setMarker(point, alt100ft, flightName, flightSrc, flightDes, time, markedSoFar) {
      //test if we already marked enough altitudes for this flight
      if (markedSoFar >= altitudesPerFlightLimit) 
         return false;
      //test if it's close to serra park
      //37.343019, -122.044503
      var setMarkerStart = Date.now();
      //console.log("setmarkerStart = "+setMarkerStart);
      var serra = new google.maps.LatLng(37.343019, -122.044503);
      //var dist = google.maps.geometry.spherical.computeDistanceBetween (serra,point);      
       var dist = calculateDistance(serra,point);
      // meter to mile
       dist = dist * 0.000621;
       dist = dist.toPrecision(2);
      //only mark if within 6 miles
      if (dist > 6.0)
         return false;
      //console.log(flightName + " marked with altitude #"+markedSoFar);
      var info = flightName + ' (' + flightSrc + '->' + flightDes + '),  Altitude(#' + (markedSoFar+1) +'):' + alt100ft + '00ft' + ', Dist:'+dist+ 'mi, ' + 'Time:'+time + ')';
      var infowincontent = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = flightName; 
      infowincontent.appendChild(strong);
      infowincontent.appendChild(document.createElement('br'));
      var text = document.createElement('text');
      text.textContent = flightSrc + '->' + flightDes + ', Altitude(#' + (markedSoFar+1) +'):' + alt100ft + '00ft' + ', Dist:'+dist+'mi, ' + 'Time:'+time;
      infowincontent.appendChild(text);
      var symbolOne = {
          path: 'M -1,0 0,-1 1,0 0,1 z',
          strokeColor: '#F00',
          fillColor: '#FF0',
          fillOpacity: 0.4
      };

      var marker = new google.maps.Marker({
       map: map,
       position: point,
       icon: symbolOne
       });
       marker.addListener('click', function() {
          infoWindow.setContent(infowincontent);
          infoWindow.open(map, marker);
        }); //addListener

       marker.addListener('mouseover', function() {
          document.getElementById('label-status').innerHTML = info;
        }); //addListener
       markers.push(marker);
       var elapsed = Date.now() - setMarkerStart;
       //console.log("elapsed:"+elapsed);
       accMarkerTime = accMarkerTime + elapsed;
       //console.log("accMarkerTime:"+accMarkerTime);
       if (accMarkerTime > 1000) {
          sec = Math.floor(accMarkerTime/1000);
          accMarkerSec = accMarkerSec + sec;
          //console.log("accMarker Second:"+accMarkerSec);
          accMarkerTime = accMarkerTime - sec * 1000;
       }
       return true;
     } 
      function downloadUrl(url, callback) {
        var request = new XMLHttpRequest;
        startd = Date.now();
        request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            request.onreadystatechange = doNothing;
            checktime("downloadUrl", startd);
            var start = Date.now();
            callback(request, request.status);
            checktime("download callback", start);
          }
        };
        request.open('GET', url, true);
        request.send(null);
      }

      function doNothing() {}

      function calculateDistance(pointA, pointB) {
        const lat1 = pointA.lat();
        const lon1 = pointA.lng();
        const lat2 = pointB.lat();
        const lon2 = pointB.lng();
        const R = 6371e3; // earth radius in meters
        const φ1 = lat1 * (Math.PI / 180);
        const φ2 = lat2 * (Math.PI / 180);
        const Δφ = (lat2 - lat1) * (Math.PI / 180);
        const Δλ = (lon2 - lon1) * (Math.PI / 180);

        const a = (Math.sin(Δφ / 2) * Math.sin(Δφ / 2)) +
            ((Math.cos(φ1) * Math.cos(φ2)) * (Math.sin(Δλ / 2) * Math.sin(Δλ / 2)));
  
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c;
        return distance; // in meters
      }
      function handleLocationError(browserHasGeolocation, infoWindow, pos) {
        infoWindow.setPosition(pos);
        infoWindow.setContent(browserHasGeolocation ?
                              'Error: The Geolocation service failed.' :
                              'Error: Your browser doesn\'t support geolocation.');
        infoWindow.open(map);
      }


  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "header")) {
      /* if present, the header is where you move the DIV from:*/
      document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
    } else {
      /* otherwise, move the DIV from anywhere inside the DIV:*/
      elmnt.onmousedown = dragMouseDown;
    }
  function dragMouseDown(e) {
    e = e || window.event;
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
function toggleMarkers(ele) {
  if (ele.checked) {
      markers.forEach(function(marker, index, arr) {
         marker.setMap(map);
      });
 } else {
      markers.forEach(function(marker, index, arr) {
         marker.setMap(null);
      });
  }
}
function clearMap() {
    markers.forEach(function(marker, index, arr) {
      marker.setMap(null);
      marker = null;
    });
   markers=[];
   flightPaths.forEach(function(flight, index, arr) {
     flight.setMap(null);
     flight = null;
    });
   flightPaths=[];
   //clear Total Flights
   document.getElementById('label-total-flight').innerHTML = 'Total Flights: '+ flightPaths.length;
   setStatus("SaveMySunnySky.org");
}
function validateFormOnSubmit() {
    sdate = document.getElementById('starting-date').value;
    stime = document.getElementById('starting-time').value;
    edate = document.getElementById('ending-date').value;
    etime = document.getElementById('ending-time').value;
    limitsjc = document.querySelector('input[id="limit-sjc-arrivals"]');
    //console.log('limit to sjc arrivals:'+limitsjc.checked);
    interval = document.getElementById('interval').value;
    //console.log("interval="+interval);

    sdt = new Date(sdate+'T'+stime+'Z');
    edt = new Date(edate+'T'+etime+'Z');
    if (sdt > edt) {
      window.alert('Invalid date range, please try again!');
      return;
    }
    if (interval < 1)
      interval = 1;
    else if (interval > 10)
      interval = 10;  
    //console.log("starting date: "+sdt+", ending date: "+edt);
    clearMap();    
    urlstring='data.php?sdate='+sdate+'&stime='+stime+'&edate='+edate+'&etime='+etime+'&limitsjc='+limitsjc.checked+'&interval='+interval;
    //console.log(urlstring);
    drawFlightPath(map, urlstring);
    return false;
}

function showRawFlightData() {
  //console.log(theData);
  //window.open(theData, "", "_blank")
}
