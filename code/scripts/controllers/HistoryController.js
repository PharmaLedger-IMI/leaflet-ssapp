import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";
import BatchStatusService from "../services/BatchStatusService.js";

const gtinResolver = require("gtin-resolver");
const utils = gtinResolver.utils;
const LeafletInfoService = gtinResolver.LeafletInfoService;

const {WebcController} = WebCardinal.controllers;
const {DataSource} = WebCardinal.dataSources;

class HistoryDataSource extends DataSource {
  constructor(...props) {
    super(...props);
    this.setPageSize(8);
    this.groups = {}
  }

  async getPageDataAsync(startOffset, dataLengthForCurrentPage) {
    let dbApi = require("opendsu").loadApi("db");
    this.enclaveDB = await $$.promisify(dbApi.getMainEnclaveDB)();
    this.settingsService = new SettingsService(this.enclaveDB);
    let products = [];
    let advancedUser = await this.settingsService.asyncReadSetting("advancedUser");
    this.advancedUser = !!advancedUser;
    let refreshPeriod = await this.settingsService.asyncReadSetting("refreshPeriod");
    this.secondsToUpdate = refreshPeriod || constants.DEFAULT_REFRESH_PERIOD;

    try {

      let results = await $$.promisify(this.enclaveDB.filter)(constants.HISTORY_TABLE, "createdAt > 0", "dsc");
      this.setRecordsNumber(results.length);
      if (results && results.length > 0) {
        if (document.querySelector(".datatable-title") && document.querySelector(".datatable-title").hidden) {
          document.querySelector(".datatable-title").hidden = false;
        }
        results = results.slice(startOffset, startOffset + dataLengthForCurrentPage);
        for (let result of results) {
          if (Date.now() - result['__timestamp'] > this.secondsToUpdate * 1000) {
            result = await this.updateRecordData(result);
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
    for (let product of products) {
      let date = product.createdAt.slice(0, 7);
      product.statusMessage = this.translate(product.statusMessage);
      if (!this.groups[date]) {
        this.groups[date] = [];
        product.firstGroupItem = true;
      } else {
        product.firstGroupItem = false;
      }

      let humanDate = utils.convertFromISOtoYYYY_HM(product.createdAt.split('T')[0], true, "");
      let month = this.translate(humanDate.slice(4).slice(0, -6));
      product.groupDate = `${month} ${humanDate.slice(-4)}`;
      let timeLabel = this.translate("ago");
      let sinceTime = utils.getTimeSince(product.createdAt);
      if (sinceTime) {
        let timeNr = this.translate(sinceTime.split(" ")[0]);
        let translatedUnit = this.translate(sinceTime.split(" ")[1]);
        product.timeFrameOrDate = `${timeNr} ${translatedUnit} ${timeLabel}`
      } else {
        product.timeFrameOrDate = humanDate;
      }
      this.groups[date].push(product);
    }
    return products;
  }

  async updateRecordData(dataObj) {

    let productModel;
    let batchModel;
    let batchStatusService = new BatchStatusService();
    try {
      let leafletInfo = await LeafletInfoService.init(dataObj.gs1Fields, dataObj.networkName);
      productModel = await leafletInfo.getProductClientModel();
      batchModel = await leafletInfo.getBatchClientModel();
    } catch (e) {
      console.log("Could not update record. ", e);
      return;
    }
    try {
      batchStatusService.getProductStatus(batchModel, dataObj.gs1Fields);
    } catch (e) {
      batchStatusService.unableToVerify();
    }

    dataObj.status = batchStatusService.status;
    dataObj.statusMessage = batchStatusService.statusMessage;
    dataObj.statusType = batchStatusService.statusType;
    dataObj.expiryForDisplay = batchStatusService.expiryForDisplay;
    dataObj.expiryTime = batchStatusService.expiryTime;
    dataObj.snCheck = batchStatusService.snCheck;
    dataObj.product = productModel;
    dataObj.batch = batchModel;
    let result = await $$.promisify(this.enclaveDB.updateRecord)(constants.HISTORY_TABLE, dataObj.pk, dataObj)
    return result;
  }

}

export default class HistoryController extends WebcController {
  constructor(...props) {
    super(...props);

    this.model = {
      productsDataSource: new HistoryDataSource({useInfiniteScroll: true})
    }
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }

      const {productsDataSource} = this.model;
      let settingsService = new SettingsService(enclaveDB);
      let appLang = await settingsService.asyncReadSetting("preferredLanguage");
      this.applySkinForCurrentPage(appLang);
      this.setSkin(appLang);
      settingsService.readSetting("refreshPeriod", (err, refreshPeriod) => {
        if (err || !refreshPeriod) {
          refreshPeriod = constants.DEFAULT_REFRESH_PERIOD;
        }
        setInterval(() => {
          productsDataSource.goToPageByIndex(productsDataSource.getCurrentPageIndex())
        }, refreshPeriod * 1000)
      });
      this.onTagClick("view-details", (model, target, event) => {

        enclaveDB.getRecord(constants.HISTORY_TABLE, model.pk, async (err, record) => {
          if (err) {
            console.log("Could not find record for pk: ", pk);
            return;
          }
          let drugDetails = await productsDataSource.updateRecordData(record);
          this.navigateToPageTag("drug-details", {
            productData: drugDetails.pk
          })
        })
      });
    })
  }
}
