# ushahidi_map

## Installation
`git clone https://github.com/nanoo-k/ushahidi_map.git`

No npm or bower scripts used. I pull mapbox in using what is hosted on mapbox.com [https://api.mapbox.com/mapbox.js/v3.0.1/mapbox.js].




## What the code does
This code displays projects based in Kenya and provides a few methods for filtering both the markers and the county outlines. You can click on a county to see more data about it (the tooltip changes depending on which county overlay is being shown). You can also click on markers to see more details.

### Toggling clusters
You may view markers in both clustered and unclustered form. Use the checkbox labled "Cluster markers" to toggle this.

### Toggling county layers
I provide two layers that provide a quick assessment of what's going on in each county. The default layer shows the number of projects per county, where counties that are darker in color have more projects. The second layer lets you see the average project cost per county, where darker counties have projects that on average cost more.

### Filtering markers
In addition, you may toggle the markers, showing some and hiding others depeding on how you filter.
- You may see all projects
- See only the projects that cost more than $500,000,000
- See the projects that cost less than $500,000,000.




## Why I took my approach
### My toolset
Ultimately I decided to focus on learning about mapbox, and so I cut away any task that was going to distract me from that. That means a few things:
- I load mapbox.js from mapbox.com instead of using npm or bower
- I load the map data through script tags as JSON rather than by setting up a server from which to send API requests
- I didn't use any MVC library like Angular2 (which is what I use at work)

I chose to work with Mapbox instead of leaflet because I thought it provided more out-of-the-box features that I was going to implement (like marker clutering), but I realized that the mapbox used implemented the same plugins used by leaflet.

### Code structure
Instead of starting by encapsulating my code in an object or some MVC structure, I started with the examples provided by mapbox. In those examples, the javascript is written right into the HTML, so I started with that. Using exampled provided by mapbox I was able to meet the first three requirements without code becoming too bloated. When adding the bonus features I decided to move all the javascript to its own file and encapsulate it, setting up a function dedicated to initializing the map (called `MyMap.initialize`). I also took this opportunity to study the examples in more detail and comment the code to explain to myself what it was doing.

My codebase was becoming bulky when I added the filter that shows the average cost of projects per county, but when I completed the methods that filter out markers depending on the cost of a project I knew it would become unmaintainable. For example the `toggleMarkerClusters`, `onFilterLayer` and `onFilterByCost` functions all check whether the user is clustering markers or filtering them. Going forward it would be unmaintainable to add more filters that need to know the state of every other filter. Ideally the filters would operate on the data without needing to manage the 6 datasets I've created. An MVC framework like Angular would have helped mitigate this problem.




## Credit
Learning how to build a choropleth: https://www.mapbox.com/mapbox.js/example/v1.0.0/choropleth/
Learning how to cluster: https://www.mapbox.com/mapbox.js/example/v1.0.0/markercluster-custom-marker-icons/




## Novel ways to visualize the data

### Null coordinates
While checking my code, I noticed that some counties like Marsabit have 12 projects within them but 2 of those projects are missing from the map. Looking at this more carefully I found that some of the projects have `null` coordinates but are listed as existing within a specific county. (Example: feature with `objectid` of `1312`). I'm not sure whether we are simply missing data or if `null` coordinates imply that the project just doesn't have a home base. If the project just doesn't have a homebase then we could visualize these by placing differently colored marker at the center of each county to display those projects which have no specific location. (Image can be found within repository as `null-coordinates.jpg`).



## Time Estimate
- <1 hour looking at the available tools (i.e. leaflet and mapbox) and choosing ones
- 3.5 hours creating a project that met the first 3 requirements
- 1.5 hours encapsulating that code within an object
- 2 hours shading areas based on average cost of project per county
- 2 hours adding a UI to filter between all projects, expensive projects, and inexpensive projects
- 1 hour writing up the README
