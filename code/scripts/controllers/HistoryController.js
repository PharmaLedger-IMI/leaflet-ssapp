const {WebcController} = WebCardinal.controllers;
const {DataSource} = WebCardinal.dataSources;
import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";
import BatchStatusService from "../services/BatchStatusService.js";
import DSUDataRetrievalService from "../services/DSUDataRetrievalService/DSUDataRetrievalService.js";
import utils from "../../utils.js";

class HistoryDataSource extends DataSource {
  constructor(...props) {
    const [myService, ...defaultOptions] = props;
    super(...defaultOptions);
    this.setPageSize(2);
    this.settingsService = myService;
  }

  async getPageDataAsync(startOffset, dataLengthForCurrentPage) {

    let dbApi = require("opendsu").loadApi("db");
    let products = [];
    let advancedUser = await this.settingsService.asyncReadSetting("advancedUser");
    this.advancedUser = !!advancedUser;
    let refreshPeriod = await this.settingsService.asyncReadSetting("refreshPeriod");
    this.secondsToUpdate = refreshPeriod || constants.DEFAULT_REFRESH_PERIOD;

    try {
      this.dbStorage = await $$.promisify(dbApi.getMainEnclaveDB)();
      let results = await $$.promisify(this.dbStorage.filter)(constants.HISTORY_TABLE, "createdAt > 0", "dsc");
      this.setRecordsNumber(results.length);
      if (results && results.length > 0) {
        if (document.querySelector(".datatable-title") && document.querySelector(".datatable-title").hidden) {
          document.querySelector(".datatable-title").hidden = false;
        }
        results = results.slice(startOffset, startOffset + dataLengthForCurrentPage);
        for (let result of results) {
          if (Date.now() - result['__timestamp'] > this.secondsToUpdate * 1000) {
            let batchData;
            let product;
            let batchStatusService = new BatchStatusService();
            try {
              let dsuDataRetrievalService = new DSUDataRetrievalService(result.gtinSSI);
              product = await dsuDataRetrievalService.asyncReadProductData();
              batchData = await dsuDataRetrievalService.asyncReadBatchData();
              batchStatusService.getProductStatus(batchData, result.gs1Fields);
            } catch (e) {
              batchStatusService.unableToVerify();
            }

            result.status = batchStatusService.status;
            result.statusMessage = batchStatusService.statusMessage;
            result.statusType = batchStatusService.statusType;
            result.expiryForDisplay = batchStatusService.expiryForDisplay;
            result.expiryTime = batchStatusService.expiryTime;
            result.snCheck = batchStatusService.snCheck;
            result.product = product;
            result.batchData = batchData;
            result = await $$.promisify(this.dbStorage.updateRecord)(constants.HISTORY_TABLE, result.pk, result)
          }
          result.advancedView = this.advancedUser;
        }
        products = results;
      } else {
        if (document.querySelector(".datatable-title") && document.querySelector(".datatable-title").hidden) {
          document.querySelector(".datatable-title").hidden = true;
        }
      }
    } catch (e) {
      console.log('Error on getting async page data: ', e);
    }
    //group by month and year
    let groups = {};
    for (let product of products) {
      let date = product.createdAt.slice(0, 7);
      if (!groups[date]) {
        groups[date] = [];
        product.firstGroupItem = true;
      } else {
        product.firstGroupItem = false;
      }
      let humanDate = utils.convertFromISOtoYYYY_HM(product.createdAt.split('T')[0], true, "");
      product.groupDate = humanDate.slice(4);
      let timeLabel = "ago";
      product.timeFrameOrDate = `${utils.getTimeSince(product.createdAt)} ${timeLabel}` || humanDate;

      groups[date].push(product);
    }
    return products;
  }
}

export default class HistoryController extends WebcController {
  constructor(element, history) {
    super(element, history);

    let settingsService = new SettingsService(this.DSUStorage);
    this.model = {
      productsDataSource: new HistoryDataSource(settingsService)
    }
    const {productsDataSource} = this.model;

    settingsService.readSetting("refreshPeriod", (err, refreshPeriod) => {
      if (err || !refreshPeriod) {
        refreshPeriod = constants.DEFAULT_REFRESH_PERIOD;
      }
      setInterval(() => {
        productsDataSource.goToPageByIndex(0)
      }, refreshPeriod * 1000)
    });

    let dbApi = require("opendsu").loadApi("db");
    let viewDetails = (pk) => {

      dbApi.getMainEnclaveDB((err, enclaveDB) => {
        if (err) {
          console.log('Error on getting enclave DB');
          return;
        }
        enclaveDB.getRecord(constants.HISTORY_TABLE, pk, (err, record) => {
          if (err) {
            console.log("Could not find record for pk: ", pk);
            return;
          }

          this.navigateToPageTag("drug-details", {
            productData: record
          })
        })
      })
    }

    this.onTagClick("view-details", (model, target, event) => {
      viewDetails(model.pk);
    });

  }
}
