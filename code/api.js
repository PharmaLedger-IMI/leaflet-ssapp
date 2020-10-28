const securityContext = require("opendsu").loadApi("sc");

function mountDSU(path, keySSI, callback) {
    const mainDSU = securityContext.getMainDSU();
    mainDSU.readFile("/code/constitution/gtinResolver.js", (err, content) => {
        eval(content.toString());
        mainDSU.mount(path, keySSI, (err) => {
            callback(err);
        });
    });
}

function listDSUs(path, callback) {
    const mainDSU = securityContext.getMainDSU();
    mainDSU.listMountedDossiers(path, callback);
}

module.exports = {
    mountDSU,
    listDSUs
}
