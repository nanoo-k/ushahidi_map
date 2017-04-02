//
// MARKERS
////////////

var MyMap = {
    // Record instance of mapbox map
    map: {},

    // Access Token for mapbox
    accessToken: 'pk.eyJ1IjoibmFub28tayIsImEiOiJjajB2N2NpN3AwMDA5MndwMXQ2NnQ2dTY2In0.xP3IuKEHtfzW_vmLNaajOw',

    // Data for the markers
    markerData: data,

    // Mapxbox cluster markers
    markers: new L.MarkerClusterGroup(),

    // Record info about projects within the county
    project_density_per_county: [],

    // Instance of mapbox popup
    countyPopup: new L.Popup({ autoPan: false }),

    // Mapbox project count in state layer
    projectCountPerStateLayer: {},

    // Mapbox project cost per state layer
    projectCostPerStateLayer: {},

    // Layers data
    kenyaCounties: kenya_counties,

    initialize() {
        // Gather info about each county (like the number of projects in the county)
        this.gatherInfoAboutCounties();

        // Generates the basic map
        this.setUpMap();

        // Adds markers to the map
        this.addMarkers();

        // Determines what happens when user drags map
        MyMap.map.on('move', MyMap.onMove);
        // call onmove off the bat so that the list is populated.
        // otherwise, there will be no markers listed until the map is moved.
        this.onMove();

        // Place the county layers, color them, and create the tooltips
        this.createChoropleth();

        // Create the legend
        this.createLegend();
    },


    /**
     * Generates the basic map
     *  i.e. Grabs the html element and places the mapbox map in it
     */
     setUpMap () {
        L.mapbox.accessToken = MyMap.accessToken;
        MyMap.map = L.mapbox.map('map', 'mapbox.streets')
            .setView([-0.143502, 38.031614], 6);
     },


    /**
     * Close the tooltip using a timeout
     */
    closeTooltip () {
        window.setTimeout(function() {
            MyMap.map.closePopup();
        }, 100);
    },


    /**
     * Add all the markers to the map
     */
    addMarkers () {
        for (var i = 0; i < this.markerData.features.length; i++) {
            // The specific data we're working with is 'a'
            var a = this.markerData.features[i];
            var props = a["properties"];

            if (props["x"] != null) {
                // Get title, description and objectives
                var title = props["project_title"];
                var description = props["project_description"];
                var objectives = props["project_objectives"];

                // Create marker
                var marker = L.marker(new L.LatLng(props["y"], props["x"]), {
                    icon: L.mapbox.marker.icon({'marker-symbol': 'post', 'marker-color': '0044FF'}),
                    title: title
                });

                // Define the popup's content
                var popupContent = `<h1>${title}</h1>`;
                popupContent += `<p><b>Objective:</b> ${objectives}</p>`;
                popupContent += `<p><b>Description:</b> ${description}</p>`;

                // Slap marker onto map
                marker.bindPopup(popupContent);
                this.markers.addLayer(marker);
            }

        }

        MyMap.map.addLayer(this.markers);
    },


    /**
     * This method pulled from tutorial. What does it do?
     */
    onMove() {
        // Get the map bounds - the top-left and bottom-right locations.
        var inBounds = [],
            bounds = MyMap.map.getBounds();

        MyMap.markers.eachLayer(function(marker) {
            // For each marker, consider whether it is currently visible by comparing
            // with the current map bounds.
            if (bounds.contains(marker.getLatLng())) {
                inBounds.push(marker.options.title);
            }
        });
    },


    /**
     * Create the choropleth.
     */
    createChoropleth () {
        // Set up and show the project count per state layer
        this.projectCountPerStateLayer = L.geoJson(MyMap.kenyaCounties, {
                               style: MyMap.getStyle,
                               onEachFeature: MyMap.onEachFeature
                           });
        this.projectCountPerStateLayer.addTo(MyMap.map);


        // Set up the project cost per state layer
        this.projectCostPerStateLayer = L.geoJson(MyMap.kenyaCounties, {
                               style: MyMap.getCostPerStateStyle,
                               onEachFeature: MyMap.onEachFeature
                           });
    },


    /**
     * For each county, store the number of projects and the number of unlisted projects
     */
    gatherInfoAboutCounties() {
        this.markerData.features.forEach(function(feature, i) {

            // If the county property is null, skip
            if (feature.properties.county == null) return;

            var county = feature.properties.county.toUpperCase();

            // Create the county property in the array if it doesn't exist
            if (MyMap.project_density_per_county[county] == undefined) {
                MyMap.project_density_per_county[county] = {
                    "number_of_projects": 1,
                    "projects_missing_from_map": 0
                };
            }
            // Else increment the tally for the county
            else {
                ++MyMap.project_density_per_county[county]["number_of_projects"];
            }

            if (feature.properties.x == null || feature.properties.y == null) {
                ++MyMap.project_density_per_county[county]["projects_missing_from_map"];
            }
        });
    },

    setUpChoropleth() {
        //
        // CHOROPLETH
        ////////////////

        // Get instance of a popup
        var popup = new L.Popup({ autoPan: false });

        // statesData comes from the 'us-states.js' script included above
        var statesLayer = L.geoJson(kenya_counties,  {
            style: getStyle,
            onEachFeature: onEachFeature
        }).addTo(map);

        // Define the style for each state
        // fillColor determined by the density of the state
        function getStyle(feature) {
            return {
                weight: 2,
                opacity: 0.1,
                color: 'black',
                fillOpacity: 0.7,
                fillColor: getColor(feature.properties.COUNTY)
            };
        }

        // get color depending on population density value
        function getColor(county) {


            // Some of the data arrives as something other than a string,
            // thus has no access to toUpperCase()
            if (typeof(county) === "string") {
                var COUNTY = MyMap.project_density_per_county[county.toUpperCase()];
            }

            if (COUNTY != null){
                var number_of_projects = COUNTY["number_of_projects"];

                return number_of_projects > 500 ? '#8c2d04' :
                    number_of_projects > 200  ? '#cc4c02' :
                    number_of_projects > 100  ? '#ec7014' :
                    number_of_projects > 50  ? '#fe9929' :
                    number_of_projects > 20   ? '#fec44f' :
                    number_of_projects > 10   ? '#fee391' :
                    number_of_projects > 5   ? '#fff7bc' :
                    '#ffffe5';
            }


            // If we have no data about this county, color it gray
            return '#d1d1d1';
        }

        // Set event callbacks
        function onEachFeature(feature, layer) {
            layer.on({
                mousemove: mousemove,
                mouseout: mouseout,
                click: zoomToFeature
            });
        }

        var closeTooltip;

        // When user hovers mouse over a state, do this:
        function mousemove(e) {
            var layer = e.target;

            // Set position and content of the popup
            popup.setLatLng(e.latlng);

            var content = '<div class="marker-title">' + layer.feature.properties.COUNTY + '</div>';

            var county_data = MyMap.project_density_per_county[layer.feature.properties.COUNTY.toUpperCase()];

            if (county_data !== undefined) {
                content += '<div>' + county_data["number_of_projects"] + ' is number of projects. </div>';

                content += '<div>' + county_data["projects_missing_from_map"] + ' is number of projects missing from map. </div>';
            }


            popup.setContent(content);

            // Open the popup
            if (!popup._map) popup.openOn(map);
            window.clearTimeout(closeTooltip);

            // highlight feature
            layer.setStyle({
                weight: 3,
                opacity: 0.3,
                fillOpacity: 0.9
            });

            if (!L.Browser.ie && !L.Browser.opera) {
                layer.bringToFront();
            }
        }

        // When user moves mouse off of state, do this:
        function mouseout(e) {
            // resetStyle() is a mapbox func?
            statesLayer.resetStyle(e.target);
            // Close popup
            closeTooltip = window.setTimeout(function() {
                map.closePopup();
            }, 100);
        }

        // When user clicks on a state, zoom into it
        function zoomToFeature(e) {
            map.fitBounds(e.target.getBounds());
        }

        // Add legend to the map
        map.legendControl.addLegend(getLegendHTML());

        // Define features in the legend
        function getLegendHTML() {
            // "Grades" display the population density for each label
            var grades = [0, 10, 20, 50, 100, 200, 500, 1000],
            labels = [],
            from, to;

            for (var i = 0; i < grades.length; i++) {
                from = grades[i];
                to = grades[i + 1];

                // A label defines what one of the colors means in terms of population density
                labels.push(
                    '<li><span class="swatch" style="background:' + getColor(from + 1) + '"></span> ' +
                    from + (to ? '&ndash;' + to : '+')) + '</li>';
            }

            // Return the HTML for the legend
            return '<span>People per square mile</span><ul>' + labels.join('') + '</ul>';
        }
    }

};

