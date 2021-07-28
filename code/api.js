const securityContext = require("opendsu").loadApi("sc");

function mountDSU(path, keySSI, callback) {
    securityContext.getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(err);
        }
        mainDSU.getKeySSIAsString((err, _keySSI) => {
            console.log("MAin DSU key SSI ===========================================", _keySSI);
            mainDSU.mount(path, keySSI, callback);
        })

    });
}

function listDSUs(path, callback) {
    console.log("Listing dsus for path 111111111111111111111111111111111111111", path);
    securityContext.getMainDSU((err, mainDSU) => {
        console.log("Got main DSU I hope .......................................", err, mainDSU);
        if (err) {
            return callback(err);
        }
        mainDSU.getKeySSIAsString((err, _keySSI) => {
            console.log("MAin DSU key SSI ===========================================", err, _keySSI);
            mainDSU.listMountedDossiers(path, callback);
        });
    });
}

function loadDSU(keySSI, callback) {
    const resolver = require("opendsu").loadAPI("resolver");
    resolver.loadDSU(keySSI, callback);
}

function listFolders(path, callback) {
    if (path.endsWith("/")) {
        path = path.slice(0, -1);
    }
    securityContext.getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(err);
        }
        mainDSU.listFolders(path, {ignoreMounts: false}, callback);
    });
}

function refreshDSUMountedAtPath(path, callback) {
    if (path.endsWith("/")) {
        path = path.slice(0, -1);
    }

    securityContext.getMainDSU((err, mainDSU) => {
        if (err) {
            return callback(err);
        }
        mainDSU.getArchiveForPath(path, (err, dsuContext) => {
            if (err) {
                return callback(err);
            }

            dsuContext.archive.refresh(callback);
        });
    });
}

module.exports = {
    mountDSU,
    listDSUs,
    listFolders,
    loadDSU,
    refreshDSUMountedAtPath
}
