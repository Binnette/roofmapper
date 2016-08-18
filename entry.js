'use strict';

var $ = require('expose?$!expose?jQuery!jquery');
var L = require('leaflet');
var keyboardJS = require('keyboardJS');
var defined = require('./defined');
var OsmApi = require('./osmapi.js');
var Session = require('./session.js');
var Building = require('./building.js');
var Session = require('./session.js');
var BuildingService = require('./buildingservice.js');
var LoadingStatus = require('./loadingstatus.js');

require('leaflet-bing-layer');
require('leaflet-easybutton');

require('leaflet/dist/leaflet.css');
require('leaflet/dist/images/marker-icon.png');
require('leaflet/dist/images/marker-icon-2x.png');
require('leaflet/dist/images/marker-shadow.png');
require('leaflet-easybutton/src/easy-button.css');
require('font-awesome/css/font-awesome.css');
require('./style.css');

require('bootstrap');
require("bootstrap-webpack");

// since leaflet is bundled into the browserify package it won't be able to detect where the images
// solution is to point it to where you host the the leaflet images yourself
L.Icon.Default.imagePath = 'http://cdn.leafletjs.com/leaflet-0.7.3/images';

$("body").append("<div id='wrapper'></div>");
var wrapper = $("body").children("#wrapper");
wrapper.append("<div id='header'></div>");
wrapper.children("#header").append(
    "<div id='connection-buttons'>" +
    "<button type='button' class='btn btn-primary' id='authenticate-button'>Authenticate</button>" +
    "<div class='btn-group' id='user-menu'>" +
    "<button type='button' class='btn btn-default dropdown-toggle' data-toggle='dropdown' href='#'><span id='username'>Username</span> <span class='caret'></span></button>" +
    "<ul class='dropdown-menu dropdown-menu-right' role='menu'>" +
    "<li><a href='#' target='_blank' id='user-profile-link'>OpenStreetMap profile</a></li>" +
    "<li class='divider'></li>" +
    "<li><a href='#' id='logout-button'>Disconnect</a></li>" +
    "</ul>" +
    "</div>" +
    "</div>"
);
wrapper.children("#header").append(
    "<div id='session-buttons'>" +
    "<button type='button' class='btn btn-primary' id='upload-changes'><i class='fa fa-cloud-upload' aria-hidden='true'></i> Send changes</button>" +
    "<p id='tagged-building-count'>0 buildings tagged</p>" +
    "<p id='uploaded-building-count'>0 buildings uploaded</p>" +
    "</div>"
);
wrapper.append("<div id='map'></div>");
wrapper.append("<div id='footer'></div>");
wrapper.children("#footer").append(
    "<div class='btn-group' data-toggle='buttons' id='tag-buttons'>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-undefined' value='undefined' autocomplete='off' />Undefined, other</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-roof_tiles' value='roof_tiles' autocomplete='off' />Tiles</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-slate' value='slate' autocomplete='off' />Slate</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-metal' value='metal' autocomplete='off' />Metal</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-copper' value='copper' autocomplete='off' />Copper</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-concrete' value='concrete' autocomplete='off' />Concrete</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-glass' value='glass' autocomplete='off' />Glass</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-tar_paper' value='tar_paper' autocomplete='off' />Tar paper</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-eternit' value='eternit' autocomplete='off' />Eternit</label>" +
    "<label class='btn btn-primary'><input type='radio' name='tag-selection' id='tag-gravel' value='gravel' autocomplete='off' />Gravel</label>" +
    "</div>" +
    "<div id='building-buttons'>" +
    "<button type='button' class='btn btn-default' id='previous-building'><div class='fa fa-chevron-left' aria-hidden='true'></div><div>Previous building</div></button>" +
    "<button type='button' class='btn btn-default' id='next-building'><div class='fa fa-chevron-right' aria-hidden='true'></div><div>Next building</div></button>" +
    "</div>"
);

/*$("body").append(require('html!./testpopup.html'));
wrapper.children("#header").append("<button type='button' class='btn btn-primary' id='testbutton'>Test</button>");
//wrapper.children("#header").append('<button type="button" class="btn btn-primary btn-lg" data-toggle="modal" data-target="#myModal">Launch demo modal</button>');
document.getElementById('testbutton').onclick = function() {
    $('#myModal').modal('show');
};*/

