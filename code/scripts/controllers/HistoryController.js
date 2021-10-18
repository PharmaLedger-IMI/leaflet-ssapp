const {WebcController} = WebCardinal.controllers;
const {DataSource} = WebCardinal.dataSources;
import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";
import BatchStatusService from "../services/BatchStatusService.js";
import utils from "../../utils.js";
import DSUDataRetrievalService from "../services/DSUDataRetrievalService/DSUDataRetrievalService.js";

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
            let batchStatusService = new BatchStatusService();
            try {
              let dsuDataRetrievalService = new DSUDataRetrievalService(result.gtinSSI);
              batchData = await dsuDataRetrievalService.readAsyncBatchData();

              batchStatusService.checkSNCheck(result.gs1Fields.serialNumber, batchData);
              batchData.expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(batchData.expiry);
              batchData.expiryForDisplay = batchData.expiryForDisplay.slice(0, 2) === "00" ? batchData.expiryForDisplay.slice(5) : batchData.expiryForDisplay;
              let expiryCheck = result.expiryForDisplay === batchData.expiryForDisplay;
              let expiryTime;
              let expireDateConverted;
              let expiryForDisplay = utils.getDateForDisplay(result.gs1Fields.expiry);
              if (result.gs1Fields.expiry.slice(0, 2) === "00") {
                expireDateConverted = utils.convertToLastMonthDay(result.gs1Fields.expiry);
              } else {
                expireDateConverted = expiryForDisplay.replaceAll(' ', '');
              }

              try {
                expiryTime = new Date(expireDateConverted).getTime();
              } catch (err) {
                // do nothing
              }
              const currentTime = Date.now();
              if (!expiryCheck || (expiryTime && expiryTime < currentTime)) {
                batchStatusService.getProductStatus(batchData);
              }
            } catch (e) {
              batchStatusService.unableToVerify();
            }

            result.status = batchStatusService.status;
            result.statusMessage = batchStatusService.statusMessage;
            const pk = utils.getRecordPKey(result.gtinSSI, result.gs1Fields);
            this.dbStorage.updateRecord(constants.HISTORY_TABLE, pk, result, (err, record) => {

            });
          }
          result.advancedView = this.advancedUser;
        }
        products = results;
      }
    } catch (e) {
      console.log('Error on getting async page data: ', e);
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
    //get all records from history table


  }
}
