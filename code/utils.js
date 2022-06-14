import BatchStatusService from "./scripts/services/BatchStatusService.js";
import constants from "./constants.js";
const gtinResolver = require("gtin-resolver");
const LeafletInfoService = gtinResolver.LeafletInfoService;

function getFetchUrl(relativePath) {
  if (window["$$"] && $$.SSAPP_CONTEXT && $$.SSAPP_CONTEXT.BASE_URL && $$.SSAPP_CONTEXT.SEED) {
    // if we have a BASE_URL then we prefix the fetch url with BASE_URL
    return `${new URL($$.SSAPP_CONTEXT.BASE_URL).pathname}${
      relativePath.indexOf("/") === 0 ? relativePath.substring(1) : relativePath
    }`;
  }
  return relativePath;
}

async function updateRecordData(enclaveDB, dataObj) {

  let productModel;
  let batchModel;
  let batchStatusService = new BatchStatusService();
  try {
    let leafletInfo = await LeafletInfoService.init(dataObj.gs1Fields, dataObj.networkName);
    leafletInfo.gtinSSI = dataObj.gtinSSI; // this is for gtin only case (ignore batch number)
    productModel = await leafletInfo.getProductClientModel();
    try {
      batchModel = await leafletInfo.getBatchClientModel();
      batchStatusService.getProductStatus(batchModel, dataObj.gs1Fields);
    } catch (e) {
      batchStatusService.unableToVerify();
    }
  } catch (e) {
    console.log("Could not update record. ", e);
    return;
  }

  dataObj.status = batchStatusService.status;
  dataObj.statusMessage = batchStatusService.statusMessage;
  dataObj.statusType = batchStatusService.statusType;
  dataObj.expiryForDisplay = batchStatusService.expiryForDisplay;
  dataObj.expiryTime = batchStatusService.expiryTime;
  dataObj.snCheck = batchStatusService.snCheck;
  dataObj.product = productModel;
  dataObj.batch = batchModel;
  let result = await $$.promisify(enclaveDB.updateRecord)(constants.HISTORY_TABLE, dataObj.pk, dataObj)
  return result;
}

export default {
  getFetchUrl,
  updateRecordData
};
