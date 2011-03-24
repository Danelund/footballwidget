var baseurl = "/geocontroller/";
var adminprivileges = ($(location).attr("href").indexOf('freemod') > -1);
var isMobile = false;
var markers = new Array();
var markerids = new Array();
var markerslisted = new Array();
var markerclusters = new Array();
var TilesLoaded = new Array();
var MarkerCluster;
var footballicon = 'application/images/football_icon.png';
var showreportedmarkers = false;
var southWest;
var northEast;
var jsonrequest;
var markerlist = $("#markerlist");
var searchstring = "";
var initialLocation = new google.maps.LatLng(jlang('InitialLat'),jlang('InitialLng'));
//variable isMobile is defined in the views, previous to loading this js file

//checks if the current marker is booked at current time
function IsBookedCheck(unixtime, btnbook) {
    if(unixtime != 0 && unixtime) {
        var Now = new Date();
        var bookingtime = new Date(unixtime * 1000);
        if(bookingtime > Now) {
            btnbook.attr("title",jlang('bookedUntil') + ' ' + bookingtime.toLocaleTimeString())
            .addClass("booked");
            return true;
        }
    }
    btnbook.removeClass("booked");
    return false;
}

$(document).ready( function() {
    //Map Options
    var browserSupportFlag =  new Boolean();
    var myOptions = {zoom: 13, center: initialLocation, mapTypeId: google.maps.MapTypeId.ROADMAP};

    //GeoCoder
    var geocoder = new google.maps.Geocoder();
    var map = new google.maps.Map(document.getElementById("map"),myOptions);
    var infowindow = new google.maps.InfoWindow();
    var boundschangedtimer;
    MarkerCluster = new MarkerClusterer(map, {gridSize: 10});

    if(!isMobile) {
        SetupMapPage();
    } else {
        SetupMobilePage();
    }

    function SetupMapPage() {
        MarkerCluster = new MarkerClusterer(map, {gridSize: 10});

        //setup search
        /*$("#contact :input, #GeoCoderSearch").uniform();
        $("#searchdrop").button({text:false, icons:{primary : 'ui-icon-search'}}).click( function() {
            if($("#markersearchcontainer").length > 0) {
                $("#markersearchcontainer").dialog("open");
            } else {
                var searchbox = $(GenerateMarkerFormString(null));
                searchbox.find("#selGoals, #selFundament, #selCapacity").append('<option value="" selected>' + jlang('all') + '</option>');
                searchbox.find(":input").uniform();
                var supm = jlang('searchHint');
                searchbox.dialog({width:265,height:300, title: jlang('searchHint'), buttons : [
                    {
                        text : jlang('clear'),
                        click : function() {
                            searchstring = "";
                            google.maps.event.trigger(map,'bounds_changed');
                            $(this).dialog('close');
                        }
                    },
                    {
                        text : jlang('searchHint'),
                        click : function() {
                            GenerateSearchString($("#markersearchcontainer #markerForm"));
                            //remove existing markers
                            ResetAllMarkers();
                            google.maps.event.trigger(map,'bounds_changed');
                            $(this).dialog('close');
                        }}
                    ]
                });
            }
        });
        //wire up geocodesearch
        $("#GeoCoderSearch").autocomplete({
            //This bit uses the geocoder to fetch address values
            source: function(request, response) {
                geocoder.geocode( {'address': request.term }, function(results, status) {
                    response($.map(results, function(item) {
                        return {
                            label:  item.formatted_address,
                            value: item.formatted_address,
                            location: item.geometry.location,
                            latlngbounds: item.geometry.viewport,
                            nativeitem: item
                        }
                    }));
                })
            },
            //This bit is executed upon selection of an address
            select: function(event, ui) {
                map.fitBounds(ui.item.latlngbounds);
                if(adminprivileges) {
                    var marker = new google.maps.Marker({
                        position: ui.item.location,
                        map: map,
                        animation: google.maps.Animation.BOUNCE
                    });
					
                    google.maps.event.addListener(marker, 'click', function(marker) {
                        map.setZoom(20);
                    }
                    );
                }
            }
        }).attr('title',jlang('searchHint')).hint();
		*/
        GetLocation();

        //check if there are admin privileges
        if(adminprivileges) {
            $("#container").append('<div id="adminpanel"><ul><li><div id="loginbtn"></div>logout</li><li><div id="getreportsbtn"></div>get reports</li></ul></div>');
            $("#adminpanel #getreportsbtn").click( function() {
                //remove existing markers
                ResetAllMarkers();

                //toggle
                showreportedmarkers = showreportedmarkers ? false : true;

                //fetch reported markers
                if(showreportedmarkers) {
                    $.getJSON(baseurl + "reportedmarkers", function(reportedmarkers) {
                        $.each(reportedmarkers, function(index, dbgeo) {
                            placeMarker(new google.maps.LatLng((dbgeo.lat/1E6),(dbgeo.lng/1E6)), dbgeo);
                        });
                    });
                    updateListedMarkers();
                }
            });
            $("#loginbtn").click( function() {
                window.location = "modpass/logout";
            });
            $("#container #adminpanel").dialog({ position:[100,100] });
        }
    }

    function SetupMobilePage() {
        //change markerlist so the markerslist can be displayed
        markerlist = $("#markerlist");
        var curmarker;
		
		GetLocation();
		
        //hack to make google maps load correctly
        setTimeout( function() {
            google.maps.event.trigger(map, 'resize');
        }, 100);
        //update listed markers when the view switches to allfields
        $("a[href=#allfieldsView]").click( function() {
            updateListedMarkers();
        });
        //set submitclick function
        $("#markerForm").submit( function() {
            var curmarker = $(this).data("marker");
            $.post(baseurl + 'marker/id/' + curmarker.data.id, $(this).serialize() + "&lng=" + getLongtitude(curmarker.position) + "&lat=" + getLatitude(curmarker.position), function(data) {
                //save rating, since it's not returned
                var saverating = curmarker.data.rating;
                curmarker.data = data;
                curmarker.data.rating = saverating;
            }, 'json');
            return false;
        });
        $("#fieldZoom").click( function() {
            jQT.goTo("#mapView","slide");
            var curmarker = $("#markerForm").data("marker");
            map.setZoom(17);
            map.panTo(curmarker.position);

        });
        //set searchsubmit function
        $("#searchForm").submit( function() {
            GenerateSearchString($(this));
            ResetAllMarkers();
            jQT.goTo("#mapView","flip");
        });
        //setup tap to ad marker
        google.maps.event.addListener(map, 'tap', function(event) {
            var data = {
                "reported" : 0,
                "id" : null,
                "rating" : 0
            }
            var tempmarker = new google.maps.Marker({
                position: event.latLng,
                map: map,
                draggable : true,
                data: data
            });
            addMarkerListener(tempmarker);
            fieldViewMarker(tempmarker);
        });
    }

    //sets the searchstring
    function GenerateSearchString(searchform) {
        searchstring = "";
        SetSearchString(searchform.find("#txtTitle").val(),"title");
        SetSearchString(searchform.find("#selGoals").val(),"goal");
        SetSearchString(searchform.find("#selCapacity").val(),"cap");
        SetSearchString(searchform.find("#selFundament").val(),"fund");
        SetSearchString(searchform.find("#txtExtra").val(),"ext");
        //checkboxes
        SetSearchString(searchform.find("#facToilet").attr("checked"),"fct");
        SetSearchString(searchform.find("#facWaterpost").attr("checked"),"fcw");
        SetSearchString(searchform.find("#facBench").attr("checked"),"fcb");
        SetSearchString(searchform.find("#facFence").attr("checked"),"fcf");

        function SetSearchString(param, urlshortstr) {
            if(param)
                searchstring += "/" + urlshortstr + "/" + param;
        }

    }

    //updates the markers listed in the side
    function updateListedMarkers() {
        var swlt = getLatitude(southWest);
        var swlg = getLongtitude(southWest);
        var nelt = getLatitude(northEast);
        var nelg = getLongtitude(northEast);
        //remove the markers from markerslisted that are not in the map
        if(!showreportedmarkers) {
            for(var i = 0; i < markerslisted.length; i++) {
                var thismark = markerslisted[i];
                //remove the marker if it is outside the map bounds
                if(!(getLatitude(thismark.position) > swlt && getLatitude(thismark.position) < nelt && getLongtitude(thismark.position) < nelg && getLongtitude(thismark.position) > swlg)) {
                    markerslisted.splice(i,1);
                    markerids.splice(i,1);
                    var listobj = markerlist.children("li:eq(" + i + ")");
                    thismark.data.listobj = listobj;
                    listobj.detach();
                }
            }
        }
        //add the markers from the markers array that are not currently listed
        var templist = $("<ul />");
        for(var i = 0; i < markers.length; i++) {
            var thismark = markers[i];
            //check if the current marker is listed
            if(!IsListed(thismark)) {
                if((getLatitude(thismark.position) > swlt && getLatitude(thismark.position) < nelt && getLongtitude(thismark.position) < nelg && getLongtitude(thismark.position) > swlg) || showreportedmarkers) {
                    //check if the marker has been added before and the cached listobj can simply be readded
                    if(thismark.data.listobj) {
                        thismark.data.listobj.appendTo(templist);
                        markerslisted[markerslisted.length] = thismark;
                    } else {
                        //add marker if it is inside the map OR it is an admin showing reported markers
                        $("<li />")
                        .append($('<a class="markerlink" href="#'+thismark.data.id+'">'+ thismark.title+"</a>")
                        .bind('click', {marker: thismark}, function(event) {
                            if(isMobile) {
                                fieldViewMarker(event.data.marker);
                            } else {
                                map.setZoom(17);
                                map.panTo(event.data.marker.position);
                                //new google.maps.event.trigger(event.data.marker, 'click');
                            }

                        }))
                        .append($('<div class="ratingright">'+ (Math.round(thismark.data.rating*100)/100) + '/5<div class="staricon star rating on"></div></div>')
                        )
                        .appendTo(templist);
                        markerslisted[markerslisted.length] = thismark;
                    }
                    markerids[markerids.length] = thismark.data.id;
                }
            }
        }
        //add the new markers
        markerlist.append(templist.contents());
        //if markerslisted and markers are empty (in other words have been cleared) clear listed markers
        if(markers.length == 0 && markerslisted.length == 0)
            markerlist.html("");
        //checks whether the marker is listed in the side
        function IsListed(marker) {
            if(marker.data != "S") {
                for(var li = 0; li < markerslisted.length; li++) {
                    if(markerslisted[li] == marker)
                        return true;
                }
                return false;
            }
            return true;
        }

    }
	google.maps.event.addListener(map, 'zoom_changed', function(){
		//if the zoom is splitting at clusters vs. singlemarkers, remove the
         if(map.getZoom() < 14)
         {
         	//map is clustering
         	ResetSingleMarkers();
         	ResetClusterMarkers();
         }
         else
         {
         	ResetClusterMarkers();
         }
	});
    // register when the bounds change and add points
    google.maps.event.addListener(map, 'bounds_changed', function() {
        clearTimeout(boundschangedtimer);
        var bounds = map.getBounds();
        southWest = bounds.getSouthWest();
        northEast = bounds.getNorthEast();
        if(showreportedmarkers) {
            var baseurl1 = baseurl + "reportedmarkers";
        } else {
            var baseurl1 = baseurl + "markers";
        }
        //possibly remove this for performance, check it later
        if(!isMobile) {
            updateListedMarkers();
        }
        if(jsonrequest && jsonrequest.readystate != 4) {
            jsonrequest.abort();
        }
        //only fetch new markers when the map is moved, if it is not in showreports mode and there are not already 25 markers listed
        if(!showreportedmarkers) {
            boundschangedtimer = setTimeout( function() {
                baseurl1 = baseurl1.concat("/swlt/", getLatitude(southWest), "/swlg/", getLongtitude(southWest), "/nelt/", getLatitude(northEast), "/nelg/", getLongtitude(northEast), "/zoom/", map.getZoom(), searchstring);
                //abort request if any other is pending
                jsonrequest = $.getJSON(baseurl1, function(json) {
                    if(json.singlemarkers != null) {
                        var singlemarkers = json.singlemarkers;
                    }
                    if(json.clustermarkers != null) {
                        var clusters = json.clustermarkers;
                    }
                    if(singlemarkers.length > 0) {
                    	
                        $.each(singlemarkers, function(index, dbgeo) {
                            placeMarker(new google.maps.LatLng((dbgeo.lat/1E6),(dbgeo.lng/1E6)), dbgeo);
                        });
                        
                    }
                    if(clusters.length > 0){
                    	
                    	$.each(clusters, function(index,servercluster){
                    		if(!existCluster(servercluster))
                    		{
                    		markerclusters.push(MarkerCluster.AddCluster(servercluster.lat/1E6, servercluster.lng/1E6, servercluster.size, servercluster.bounds));	
                    		}
                    	});
                    }
                    if(!isMobile) {
                        updateListedMarkers();
                    }
                });
            },400);
        }
    });
    //add functionality to add temporarymarkers
    google.maps.event.addListener(map, 'rightclick', function(event) {
        var data = {
            "reported" : 0,
            "id" : null,
            "rating" : 0
        }
        var tempmarker = new google.maps.Marker({
            position: event.latLng,
            map: map,
            draggable : true,
            data: data
        });
        addMarkerListener(tempmarker);
        //trigger infowindowopen, thereafter trigger editbuttonclick
        google.maps.event.trigger(tempmarker, 'click')
        $("#vieweditmarker").click();
    });
    //posts a marker to be inserted or updated
    function postMarker(event) {
        $.post(baseurl + 'marker/', $('#markerinfocontainer #markerForm').serialize() + "&lng=" + getLongtitude(event.latLng) + "&lat=" + getLatitude(event.latLng), function(data) {
            placeMarker(event.latLng, data);
        },'json');
    }

	function ResetSingleMarkers()
	{
		$.each(markers, function(index) {
            markers[index].setMap(null);
        })
        markers.length = 0;
        markerslisted.length = 0;
        MarkerCluster.clearMarkers();
        updateListedMarkers();
	}
    function ResetClusterMarkers() {
        $.each(markerclusters, function(index,clust){
         	clust.remove();
        });
        markerclusters.length = new Array();
    }
    function ResetAllMarkers()
    {
    	ResetSingleMarkers();
    	ResetClusterMarkers();
    }

    //places a marker on the map
    function placeMarker(location, data) {
        //add marker only if the marker does not exist already
        if(!existMarker(data)) {
            var marker = new google.maps.Marker({
                position: location,
                map: map,
                title: data.title,
                data: data
            });
            markers[markers.length] = marker;
            addMarkerListener(marker);
            MarkerCluster.addMarker(marker);
        }
    }

    //slides up the fieldview in the mobilemarker mode
    function fieldViewMarker(marker) {
        jQT.goTo("#fieldView", "slideup");
        addMarkerDataToForm(marker,$("#fieldView"));
        $("#markerForm").data("marker", marker);
    }

    //listens for the click event on the marker to open an infowindow
    function addMarkerListener(marker) {
        google.maps.event.addListener(marker, 'click', function(event) {
            if(!isMobile) {
                var Mnode = $(GenerateMarkerFormString(marker));
                //perform modifications to current marker window
                //add rating stars
                Mnode.find('#star-rating').rating(baseurl + 'rating', {id:marker.data.id, maxvalue:5,increment:.5, curvalue:marker.data.rating});
                addMarkerDataToForm(marker,Mnode);
                //beautify the form
                var markerform = Mnode.find("#markerForm");
                var markerinfolist = markerform.children("#markerinfolist");
                markerinfolist.find(":input").uniform();
                //do actionpanel transformation and editing
                markerinfolist.inline({markerform: markerform, deletemarker: Mnode.find("#deletemarker"), reportmarker: Mnode.find("#reportmarker"), vieweditmarker: Mnode.find("#vieweditmarker"), bookmarker : Mnode.find("#btnbook"), marker: marker});
                infowindow.content = "<div id='tempinfowindowuntildommanipulation'></div>";
                google.maps.event.addListenerOnce(infowindow, 'domready', function() {
                    $("#tempinfowindowuntildommanipulation").replaceWith(Mnode);
                });
                //make confirmbox if it's a new marker
                if(marker.data.id == null) {
                    google.maps.event.addListenerOnce(infowindow, 'closeclick', function(event) {
                        if(marker.data.id) {
                        }
                    });
                }
                infowindow.open(map, marker);
            } else {
                fieldViewMarker(marker);
            }
        });
    }

    //generates the markerform html string
    function GenerateMarkerFormString(marker) {
        var htmlstr;
        if(marker != null) {
            htmlstr += '<div id="markerinfocontainer"><div id="markerinfopanel"><div id="actionpanel"><div id="reportmarker" title="' + jlang('clickToReport');
            if(adminprivileges)
                htmlstr += ' / ' + marker.reported;
            htmlstr +='"></div><div id="vieweditmarker" class="view" title="' + jlang('clickToEdit') + '"></div><div id="btnbook" title="' + jlang('clickToBook') + '" class="booked"></div>';
            if(adminprivileges)
                htmlstr += '<div id="deletemarker" title="' + jlang('clickToDelete') + '"></div>';
            htmlstr += '</div><div id="star-rating" class="rating"></div></div>';
        } else {
            htmlstr += '<div id="markersearchcontainer">';
        }
        htmlstr += '<form id="markerForm" method="post" action=""><ul id="markerinfolist"><li><span class="label">' + jlang('markerInfoTitle') + '</span><input  name="txtTitle" id="txtTitle" type="text" maxlength="40" /></li><li><span class="label">' + jlang('markerInfoGoalsize') + '</span><select name="selGoals" id="selGoals"><option value="6">' + jlang('unknown') +  '</option><option value="1">2v2</option> <option value="5">4v4</option>  <option value="2">5v5</option>   <option value="3">7v7</option>   <option value="4">11v11</option>   </select></li><li><span class="label">' + jlang('markerInfoFieldsize') + '</span><select name="selCapacity" id="selCapacity"><option value="6">' + jlang('unknown') +  '</option>  <option value="1">2v2</option><option value="5">4v4</option>   <option value="2">5v5</option>   <option value="3">7v7</option>   <option value="4">11v11</option>   </select></li><li><span class="label">' + jlang('markerInfoFundament') + '</span><select name="selFundament" id="selFundament">   <option value="1">' + jlang('fundamentGrass') + '</option>   <option value="2">' + jlang('fundamentDirt') + '</option>   <option value="3">' + jlang('fundamentGrowel') + '</option> <option value="4">' + jlang('fundamentTurf') + '</option> <option value="6">' + jlang('fundamentAsphalt') + '</option><option value="7">' + jlang('fundamentConcrete') + '</option> <option value="8">' + jlang('fundamentIndoor') + '</option> <option value="9">' + jlang('fundamentHardwood') + '</option>   </select></li><li class="facilities"><span class="label">' + jlang('markerInfoFacilities') + '</span><div id="facilitydiv">' + jlang('facilityWaterpost') + ':<input type="checkbox"  name="facWaterpost" id="facWaterpost" />' + jlang('facilityToilet') + ':<input type="checkbox"  name="facToilet" id="facToilet" />' + jlang('facilityBench') + ':<input type="checkbox"  name="facBench" id="facBench" />' + jlang('facilityFence') + ':<input type="checkbox"  name="facFence" id="facFence" /></div></li><li class="extratext"><span class="label">' + jlang('markerInfoExtra') + '</span><textarea id="txtExtra" name="txtExtra" rows="3" cols="20" maxlength="255"></textarea></li></ul></form></div>';
        return htmlstr;
    }

    //checks if the marker is already in the markers array
    function existMarker(markerdata) {
        if(markers.length > 0) {
            for(var i = 0; i < markers.length; i++) {
                if(markers[i].data.id == markerdata.id)
                    return true;
            }
            return false;
        }
    }
	
	//checks if the cluster is already in the clusters array
	function existCluster(cluster)
	{
		if(markerclusters.length > 0)
		{
			for(var i = 0; i < markerclusters.length; i++)
			{
				if(markerclusters[i].clat_ == cluster.lat/1E6 && markerclusters[i].clng_ == cluster.lng/1E6 && markerclusters[i].bounds_.join(",") == cluster.bounds.join(","))
				{
					return true;
				}
			}
			return false;
		}
	}
    function addMarkerDataToForm(marker, form) {
        var dataform = form.children("#markerForm");
        dataform.find("#txtTitle").val(marker.data.title);
        dataform.find("#selGoals").val(marker.data.goals);
        dataform.find("#selCapacity").val(marker.data.capacity);
        dataform.find("#selFundament").val(marker.data.fundament);
        dataform.find("#txtExtra").val(marker.data.extra);
        //checkboxes
        SetCheckbox("#facToilet",marker.data.facility_toilet);
        SetCheckbox("#facWaterpost",marker.data.facility_waterpost);
        SetCheckbox("#facBench",marker.data.facility_bench);
        SetCheckbox("#facFence",marker.data.facility_fence);

        function SetCheckbox(identifier, markerdata) {
            if(markerdata == 1) {
                dataform.find(identifier).attr("checked","checked");
            }
            else
            {
			    dataform.find(identifier).removeAttr("checked");
	
            }
        }

    }
	
	function GetLocation(){
		// Try W3C Geolocation (Preferred)
        if(navigator.geolocation) {
            browserSupportFlag = true;
            navigator.geolocation.getCurrentPosition( function(position) {
                initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
                map.setCenter(initialLocation);
            }, function() {
                handleNoGeolocation(browserSupportFlag);
            });
            // Try Google Gears Geolocation
        } else if (google.gears) {
            browserSupportFlag = true;
            var geo = google.gears.factory.create('beta.geolocation');
            geo.getCurrentPosition( function(position) {
                initialLocation = new google.maps.LatLng(position.latitude,position.longitude);
                map.setCenter(initialLocation);
            }, function() {
                handleNoGeoLocation(browserSupportFlag);
            });
            // Browser doesn't support Geolocation
        } else {
            browserSupportFlag = false;
            handleNoGeolocation(browserSupportFlag);
        }

        function handleNoGeolocation(errorFlag) {
            map.setCenter(initialLocation);
            if(errorFlag)
                map.setZoom(13);
        }
        if(browserSupportFlag)
        {
	        // Add a Circle overlay to the map.
	        var circle = new google.maps.Circle({
	          map: map,
	          center: initialLocation,
	          clickable: false,
	          radius: 100,
	          fillColor : "#3F85FF",
	          strokeColor : "#3F85FF",
	          strokeWeight : 1
	        });
        }

	}
    //MarkerCluster.AddCluster(55.658996, 12.579346, 40);
});
function getLatitude(latlng) {
    return Math.round(latlng.lat() * 1E6);
}