var _username = undefined;
var _map = undefined;
var _recenterButton = undefined;
var _buildingPolygon = undefined;
var _api = new OsmApi();
var _session = new Session();
var _loadingStatus = new LoadingStatus();

function logout() {
    _api.logout();
    
    console.log("logged out");
    
    updateConnectionStatusDisplay();
    updateUi();
}

function fetchUserName(onSuccess, onError) {
    _api.request('/api/0.6/user/details', 'GET', function(error, details) {
        if (defined(error)) {
            alert("Error: " + error.responseText);
            console.log("could not connect: " + error.responseText);            
            
            if (defined(onError)) {
                onError(error);
            }
            
            return;
        }
        
        var u = details.getElementsByTagName('user')[0];
        _username = u.getAttribute('display_name');
        var userId = u.getAttribute('id');
        
        console.log("connected as " + _username + " (" + userId + ")");
        
        updateConnectionStatusDisplay();
        updateUi();
        
        if (defined(onSuccess)) {
            onSuccess();
        }
    });
};

function updateUi() {
    var loading = _loadingStatus.isLoading;
    
    $("#authenticate").prop('disabled', loading || _api.authenticated);
    $("#logout").prop('disabled', loading || !_api.authenticated)
    $("#building-buttons").find("button").prop('disabled', loading);
    
    if (_session.currentIndex <= 0) {
        $("#previous-building").prop('disabled', true);
    }
    if (_session.changesetIsFull) {
        $("#next-building").prop('disabled', true);
    }
    
    if (defined(_session.currentBuilding)) {
        _recenterButton.enable();
    } else {
        _recenterButton.disable();
    }
    
    $("#tag-buttons").find("input").prop('disabled', loading || _session.currentIndex < 0);
    
    $("#upload-changes").prop("disabled", loading || !_api.authenticated || _session.taggedBuildingCount <= 0);
    
    $("#tag-buttons").find("input")
        .prop("checked", false)
        .parent().removeClass("active");
    
    if (defined(_session.currentBuilding)) {
        var roofMaterial = _session.currentBuilding.roofMaterial;
        $("#tag-" + roofMaterial)
            .prop("checked", true)
            .parent().addClass("active");
        
        $("#tag-buttons").find("input")
            .parent().removeClass("disabled")
    } else {
        $("#tag-buttons").find("input")
            .parent().addClass("disabled")
    }
    
    $("#tagged-building-count").text(
        _session.taggedBuildingCount +
        " building" + (_session.taggedBuildingCount === 1 ? "" : "s") +
        " tagged");
    $("#uploaded-building-count").text(
        _session.uploadedBuildingCount +
        " building" + (_session.uploadedBuildingCount === 1 ? "" : "s") +
        " uploaded");
}

function updateConnectionStatusDisplay() {
    if (_api.authenticated) {
        $("#authenticate-button").hide();
        $("#user-menu").show();
        $("#username").text(_username);
        $("#user-profile-link").attr("href", _api.url + "/user/" + _username);
    } else {
        $("#authenticate-button").show();
        $("#user-menu").hide();
    }
}

if (_api.authenticated) {
    $("#connection-status").text("Connected, retrieving username...");
    fetchUserName();
}

document.getElementById('authenticate-button').onclick = function() {
    _loadingStatus.addSystem('authentication');
    _api.authenticate(function() {
        _loadingStatus.removeSystem('authentication');
        
        updateConnectionStatusDisplay();
        updateUi();
        
        if (_api.authenticated) {
            fetchUserName(
                function() {},
                function(error) {
                    if (error.status === 401) {
                        logout();
                    }
                }
            );
        }
    });
};
document.getElementById('logout-button').onclick = logout;

function destroyBuildingPolygon() {
    if (defined(_buildingPolygon)) {
        _map.removeLayer(_buildingPolygon);
        _buildingPolygon = undefined;
    }
}

function displayBuildingPolygon(building) {
    destroyBuildingPolygon();
    
    if (!defined(building)) {
        return;
    }
    
    building.polygon.setStyle({
        weight : 2,
        color : '#FFFF00',
        opacity : 0.8,
        fill : false,
        dashArray : "5,5",
        clickable : false
    });
    building.polygon.addTo(_map);
    _map.fitBounds(building.polygon.getBounds());
    _buildingPolygon = building.polygon;
}

