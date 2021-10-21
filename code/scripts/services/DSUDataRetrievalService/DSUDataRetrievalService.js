import constants from "../../../constants.js";
import utils from "../../../utils.js";

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


  async asyncReadBatchData() {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.readBatchData((err, batchData) => {
        if (err) {
          return reject(err);
        }
        if (typeof batchData === "undefined") {
          return reject(new Error("Could not find batch"));
        }
        return resolve(batchData)
      })
    })
  }

  async asyncReadProductData() {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.readProductData((err, batchData) => {
        if (err) {
          return reject(err);
        }
        if (typeof batchData === "undefined") {
          return reject(new Error("Could not find batch"));
        }
        return resolve(batchData)
      })
    })
  }

  readProductData(callback) {
    if (typeof this.cache.productData !== "undefined") {
      return callback(undefined, this.cache.productData);
    }
    const pathToProductVersion = constants.PATH_TO_PRODUCT_DSU;
    resolver.loadDSU(this.gtinSSI, async (err, dsu) => {
      if (err) {
        return callback(err);
      }
      try {
        let productData = await $$.promisify(dsu.readFile)(`${pathToProductVersion}product.json`);
        if (typeof productData === "undefined") {
          return callback(Error(`Product data is undefined.`));
        }
        productData = JSON.parse(productData.toString());
        try {
          let imgFile = await $$.promisify(dsu.readFile)(`${constants.PATH_TO_PRODUCT_DSU}image.png`);
          productData.productPhoto = utils.getImageAsBase64(imgFile)
        } catch (err) {
          productData.productPhoto = constants.HISTORY_ITEM_DEFAULT_ICON;
        }
        this.cache.productData = productData;
        callback(undefined, productData);
      } catch (err) {
        return callback(err);
      }
    });
  }
}