function getLongtitude(latlng) {
    return Math.round(latlng.lng() * 1E6);
}
//MarkerCluster
eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('8 6(e,a,d){4.U(6,s.t.2b);4.o=e;4.n=[];4.12=[];4.2c=[3K,3w,3u,3s,3q];4.I=[];4.1l=u;7 b=d||{};4.Q=b.3p||3i;4.25=b.1K||B;4.I=b.3g||[];4.2A=b.2R||4.2B;4.2C=b.35||4.2F;4.1D=G;l(b.2G!=2L){4.1D=b.2G}4.1e=u;l(b.2M!=2L){4.1e=b.2M}4.2N();4.H(e);4.21=4.o.1v();7 c=4;s.t.1g.28(4.o,"2S",8(){7 f=c.o.2O[c.o.2Q()].1K;7 g=c.o.1v();l(g<0||g>f){9}l(c.21!=g){c.21=c.o.1v();c.M()}});s.t.1g.28(4.o,"2T",8(){c.L()});l(a&&a.D){4.1p(a,u)}}6.5.2B="2U://s-t-2V-2Z-32.33.34/36/3c/3d/3f/m";6.5.2F="3j";6.5.U=8(b,a){9(8(c){E(7 d 3n c.5){4.5[d]=c.5[d]}9 4}).3J(b,[a])};6.5.13=8(){4.2q(G)};6.5.15=8(){};6.5.2N=8(){l(4.I.D){9}E(7 b=0,a;a=4.2c[b];b++){4.I.C({1m:4.2A+(b+1)+"."+4.2C,O:a,V:a})}};6.5.3N=8(a){4.I=a};6.5.W=8(){9 4.I};6.5.2o=8(){9 4.1D};6.5.2n=8(){9 4.1e};6.5.S=8(){9 4.n};6.5.26=8(){9 4.n.D};6.5.3P=8(a){4.25=a};6.5.1x=8(){9 4.25||4.o.2O[4.o.2Q()].1K};6.5.1B=8(e,d){7 a=0;7 c=e.D;7 b=c;2j(b!==0){b=1y(b/10,10);a++}a=w.2i(a,d);9{T:c,1j:a}};6.5.1J=8(a){4.1B=a};6.5.1k=8(){9 4.1B};6.5.1p=8(d,c){E(7 b=0,a;a=d[b];b++){4.1L(a)}l(!c){4.L()}};6.5.1L=8(a){a.14(u);a.H(B);a.1c=u;l(a.3Q){7 b=4;s.t.1g.28(a,"3W",8(){a.1c=u;b.M();b.L()})}4.n.C(a)};6.5.18=8(a,b){4.1L(a);l(!b){4.L()}};6.5.1R=8(b){7 c=-1;l(4.n.1q){c=4.n.1q(b)}J{E(7 d=0,a;a=4.n[d];d++){l(a==b){c=d;49}}}l(c==-1){9 u}4.n.4a(c,1);b.14(u);b.H(B);9 G};6.5.1W=8(a,b){7 c=4.1R(a);l(!b&&c){4.M();4.L();9 G}J{9 u}};6.5.1X=8(f,c){7 e=u;E(7 b=0,a;a=f[b];b++){7 d=4.1R(a);e=e||d}l(!c&&e){4.M();4.L();9 G}};6.5.2q=8(a){l(!4.1l){4.1l=a;4.1Y()}};6.5.1Z=8(){9 4.12.D};6.5.1a=8(){9 4.o};6.5.H=8(a){4.o=a};6.5.17=8(){9 4.Q};6.5.22=8(a){4.Q=a};6.5.1b=8(e){7 c=4.2e();7 f=A s.t.Z(e.27().N(),e.27().X());7 h=A s.t.Z(e.1V().N(),e.1V().X());7 d=c.1U(f);d.x+=4.Q;d.y-=4.Q;7 b=c.1U(h);b.x-=4.Q;b.y+=4.Q;7 g=c.2a(d);7 a=c.2a(b);e.U(g);e.U(a);9 e};6.5.2f=8(a,b){9 b.2g(a.P())};6.5.1C=8(){4.M();4.n=[]};6.5.M=8(){E(7 c=0,a;a=4.12[c];c++){a.1w()}E(7 c=0,b;b=4.n[c];c++){b.1c=u;b.H(B);b.14(u)}4.12=[]};6.5.L=8(){4.1Y()};6.5.2k=8(j,h){l(!j||!h){9 0}7 g=3O;7 e=(h.N()-j.N())*w.1t/1r;7 f=(h.X()-j.X())*w.1t/1r;7 b=w.1h(e/2)*w.1h(e/2)+w.2r(j.N()*w.1t/1r)*w.2r(h.N()*w.1t/1r)*w.1h(f/2)*w.1h(f/2);7 k=2*w.3M(w.2t(b),w.2t(1-b));7 i=g*k;9 i};6.5.2v=8(c){7 j=3H;7 f=B;7 h=c.P();E(7 e=0,b;b=4.12[e];e++){7 a=b.1s();l(a){7 g=4.2k(a,c.P());l(g<j){j=g;f=b}}}l(f&&f.2y(c)){f.18(c)}J{7 b=A q(4);b.18(c);4.12.C(b)}};6.5.1Y=8(){l(!4.1l){9}7 b=A s.t.1o(4.o.1n().1V(),4.o.1n().27());7 d=4.1b(b);E(7 c=0,a;a=4.n[c];c++){l(!a.1c&&4.2f(a,d)){4.2v(a)}}};8 q(a){4.19=a;4.o=a.1a();4.Q=a.17();4.1e=a.2n();4.v=B;4.n=[];4.1A=B;4.Y=A p(4,a.W(),a.17())}q.5.2H=8(b){l(4.n.1q){9 4.n.1q(b)!=-1}J{E(7 c=0,a;a=4.n[c];c++){l(a==b){9 G}}}9 u};q.5.18=8(b){l(4.2H(b)){9 u}l(!4.v){4.v=b.P();4.20()}J{l(4.1e){7 a=4.n.D+1;7 d=(4.v.N()*(a-1)+b.P().N())/a;7 c=(4.v.X()*(a-1)+b.P().X())/a;4.v=A s.t.Z(d,c);4.20()}}l(4.n.D==0){b.H(4.o);b.14(G)}J{l(4.n.D==1){4.n[0].H(B);4.n[0].14(u)}}b.1c=G;4.n.C(b);4.2J();9 G};q.5.1T=8(){9 4.19};q.5.1n=8(){7 c=A s.t.1o(4.v,4.v);7 d=4.S();E(7 b=0,a;a=d[b];b++){c.U(a.P())}9 c};q.5.1w=8(){4.Y.1w();4.n.D=0;2Y 4.n};q.5.1S=8(){9 4.n.D};q.5.S=8(){9 4.n};q.5.1s=8(){9 4.v};q.5.20=8(){7 a=A s.t.1o(4.v,4.v);4.1A=4.19.1b(a)};q.5.2y=8(a){9 4.1A.2g(a.P())};q.5.1a=8(){9 4.o};q.5.2J=8(){7 e=4.o.1v();7 f=4.19.1x();l(e>f){E(7 c=0,a;a=4.n[c];c++){a.H(4.o);a.14(G)}9}l(4.n.D<2){4.Y.1M();9}7 d=4.19.W().D;7 b=4.19.1k()(4.n,d);4.Y.1F(4.v);4.Y.2P(b);4.Y.1E()};8 p(a,c,b){a.1T().U(p,s.t.2b);4.I=c;4.3e=b||0;4.1i=a;4.v=B;4.o=a.1a();4.r=B;4.1f=B;4.1d=u;4.H(4.o)}p.5.1I=8(){7 a=4.1i.1T();s.t.1g.2W(a,"2X",4.1i);l(a.2o()){4.o.2K(4.1i.1n())}};p.5.13=8(){4.r=2I.30("31");l(4.1d){7 c=4.1z(4.v);4.r.16.2E=4.24(c);4.r.2D=4.1f.T}7 a=4.37();a.38.39(4.r);7 b=4;s.t.1g.3a(4.r,"3b",8(){b.1I()})};p.5.1z=8(b){7 a=4.2e().1U(b);a.x-=1y(4.R/2,10);a.y-=1y(4.K/2,10);9 a};p.5.15=8(){l(4.1d){7 a=4.1z(4.v);4.r.16.1P=a.y+"z";4.r.16.1G=a.x+"z"}};p.5.1M=8(){l(4.r){4.r.16.2z="3h"}4.1d=u};p.5.1E=8(){l(4.r){7 a=4.1z(4.v);4.r.16.2E=4.24(a);4.r.16.2z=""}4.1d=G};p.5.1w=8(){4.H(B)};p.5.29=8(){l(4.r&&4.r.2x){4.1M();4.r.2x.3k(4.r);4.r=B}};p.5.2P=8(a){4.1f=a;4.3l=a.T;4.3m=a.1j;l(4.r){4.r.2D=a.T}4.2w()};p.5.2w=8(){7 a=w.3o(0,4.1f.1j-1);a=w.2i(4.I.D-1,a);7 b=4.I[a];4.1u=b.1m;4.K=b.O;4.R=b.V;4.23=b.3r;4.F=b.3t;4.1O=b.3v;4.1N=b.3x};p.5.1F=8(a){4.v=a};p.5.24=8(e){7 d=[];l(2I.3y){d.C(\'3z:3A:3B.3C.3D(3E=3F,3G="\'+4.1u+\'");\')}J{d.C("2u-3I:1m("+4.1u+");");7 b=4.1N?4.1N:"0 0";d.C("2u-2s:"+b+";")}l(1H 4.F==="3L"){l(1H 4.F[0]==="2p"&&4.F[0]>0&&4.F[0]<4.K){d.C("O:"+(4.K-4.F[0])+"z; 2m-1P:"+4.F[0]+"z;")}J{d.C("O:"+4.K+"z; 2l-O:"+4.K+"z;")}l(1H 4.F[1]==="2p"&&4.F[1]>0&&4.F[1]<4.R){d.C("V:"+(4.R-4.F[1])+"z; 2m-1G:"+4.F[1]+"z;")}J{d.C("V:"+4.R+"z; T-2h:2d;")}}J{d.C("O:"+4.K+"z; 2l-O:"+4.K+"z; V:"+4.R+"z; T-2h:2d;")}7 a=4.23?4.23:"3R";7 c=4.1O?4.1O:11;d.C("3S:3T; 1P:"+e.y+"z; 1G:"+e.x+"z; 3U:"+a+"; 2s:3V; 1Q-3X:"+c+"z; 1Q-3Y:3Z,40-41; 1Q-42:43");9 d.44("")};45.6=6;6.5.18=6.5.18;6.5.1p=6.5.1p;6.5.1C=6.5.1C;6.5.1k=6.5.1k;6.5.17=6.5.17;6.5.1b=6.5.1b;6.5.1a=6.5.1a;6.5.S=6.5.S;6.5.1x=6.5.1x;6.5.W=6.5.W;6.5.1Z=6.5.1Z;6.5.26=6.5.26;6.5.L=6.5.L;6.5.1W=6.5.1W;6.5.1X=6.5.1X;6.5.M=6.5.M;6.5.1J=6.5.1J;6.5.22=6.5.22;6.5.13=6.5.13;6.5.15=6.5.15;q.5.1s=q.5.1s;q.5.1S=q.5.1S;q.5.S=q.5.S;p.5.13=p.5.13;p.5.15=p.5.15;p.5.29=p.5.29;6.5.46=8(h,i,e,a){7 d=A s.t.Z(h,i);7 f=A p(A q(4),4.W,4.17());7 g=0;7 j=A s.t.1o(A s.t.Z(a[0],a[1]),A s.t.Z(a[2],a[3]));7 c=e;2j(c!==0){c=1y(c/10,10);g++}7 b=4.I[g-1];f.1F(d);$.U(f,{1f:{T:e,1j:g},1u:b.1m,R:b.V,K:b.O,1A:a,47:h,48:i});f.H(4.o);f.1E();f.1I=8(){4.o.2K(j)};9 f};',62,259,'||||this|prototype|MarkerClusterer|var|function|return||||||||||||if||markers_|map_|ClusterIcon|Cluster|div_|google|maps|false|center_|Math|||px|new|null|push|length|for|anchor_|true|setMap|styles_|else|height_|redraw|resetViewport|lat|height|getPosition|gridSize_|width_|getMarkers|text|extend|width|getStyles|lng|clusterIcon_|LatLng|||clusters_|onAdd|setVisible|draw|style|getGridSize|addMarker|markerClusterer_|getMap|getExtendedBounds|isAdded|visible_|averageCenter_|sums_|event|sin|cluster_|index|getCalculator|ready_|url|getBounds|LatLngBounds|addMarkers|indexOf|180|getCenter|PI|url_|getZoom|remove|getMaxZoom|parseInt|getPosFromLatLng_|bounds_|calculator_|clearMarkers|zoomOnClick_|show|setCenter|left|typeof|triggerClusterClick|setCalculator|maxZoom|pushMarkerTo_|hide|backgroundPosition_|textSize_|top|font|removeMarker_|getSize|getMarkerClusterer|fromLatLngToDivPixel|getSouthWest|removeMarker|removeMarkers|createClusters_|getTotalClusters|calculateBounds_|prevZoom_|setGridSize|textColor_|createCss|maxZoom_|getTotalMarkers|getNorthEast|addListener|onRemove|fromDivPixelToLatLng|OverlayView|sizes|center|getProjection|isMarkerInBounds_|contains|align|min|while|distanceBetweenPoints_|line|padding|isAverageCenter|isZoomOnClick|number|setReady_|cos|position|sqrt|background|addToClosestCluster_|useStyle|parentNode|isMarkerInClusterBounds|display|imagePath_|MARKER_CLUSTER_IMAGE_PATH_|imageExtension_|innerHTML|cssText|MARKER_CLUSTER_IMAGE_EXTENSION_|zoomOnClick|isMarkerAlreadyAdded|document|updateIcon|fitBounds|undefined|averageCenter|setupStyles_|mapTypes|setSums|getMapTypeId|imagePath|zoom_changed|idle|http|utility|trigger|clusterclick|delete|library|createElement|DIV|v3|googlecode|com|imageExtension|svn|getPanes|overlayImage|appendChild|addDomListener|click|trunk|markerclusterer|padding_|images|styles|none|60|png|removeChild|text_|index_|in|max|gridSize|90|textColor|78|anchor|66|textSize|56|backgroundPosition|all|filter|progid|DXImageTransform|Microsoft|AlphaImageLoader|sizingMethod|scale|src|40000|image|apply|53|object|atan2|setStyles|6371|setMaxZoom|draggable|black|cursor|pointer|color|absolute|dragend|size|family|Arial|sans|serif|weight|bold|join|window|AddCluster|clat_|clng_|break|splice'.split('|'),0,{}))

/* serialize obj */
jQuery.fn.serializeObject= function() {
    var c={};
    var b=this.serializeArray();
    $.each(b, function() {
        if(c[this.name]) {
            if(!c[this.name].push) {
                c[this.name]=[c[this.name]]
            }
            c[this.name].push(this.value||"")
        } else {
            c[this.name]=this.value||""
        }
    });
    return c
};


