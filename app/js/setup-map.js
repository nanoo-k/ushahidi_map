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

    radioBtns: document.querySelectorAll('.county_filter'),

    // Record info about projects within the county
    countyDetails: [],

    // Instance of mapbox popup
    countyPopup: new L.Popup({ autoPan: false }),

    // Mapbox project count in county layer
    projectCountPerCountyLayer: {},

    // Mapbox project cost per county layer
    projectCostPerCountyLayer: {},

    // HTML for the various map legends
    projectCostLegend: null,
    projectCountLegend: null,

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
        this.createLegends();

        // Set up the radio button blick handler
        this.setupRadioButtonClickHandler();
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
        // Set up and show the project count per county layer
        this.projectCountPerCountyLayer = L.geoJson(MyMap.kenyaCounties, {
                               style: MyMap.getCountPerCountyStyle,
                               onEachFeature: MyMap.onEachFeature
                           });
        this.projectCountPerCountyLayer.addTo(MyMap.map);


        // Set up the project cost per county layer
        this.projectCostPerCountyLayer = L.geoJson(MyMap.kenyaCounties, {
                               style: MyMap.getCostPerCountyStyle,
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
            if (MyMap.countyDetails[county] == undefined) {
                MyMap.countyDetails[county] = {
                    "project_count": 1,
                    "projects_missing_from_map": 0,
                    "projects_total_cost": 0
                };
            }
            // Else increment the tally for the county
            else {
                ++MyMap.countyDetails[county]["project_count"];
            }

            // If the project has no x or y coordinate then it's missing from the map
            if (feature.properties.x == null || feature.properties.y == null) {
                ++MyMap.countyDetails[county]["projects_missing_from_map"];
            }

            // If this project's yearly breakdown is not null...
            if (feature.properties.project_cost_yearly_breakdown__) {
                // Store the total cost of all projects within the county
                MyMap.countyDetails[county]["projects_total_cost"] += feature.properties.project_cost_yearly_breakdown__;
            }
        });
    },


    /**
     * Define the style for each county
     * `fillColor` determined by the density of projects in the county.
     * @param {object} feature
     */
    getCountPerCountyStyle(feature) {

        // Get the number of projects in this county.
        //      Some of the data arrives as something other than a string,
        //      thus has no access to `toUpperCase()` func
        if (typeof(feature.properties.COUNTY) === "string") {
            var COUNTY = MyMap.countyDetails[feature.properties.COUNTY.toUpperCase()];
        }
        var number_of_projects = (COUNTY == null) ? null : COUNTY["project_count"];

        return {
            weight: 2,
            opacity: 0.1,
            color: 'black',
            fillOpacity: 0.7,
            fillColor: MyMap.getCountPerCountyColor(number_of_projects)
        };
    },


    /**
     * Define the style for each county
     * `fillColor` determined by the density of projects in the county.
     * @param {object} feature
     */
    getCostPerCountyStyle(feature) {

        // Get the number of projects in this county.
        //      Some of the data arrives as something other than a string,
        //      thus has no access to `toUpperCase()` func
        if (typeof(feature.properties.COUNTY) === "string") {
            var COUNTY = MyMap.countyDetails[feature.properties.COUNTY.toUpperCase()];
        }
        var average_projects_cost = (COUNTY == null) ? null : COUNTY["projects_total_cost"] / COUNTY["project_count"];

        // console.log(average_projects_cost);

        return {
            weight: 2,
            opacity: 0.1,
            color: 'black',
            fillOpacity: 0.7,
            fillColor: MyMap.getCostPerCountyColor(average_projects_cost)
        };
    },


    /**
     * Get color depending on population density value
     * @param {number} average_projects_cost
     */
    getCostPerCountyColor(average_projects_cost) {
        // `average_projects_cost` will be `null` if no projects are known to be in that county.
        if (average_projects_cost != null) {

            // Various shades of orange.
            return average_projects_cost > 1000000000000 ? '#8c2d04' :
                average_projects_cost > 500000000000  ? '#cc4c02' :
                average_projects_cost > 100000000000  ? '#ec7014' :
                average_projects_cost > 50000000000  ? '#fe9929' :
                average_projects_cost > 10000000000   ? '#fec44f' :
                average_projects_cost > 1000000000   ? '#fee391' :
                average_projects_cost > 100000000   ? '#fff7bc' :
                '#ffffe5';
        }


        // If we have no data about this county, color it grey.
        return '#d1d1d1';
    },


    /**
     * Get color depending on population density value
     * @param {number} number_of_projects
     */
    getCountPerCountyColor(number_of_projects) {
        // `number_of_projects` will be `null` if no projects are known to be in that county.
        if (number_of_projects != null) {

            // Various shades of orange.
            return number_of_projects > 500 ? '#8c2d04' :
                number_of_projects > 200  ? '#cc4c02' :
                number_of_projects > 100  ? '#ec7014' :
                number_of_projects > 50  ? '#fe9929' :
                number_of_projects > 20   ? '#fec44f' :
                number_of_projects > 10   ? '#fee391' :
                number_of_projects > 5   ? '#fff7bc' :
                '#ffffe5';
        }


        // If we have no data about this county, color it grey.
        return '#d1d1d1';
    },


    // Set event callbacks
    onEachFeature(feature, layer) {
        layer.on({
            mousemove: MyMap.mouseMove,
            mouseout: MyMap.mouseOut,
            click: MyMap.zoomToFeature
        });
    },


    /**
     * When user hovers mouse over a county, change contents of popup.
     * @param {event} e
     */
    mouseMove(e) {
        var layer = e.target;

        // highlight feature
        layer.setStyle({
            weight: 3,
            opacity: 0.3,
            fillOpacity: 0.9
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
    },

    /**
     * Show the popup for a county
     * @param {event} e
     */
    showCountyPopup (e) {
        // Must pass in an event (from onclick or mouseover)
        var layer = e.target;

        // Set position and content of the popup
        MyMap.countyPopup.setLatLng(e.latlng);

        // Get the project data for this county
        var county_data = MyMap.countyDetails[layer.feature.properties.COUNTY.toUpperCase()];

        // Generate popup content
        var content = '<div class="marker-title">' + layer.feature.properties.COUNTY + '</div>';
        if (county_data !== undefined) {
            content += '<div>' + county_data["number_of_projects"] + ' is number of projects. </div>';
            content += '<div>' + county_data["projects_missing_from_map"] + ' is number of projects missing from map. </div>';
        }
        // else {
        //     content += '<div></div>';
        // }

        // Set popup content
        MyMap.countyPopup.setContent(content);

        // Open the popup
        if (!MyMap.countyPopup._map) MyMap.countyPopup.openOn(MyMap.map);
        window.clearTimeout(MyMap.closeTooltip);

    },


    /**
     * When user moves mouse off of county, remove popup.
     * @param {event} e
     */
    mouseOut(e) {
        // resetStyle() is a mapbox func?
        MyMap.projectCountPerCountyLayer.resetStyle(e.target);
    },


    /**
     * When user clicks on a county, zoom into it.
     * @param {event} e
     */
    zoomToFeature(e) {
        MyMap.map.fitBounds(e.target.getBounds());
        MyMap.showCountyPopup(e);
    },


    /**
     * Define features in the legend for project count
     */
    getProjectCountLegendHTML() {

        // If this legend already exists, use it. Else build it and use it.
        if (MyMap.projectCountLegend != null) return MyMap.projectCountLegend;

        // "Grades" display the population density for each label
        var grades = [null, 0, 5, 10, 20, 50, 100, 200, 500],
        labels = [],
        from, to;

        for (var i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            // A label defines what one of the colors means in terms of population density
            // Create label for undefined data (grey)
            if (grades[i] == undefined) {
                var color = MyMap.getCountPerCountyColor(null);
                var text = "No data available";
            }
            // Create labels for every other color
            else {
                var color = MyMap.getCountPerCountyColor(from + 1);
                var text = from + (to ? '&ndash;' + to : '+');
            }

            labels.push(
                '<li><span class="swatch" style="background:' + color + '"></span> ' +
                text);

        }

        MyMap.projectCountLegend = '<span>Projects per county</span><ul>' + labels.join('') + '</ul>';

        // Return the HTML for the legend
        return MyMap.projectCountLegend;
    },


    /**
     * Define features in the legend for project cost
     */
    getProjectCostLegendHTML() {

        // If this legend already exists, use it. Else build it and use it.
        if (MyMap.projectCostLegend != null) return MyMap.projectCostLegend;

        // "Grades" display the population density for each label
        var grades = [null, 0, 100000000, 1000000000, 10000000000, 50000000000, 100000000000, 500000000000, 1000000000000],
        labels = [],
        from, to;

        for (var i = 0; i < grades.length; i++) {
            from = grades[i];
            to = grades[i + 1];

            // A label defines what one of the colors means in terms of population density
            // Create label for undefined data (grey)
            if (grades[i] == undefined) {
                var color = MyMap.getCostPerCountyColor(null);
                var text = "No data available";
            }
            // Create labels for every other color
            else {
                var color = MyMap.getCostPerCountyColor(from + 1);
                var text = from + (to ? '&ndash;' + to : '+');
            }

            labels.push(
                '<li><span class="swatch" style="background:' + color + '"></span> ' +
                text);

        }

        MyMap.projectCostLegend = '<span>Average project costper county</span><ul>' + labels.join('') + '</ul>';

        // Return the HTML for the legend
        return MyMap.projectCostLegend;
    },


    /**
     * Create the map legends
     */
    createLegends() {
        MyMap.map.legendControl.addLegend(MyMap.getProjectCountLegendHTML());
    },


    /**
     * Set up the click handler for the radio btns.
     * This switches between showing the average project cost per county
     * and the project count per county.
     */
    setupRadioButtonClickHandler () {
        MyMap.radioBtns.forEach( function (btn, i) {
            btn.onclick = function(e) {
                // Shut off project COST per county layer
                // Turn on project COUNT per county layer
                if (e.target.value === "project_cost") {
                    // Remove layer and legend
                    MyMap.map.removeLayer(MyMap.projectCostPerCountyLayer);
                    MyMap.map.legendControl.removeLegend(MyMap.getProjectCostLegendHTML());

                    // Add layer and legend
                    MyMap.map.addLayer(MyMap.projectCountPerCountyLayer);
                    MyMap.map.legendControl.addLegend(MyMap.getProjectCountLegendHTML());
                }
                // Else user clicked the `project_count`
                // Shut off project COUNT per county layer
                // Turn on project COST per county layer
                else {
                    // Remove layer and legend
                    MyMap.map.removeLayer(MyMap.projectCountPerCountyLayer);
                    MyMap.map.legendControl.removeLegend(MyMap.getProjectCountLegendHTML());

                    // Add layer and legend
                    MyMap.map.addLayer(MyMap.projectCostPerCountyLayer);
                    MyMap.map.legendControl.addLegend(MyMap.getProjectCostLegendHTML());
                }
            }
        });
    }

};

// Initialize the map
MyMap.initialize();




// var layers = document.getElementById('menu-ui');

// // Add the layers of the map
// addLayer(L.mapbox.tileLayer('mapbox.streets'), 'Base Map', 1);
// addLayer(L.mapbox.tileLayer('examples.bike-lanes'), 'Bike Lanes', 2);
// addLayer(L.mapbox.tileLayer('examples.bike-locations'), 'Bike Stations', 3);

// function addLayer(layer, name, zIndex) {
//     layer
//         .setZIndex(zIndex)
//         .addTo(MyMap.map);

//     // Create a simple layer switcher that
//     // toggles layers on and off.
//     var link = document.createElement('a');
//         link.href = '#';
//         link.className = 'active';
//         link.innerHTML = name;

//     link.onclick = function(e) {
//         e.preventDefault();
//         e.stopPropagation();

//         if (MyMap.map.hasLayer(layer)) {
//             MyMap.map.removeLayer(layer);
//             this.className = '';
//         } else {
//             MyMap.map.addLayer(layer);
//             this.className = 'active';
//         }
//     };

//     layers.appendChild(link);
// }
