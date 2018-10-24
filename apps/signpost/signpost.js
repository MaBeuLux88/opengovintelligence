/*
    Created:        2018/10/04 by James Austin - Trafford Data Lab
    Purpose:        Provides a signposting facility to services related to worklessness within Greater Manchester. Developed for the opengovintelligence project (http://www.opengovintelligence.eu) with EU funding and co-created with the Department for Work and Pensions. Uses software developed outside of the opengovintelligence project.
    Dependencies:   Leaflet.js - (C) Vladimir Agafonkin http://leafletjs.com
                    Leaflet.awesome-markers.js - Lennard Voogdt https://github.com/lvoogdt/Leaflet.awesome-markers
                    Leaflet.Locate plugin - (C) Dominik Moritz https://github.com/domoritz/leaflet-locatecontrol
                    Leaflet.markercluster.js - (C) Dave Leaver https://github.com/danzel
                    Leaflet.Control.Geocoder.js - (C) Per Liedman https://github.com/perliedman/leaflet-control-geocoder
                    Fontawesome - (C) Fonticons, Inc. All rights reserved https://fontawesome.com
                    Chroma.js - (C) Gregor Aisch https://github.com/gka/chroma.js/
                    All other code by Trafford Data Lab

    Licence:        Leaflet: https://github.com/Leaflet/Leaflet/blob/master/LICENSE
                    Leaflet.awesome-markers: https://github.com/lvoogdt/Leaflet.awesome-markers/blob/2.0/develop/LICENSE
                    Leaflet.Locate: https://github.com/domoritz/leaflet-locatecontrol/blob/gh-pages/LICENSE
                    Leaflet.markercluster: https://github.com/Leaflet/Leaflet.markercluster/blob/master/MIT-LICENCE.txt
                    Leaflet.Control.Geocoder: https://github.com/perliedman/leaflet-control-geocoder/blob/master/LICENSE
                    Fontawesome: https://fontawesome.com/license
                    Chroma.js: https://github.com/gka/chroma.js/blob/master/LICENSE
                               https://github.com/gka/chroma.js/blob/master/LICENSE-colors
                    Trafford Data Lab: https://github.com/traffordDataLab/opengovintelligence/blob/master/LICENSE

    Notes:          Trafford Data Lab Leaflet.reachability plugin uses © Powered by openrouteservice https://openrouteservice.org/
*/

// ######### FUNCTIONS #########
/*
    Purpose:        Converts the standard format JSON output by a SPARQL query into keyed JSON which is our preferred format as it can easily be bound to maps etc.
    Dependencies:   None
*/
function labConvertSparqlResultJsonToKeyedJson(json, objectKey, objOptions) {
    // objectKey is the name of one of the vars returned in the data from the SPARQL query and is the key whose value we will be binding the other data items to.  Commonly this might be the ONS code of a geographic area allowing us to easily map the data
    var def_forceType = null;

    var newJson = {};
    var arrDataKeys = [];
    var objectKeyValue;

    var arrVars = json.head.vars;			// Where all the variables used in the SPARQL query are stored, these becomes keys in the returned dataset object
    var arrData = json.results.bindings;	// Where all the data is stored for each of the variables above

    if (objOptions != null) {
    	if (objOptions["forceType"] != null) def_forceType = String(objOptions['forceType']).toLowerCase();		// optional parameter to force all values to be a specific type, e.g. integer etc.
    }

    /*
        Type conversion:
        ----------------
        The values returned in the JSON will be strings - EVEN IF THEY ARE NOT STORED AS STRINGS IN THE TRIPLE STORE
        This is part of the RDF Literal specification: https://www.w3.org/TR/rdf11-concepts/#section-Graph-Literal
        However the actual datatype of the value could/should be contained in a key/value pair e.g. "datatype" : "http://www.w3.org/2001/XMLSchema#integer"
        We can use this to determine the correct type for the value, or we can force the type if we wish via the def_forceType param
        If we want to force the type, we don't want to keep testing the "datatype" key/value so we set a flag forceTypeConversion to true
        If we do decide to force the type - all data items will be converted to this type, therefore this is not suitable for mixed types datasets
    */
    var tempVal;                        // local storage for the data values found in the JSON before they are converted to their correct types
    var tempType;                       // local storage for the data type if we are determining it from the data
    var valType;                        // the type we are going to convert the data to - determined either from the def_forceType param or from the data itself
    var forceTypeConversion = false;    // whether we are forcing the conversion - saves on processing if we are

    if (def_forceType != null) {
        if (def_forceType === "integer" || def_forceType === "float" || def_forceType === "boolean" || def_forceType === "string") {
            valType = def_forceType;
            forceTypeConversion = true;
        }
    }

    // Iterate through the variables section of the JSON to build up an array of data keys to populate our new object
    for (var i = 0; i < arrVars.length; i++) {
        // So long as the variable we are looking at is not the objectKey variable, add it to the array
        if (arrVars[i] != objectKey) arrDataKeys.push(arrVars[i]);
    }

    // Iterate through the data sections of the JSON creating our new JSON object structure
    for (var i = 0; i < arrData.length; i++) {
        objectKeyValue = arrData[i][objectKey].value;     // get the objectKey value, e.g. "E08000009"

        newJson[objectKeyValue] = {};                      // make a new key with the objectKey value within the new JSON object we are creating and make it equal to another object

        // This sub-loop iterates through all the data items other than the feature key and adds them to the new data object
        for (var j = 0; j < arrDataKeys.length; j++) {

            // Temporarily store the value in a local variable ready to determine its type
            tempVal = arrData[i][arrDataKeys[j]]["value"];

            // Determine type from data if not forced - NOTE: this could be expanded for more datatypes if necessary at a later date
            if (!forceTypeConversion) {
                tempType = arrData[i][arrDataKeys[j]]["datatype"];

                if (tempType != null) {
                    if (tempType.lastIndexOf("integer") > -1) {
                        valType = "integer";
                    }
                    else if (tempType.lastIndexOf("float") > -1 || tempType.lastIndexOf("double") > -1 || tempType.lastIndexOf("decimal") > -1) {
                        valType = "float";
                    }
                    else if (tempType.lastIndexOf("boolean") > -1) {
                        valType = "boolean";
                    }
                    else {
                        valType = "string";
                    }
                }
                else {
                    valType = "string";
                }
            }

            // Convert value to the correct type
            switch (valType) {
                case "integer":
                    tempVal = parseInt(tempVal);
                    break;

                case "float":
                    tempVal = parseFloat(tempVal);
                    break;

                case "boolean":
                    tempVal = (tempVal == "true" || tempVal == "1");
                    break;

                default:
                    // Treat as a string
                    tempVal = String(tempVal);
            }

            // Add the value to the key;
            newJson[objectKeyValue][arrDataKeys[j]] = tempVal;
        }
    }

    return newJson;
}


