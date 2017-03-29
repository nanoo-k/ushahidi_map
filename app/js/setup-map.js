//
// MARKERS
////////////
L.mapbox.accessToken = 'pk.eyJ1IjoibmFub28tayIsImEiOiJjajB2N2NpN3AwMDA5MndwMXQ2NnQ2dTY2In0.xP3IuKEHtfzW_vmLNaajOw';
var map = L.mapbox.map('map', 'mapbox.streets')
    .setView([-0.143502, 38.031614], 6);

var markers = new L.MarkerClusterGroup();

for (var i = 0; i < data.features.length; i++) {
    // The specific data we're working with is 'a'
    var a = data.features[i];
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
        markers.addLayer(marker);
    }

}

map.addLayer(markers);

function onmove() {
    // Get the map bounds - the top-left and bottom-right locations.
    var inBounds = [],
        bounds = map.getBounds();
    markers.eachLayer(function(marker) {
        // For each marker, consider whether it is currently visible by comparing
        // with the current map bounds.
        if (bounds.contains(marker.getLatLng())) {
            inBounds.push(marker.options.title);
        }
    });
    // Display a list of markers.
    document.getElementById('coordinates').innerHTML = inBounds.join('\n');
}

map.on('move', onmove);

// call onmove off the bat so that the list is populated.
// otherwise, there will be no markers listed until the map is moved.
onmove();



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
        fillColor: getColor(feature.properties.PERIMETER)
    };
}

// get color depending on population density value
function getColor(d) {
    return d > 1000 ? '#8c2d04' :
        d > 500  ? '#cc4c02' :
        d > 200  ? '#ec7014' :
        d > 100  ? '#fe9929' :
        d > 50   ? '#fec44f' :
        d > 20   ? '#fee391' :
        d > 10   ? '#fff7bc' :
        '#ffffe5';
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
    popup.setContent('<div class="marker-title">' + layer.feature.properties.COUNTY + '</div>' +
        layer.feature.properties.PERIMETER + ' is PERIMETER number');

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