import constants from "../../constants.js";

export default class BatchStatusService{
  statusMessage = constants.SN_OK_MESSAGE;
  statusType = "";
  status = "verified";

  checkSNCheck(serialNumber, batchData) {
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
      if (batchData.recalled) {
        this.status = "recalled_batch";
      } else {
        this.status = "recalled_sn";
      }
      this.statusType = "warning";
      this.statusMessage = constants.SN_RECALLED_MESSAGE;
    }

    if (res.decommissionedSerial) {
      this.statusType = "warning";
      this.statusMessage = constants.SN_DECOMMISSIONED_MESSAGE;
      this.status = "decommissioned_sn";
    }

    return res;
  };

  getStatusType(serialNumber, bloomFilterSerialisations) {
    if (typeof serialNumber === "undefined" || typeof bloomFilterSerialisations === "undefined" || bloomFilterSerialisations.length === 0) {
      return false;
    }
    let createBloomFilter;
    try {
      createBloomFilter = require("opendsu").loadAPI("crypto").createBloomFilter;
    } catch (err) {
      return alert(err.message);
    }

    for (let i = bloomFilterSerialisations.length - 1; i >= 0; i--) {
      let bf = createBloomFilter(bloomFilterSerialisations[i].serialisation);
      if (bf.test(serialNumber)) {
        return bloomFilterSerialisations[i].type;
      }
    }

    return undefined;
  }

  getProductStatus(batchData, expiryTime) {
    if (batchData.incorrectDateCheck && !expiryTime) {
      this.statusMessage = constants.PRODUCT_STATUS_FAIL_MESSAGE;
      this.statusType = "error";
      this.status = "incorrect_date";
    } else if (batchData.expiredDateCheck && (!expiryTime || expiryTime< Date.now())) {
      this.statusMessage = constants.PRODUCT_EXPIRED_MESSAGE;
      this.statusType = "error";
      this.status = "expired_date";
    }
  }

  unableToVerify() {
    this.statusMessage = constants.PRODUCT_STATUS_UNABLE_TO_VALIDATE_MESSAGE;
    this.statusType = "error";
    this.status = "invalid_data";
  }
}