/*
    Purpose:        Creates a chroma.js colour object for automatically creating choropleth colour ranges
    Dependencies:   chroma.js (external library), labError (internal library)
*/
function LabChroma(objOptions) {
    try {
        // properties
        this.data = (objOptions["data"] == null) ? [] : objOptions["data"];                                     // The dataset which we want the colour ranges to be based on
        this.palette = (objOptions["palette"] == null) ? "Purples" : objOptions["palette"];                     // Either a string value or an array containing anything from a colour name, hex value, rgb value, array of colour strings, ColorBrewer palette string etc. etc.
        this.paletteMode = (objOptions["paletteMode"] == null) ? "lab" : String(objOptions["paletteMode"]);     // The colour mode is how the interpolations are worked out. Could be 'rbg', 'lab', 'hsl' etc. Apparently 'lab' gives nicer colour ranges for maps so that's the default
        this.hasBreaks = (objOptions["hasBreaks"] == false) ? false : true;                                     // Whether we want class breaks or a continuous colour range

        if (this.hasBreaks) {
            this.breakMode = (objOptions["breakMode"] == null) ? "q" : String(objOptions["breakMode"]);         // Do we want the class breaks based on [q]uantiles, [k]-means or [e]ven distributions
            this.breakNum = (objOptions["breakNum"] == null) ? 5 : parseInt(objOptions["breakNum"]);            // The number of class breaks we want, default is 5
        }
        else {
            // NOTE: we always need a limits object creating even if we are having a continuous colour range because the limits object gives us the domain (range) of the dataset very easily.
            this.breakMode = "e";       // We want an even distribution of the colour across the range
            this.breakNum = 100;        // By setting a high number of breaks, a legend created from this chroma object will look like a continous range of colour, rather than 'steps' as you would get with 5 etc.
        }

        /*
        Outputs - these are properties which are read out of the object, created from the input properties.
        this.limits is the array of class breaks for the data set, going from the minimum through to the maximum value in the dataset
        this.getColor is the actual chroma object which we get a colour value output from a numeric value input.  The input lies within the limits of the data set
        */
        this.limits = chroma.limits(this.data, this.breakMode, this.breakNum);
        this.getColor = chroma.scale(this.palette).domain([this.limits[0], this.limits[this.limits.length - 1]]).mode(this.paletteMode);    // Set up the main chroma object

        if (this.hasBreaks) this.getColor.classes(this.limits)  // Add on the classes aspect if we want class breaks
    }
    catch(e) {
        throw new LabException("Error in LabChroma(). Error occurred trying to create a chroma.js object: " + e.description);
    }
}