MyMap.initialize();

// var markers = new L.MarkerClusterGroup();

// for (var i = 0; i < data.features.length; i++) {
//     // The specific data we're working with is 'a'
//     var a = data.features[i];
//     var props = a["properties"];

//     if (props["x"] != null) {
//         // Get title, description and objectives
//         var title = props["project_title"];
//         var description = props["project_description"];
//         var objectives = props["project_objectives"];

//         // Create marker
//         var marker = L.marker(new L.LatLng(props["y"], props["x"]), {
//             icon: L.mapbox.marker.icon({'marker-symbol': 'post', 'marker-color': '0044FF'}),
//             title: title
//         });

//         // Define the popup's content
//         var popupContent = `<h1>${title}</h1>`;
//         popupContent += `<p><b>Objective:</b> ${objectives}</p>`;
//         popupContent += `<p><b>Description:</b> ${description}</p>`;

//         // Slap marker onto map
//         marker.bindPopup(popupContent);
//         markers.addLayer(marker);
//     }

// }

// map.addLayer(markers);

// function onmove() {
//     // Get the map bounds - the top-left and bottom-right locations.
//     var inBounds = [],
//         bounds = map.getBounds();
//     markers.eachLayer(function(marker) {
//         // For each marker, consider whether it is currently visible by comparing
//         // with the current map bounds.
//         if (bounds.contains(marker.getLatLng())) {
//             inBounds.push(marker.options.title);
//         }
//     });
//     // Display a list of markers.
//     document.getElementById('coordinates').innerHTML = inBounds.join('\n');
// }

