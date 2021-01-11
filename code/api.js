const securityContext = require("opendsu").loadApi("sc");
const mainDSU = securityContext.getMainDSU();

function mountDSU(path, keySSI, callback) {
    //TODO: check if this is still usefull
    mainDSU.readFile("/code/constitution/gtinResolver.js", (err, content) => {
        eval(content.toString());
        mainDSU.mount(path, keySSI, (err) => {
            callback(err);
        });
    });
}

function listDSUs(path, callback) {
    mainDSU.listMountedDossiers(path, callback);
}

function listFolders(path, callback) {
    console.log("Listing folders ...............", path);
    if (path.endsWith("/")) {
        path = path.slice(0, -1);
    }
    mainDSU.listFolders(path, {ignoreMounts: false}, (err, folders) => {
        console.log("List folders callback ====================================", err, folders);
        if (err) {
            return callback(err);
        }

        callback(undefined, folders);
    });
}


function readJSONData(path, callback){
    mainDSU.readFile(path, (err, data) => {
        if (err) {
            return callback(err);
        }

        try {
            data = JSON.parse(data.toString());
        } catch (e) {
            return callback(e);
        }

        callback(undefined, data);
    });
}

function getBatchData(callback){
    readJSONData("/package/batch/batch.json", (err, batchData) => {
        callback(err, batchData);
    });
}

function getProductData(version, callback) {
    readJSONData(`/package/batch/product/${version}/product.json`, (err, productData) => {
        callback(err, productData);
    })
}

function getVersion(country, language, callback){
    if (typeof language === "function") {
        callback = language;
        language = country;
        country = undefined;
    }

    if (typeof country === "function") {
        callback = country;
        country = undefined;
        language = "en";
    }


    getBatchData((err, batchData)=>{
        if (err) {
            return callback(err);
        }

        let version = batchData.version;
        let versionLanguage = version + "/" + language;
        return callback(undefined, versionLanguage);
    });
}

function getLeafletFolder(version){
    return `/package/batch/product/${version}`;
}

function getXML(version, callback){

}

function getXSLT(version, callback){

}


module.exports = {
    mountDSU,
    listDSUs,
    listFolders,
    getVersion,
    getLeafletFolder,
    getBatchData,
    getProductData
}