/*
    Purpose:        For returning a single dimension data array of any key's values from a json object with the following structure:
				    {
				    	"objectKey1": { "dataKey1": value, "dataKey2": value, ... "dataKeyN": value },
				    	"objectKey2": { "dataKey1": value, "dataKey2": value, ... "dataKeyN": value }
				    };
				    Useful for providing the data for charts and chroma objects
    Dependencies:   None
*/
function labGetDataArrayFromKeyedJson(json, dataKey) {
    var arrData = [];

    for (var objKey in json) {
        if (json.hasOwnProperty(objKey) && json[objKey].hasOwnProperty(dataKey)) arrData.push(json[objKey][dataKey]);  // The check doesn't result in an error if false as it might be plausible for some of the items in the JSON to not have data of the type we are looking for
    }

    return arrData;
}


// To setup each feature within GeoJSON
function featureEvents (feature, layer) {
    // we need to discover the feature type - remember it is valid for this to be null!
    if (feature.hasOwnProperty('type')) {
        featureType = feature.type.toLowerCase();

        if (featureType == 'feature' || featureType == 'featurecollection') {
            if (feature.hasOwnProperty('geometry') && feature.geometry.hasOwnProperty('type')) featureType = (feature.geometry.type !== null) ? feature.geometry.type.toLowerCase() : null;
        }
    }

    // based on the feature type we now need to set the correct layer type
    if (featureType == 'point' && feature.hasOwnProperty('properties') && feature.properties.hasOwnProperty('featureRadius') && feature.properties.featureRadius !== '') {
        layer.type = 'circle';  // special case as there is no circle in GeoJSON - therefore we can only distinguish between a circle and a point if we have a radius value
    }
    else if (featureType == 'point' || featureType == 'multipoint') {
        layer.type = 'marker';
    }
    else if (featureType == 'polygon' || featureType == 'multipolygon') {
        layer.type = 'polygon';
    }
    else if (featureType == 'linestring' || featureType == 'multilinestring') {
        layer.type = 'polyline';
    }
    else {
        layer.type = featureType;   // probably null
    }

    // Add handler to layer to show properties onclick
    layer.on({
        click: showLayerProps
    });
}

// This function is for styling non-point data. If it has internal styling properties use them, otherwise use a default
function styleOverlayData(feature) {
    var styles = {
        color: '#fc6721',
        fillColor: '#fc6721',
        opacity: 0.5,
        fillOpacity: 0.2
    };

    var props = feature.properties;
    if (props != null) {
        if (props['stroke'] != null) styles['color'] = props['stroke'];
        if (props['stroke-width'] != null) styles['weight'] = props['stroke-width'];
        if (props['stroke-opacity'] != null) styles['opacity'] = props['stroke-opacity'];
        if (props['fill'] != null) styles['fillColor'] = props['fill'];
        if (props['fill-opacity'] != null) styles['fillOpacity'] = props['fill-opacity'];
    }

    return styles;
}

// To setup any point data features within GeoJSON
function pointData (feature, latlng) {
    if (app.datasetCluster == null) {
        // create the marker cluster object in case we require this feature - also indicates to the application that we have point data in the dataset
        app.datasetCluster = L.markerClusterGroup({
            spiderLegPolylineOptions: { weight: 2, color: '#fc6721', opacity: 0.5 },
            polygonOptions: { weight: 2, color: '#fc6721', opacity: 0.5, dashArray: '5' }
        });
    }

    if (feature.hasOwnProperty('properties') && feature.properties.hasOwnProperty('featureRadius') && feature.properties.featureRadius !== '') {
        return L.circle(latlng, { radius: feature.properties.featureRadius });
    }
    else {
        return L.marker(latlng, { icon: app.marker });
    }
}

// Reset the styling of a previously selected feature
function resetFeatureStyle() {
    if (app.featureCache != null) {
        var layer = app.featureCache;

        if (layer.type == 'marker') {
            // Specific reset implementation for markers
            layer.setIcon(app.marker);
        }
        else if (isDatasetLayer(layer)) {
            // The feature belongs to a dataset that has been loaded
            app.datasetGeoJson.resetStyle(layer);
        }
        else if (isIsolineLayer(layer)) {
            // The feature is an isoline drawn with the reachability plugin
            app.reachabilityControl.isolinesGroup.resetStyle(layer);
        }
        else if (isChoroplethLayer(layer)) {
            for (key in app.objChoropleths) {
                if (app.objChoropleths[key].hasLayer(layer)) app.objChoropleths[key].resetStyle(layer);
            }
        }
        else {
            // The feature is a polygon from a geography boundary. Easier to just set the style back to the default than resetting it via the L.geoJSON method
            layer.setStyle(app.poly);
        }

        app.featureCache = null; // clear the cache to prevent a situation where no feature is currently selected but the cache still contains the previously selected layer
    }
}

