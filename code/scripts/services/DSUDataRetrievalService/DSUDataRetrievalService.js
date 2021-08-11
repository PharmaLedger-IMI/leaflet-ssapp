import constants from "../../../constants.js";
const openDSU = require("opendsu");
const resolver = openDSU.loadAPI("resolver");
export default class DSUDataRetrievalService {
  constructor(gtinSSI) {
    this.gtinSSI = gtinSSI;
    this.cache = {};
  }

  readBatchData(callback) {
    if (typeof this.cache.batchData !== "undefined") {
      return callback(undefined, this.cache.batchData);
    }
    resolver.loadDSU(this.gtinSSI, (err, dsu) => {
      if (err) {
        return callback(err);
      }
      dsu.readFile(`/batch/batch.json`, (err, batchData) => {
        if (err) {
          return callback(err);
        }
        if (typeof batchData === "undefined") {
          return callback(Error(`Batch data is undefined`));
        }

        batchData = JSON.parse(batchData.toString());
        this.cache.batchData = batchData;
        callback(undefined, batchData);
      });
    });
  }

  readProductData(callback) {
    if (typeof this.cache.productData !== "undefined") {
      return callback(undefined, this.cache.productData);
    }
    const pathToProductVersion = constants.PATH_TO_PRODUCT_DSU;
    resolver.loadDSU(this.gtinSSI, (err, dsu) => {
      if (err) {
        return callback(err);
      }
      dsu.readFile(
        `${pathToProductVersion}product.json`,
        (err, productData) => {
          if (err) {
            return callback(err);
          }

          if (typeof productData === "undefined") {
            return callback(Error(`Product data is undefined.`));
          }

          productData = JSON.parse(productData.toString());
          this.cache.productData = productData;
          callback(undefined, productData);
        }
      );
    });
  }
}
