const {WebcController} = WebCardinal.controllers;
import utils from "../../utils.js";
import DSUDataRetrievalService from "../services/DSUDataRetrievalService/DSUDataRetrievalService.js";
import constants from "../../constants.js";
import XMLDisplayService from "../services/XMLDisplayService/XMLDisplayService.js";
import BatchStatusService from "../services/BatchStatusService.js";

export default class DrugDetailsController extends WebcController {
  constructor(element, history) {
    super(element, history);
    this.model = {
      serialNumberLabel: constants.SN_LABEL,
      statusMessage: constants.SN_OK_MESSAGE,
      packageVerification: "Action required",
      showVerifyPackageButton: true,
      showReportButton: true,
      showAddToCabinetButton: true,
      serialNumber: "",
      showSmpc: false,
      showLeaflet: false,
      epiColumns: 0,
      displayStatus: false,
    };

    if (typeof history.location.state !== "undefined") {
      this.gtinSSI = history.location.state.productData.gtinSSI;
      this.gs1Fields = history.location.state.productData.gs1Fields;
      this.model.serialNumber = this.gs1Fields.serialNumber === "0" ? "-" : this.gs1Fields.serialNumber;
      this.model.gtin = this.gs1Fields.gtin;
      this.model.batchNumber = this.gs1Fields.batchNumber;
      this.model.expiryForDisplay = history.location.state.productData.expiryForDisplay
      this.model.expiryTime = history.location.state.productData.expiryTime;
      this.model.product = history.location.state.productData.product;
      this.model.batch = history.location.state.productData.batch;
      this.model.statusType = history.location.state.productData.statusType;
      this.model.statusMessage = history.location.state.productData.statusMessage;
      this.model.snCheck = history.location.state.productData.snCheck;
    } else {
      console.log("Undefined product data");
      this.updateUIInGTINOnlyCase("Undefined product data")
      return
    }

    this.dsuDataRetrievalService = new DSUDataRetrievalService(this.gtinSSI);
    this.batchStatusService = new BatchStatusService();
    const smpcDisplayService = new XMLDisplayService(this.DSUStorage, element, this.gtinSSI, "smpc", "smpc.xml", this.model);
    const leafletDisplayService = new XMLDisplayService(this.DSUStorage, element, this.gtinSSI, "leaflet", "smpc.xml", this.model);

    smpcDisplayService.isXmlAvailable();
    leafletDisplayService.isXmlAvailable();

    if (typeof this.model.batch === "undefined") {
      this.updateUIInGTINOnlyCase();
      if (this.model.product.gtin && this.model.product.showEPIOnUnknownBatchNumber) {
        this.model.showEPI = true;
        this.querySelector(".subheader-container").classList.add("showEpi");
      }
    }

    if (this.model.batch.defaultMessage || this.model.batch.recalled) {
      this.showModalFromTemplate('batch-info-message', () => {
      }, () => {
      }, {
        model: {
          title: "Note",
          recallMessage: this.model.batch.recalled ? this.model.batch.recalledMessage : "",
          defaultMessage: this.model.batch.defaultMessage
        },
        disableExpanding: true,
        disableFooter: true
      });
    }
    let expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(this.model.batch.expiry);
    if (expiryForDisplay.slice(0, 2) === "00") {
      expiryForDisplay = expiryForDisplay.slice(5);
    }
    let expiryCheck = this.model.expiryForDisplay === expiryForDisplay;

    const currentTime = Date.now();
    this.model.showEPI = this.leafletShouldBeDisplayed(this.model.product, this.model.batch, this.model.snCheck, expiryCheck, currentTime, this.model.expiryTime);
    if (this.model.showEPI) {
      this.querySelector(".subheader-container").classList.add("showEpi");
    }


    if (this.model.statusMessage !== constants.SN_OK_MESSAGE) {
      this.model.displayStatus = true;
    } else {
      this.model.displayStatus = false;
    }

    this.onTagClick("click-verified", () => {
      this.showModalFromTemplate('batch-info', () => {
      }, () => {
      }, {
        model: {
          title: "Batch Info",
          expiryForDisplay: this.model.expiryForDisplay,
          serialNumber: this.model.serialNumber,
          gtin: this.model.gtin,
          batchNumber: this.model.batchNumber
        },
        disableExpanding: true,
        disableFooter: true
      });
    })
  }

  updateUIInGTINOnlyCase(message) {
    let msg = message || "The batch number in the barcode could not be found";
    this.displayModal(msg, " ");
    this.batchStatusService.unableToVerify();
    this.model.statusMessage = this.batchStatusService.statusMessage;
    this.model.statusType = this.batchStatusService.statusType;
    this.model.packageVerification = constants.PACK_VERIFICATION_UNABLE_TO_VERIFY_MESSAGE;
  }

  leafletShouldBeDisplayed(product, batchData, snCheck, expiryCheck, currentTime, expiryTime) {
    //fix for the missing case describe here: https://github.com/PharmaLedger-IMI/epi-workspace/issues/167
    if (batchData.serialCheck && !snCheck.validSerial && !snCheck.recalledSerial && !snCheck.decommissionedSerial && product.showEPIOnSNUnknown) {
      return true;
    }

    if (batchData.serialCheck && typeof this.model.serialNumber === "undefined" && product.showEPIOnSNUnknown) {
      return true;
    }

    if (batchData.serialCheck && snCheck.recalledSerial && (product.showEPIOnBatchRecalled || product.showEPIOnSNRecalled)) {
      return true;
    }

    if (batchData.serialCheck && snCheck.decommissionedSerial && product.showEPIOnSNDecommissioned) {
      return true;
    }

    if (!batchData.expiredDateCheck && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && !batchData.incorrectDateCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.incorrectDateCheck && !expiryCheck && !batchData.serialCheck && product.showEPIOnIncorrectExpiryDate && !batchData.serialCheck) {
      return true;
    }

    if (!batchData.expiredDateCheck && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && batchData.incorrectDateCheck && expiryCheck && !batchData.serialCheck) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial && batchData.recalled && product.showEPIOnBatchRecalled) {
      return true;
    }

    if (batchData.expiredDateCheck && currentTime < expiryTime && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial && !batchData.recalled) {
      return true;
    }

    if (batchData.expiredDateCheck && expiryTime < currentTime && product.showEPIOnBatchExpired && batchData.incorrectDateCheck && expiryCheck
      && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (batchData.incorrectDateCheck && !expiryCheck && product.showEPIOnIncorrectExpiryDate && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (!batchData.expiredDateCheck && !batchData.incorrectDateCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    if (!batchData.expiredDateCheck && batchData.incorrectDateCheck && expiryCheck && batchData.serialCheck && snCheck.validSerial) {
      return true;
    }

    return false;
  }
}
