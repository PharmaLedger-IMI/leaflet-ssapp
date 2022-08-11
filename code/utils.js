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
  let batchStatusService = new BatchStatusService(enclaveDB);
  try {
    let leafletInfo = await LeafletInfoService.init(dataObj.gs1Fields, dataObj.networkName);
    leafletInfo.gtinSSI = dataObj.gtinSSI; // this is for gtin only case (ignore batch number)
    productModel = await leafletInfo.getProductClientModel();
    batchModel = await getBatchWithStatus(leafletInfo, batchStatusService, dataObj.gs1Fields)
  } catch (e) {
    console.log("Could not update record. ", e);
    throw e;
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

async function getBatchWithStatus(leafletInfo, batchStatusService, gs1Fields) {
  let batchModel;
  try {
    batchModel = await leafletInfo.getBatchClientModel();
    batchStatusService.getProductStatus(batchModel, gs1Fields);
  } catch (e) {
    await batchStatusService.unableToVerify(batchModel);

  }
  return batchModel;
}

export default {
  getFetchUrl,
  updateRecordData,
  getBatchWithStatus
};