function loadAndDisplayNewBuilding() {
    if (_session.changesetIsFull) {
        return;
    }
    
    _loadingStatus.addSystem('load-building');
    
    BuildingService.getBuilding(function(building) {
        _api.request('/api/0.6/' + building.type + '/' + building.id + '/full', 'GET', function(error, response) {
            if (defined(error)) {
                console.error("Download error: " + error.responseText);
                _loadingStatus.removeSystem('load-building');
            } else {
                var $data = $(response);
                var version = Number($data.children("osm").children(building.type).attr("version"));
                
                if (version !== building.version) {
                    console.log("Building " + building.type + "/" + building.id + " is at version " + version +
                        ", was expecting version " + building.version + ". Skipping.");
                    _loadingStatus.removeSystem('load-building');
                    loadAndDisplayNewBuilding();
                } else {
                    building.setData($data);
                    
                    if (defined(building.roofMaterial)) {
                        console.log("Building " + building.type + "/" + building.id +
                            " already has its roof material defined. Skipping.");
                        _loadingStatus.removeSystem('load-building');
                        loadAndDisplayNewBuilding();
                    } else {
                        console.log("Displaying building " + building.type + "/" + building.id);
                        _session.addBuilding(building, true);
                        displayBuildingPolygon(building);
                        updateUi();
                        _loadingStatus.removeSystem('load-building');
                    }
                }
            }
        });
    });
}

function displayPreviousBuilding() {
    if (_session.currentIndex > 0) {
        _session.currentIndex = _session.currentIndex - 1;
        var building = _session.getCurrentBuilding();
        displayBuildingPolygon(building);
        updateUi();
    }
}

function displayNextBuilding() {
    if (_session.currentIndex < _session.buildingCount - 1) {
        _session.currentIndex = _session.currentIndex + 1;
        var building = _session.getCurrentBuilding();
        displayBuildingPolygon(building);
        updateUi();
    } else {
        loadAndDisplayNewBuilding();
    }
}

function clearTaggedBuildings() {
    _session.clearTaggedBuildings();
    var building = _session.getCurrentBuilding();
    displayBuildingPolygon(building);
    updateUi();
}

document.getElementById('previous-building').onclick = displayPreviousBuilding;
document.getElementById('next-building').onclick = displayNextBuilding;

function createChangeset(callback) {
    var changesetData =
        '<osm>' +
        '<changeset>' +
        '<tag k="created_by" v="RoofMapper ' + VERSION + '"/>' +
        '<tag k="comment" v="Add building roof:material data from imagery"/>' +
        '</changeset>' +
        '</osm>';
    
    _loadingStatus.addSystem('changeset-creation');
    
    _api.requestWithData('/api/0.6/changeset/create', 'PUT', changesetData, function(error, response) {
        if (defined(error)) {
            console.error("Changeset creation error: " + error.responseText);
            _loadingStatus.removeSystem('changeset-creation');
        } else {
            var changesetId = Number(response);
            console.log("Changeset " + changesetId + " created");
            _session.changesetId = changesetId;
            
            callback();
            _loadingStatus.removeSystem('changeset-creation');
        }
    });
}

function uploadChanges() {
    if (!defined(_session.changesetId)) {
        return;
    }
    
    var changeData = _session.toOsmChange();
    
    _loadingStatus.addSystem('changes-upload');
    
    var url = '/api/0.6/changeset/' + _session.changesetId + '/upload';
    _api.requestWithData(url, 'POST', changeData, function(error, response) {
        if (defined(error)) {
            console.error("Changes upload error: " + error.responseText);
            
            if (error.statusText === "Conflict") {
                if (error.responseText.match(/was closed/)) {
                    // The changeset #id was closed at #closed_at.
                    console.log("The changeset " + _session.changesetId +
                        " has been closed, creating a new one.");
                    createChangeset(uploadChanges);
                } else if (error.responseText.match(/Version mismatch/)) {
                    // Version mismatch: Provided #ver_client, server had: #ver_serv of [Way|Relation] #id
                    removeBuildingInConflict(error.responseText);
                }
            }
            
            _loadingStatus.removeSystem('changes-upload');
        } else {
            console.log("Changes uploaded");
            
            _session.clearTaggedBuildings();
            destroyBuildingPolygon();
            loadAndDisplayNewBuilding();
            
            _loadingStatus.removeSystem('changes-upload');
        }
    });
}