// Show the properties of a selected layer
function showLayerProps(e) {
    L.DomEvent.stopPropagation(e);  // stop the event bubbling to the map which would cause the information to be removed from the info panel etc.

    var layer = e.target;
    var propsTable = '';

    // reset the style of a previously selected feature
    resetFeatureStyle();

    // add new selected feature to the cache
    app.featureCache = layer;

    // set the highlight style of the selected feature
    if (layer.type == 'marker') {
        layer.setIcon(app.markerSelected);
    }
    else {
        layer.setStyle(app.polySelected);

        // Does the polygon layer belong to either a dataset or boundary geography? If so we want to bring that layer to the front
        // It's really important that we don't do this for isolines otherwise the user couldn't select intervals
        if (isIsolineLayer(layer) == false) layer.bringToFront();
    }

    // build the content for the properties table to be displayed
    if (layer.feature.hasOwnProperty('properties')) {
        var props = layer.feature.properties;

        for (var key in props) {
            // ensure that the key is a valid property of the GeoJson object and isn't one of the styling options
            if (props.hasOwnProperty(key) && key != 'stroke' && key != 'stroke-width' && key != 'stroke-opacity' && key != 'fill' && key != 'fill-opacity' && key != 'marker-color' && key != 'marker-size') {
                propsTable += '<tr><td>' + key + '</td><td>';
                propsTable += (props[key] == null) ? '' : props[key];
                propsTable += '</td></tr>';
            }
        }

        if (propsTable != '') app.updateInfo('<table class="propertiesTable">' + propsTable + '</table>');
    }
}

// for loading data as an overlay layer
function loadDatasetLayer(datasetKey) {
    // Remove any current data layer and reset the variables
    if (app.datasetLayer !== null) {
        app.datasetLayer.removeFrom(app.map);
        app.attribution.removeAttribution(app.datasetGeoJson.getAttribution());   // have to remove the attribution manually due to a seeming bug in Leaflet.MarkerCluster not handling it automatically

        app.datasetLayer = null;
        app.datasetGeoJson = null;
        app.datasetCluster = null;

        // ensure the cluster checkbox is hidden
        if (L.DomUtil.hasClass(app.toggleClusterContainer, 'hideContent') == false) L.DomUtil.addClass(app.toggleClusterContainer, 'hideContent');

        // reset the info panel if a feature from the previous dataset was selected
        if (app.featureCache != null && isGeographyLayer(app.featureCache) == false && isIsolineLayer(app.featureCache) == false) {
            app.updateInfo();
            app.featureCache = null;
        }

        // reset the legend panel
        app.updateLegend();
    }

    // Check to see if the dataset key we've been given matches any datset objects
    if (app.objDatasets.hasOwnProperty(datasetKey)) {
        // Set the page title to match the dataset title.
        document.title = 'Signpost: ' + app.objDatasets[datasetKey].title;

        // Update the about section
        app.updateAbout(app.objDatasets[datasetKey].about);

        startLabSpinner()  // inform the user that something is loading

        // Attempt to load GeoJSON specified in the URL
        labAjax(app.objDatasets[datasetKey].url, function (data) {
            if (data !== null && data !== '') {
                try {
                    // set the options for the GeoJSON layer
                    var layerOptions = { style: styleOverlayData, onEachFeature: featureEvents, pointToLayer: pointData, pane: 'pane_data_overlay' };
                    if (app.objDatasets[datasetKey].attribution !== null) layerOptions['attribution'] = 'Data source: ' + app.objDatasets[datasetKey].attribution;

                    app.datasetGeoJson = L.geoJSON(data, layerOptions);     // create and store the GeoJSON object

                    // do we have point data in the dataset?
                    if (app.datasetCluster != null) {
                        app.datasetCluster.addLayer(app.datasetGeoJson);  // add the GeoJSON to the cluster object - point data will be clustered but polygons/lines won't

                        // the following is a patch for a seeming bug in Leaflet.MarkerCluster not handling the layer attribution automatically
                        if (app.objDatasets[datasetKey].attribution !== null) app.attribution.addAttribution('Data source: ' + app.objDatasets[datasetKey].attribution);

                        // do we want clustering on or off?
                        var clusterQS = labGetQryStrValByKey('cluster');

                        if (clusterQS === 'true' || (clusterQS !== 'false' && app.objDatasets[datasetKey].hasOwnProperty('cluster') && app.objDatasets[datasetKey].cluster === true)) {
                            app.datasetLayer = app.datasetCluster;    // the layer we are going to add to the map is the clustered version
                            document.getElementById('toggleClustering').checked = true;
                        }
                        else {
                            app.datasetLayer = app.datasetGeoJson;    // the layer we are going to add to the map is the straight GeoJSON we loaded
                            document.getElementById('toggleClustering').checked = false;
                        }

                        L.DomUtil.removeClass(app.toggleClusterContainer, 'hideContent');    // show the clustering checkbox
                    }
                    else {
                        app.datasetLayer = app.datasetGeoJson;    // the layer we are going to add to the map is the straight GeoJSON we loaded
                    }

                    // add the dataset layer to the map
                    app.datasetLayer.addTo(app.map);

                    // add legend content if applicable
                    if (app.objDatasets[datasetKey].hasOwnProperty('legend') && app.objDatasets[datasetKey].legend != null && app.objDatasets[datasetKey].legend !== '') app.updateLegend(app.objDatasets[datasetKey].legend);
                }
                catch (e) {
                    labError(new LabException("Error attempting to create GeoJSON Leaflet layer: " + e.message));
                }
            }
            else {
                labError(new LabException("Couldn't find URL: " + app.objDatasets[datasetKey].url));
            }

            stopLabSpinner()   // remove the spinner as the data has loaded
        });
    }
    else {
        // No dataset found so reset the map to the initial state
        document.title = app.title;
        app.updateAbout(app.about);
    }
}