// map.on('move', onmove);

// // call onmove off the bat so that the list is populated.
// // otherwise, there will be no markers listed until the map is moved.
// onmove();


// // CREATE project_density ARRAY
// var project_density_per_county = [];
// data.features.forEach(function(feature, i) {

//     // If the county property is null, skip
//     if (feature.properties.county == null) return;

//     var county = feature.properties.county.toUpperCase();

//     // Create the county property in the array if it doesn't exist
//     if (project_density_per_county[county] == undefined) {
//         project_density_per_county[county] = {
//             "number_of_projects": 1,
//             "projects_missing_from_map": 0
//         };
//     }
//     // Else increment the tally for the county
//     else {
//         ++project_density_per_county[county]["number_of_projects"];
//     }

//     if (feature.properties.x == null || feature.properties.y == null) {
//         ++project_density_per_county[county]["projects_missing_from_map"];
//     }
// });

//
// CHOROPLETH
////////////////

// Get instance of a popup
// var popup = new L.Popup({ autoPan: false });

// // statesData comes from the 'us-states.js' script included above
// var statesLayer = L.geoJson(kenya_counties,  {
//     style: getStyle,
//     onEachFeature: onEachFeature
// }).addTo(map);

// // Define the style for each state
// // fillColor determined by the density of the state
// function getStyle(feature) {
//     return {
//         weight: 2,
//         opacity: 0.1,
//         color: 'black',
//         fillOpacity: 0.7,
//         fillColor: getColor(feature.properties.COUNTY)
//     };
// }

// // get color depending on population density value
// function getColor(county) {


//     // Some of the data arrives as something other than a string,
//     // thus has no access to toUpperCase()
//     if (typeof(county) === "string") {
//         var COUNTY = MyMap.project_density_per_county[county.toUpperCase()];
//     }

//     if (COUNTY != null){
//         var number_of_projects = COUNTY["number_of_projects"];

//         return number_of_projects > 500 ? '#8c2d04' :
//             number_of_projects > 200  ? '#cc4c02' :
//             number_of_projects > 100  ? '#ec7014' :
//             number_of_projects > 50  ? '#fe9929' :
//             number_of_projects > 20   ? '#fec44f' :
//             number_of_projects > 10   ? '#fee391' :
//             number_of_projects > 5   ? '#fff7bc' :
//             '#ffffe5';
//     }


//     // If we have no data about this county, color it gray
//     return '#d1d1d1';
// }

// // Set event callbacks
// function onEachFeature(feature, layer) {
//     layer.on({
//         mousemove: mousemove,
//         mouseout: mouseout,
//         click: zoomToFeature
//     });
// }

// var closeTooltip;

// // When user hovers mouse over a state, do this:
// function mousemove(e) {
//     var layer = e.target;

//     // Set position and content of the popup
//     popup.setLatLng(e.latlng);

//     var content = '<div class="marker-title">' + layer.feature.properties.COUNTY + '</div>';

//     var county_data = MyMap.project_density_per_county[layer.feature.properties.COUNTY.toUpperCase()];

//     if (county_data !== undefined) {
//         content += '<div>' + county_data["number_of_projects"] + ' is number of projects. </div>';

//         content += '<div>' + county_data["projects_missing_from_map"] + ' is number of projects missing from map. </div>';
//     }


//     popup.setContent(content);

//     // Open the popup
//     if (!popup._map) popup.openOn(map);
//     window.clearTimeout(closeTooltip);

//     // highlight feature
//     layer.setStyle({
//         weight: 3,
//         opacity: 0.3,
//         fillOpacity: 0.9
//     });

//     if (!L.Browser.ie && !L.Browser.opera) {
//         layer.bringToFront();
//     }
// }

// // When user moves mouse off of state, do this:
// function mouseout(e) {
//     // resetStyle() is a mapbox func?
//     statesLayer.resetStyle(e.target);
//     // Close popup
//     closeTooltip = window.setTimeout(function() {
//         map.closePopup();
//     }, 100);
// }

// // When user clicks on a state, zoom into it
// function zoomToFeature(e) {
//     map.fitBounds(e.target.getBounds());
// }

// // Add legend to the map
// map.legendControl.addLegend(getLegendHTML());

// // Define features in the legend
// function getLegendHTML() {
//     // "Grades" display the population density for each label
//     var grades = [0, 10, 20, 50, 100, 200, 500, 1000],
//     labels = [],
//     from, to;

//     for (var i = 0; i < grades.length; i++) {
//         from = grades[i];
//         to = grades[i + 1];

//         // A label defines what one of the colors means in terms of population density
//         labels.push(
//             '<li><span class="swatch" style="background:' + getColor(from + 1) + '"></span> ' +
//             from + (to ? '&ndash;' + to : '+')) + '</li>';
//     }

//     // Return the HTML for the legend
//     return '<span>People per square mile</span><ul>' + labels.join('') + '</ul>';
// }