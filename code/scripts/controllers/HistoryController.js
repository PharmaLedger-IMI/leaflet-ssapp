const {WebcController} = WebCardinal.controllers;
import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";
import BatchStatusService from "../services/BatchStatusService.js";
import utils from "../../utils.js";
import DSUDataRetrievalService from "../services/DSUDataRetrievalService/DSUDataRetrievalService.js";


export default class HistoryController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.model = {products: []}
    this.settingsService = new SettingsService(this.DSUStorage);
    this.batchStatusService = new BatchStatusService();
    let dbApi = require("opendsu").loadApi("db");

    dbApi.getMainEnclaveDB((err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }
      this.dbStorage = enclaveDB;
      this.onTagClick("view-details", (model, target, event) => {
        let gtinSSI = model.gtinSSI;
        this.dbStorage.getRecord(constants.HISTORY_TABLE, model.pk, (err, gs1Fields) => {

          this.navigateToPageTag("drug-details", {
            gtinSSI,
            gs1Fields
          })
        });
      }, {capture: true});


      //get all records from history table
      this.settingsService.readSetting("advancedUser", (err, advancedUser) => {
        this.model.advancedUser = !!advancedUser;

        this.dbStorage.filter(constants.HISTORY_TABLE, async (err, results) => {
          if (err || !results || results.length === 0) {
            this.model.historyIsEmpty = true;
            document.querySelector("#home-page-template").shadowRoot.querySelector(".page-content-container").classList.add("empty-history");
          } else {
            for (let result of results) {
              let batchData
              try {
                batchData = await this.getBatchData(result.gtinSSI);
                this.batchStatusService.checkSNCheck(result.serialNumber, batchData);
                batchData.expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(batchData.expiry);
                batchData.expiryForDisplay = batchData.expiryForDisplay.slice(0, 2) === "00" ? batchData.expiryForDisplay.slice(5) : batchData.expiryForDisplay;
                let expiryCheck = result.expiryForDisplay === batchData.expiryForDisplay;
                let expiryTime;
                let expireDateConverted;
                let expiryForDisplay = utils.getDateForDisplay(result.expiry);
                if (result.expiry.slice(0, 2) === "00") {
                  expireDateConverted = utils.convertToLastMonthDay(result.expiry);
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
                  this.batchStatusService.getProductStatus(batchData);
                }
              } catch (e) {
                this.batchStatusService.unableToVerify();
              }

              result.status = this.batchStatusService.status;
              result.statusMessage = this.batchStatusService.statusMessage;
              result.advancedView = this.model.advancedUser;

            }
            this.model.historyIsEmpty = false;
            this.model.lastScannedProduct = results.pop();
            if (results.length > 0) {
              this.model.products = results;
            }
          }
          if (this.querySelector(".content")) {
            this.querySelector(".content").hidden = false;
          }
        })
      });
    })

  }

  async getBatchData(gtinSSI) {
    return new Promise(function (resolve, reject) {
      let dsuDataRetrievalService = new DSUDataRetrievalService(gtinSSI);
      dsuDataRetrievalService.readBatchData((err, batchData) => {
        if (err || typeof batchData === "undefined") {
          return reject();
        }
        return resolve(batchData)
      })
    })
  }
}
