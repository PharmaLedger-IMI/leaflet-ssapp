const {WebcController} = WebCardinal.controllers;
import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";

export default class HistoryController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.model = {products: []}
    this.settingsService = new SettingsService(this.DSUStorage);
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

      this.dbStorage.filter(constants.HISTORY_TABLE, (err, results) => {
        this.settingsService.readSetting("advancedUser", (err, advancedUser) => {
          this.model.advancedUser = !!advancedUser;
          if (err || !results || results.length === 0) {
            this.model.historyIsEmpty = true;
            document.querySelector("#home-page-template").shadowRoot.querySelector(".page-content-container").classList.add("empty-history");
          } else {
            results.map(result => {
              result.advancedView = this.model.advancedUser;
            });
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
      })
    })

  }
}
