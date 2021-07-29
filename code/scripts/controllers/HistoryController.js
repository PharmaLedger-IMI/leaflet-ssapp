const {WebcController} = WebCardinal.controllers;
import constants from "../../constants.js";
import getStorageService from "../services/StorageService.js";

export default class HistoryController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.model = {products: [], loadingStatusMessage: "Loading..."}
    this.dbStorage = getStorageService();

    this.on("view-details", (event) => {
      let target = event.target;
      let targetProduct = target.getAttribute("keySSI");
      const index = parseInt(targetProduct.replace(/\D/g, ''));
      let basePath = "/packages/" + this.model.products[index].pk;
      let gtinSSI = this.model.products[index].gtinSSI;
      this.dbStorage.getRecord(constants.HISTORY_TABLE, this.model.products[index].pk, (err, gs1Fields) => {

      this.navigateToPageTag("drug-details", {
          gtinSSI,
          gs1Fields
        })
      });
    }, {capture: true});


    //get all records from history table

    this.dbStorage.filter(constants.HISTORY_TABLE, (err, results) => {
      if (err || !results || results.length === 0) {
        this.model.loadingStatusMessage = "You have not scanned any valid products previously. Kindly click on the scan button below to scan.";
      }
      this.model.products = results;
    })

  }
}