// Handles clustering and de-clustering of point data - called via click event on clustering checkbox
function toggleClustering() {
    app.datasetLayer.removeFrom(app.map);

    if (document.getElementById('toggleClustering').checked) {
        app.datasetLayer = app.datasetCluster;    // the layer we are going to add to the map is the clustered version
    }
    else {
        app.datasetLayer = app.datasetGeoJson;    // the layer we are going to add to the map is the straight GeoJSON we loaded
    }

    app.datasetLayer.addTo(app.map);
}

// Determines whether the layer provided is an isoline
function isIsolineLayer(layer) {
    if (app.reachabilityControl != null && app.reachabilityControl.isolinesGroup != null) {
        /*
            The following iteration is seemingly required as the expected code: app.reachabilityControl.isolinesGroup.hasLayer(layer) doesn't work.
            Each isoline or set of isolines (if intervals were created) are added to .isolinesGroup as a L.geoJSON object, thus they are effectively sub groups of .isolinesGroup.
            The loop iterates through each sub group and checks if the layer is present. If so we stop checking.
        */
        var arrGroups = app.reachabilityControl.isolinesGroup.getLayers();
        for (var i = 0; i < arrGroups.length; i++) {
            if (arrGroups[i].hasLayer(layer)) return true;
        }
    }

    return false;
}

// Determines whether the layer provided is a geography boundary
function isGeographyLayer(layer) {
    for (key in app.objGeographies) {
        if (app.objGeographies[key].hasLayer(layer)) return true;
    }

    return false;
}

// Determines whether the layer provided is a choropleth layer
function isChoroplethLayer(layer) {
    for (key in app.objChoropleths) {
        if (app.objChoropleths[key].hasLayer(layer)) return true;
    }

    return false;
}

// Determines whether the layer provided is a dataset layer
function isDatasetLayer(layer) {
    return (app.datasetLayer != null && app.datasetLayer.hasLayer(layer));
}

// Handles adding and removing choropleth layers
function loadChoroplethLayer(layer) {
    if (layer == '') {
        // we need to remove the current choropleth
        for (key in app.objChoropleths) {
            if (app.map.hasLayer(app.objChoropleths[key])) app.map.removeLayer(app.objChoropleths[key]);
        }
    }
    else if (app.objChoropleths[layer] != null) {
        app.objChoropleths[layer].addTo(app.map);
    }
    else if (layer == 'claimantCount') {
        // --- Choropleth layer for claimant count percentage ---
        startLabSpinner();  // inform the user that something is loading

        labAjax('https://www.trafforddatalab.io/spatial_data/ward/2017/gm_ward_full_resolution.geojson', function (wardGeoJson) {

            // Load the claimant data from the endpoint
            labAjax(app.endpoint , function (dataFromEndpoint) {
                if (dataFromEndpoint != null) {
                    // Convert data returned from the endpoint into the format we need to easily bind to the geography
                    var claimantData = labConvertSparqlResultJsonToKeyedJson(dataFromEndpoint, 'area_code');

                    // Create chroma object to provide the colour values for the choropleth layer
                    var chroma = new LabChroma({ data: labGetDataArrayFromKeyedJson(claimantData, 'percent'), palette: 'Blues' });

                    // Rename the property variables in the ward GeoJson for clarity
                    for (var i = 0; i < wardGeoJson['features'].length; i++) {
                        var newProps = {
                            'Ward code': wardGeoJson['features'][i].properties.area_code,
                            'Ward name': wardGeoJson['features'][i].properties.area_name,
                            'Claimant count %': claimantData[wardGeoJson['features'][i].properties.area_code].percent
                        };

                        wardGeoJson['features'][i].properties = newProps;
                    }

                    // Create Leaflet GeoJSON layer
                    app.objChoropleths['claimantCount'] = L.geoJSON(wardGeoJson, { attribution: app.attributionOS, style: function (feature) {
                        // Return the styling object
                        return {
                            fillColor: chroma.getColor(feature.properties['Claimant count %']),
                            fillOpacity: 0.5,
                            color: '#212121',
                            weight: 2
                        };
                    }, onEachFeature: featureEvents }).addTo(app.map);
                }

                stopLabSpinner();

            }, { data: app.claimantChoroQry, method: 'POST', header: [{ header: 'Accept', value: 'application/sparql-results+json' }, { header: 'Content-Type', value: 'application/x-www-form-urlencoded'}] });

        }, { cache: true });    // Cache the spatial data in case we need again for another choropleth layer
        // ------------------------------------------------------
    }
}


