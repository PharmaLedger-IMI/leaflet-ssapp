import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";
import DSUDataRetrievalService from "../services/DSUDataRetrievalService/DSUDataRetrievalService.js";
import constants from "../../constants.js";
export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({
            serialNumberVerification: constants.SN_OK_MESSAGE,
            productStatus: constants.PRODUCT_STATUS_OK_MESSAGE,
            packageVerification: "Action required"
        });

        this.model.SNCheckIcon = ""

        if (typeof history.location.state !== "undefined") {
            this.gtinSSI = history.location.state.gtinSSI;
            this.gs1Fields = history.location.state.gs1Fields;
            this.model.serialNumber = this.gs1Fields.serialNumber;
            this.model.gtin = this.gs1Fields.gtin;
            this.model.batchNumber = this.gs1Fields.batchNumber;
            this.model.expiryForDisplay = this.gs1Fields.expiry;
        }

        const basePath = utils.getMountPath(this.gtinSSI, this.gs1Fields);
        this.dsuDataRetrievalService = new DSUDataRetrievalService(this.DSUStorage, this.gtinSSI, basePath);
        this.model.SNCheckIcon = constants.SN_OK_ICON;
        this.model.PSCheckIcon = constants.PRODUCT_STATUS_OK_ICON;

        this.on("view-leaflet", () => {
            history.push({
                pathname: `${new URL(history.win.basePath).pathname}leaflet`,
                state: {
                    gtinSSI: this.gtinSSI,
                    gs1Fields: this.gs1Fields
                }
            });
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


        this.dsuDataRetrievalService.readProductData((err, product) => {
            if (err) {
                return console.log(err);
            }

            this.model.product = product;

            this.dsuDataRetrievalService.readBatchData((err, batchData) => {
                if (err) {
                    this.model.serialNumberVerification = constants.SN_FAIL_MESSAGE;
                    this.model.SNCheckIcon = constants.SN_FAIL_ICON
                    this.model.productStatus = constants.PRODUCT_STATUS_FAIL_MESSAGE;
                    this.model.PSCheckIcon = constants.PRODUCT_STATUS_FAIL_ICON;
                    return console.log(err);
                }

                let checkSNCheck = () => {
                    let res = false;
                    try {
                        let bloomFilter = require("opendsu").loadAPI("crypto").createBloomFilter(batchData.bloomFilterSerialisation);
                        res = bloomFilter.test(this.model.serialNumber);
                    } catch (err) {
                        alert(err.message);
                    }
                    return res;
                };

                batchData.expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(batchData.expiry);
                this.model.batch = batchData;
                let snCheck = checkSNCheck();
                let expiryCheck = this.model.expiryForDisplay != batchData.expiryForDisplay;
                if (!snCheck) {
                    this.model.serialNumberVerification = constants.SN_FAIL_MESSAGE;
                    this.model.SNCheckIcon = constants.SN_FAIL_ICON;
                }

                if (expiryCheck) {
                    this.model.productStatus = constants.PRODUCT_STATUS_FAIL_MESSAGE;
                    this.model.PSCheckIcon = constants.PRODUCT_STATUS_FAIL_ICON;
                }
            });
        });
    }
}
