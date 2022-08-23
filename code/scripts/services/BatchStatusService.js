import constants from "../../constants.js";
import SettingsService from "./SettingsService.js";

const gtinResolver = require("gtin-resolver");
const utils = gtinResolver.utils;

export default class BatchStatusService {
  constructor(enclaveDB) {
    this.statusMessage = constants.SN_OK_MESSAGE;
    this.statusType = "";
    this.status = "verified";
    this.expiryForDisplay = null;
    this.snCheck = null;
    this.expiryTime = null;
    this.enclaveDB = enclaveDB
  }


  checkSNCheck(batchData, serialNumber) {
    let res = {
      validSerial: false,
      recalledSerial: false,
      decommissionedSerial: false
    };
    const statusType = this.getStatusType(serialNumber, batchData.bloomFilterSerialisations);
    switch (statusType) {
      case "valid":
        res.validSerial = true;
        break;
      case "recalled":
        res.recalledSerial = true;
        break;
      case "decommissioned":
        res.decommissionedSerial = true;
        break;
      default:
        if (batchData.recalled) {
          res.recalledSerial = true;
          this.statusType = "warning";
        }
    }
    if (!res.validSerial && batchData.serialCheck) {
      this.statusType = "error";
      this.statusMessage = constants.SN_FAIL_MESSAGE;
      this.status = "invalid_sn"
    }

    if (res.recalledSerial) {
      this.status = "recalled_sn";
      this.statusType = "warning";
      this.statusMessage = constants.SN_RECALLED_MESSAGE;
    }

    if (res.decommissionedSerial) {
      this.statusType = "warning";
      this.statusMessage = constants.SN_DECOMMISSIONED_MESSAGE;
      this.status = "decommissioned_sn";
    }

    if (batchData.recalled) {
      this.status = "recalled_batch";
      this.statusType = "warning";
      this.statusMessage = constants.BATCH_RECALLED_MESSAGE;
    }
    this.snCheck = res;
  };

  getStatusType(serialNumber, bloomFilterSerialisations) {
    if (typeof serialNumber === "undefined" || typeof bloomFilterSerialisations === "undefined" || bloomFilterSerialisations.length === 0) {
      return false;
    }
    let createBloomFilter;
    try {
      createBloomFilter = require("opendsu").loadAPI("crypto").createBloomFilter;
    } catch (err) {
      console.log("Could not create bloomfilter ", err);
      return false;
    }

    for (let i = bloomFilterSerialisations.length - 1; i >= 0; i--) {
      let bf = createBloomFilter(bloomFilterSerialisations[i].serialisation);
      if (bf.test(serialNumber)) {
        return bloomFilterSerialisations[i].type;
      }
    }

    return undefined;
  }

  getProductStatus(batchData, gs1Fields) {

    this.checkSNCheck(batchData, gs1Fields.serialNumber);
    if (batchData.incorrectDateCheck || batchData.expiredDateCheck) {
      try {
        this.expiryForDisplay = utils.getDateForDisplay(gs1Fields.expiry);

        if (gs1Fields.expiry.slice(0, 2) === "00") {
          this.normalizedExpiryDate = utils.convertToLastMonthDay(gs1Fields.expiry);
        } else {
          this.normalizedExpiryDate = this.expiryForDisplay.replaceAll(' ', '');
        }

        this.expiryTime = new Date(this.normalizedExpiryDate).getTime();
      } catch (err) {
        // do nothing

      }
      if (batchData.incorrectDateCheck && (!this.expiryTime || utils.convertFromGS1DateToYYYY_HM(batchData.expiry) !== gs1Fields.expiry)) {
        this.statusMessage = constants.PRODUCT_STATUS_FAIL_MESSAGE;
        this.statusType = "error";
        this.status = "incorrect_date";
      } else if (batchData.expiredDateCheck && (!this.expiryTime || this.expiryTime < Date.now())) {
        this.statusMessage = constants.PRODUCT_EXPIRED_MESSAGE;
        this.statusType = "error";
        this.status = "expired_date";
      }
    }
  }

  async unableToVerify(batch) {
    //for unknown batch (gtin-only case) show error status just for advanced users
    this.settingsService = new SettingsService(this.enclaveDB);
    let advancedUser = await this.settingsService.asyncReadSetting("advancedUser");
    this.advancedUser = !!advancedUser;
    if (advancedUser) {
      this.statusMessage = constants.PRODUCT_STATUS_UNABLE_TO_VALIDATE_MESSAGE;
      this.statusType = "error";
      this.status = "invalid_data"
    } else {
      if (batch) {
        this.statusMessage = constants.PRODUCT_STATUS_UNABLE_TO_VALIDATE_MESSAGE;
        this.statusType = "error";
        this.status = "invalid_data"
      } else {
        this.statusMessage = constants.SN_OK_MESSAGE;
        this.statusType = "valid";
        this.status = "invalid_batch";
      }
    }

  }
}