// ######### INITIALISATION #########
// Set up the basic map environment
var app = new LabLeafletMap({
    title: 'Signpost',
    about: 'Find services relating to worklessness within Greater Manchester.<br /><br /><img src="eu_flag.png" width="50" alt="Flag of the European Union" style="float: left; margin-right: 6px; margin-top: 5px;"/> Developed for the EU funded <a href="http://www.opengovintelligence.eu" target="_blank">opengovintelligence</a> project.'
});
app.layerControl.remove();   // remove the layer control as it is not required


// Add the Leaflet Control Geocoder by perliedman
app.geocoder = L.Control.geocoder({
    position: 'topleft',
    defaultMarkGeocode: false,
    placeholder: 'Search town, road, postcode...',
    errorMessage: 'Sorry, nothing found.',
    expand: 'click',
    geocoder: L.Control.Geocoder.nominatim({
        geocodingQueryParams: { countrycodes: 'gb' }    // limit searches to UK
    })
}).addTo(app.map);

// Access the icon element within the plugin to replace the default graphics with a Font Awesome icon
app.geocoderIcon = document.getElementsByClassName('leaflet-control-geocoder-icon')[0];
app.geocoderIconClass = 'fa-search';
while (app.geocoderIcon.firstChild) {
    app.geocoderIcon.removeChild(app.geocoderIcon.firstChild);  // remove any child nodes, such as the &nbsp; char added by the plugin
}
L.DomUtil.addClass(app.geocoderIcon, 'fa ' + app.geocoderIconClass);

// Events to add and remove the spinner class from the geocoder control
app.geocoder.on('startgeocode', function () {
    L.DomUtil.removeClass(app.geocoderIcon, app.geocoderIconClass);
    L.DomUtil.addClass(app.geocoderIcon, 'fa-spinner');
    L.DomUtil.addClass(app.geocoderIcon, 'fa-pulse');
});
app.geocoder.on('finishgeocode', function () {
    L.DomUtil.removeClass(app.geocoderIcon, 'fa-spinner');
    L.DomUtil.removeClass(app.geocoderIcon, 'fa-pulse');
    L.DomUtil.addClass(app.geocoderIcon, app.geocoderIconClass);
    app.geocoder._collapse();
});

// prevent a standard marker being placed at the search location, create a custom one instead
app.geocoder.on('markgeocode', function(result) {
    result = result.geocode || result;
    app.map.fitBounds(result.bbox); // zoom to the bounds of the result area

    // remove current marker if it exists and create a new marker
    if (app.geocoderMarker != null && app.map.hasLayer(app.geocoderMarker)) app.map.removeLayer(app.geocoderMarker);
    app.geocoderMarker = new L.Marker(result.center, { icon: L.divIcon({ className: 'fa fa-street-view geocoderMarker' }) })
        .bindPopup(result.html || result.name, { offset: L.point(14, 0) })
        .addTo(app.map)
        .openPopup();
});


// Add the reachability plugin
app.reachabilityControl = labSetupReachabilityPlugin({
    // Common options are taken care of in the function, however the options below are extra
    styleFn: labStyleIsolines,
    clickFn: showLayerProps,
    pane: 'pane_geography_overlay'
});
app.reachabilityControl.addTo(app.map);

app.baseLayers['Low detail'].addTo(app.map);   // Choose the base/tile layer for the map

app.datasetGeoJson = null;       // object to store GeoJSON created from datasets loaded from the select list. ***NOTE*** this object is important for the resetting of styles for clusered marker datasets
app.datasetCluster = null;       // object to store a leaflet.markercluster object - created if the dataset contains point data
app.datasetLayer = null;         // either a copy of app.datasetGeoJson or app.datasetCluster containing app.datasetGeoJson layers - depends on whether we are clustering point data or not
app.featureCache = null;         // for caching the currently selected feature

// Polygon feature styling
app.poly = {
    color: '#212121',
    weight: 2,
    fillOpacity: 0
};

// Selected polygon styling
app.polySelected = {
    color: '#ffea00',
    weight: 5,
    opacity: '1'
};

// Point data feature styling
app.marker = L.AwesomeMarkers.icon({
    markerColor: 'pin-circle-orange-bright',
    iconSize: [20, 39]
});

