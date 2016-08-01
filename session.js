'use strict';

function Session() {
    this._buildings = [];
    this._currentIndex = -1;
}

Object.defineProperties(Session.prototype, {
    currentIndex : {
        get : function() {
            return this._currentIndex;
        },
        set : function(value) {
            if (value !== this._currentIndex && value >= 0 && value < this._buildings.length) {
                this._currentIndex = value;
            }
        }
    },
    buildingCount : {
        get : function() {
            return this._buildings.length;
        }
    }
});

Session.prototype.addBuilding = function(building, setAsCurrentIndex) {
    this._buildings.push(building);
    
    if (setAsCurrentIndex === true) {
        this._currentIndex = this._buildings.length - 1;
    }
};

Session.prototype.getBuilding = function(index) {
    return this._buildings[index];
}

Session.prototype.getCurrentBuilding = function() {
    if (this._currentIndex !== -1) {
        return this._buildings[this._currentIndex];
    }
    
    return undefined;
}

module.exports = Session;