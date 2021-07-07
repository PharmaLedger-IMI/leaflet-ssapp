import utils from "../../../utils.js";

export default class DSUDataRetrievalService {
    constructor(storage, gtinSSI, basePath) {
        this.storage = storage;
        this.gtinSSI = gtinSSI;
        this.basePath = basePath;
        this.cache = {};
    }

    setBasePath(basePath){
        this.basePath = basePath;
        this.cache = {};
    }
    readBatchData(callback) {
        if (typeof this.cache.batchData !== "undefined") {
            return callback(undefined, this.cache.batchData);
        }
        this.storage.getObject(`${this.basePath}/batch/batch.json`, (err, batchData) => {
            if (err) {
                return callback(err);
            }
            if (typeof batchData === "undefined") {
                return callback(Error(`Batch data is undefined`));
            }
            this.cache.batchData = batchData;
            callback(undefined, batchData);
        });
    }

    getPathToProductDSU(callback) {
        if (typeof this.cache.pathToProductDSU !== "undefined") {
            return callback(undefined, this.cache.pathToProductDSU);
        }

        this.cache.pathToProductDSU = `${this.basePath}/product/`
        callback(undefined, this.cache.pathToProductDSU);
    }

    getPathToBatchDSU(callback) {
        if (typeof this.cache.pathToBatchDSU !== "undefined") {
            return callback(undefined, this.cache.pathToBatchDSU);
        }

        this.cache.pathToBatchDSU = `${this.basePath}/batch/`
        callback(undefined, this.cache.pathToBatchDSU);
    }


    readProductData(callback) {
        if (typeof this.cache.productData !== "undefined") {
            return callback(undefined, this.cache.productData);
        }
        this.getPathToProductDSU((err, pathToProductVersion) => {
            if (err) {
                return callback(err);
            }
            this.cache.pathToProductVersion = pathToProductVersion;
            this.storage.getObject(`${pathToProductVersion}product.json`, (err, productData) => {
                if (err) {
                    return callback(err);
                }

                if (typeof productData === "undefined") {
                    return callback(Error(`Product data is undefined.`))
                }

                productData.photo = utils.getFetchUrl(`/download${pathToProductVersion}/image.png`);
                this.cache.productData = productData;
                callback(undefined, productData);
            });
        })
    }

}