// User-selected point data styling
app.markerSelected = L.AwesomeMarkers.icon({
    markerColor: 'pin-circle-yellow-bright',
    iconSize: [20, 39]
});


// ######### EVENTS #########
// Reset the map state if any features have been selected
app.map.on('click', (function (e) {
    resetFeatureStyle();    // reset the style of a previously selected feature
    app.updateInfo();    // clear and hide the info panel
}));

app.map.on('reachability:api_call_start', function (e) {
    // indicate to the user that something is happening at the start of the API call
    startLabSpinner();
});

app.map.on('reachability:api_call_end', function (e) {
    // stop the spinner at the end of the API call
    stopLabSpinner();
});

app.map.on('reachability:delete', function (e) {
    // Check that the recently deleted isoline wasn't currently selected
    if (app.featureCache != null) {
        var layer = app.featureCache;

        if (isIsolineLayer(layer) == false && isGeographyLayer(layer) == false && isDatasetLayer(layer) == false) {
            // The currently cached layer must've been an isoline which has now been deleted so reset the info panel and cache
            app.updateInfo();
            app.featureCache = null;
        }
    }
});


// ######### DATASET METADATA & SELECTION UI  #########
labAjax('apps/signpost/datasets.json', function (data) {
    // Load the JSON holding the metadata for all the datasets which we visualise in the app. The data is in the form:
    /*
    "": {
        "title": "",
        "about": "",
        "attribution": "",
        "url": "",
        "theme": "",
        "cluster": true,    // OPTIONAL
        "hidden": true,     // OPTIONAL
        "legend": ""        // OPTIONAL
    }
    */

    // Before creating in the select list for the datasets create one for the choropleth layers
    var choroplethSelect = '<select name="frmChoroplethList" onChange="loadChoroplethLayer(this.value)" class="datasetSelect"><option value="" selected="selected">Select a data layer to display...</option>';
    choroplethSelect += '<option value="claimantCount">Claimant count percentage</option></select>';

    app.objDatasets = data;  // store the dataset data

    var arrSelectList = [];     // array to hold the contents of the select list to choose the dataset to visualise

    // Loop through the app.objDatasets object adding the main key, title and theme to the array so long as the key is a dataset and we don't want it hidden
    for (key in app.objDatasets) {
        if (app.objDatasets.hasOwnProperty(key) && (!app.objDatasets[key].hasOwnProperty('hidden') || (app.objDatasets[key].hasOwnProperty('hidden') && app.objDatasets[key].hidden !== true))) {
            arrSelectList.push({ dataset: key, title: app.objDatasets[key].title, theme: app.objDatasets[key].theme });
        }
    }

    // Sort the select list array by the themes first as these form the optgroup headings, then by the dataset titles
    arrSelectList.sort(function(a, b) {
        var themeA = a.theme.toLowerCase();
        var themeB = b.theme.toLowerCase();
        var titleA = a.title.toLowerCase();
        var titleB = b.title.toLowerCase();

        // attempt sorting by theme first
        if (themeA < themeB) return -1;
        if (themeA > themeB) return 1;

        // if the theme is the same, sort by the title
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        return 0;
    });

    // Check the URL for a dataset key in the Query String
    var datasetQS = labGetQryStrValByKey('dataset');

    // Create the select element to choose the app.objDatasets
    var datasetSelect = '<select name="frmDatasetList" onChange="loadDatasetLayer(this.value)" class="datasetSelect"><option value="" selected="selected">Select a service to display...</option>';

    var optGroupTheme = '';     // ensure we create new optgroup tags based on the themes

    for (var i = 0; i < arrSelectList.length; i++) {
        /* COMMENTED OUT AS WE DON'T WANT THEMES
        // Write out new optgroup tag
        if (optGroupTheme != arrSelectList[i].theme) {
            if (optGroupTheme != '') datasetSelect += '</optgroup>';
            datasetSelect += '<optgroup label="' + arrSelectList[i].theme + '">';
            optGroupTheme = arrSelectList[i].theme;
        }
        */

        // Write out the dataset list
        datasetSelect += '<option value="' + arrSelectList[i].dataset + '"';
        if (datasetQS == arrSelectList[i].dataset) datasetSelect += ' selected="selected"';
        datasetSelect += '>' + arrSelectList[i].title + '</option>';
    }

    //datasetSelect += '</optgroup></select>';  COMMENTED OUT AS WE DON'T WANT THEMES
    datasetSelect += '</select>';

    // Add the dataset chooser UI to the filter container along with the element to toggle point data clustering
    app.updateFilterGUI(choroplethSelect + datasetSelect + '<div id="toggleClusteringContainer" class="hideContent"><input type="checkbox" id="toggleClustering" onClick="toggleClustering()"/><label for="toggleClustering" class="toggleCluster">cluster markers</label></div>');

    // Store a reference to the container for the point data clustering control so that we can show/hide by adding or removing a CSS class
    app.toggleClusterContainer = document.getElementById('toggleClusteringContainer');

    // If a dataset has been specified via the QueryString, attempt to load it
    if (datasetQS !== null) loadDatasetLayer(datasetQS);
});


