import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";
import DSUDataRetrievalService from "../services/DSUDataRetrievalService/DSUDataRetrievalService.js";
import constants from "../../constants.js";
import XMLDisplayService from "../services/XMLDisplayService/XMLDisplayService.js";

export default class DrugDetailsController extends ContainerController {
  constructor(element, history) {
    super(element, history);
    this.setModel({
      serialNumberVerification: constants.SN_OK_MESSAGE,
      productStatus: constants.PRODUCT_STATUS_OK_MESSAGE,
      packageVerification: "Action required",
      displayItems: 3
    });

    this.model.SNCheckIcon = ""

    if (typeof history.location.state !== "undefined") {
      this.gtinSSI = history.location.state.gtinSSI;
      this.gs1Fields = history.location.state.gs1Fields;
      this.model.serialNumber = this.gs1Fields.serialNumber === "0" ? "-" : this.gs1Fields.serialNumber;
      this.model.gtin = this.gs1Fields.gtin;
      this.model.batchNumber = this.gs1Fields.batchNumber;
      this.model.expiryForDisplay = this.gs1Fields.expiry;
    }

    const basePath = utils.getMountPath(this.gtinSSI, this.gs1Fields);
    this.dsuDataRetrievalService = new DSUDataRetrievalService(this.DSUStorage, this.gtinSSI, basePath);
    this.model.SNCheckIcon = constants.SN_OK_ICON;
    this.setColor('serialNumberVerification', '#7eba7e');

    this.model.PSCheckIcon = constants.PRODUCT_STATUS_OK_ICON;
    this.setColor('productStatusVerification', '#7eba7e');

    this.model.PVIcon = constants.PACK_VERIFICATION_ICON;
    this.setColor('packageVerification', 'orange');

    const smpcDisplayService = new XMLDisplayService(this.DSUStorage, element, this.gtinSSI, basePath, "smpc", "smpc.xml", this.model);
    smpcDisplayService.isXmlAvailable()

    this.on("view-leaflet", () => {
      history.push({
        pathname: `${new URL(history.win.basePath).pathname}leaflet`,
        state: {
          gtinSSI: this.gtinSSI,
          gs1Fields: this.gs1Fields
        }
      });
    });

    element.querySelectorAll("[disabled]").forEach(node => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true)
    });

    this.on("view-smpc", () => {
      history.push({
        pathname: `${new URL(history.win.basePath).pathname}smpc`,
        state: {
          gtinSSI: this.gtinSSI,
          gs1Fields: this.gs1Fields
        }
      });
    });

    this.on("report", () => {
      history.push({
        pathname: `${new URL(history.win.basePath).pathname}report`,
        state: {
          gtinSSI: this.gtinSSI,
          gs1Fields: this.gs1Fields
        }
      });
    });

    this.dsuDataRetrievalService.readProductData((err, product) => {
      if (err) {
        return console.log(err);
      }

      if (typeof product === "undefined") {
        return;
      }

      this.model.product = product;

      this.dsuDataRetrievalService.readBatchData((err, batchData) => {
        if (err || typeof batchData === "undefined") {
          this.updateUIInGTINOnlyCase();
          return console.log(err);
        }

        //serial number data validation item is not displayed
        if (!batchData.serialCheck) {
          this.model.displayItems--;
          this.element.querySelector("#serial-number-validation-item").hidden = true;
        }
        //expiration date validation item is not displayed
        if (!batchData.incorectDateCheck && !batchData.expiredDateCheck) {
          this.model.displayItems--;
          this.element.querySelector("#date-validation-item").hidden = true;
        }

        if (batchData.defaultMessage || batchData.recalled) {
          this.displayConfigurableModal({
            title: "Important notes!!!",
            modalName: "batchInfoModal",
            modalContent: {
              recallMessage: batchData.recalled ? batchData.recalledMessage : "",
              defaultMessage: batchData.defaultMessage
            }
          })
        }

        let checkSNCheck = () => {
          let res;
          try {
            res = {
              validSerial: this.serialNumberIsInBloomFilter(this.model.serialNumber, batchData.bloomFilterSerialisations),
              recalledSerial: this.serialNumberIsInBloomFilter(this.model.serialNumber, batchData.bloomFilterRecalledSerialisations) || batchData.recalled,
              decommissionedSerial: this.serialNumberIsInBloomFilter(this.model.serialNumber, batchData.bloomFilterDecommissionedSerialisations),
            };
          } catch (err) {
            console.log("Error", err);
            return alert(err.message);
          }
          return res;
        };
        const showError = (message) => {
          this.model.serialNumberVerification = message;
          this.model.SNCheckIcon = constants.SN_FAIL_ICON;
          this.setColor('serialNumberVerification', 'red');
        }
        batchData.expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(batchData.expiry);
        this.model.batch = batchData;
        let snCheck = checkSNCheck();
        let expiryCheck = this.model.expiryForDisplay != batchData.expiryForDisplay;
        if (snCheck.recalledSerial) {
          showError(constants.SN_RECALLED_MESSAGE);
          return;
        }
        if (snCheck.decommissionedSerial) {
          showError(constants.SN_DECOMMISSIONED_MESSAGE + ' reason: ' + batchData.decommissionReason);
          return;
        }
        if (!snCheck.validSerial && batchData.serialCheck) {
          showError(constants.SN_FAIL_MESSAGE)
        }

        if (expiryCheck && batchData.incorectDateCheck) {
          this.model.productStatus = constants.PRODUCT_STATUS_FAIL_MESSAGE;
          this.model.PSCheckIcon = constants.PRODUCT_STATUS_FAIL_ICON;
          this.setColor('productStatusVerification', 'red');
          return;
        }

        const expiryTime = new Date(batchData.expiryForDisplay.replaceAll(' ', '')).getTime();
        const currentTime = Date.now();
        console.log(currentTime, expiryTime);
        if (expiryTime < currentTime && batchData.expiredDateCheck) {
          this.model.productStatus = constants.PRODUCT_EXPIRED_MESSAGE;
          this.model.PSCheckIcon = constants.PRODUCT_STATUS_FAIL_ICON;
          this.setColor('productStatusVerification', 'red');
        }
        this.model.showLeaflet = false;
        if (snCheck.recalledSerial) {
          this.model.showLeaflet = product.show_ePI_on_batch_recalled || product.show_ePI_on_sn_recalled === true
        }
        if (snCheck.decommissionedSerial) {
          this.model.showLeaflet = product.show_ePI_on_sn_decommissioned === true
        }
        if (this.model.serialNumber === "undefined") {
          this.model.showLeaflet = product.show_ePI_on_sn_unknown === true
        }
        if (batchData.incorrectDateCheck) {
          this.model.showLeaflet = product.show_ePI_on_incorrect_expiry_date === true;
        }
        if (batchData.expiredDateCheck) {
          this.model.showLeaflet = product.show_ePI_on_batch_expired === true;
        }

      });
    });
  }

  updateUIInGTINOnlyCase() {
    const title = "The batch number in the barcode cannot be found."
    const message = "You are being provided with the latest leaflet.";
    this.displayModal(title + " " + message, " ");
    this.model.serialNumberVerification = constants.SN_UNABLE_TO_VERIFY_MESSAGE;
    this.model.SNCheckIcon = constants.SN_GRAY_ICON
    this.model.productStatus = constants.PRODUCT_STATUS_UNABLE_TO_VALIDATE_MESSAGE;
    this.model.PSCheckIcon = constants.PRODUCT_STATUS_GRAY_ICON;
    this.model.packageVerification = constants.PACK_VERIFICATION_UNABLE_TO_VERIFY_MESSAGE;
    this.model.PVIcon = constants.PACK_VERIFICATION_GRAY_ICON;

    this.setColor("serialNumberVerification", "#cecece");
    this.setColor("productStatusVerification", "#cecece");
    this.setColor("packageVerification", "#cecece");
  }

  setColor(id, color) {
    let el = this.element.querySelector('#' + id);
    el.style.color = color;
  }

  serialNumberIsInBloomFilter(serialNumber, bloomFilterSerialisations) {
    let createBloomFilter;
    try {
      createBloomFilter = require("opendsu").loadAPI("crypto").createBloomFilter;
    } catch (err) {
      console.log("Error when requiring bloom filter");
      return alert(err.message);
    }

    for (let i = 0; i < bloomFilterSerialisations.length; i++) {
      let bf = createBloomFilter(bloomFilterSerialisations[i]);
      if (bf.test(serialNumber)) {
        return true;
      }
    }

    return false;
  }
}