function removeBuildingInConflict(errorString) {
    var matches = errorString.match(/(Way|Relation) (\d+)/);
    
    if (matches == null) {
        return;
    }
    
    var type = matches[1].toLowerCase();
    var id = Number(matches[2]);
    
    console.log("Removing building " + type + "/" + id + " from session");
    
    _session.removeBuilding(type, id);
    
    if (_session.currentIndex >= 0 && _session.currentIndex < _session.buildingCount) {
        var building = _session.getCurrentBuilding();
        displayBuildingPolygon(building);
        updateUi();
    } else {
        loadAndDisplayNewBuilding();
    }
}

document.getElementById('upload-changes').onclick = function() {
    if (!defined(_session.changesetId)) {
        createChangeset(uploadChanges);
    } else {
        uploadChanges();
    }
};

function addKeyboardShortcut(key, conditions, action) {
    keyboardJS.bind(key, function(e) {
        for (var i = 0; i < conditions.length; i++) {
            if (!conditions[i]) {
                return;
            }
        }
        
        action(e);
    });
}

function init() {
    console.log("RoofMapper " + VERSION + ", environment: " + ENV);
    
    _map = L.map('map');
    
    var bingKey = 'AlCYN3W0pAkcnVgUrS9Jb4Wkmoa_3WCGtD72BGvpzaYxAgjz0VEv5_5OalHYb3k5';
    L.tileLayer.bing(bingKey).addTo(_map);
    
    _map.setView([46.935, 2.780], 7);
    
    _recenterButton = L.easyButton(
        'fa-crosshairs fa-lg',
        function(button, map) {
            if (defined(_buildingPolygon)) {
                _map.fitBounds(_buildingPolygon.getBounds());
            }
        },
        '', // title
        'recenter-button' // id
    );
    _recenterButton.addTo(_map);
    _recenterButton.disable();
    
    // Set the title here and not in the button constructor because when set by
    // the constructor, the title is only displayable when the button is active.
    // With this alternative way its always displayable.
    $("#recenter-button").closest(".leaflet-control").prop("title", "Recenter on building");
    
    _loadingStatus.addListener(updateUi);
    
    $('input[type=radio][name=tag-selection]').change(function() {
        if (defined(_session.currentBuilding)) {
            var value = this.value === 'undefined' ? undefined : this.value;
            _session.setBuildingRoofMaterial(_session.currentBuilding, value);
            updateUi();
        }
    });
    
    var isNotLoading = function() { return !_loadingStatus.isLoading; };
    var buildingDisplayed = function() { return defined(_session.currentBuilding); };
    var isNotAtFirstBuilding = function() { return _session.currentIndex > 0; };
    addKeyboardShortcut('backspace', [ isNotLoading, isNotAtFirstBuilding ], displayPreviousBuilding);
    addKeyboardShortcut('space', [ isNotLoading ], displayNextBuilding);
    
    var addRoofMaterialKeyboardShortcut = function(key, material) {
        addKeyboardShortcut(key, [ isNotLoading, buildingDisplayed ], function() { $("#tag-" + material).prop("checked", true).trigger('change'); });
    };
    addRoofMaterialKeyboardShortcut('numzero', 'undefined');
    addRoofMaterialKeyboardShortcut('numone', 'roof_tiles');
    addRoofMaterialKeyboardShortcut('numtwo', 'slate');
    addRoofMaterialKeyboardShortcut('numthree', 'metal');
    addRoofMaterialKeyboardShortcut('numfour', 'copper');
    addRoofMaterialKeyboardShortcut('numfive', 'concrete');
    addRoofMaterialKeyboardShortcut('numsix', 'glass');
    addRoofMaterialKeyboardShortcut('numseven', 'tar_paper');
    addRoofMaterialKeyboardShortcut('numeight', 'eternit');
    addRoofMaterialKeyboardShortcut('numnine', 'gravel');
    
    updateConnectionStatusDisplay();
    updateUi();
}

init();