// ######### SPATIAL GEOGRAPHY LAYERS/LABELS/CHOROPLETHS #########
app.objGeographies = {};   // object to hold all the boundary L.geoJSON objects
app.objChoropleths = {};   // object to hold the choropleth data layers

app.endpoint = 'http://gmdatastore.org.uk/sparql.json'; // linked data enpoint URL

// Query for obtaining the claimant count percentage by ward
app.claimantChoroQry = 'SELECT DISTINCT ?area_name ?area_code ?percent ';
app.claimantChoroQry +='WHERE {?metcty <http://www.w3.org/2000/01/rdf-schema#label> "E11000001" .';
app.claimantChoroQry +='?inmetcty <http://publishmydata.com/def/ontology/spatial/within> ?metcty .';
app.claimantChoroQry +='?wards <http://publishmydata.com/def/ontology/spatial/within> ?inmetcty .';
app.claimantChoroQry +='?wards <http://statistics.data.gov.uk/def/statistical-entity#code> <http://statistics.data.gov.uk/id/statistical-entity/E05> .';
app.claimantChoroQry +='?wards <http://statistics.data.gov.uk/def/statistical-geography#officialname> ?area_name.';
app.claimantChoroQry +='?wards <http://www.w3.org/2000/01/rdf-schema#label> ?area_code.';
app.claimantChoroQry +='?s2 <http://purl.org/linked-data/cube#dataSet> <http://gmdatastore.org.uk/data/claimant-count> . ';
app.claimantChoroQry +='?s2 <http://purl.org/linked-data/sdmx/2009/dimension#refArea> ?wards . ';
app.claimantChoroQry +='?s2 <http://gmdatastore.org.uk/def/measure-properties/percent> ?percent . ';
app.claimantChoroQry +='?s2 <http://purl.org/linked-data/sdmx/2009/dimension#refPeriod> <http://reference.data.gov.uk/id/month/2018-07> .}';
app.claimantChoroQry = 'query=' + encodeURIComponent(app.claimantChoroQry);


// Add the LA boundaries within GM
labAjax('https://www.trafforddatalab.io/spatial_data/local_authority/2016/gm_local_authority_full_resolution.geojson', function (data) {
    app.objGeographies['LA'] = L.geoJSON(data, { attribution: app.attributionOS, style: app.poly, onEachFeature: featureEvents }).addTo(app.map);
    app.map.fitBounds(app.objGeographies['LA'].getBounds()); // adjust the zoom to fit the boundary to the screen size
});

/*
// --- Choropleth layer for claimant count percentage ---
startLabSpinner();  // inform the user that something is loading

labAjax('https://www.trafforddatalab.io/spatial_data/ward/2017/gm_ward_full_resolution.geojson', function (wardGeoJson) {

    // Load the claimant data from the endpoint
    labAjax(app.endpoint , function (dataFromEndpoint) {
        if (dataFromEndpoint != null) {
            // Convert data returned from the endpoint into the format we need to easily bind to the geography
            var claimantData = labConvertSparqlResultJsonToKeyedJson(dataFromEndpoint, 'area_code');

            // Create chroma object to provide the colour values for the choropleth layer
            var chroma = new LabChroma({ data: labGetDataArrayFromKeyedJson(claimantData, 'percent'), palette: 'Blues' });

            // Rename the property variables in the ward GeoJson for clarity
            for (var i = 0; i < wardGeoJson['features'].length; i++) {
                var newProps = {
                    'Ward code': wardGeoJson['features'][i].properties.area_code,
                    'Ward name': wardGeoJson['features'][i].properties.area_name,
                    'Claimant count %': claimantData[wardGeoJson['features'][i].properties.area_code].percent
                };

                wardGeoJson['features'][i].properties = newProps;
            }

            // Create Leaflet GeoJSON layer
            app.objChoropleths['claimantCount'] = L.geoJSON(wardGeoJson, { attribution: app.attributionOS, style: function (feature) {
                // Return the styling object
                return {
                    fillColor: chroma.getColor(feature.properties['Claimant count %']),
                    fillOpacity: 0.5,
                    color: '#212121',
                    weight: 2
                };
            }, onEachFeature: featureEvents }).addTo(app.map);
        }

        stopLabSpinner();

    }, { data: app.claimantChoroQry, method: 'POST', header: [{ header: 'Accept', value: 'application/sparql-results+json' }, { header: 'Content-Type', value: 'application/x-www-form-urlencoded'}] });

}, { cache: true });    // Cache the spatial data in case we need again for another choropleth layer
// ------------------------------------------------------
*/
