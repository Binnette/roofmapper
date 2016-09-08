function SessionList() {
    this._sessionsById = new Map();
    this._sessionsByUser = new Map();
}

SessionList.prototype.add = function(session) {
    if (this._sessionsById.has(session.id)) {
        console.error("Trying to add session " + session.id + ", which is already present!");
    } else if (this._sessionsByUser.has(session.userId)) {
        console.error("Trying to add session for user " + session.id + ", who already has one open!");
    } else {
        this._sessionsById.set(session.id, session);
        this._sessionsByUser.set(session.userId, session);
    }
};

SessionList.prototype.has = function(sessionId) {
    return this._sessionsById.has(sessionId);
};

SessionList.prototype.hasForUser = function(userId) {
    return this._sessionsByUser.has(userId);
};

SessionList.prototype.get = function(sessionId) {
    return this._sessionsById.get(sessionId);
};

SessionList.prototype.remove = function(sessionId) {
    if (!this._sessionsById.has(sessionId)) {
        console.error("Trying to remove session " + sessionId + ", which is not present!");
    } else {
        var session = this._sessionsById.get(sessionId);
        this._sessionsById.delete(sessionId);
        
        if (!this._sessionsByUser.has(session.userId)) {
            console.error("Trying to remove session for user " + session.userId + ", who has no open sessions!");
        } else {
            this._sessionsByUser.delete(session.userId);
        }
    }
};

module.exports = SessionList;
