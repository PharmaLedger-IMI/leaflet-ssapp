import constants from "../../constants.js";
import SettingsService from "../services/SettingsService.js";

const {WebcController} = WebCardinal.controllers;
const gtinResolver = require("gtin-resolver");
const utils = gtinResolver.utils;

export default class AuthFeatureController extends WebcController {
  constructor(element, history, ...args) {
    super(element, history, ...args);
    // if (!history.location.state)
    //   return console.log(`ERROR: No state found for Auth Feature`);
    // const {ssi, gs1Fields, gtinSSI, acdc, networkName} = history.location.state;
    const {ssi, gs1Fields, gtinSSI, acdc, networkName} = this.model;
    gs1Fields.domain = networkName;
    let dbApi = require("opendsu").loadApi("db");
    dbApi.getMainEnclaveDB(async (err, enclaveDB) => {
      if (err) {
        console.log('Error on getting enclave DB');
        return;
      }
      this.dbStorage = enclaveDB;
      this.settingsService = new SettingsService(enclaveDB);
      this.acdc = require('acdc').ReportingService.getInstance(this.settingsService);
    })

    this.on('windowAction', this.receiveAuthResponse.bind(this));
  }

  receiveAuthResponse(evt) {
    evt.preventDefault();
    evt.stopImmediatePropagation();
    const authResponse = evt.detail;
    const self = this;

    self.storeResults(authResponse, (err) => {
      if (err)
        console.log(`Failed to store auth feature results`);
      self.report(authResponse, (err) => {
        if (err)
          console.log(`failure to report to acdc`);
        self.returnToDetails(authResponse);
      });
    });
  }

  returnToDetails(authResponse) {
    this.model.ssi = ''
    const acdc = Object.assign({}, this.model.acdc, {
      authResponse: authResponse
    })
    
    const result = {
      gs1Fields: Object.assign({}, this.model.gs1Fields),
      gtinSSI: this.model.gtinSSI,
      acdc: acdc
    }
    
    // Since this is now a modal, I dont really know how I should return these results back to the Main Application.
    // This was the former way
    // this.navigateToPageTag('drug-details', results);
    
    // You could use an event... but regardless, the scanning and validation is done, the report has been sent. all is good
    
    // So now I just close the modal and log the results... 
    const modal = this.element.closest('webc-modal');
    
    if (!modal)
      console.errors("This should be impossible...");
    modal.hide().then(_ => console.log("Results of Auth Feature:\n" + JSON.stringify(result, undefined, 2)))
    
  }

  storeResults(authResponse, callback) {
    const self = this;
    const pk = utils.getRecordPKey(self.model.gtinSSI, Object.assign({}, self.model.gs1Fields));
    self.dbStorage.getRecord(constants.HISTORY_TABLE, pk, (err, record) => {
      if (err)
        return callback(err);
      record.acdc = Object.assign(record.acdc || {}, {
        authResponse: authResponse
      });

      self.dbStorage.updateRecord(constants.HISTORY_TABLE, pk, record, (err) => {
        if (err)
          return callback(err);
        callback(undefined);
      });
    });
  }

  report(authResponse, callback) {
    const evt = this.acdc.createScanEvent(Object.assign({}, this.model.gs1Fields, {
      previousScan: this.model.acdc ? this.model.acdc.eventId : undefined,
      authResponse: authResponse,
      batchDsuStatus: this.model.acdc.batchDsuStatus,
      productDsuStatus: this.model.acdc.productDsuStatus
    }));
    evt.report((err) => {
      if (err)
        console.log(`failed to report to acdc`, err);
      callback();
    });
  }
}
