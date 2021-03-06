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
    clusteredMarkers: new L.MarkerClusterGroup(),
    // "Individual" markers are unclustered markers
    individualMarkers: [],

    // Collection for filtering only the "expensive" projects
    expensiveProjects: {
        clustered: new L.MarkerClusterGroup(),
        individual: []
    },

    // Collection for filtering only the "inexpensive" projects
    inexpensiveProjects: {
        clustered: new L.MarkerClusterGroup(),
        individual: []
    },

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

        // Set up the checkbox click handler
        this.toggleMarkerClusters();

        // Set up the radio button click handler
        this.onFilterLayer();

        this.onFilterByCost();
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
                    title: title
                });

                // Define the popup's content
                var popupContent = `<h1>${title}</h1>`;
                popupContent += `<p><b>Objective:</b> ${objectives}</p>`;
                popupContent += `<p><b>Description:</b> ${description}</p>`;

                // Bind the popoup content
                marker.bindPopup(popupContent);

                // Push marker into arrays destined for map
                this.clusteredMarkers.addLayer(marker);
                this.individualMarkers.push(marker);

                // Dependig on how much this project costs annualy, save it as
                // an expensive or inexpensive marker
                if (props.project_cost_yearly_breakdown__ > 500000000) {
                    this.expensiveProjects.clustered.addLayer(marker);
                    this.expensiveProjects.individual.push(marker);
                } else {
                    this.inexpensiveProjects.clustered.addLayer(marker);
                    this.inexpensiveProjects.individual.push(marker);
                }

            }

        }

        MyMap.map.addLayer(this.clusteredMarkers);
    },


    /**
     * This method pulled from tutorial. What does it do?
     */
    onMove() {
        // Get the map bounds - the top-left and bottom-right locations.
        var inBounds = [],
            bounds = MyMap.map.getBounds();

        MyMap.clusteredMarkers.eachLayer(function(marker) {
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
                               onEachFeature: MyMap.onEachFeatureForCount
                           });
        this.projectCountPerCountyLayer.addTo(MyMap.map);


        // Set up the project cost per county layer
        this.projectCostPerCountyLayer = L.geoJson(MyMap.kenyaCounties, {
                               style: MyMap.getCostPerCountyStyle,
                               onEachFeature: MyMap.onEachFeatureForCost
                           });
    },


    /**
     * For each county, store the number of projects and the number of unlisted projects
     */
    gatherInfoAboutCounties() {
        this.markerData.features.forEach(function(feature, i) {

            // If the county is unknown, skip it.
            if (feature.properties.county == null) return;

            // Uppercase county names for consistency
            var county = feature.properties.county.toUpperCase();

            // Create the county property in the array if it doesn't exist
            if (MyMap.countyDetails[county] == undefined) {
                MyMap.countyDetails[county] = {
                    "project_count": 1,
                    "projects_missing_from_map": 0,
                    "projects_total_cost": 0,
                    "average_cost_of_project": 0,
                    "projects_with_annual_cost_data_missing": 0
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

                // Get the average cost of a project
                // NOTE: To generate the average cost of a project, we need to use the number of projects
                // for which we have data about the annual cost. That means we must subtract `projects_with_annual_cost_data_missing`
                // from `project_count`
                var total = MyMap.countyDetails[county]["project_count"] - MyMap.countyDetails[county]["projects_with_annual_cost_data_missing"];

                MyMap.countyDetails[county]["average_cost_of_project"] = (MyMap.countyDetails[county]["projects_total_cost"] / total);
            }
            // Else increment the number of projects for which we have no data about the annual cost
            else {
                ++MyMap.countyDetails[county]["projects_with_annual_cost_data_missing"];
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
        // If county name isn't available, `average_cost_of_project` is also unknown
        if (COUNTY == null) {
            var average_cost_of_project = null;
        }
        // Else use the number generated earlier
        else {
            var average_cost_of_project = COUNTY["average_cost_of_project"];
        }

        return {
            weight: 2,
            opacity: 0.1,
            color: 'black',
            fillOpacity: 0.7,
            fillColor: MyMap.getCostPerCountyColor(average_cost_of_project)
        };
    },


    /**
     * Get color depending on population density value
     * @param {number} average_cost_of_project
     */
    getCostPerCountyColor(average_cost_of_project) {
        // `average_cost_of_project` will be `null` if no projects are known to be in that county.
        if (average_cost_of_project != null) {

            // Various shades of orange.
            return average_cost_of_project > 1000000000000 ? '#8c2d04' :
                average_cost_of_project > 500000000000  ? '#cc4c02' :
                average_cost_of_project > 100000000000  ? '#ec7014' :
                average_cost_of_project > 50000000000  ? '#fe9929' :
                average_cost_of_project > 10000000000   ? '#fec44f' :
                average_cost_of_project > 1000000000   ? '#fee391' :
                average_cost_of_project > 100000000   ? '#fff7bc' :
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
    onEachFeatureForCount(feature, layer, zoomType) {
        layer.on({
            click: MyMap.zoomToCountyForCount
        });
    },


    // Set event callbacks
    onEachFeatureForCost(feature, layer, zoomType) {
        layer.on({
            click: MyMap.zoomToCountyForCost
        });
    },


    /**
     * Show the popup for a county
     * @param {event} e
     */
    showCountPopup (e) {
        // Must pass in an event (from onclick or mouseover)
        var layer = e.target;

        // Set position and content of the popup
        MyMap.countyPopup.setLatLng(e.latlng);

        // Get the project data for this county
        var county_data = MyMap.countyDetails[layer.feature.properties.COUNTY.toUpperCase()];

        // Generate popup content
        var content = '<div class="marker-title">' + layer.feature.properties.COUNTY + '</div>';
        if (county_data !== undefined) {
            content += '<div>' + county_data["project_count"] + ' is number of projects. </div>';
            content += '<div>' + county_data["projects_missing_from_map"] + ' is number of projects missing from map. </div>';
        }

        // Set popup content
        MyMap.countyPopup.setContent(content);

        // Open the popup
        if (!MyMap.countyPopup._map) MyMap.countyPopup.openOn(MyMap.map);
        window.clearTimeout(MyMap.closeTooltip);

    },


    /**
     * Show the popup for a county
     * @param {event} e
     */
    showCostPopup (e) {
        // Must pass in an event (from onclick or mouseover)
        var layer = e.target;

        // Set position and content of the popup
        MyMap.countyPopup.setLatLng(e.latlng);

        // Get the project data for this county
        var county_data = MyMap.countyDetails[layer.feature.properties.COUNTY.toUpperCase()];

        // Generate popup content
        var content = '<div class="marker-title">' + layer.feature.properties.COUNTY + '</div>';
        if (county_data !== undefined) {
            content += '<div>Average annual cost of projects in this county: ' + county_data["average_cost_of_project"] + '</div>';
        }

        // Set popup content
        MyMap.countyPopup.setContent(content);

        // Open the popup
        if (!MyMap.countyPopup._map) MyMap.countyPopup.openOn(MyMap.map);
        window.clearTimeout(MyMap.closeTooltip);

    },


    /**
     * When user clicks on a county, zoom into it.
     * @param {event} e
     */
    zoomToCountyForCount(e) {
        MyMap.map.fitBounds(e.target.getBounds());
        MyMap.showCountPopup(e);
    },


    /**
     * When user clicks on a county, zoom into it.
     * @param {event} e
     */
    zoomToCountyForCost(e) {
        MyMap.map.fitBounds(e.target.getBounds());
        MyMap.showCostPopup(e);
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
     * When user toggles the checkbox, switch between clustering markers
     * and showing all markers individually.
     */
    toggleMarkerClusters () {
        document.querySelector('#toggle_markers').addEventListener('change', function(e) {
            var all_projects = document.querySelector('#all_projects').checked;
            var expensive_projects = document.querySelector('#expensive_projects').checked;
            var inexpensive_projects = document.querySelector('#inexpensive_projects').checked;

            // User wants to see clustered markers, so show those and hide the individual markers
            if (e.target.checked) {

                if (all_projects) {
                    // Add clustered markers group
                    MyMap.map.addLayer(MyMap.clusteredMarkers);
                }
                else if (expensive_projects) {
                    MyMap.map.addLayer(MyMap.expensiveProjects.clustered);
                }
                else if (inexpensive_projects) {
                    MyMap.map.addLayer(MyMap.inexpensiveProjects.clustered);
                }

                // Must remove each marker individually
                MyMap.removeCollection(MyMap.individualMarkers);
            }

            // If user wants to see individual markers, show those and hide the clustered markers
            else {
                // Depending on which filter is selected, show all or some unclustered markers
                if (all_projects) {
                    MyMap.showCollection(MyMap.individualMarkers);
                }
                else if (expensive_projects) {
                    MyMap.showCollection(MyMap.expensiveProjects.individual);
                }
                else if (inexpensive_projects) {
                    MyMap.showCollection(MyMap.inexpensiveProjects.individual);
                }

                // Remove clustered markers group
                MyMap.map.removeLayer(MyMap.clusteredMarkers);
                MyMap.map.removeLayer(MyMap.expensiveProjects.clustered);
                MyMap.map.removeLayer(MyMap.inexpensiveProjects.clustered);
            }
        });
    },


    /**
     * Set up the click handler for the layer filter radio btns.
     * This switches between showing the average project cost per county
     * and the project count per county.
     */
    onFilterLayer () {
        document.querySelectorAll('.county_filter').forEach( function (btn, i) {
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
    },


    /**
     * Set up the click handler for the price filter radio btns.
     * This switches between showing all projects, showing expensive
     * projects, and showing inexpensive projects.
     */
    onFilterByCost () {
        document.querySelectorAll('.price_filter').forEach( function (btn, i) {
            btn.onclick = function(e) {

                // Show all projects
                if (e.target.value === "all_projects") {
                    // Show all markers (either as clusters or not)
                    if (document.querySelector('#toggle_markers').checked) {
                        MyMap.map.addLayer(MyMap.clusteredMarkers);
                    } else {
                        MyMap.showCollection(MyMap.individualMarkers);
                    }

                    // Hide all other layers of markers
                    MyMap.map.removeLayer(MyMap.expensiveProjects.clustered);
                    MyMap.map.removeLayer(MyMap.inexpensiveProjects.clustered);

                }
                // Show the expensive projects, hide all others
                else if (e.target.value === "expensive_projects") {
                    // Show expensive projects (either as clusters or not)
                    if (document.querySelector('#toggle_markers').checked) {
                        MyMap.map.addLayer(MyMap.expensiveProjects.clustered);
                    } else {
                        MyMap.showCollection(MyMap.expensiveProjects.individual);
                    }

                    // Hide all other layers of markers
                    MyMap.map.removeLayer(MyMap.clusteredMarkers);
                    MyMap.map.removeLayer(MyMap.inexpensiveProjects.clustered);

                    MyMap.removeCollection(MyMap.inexpensiveProjects.individual);
                }
                // Show the inexpensive projects, hide all others
                else if (e.target.value === "inexpensive_projects") {
                    // Show inexpensive projects (either as clusters or not)
                    if (document.querySelector('#toggle_markers').checked) {
                        MyMap.map.addLayer(MyMap.inexpensiveProjects.clustered);
                    } else {
                        MyMap.showCollection(MyMap.inexpensiveProjects.individual);
                    }

                    // Hide all other layers of markers
                    MyMap.map.removeLayer(MyMap.clusteredMarkers);
                    MyMap.map.removeLayer(MyMap.expensiveProjects.clustered);

                    MyMap.removeCollection(MyMap.expensiveProjects.individual);
                }
            }
        });
    },

    /**
     * Shows layer of markers that are not clustered
     * @param {array} collection
     */
    showCollection (collection) {
        collection.forEach( function (marker, i) {
            MyMap.map.addLayer(marker);
        });
    },

    /**
     * Hides layer of markers that are not clustered
     * @param {array} collection
     */
    removeCollection (collection) {
        collection.forEach( function (marker, i) {
            MyMap.map.removeLayer(marker);
        });
    }

};

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the map
    MyMap.initialize();
});
