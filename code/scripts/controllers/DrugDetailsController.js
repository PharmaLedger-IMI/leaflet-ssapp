import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import LanguageService from "../services/LanguageService.js";
import utils from "../../utils.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({
            serialNumberVerification: "Verified",
            productStatus: "Verified",
            packageVerification: "Action required"
        });

        if (typeof history.location.state !== "undefined") {
            this.gtinSSI = history.location.state.gtinSSI;
            this.gs1Fields = history.location.state.gs1Fields;
            this.model.serialNumber       = this.gs1Fields.serialNumber;
            this.model.gtin               = this.gs1Fields.gtin;
            this.model.batchNumber        = this.gs1Fields.batchNumber;
            this.model.expiryForDisplay   = this.gs1Fields.expiry;
        }

        this.on("view-leaflet", () => {
            history.push({
                pathname: '/leaflet',
                state: {
                    gtinSSI: this.gtinSSI,
                    gs1Fields: this.gs1Fields
                }
            });
        });

        this.on("view-smpc", () => {
            history.push({
                pathname: '/smpc',
                state: {
                    gtinSSI: this.gtinSSI,
                    gs1Fields: this.gs1Fields
                }
            });
        });

        const basePath = `/packages/${this.gtinSSI}`;

        this.DSUStorage.getItem(`${basePath}/batch/batch.json`, "json", (err, batchData) => {
            if (err) {
                console.log(err);
                return;
            }

            this.DSUStorage.getItem(`${basePath}/batch/product/${batchData.version}/product.json`, "json", (err, product) => {
                if (err) {
                    return console.log(err);
                }
                product.photo = `/download${basePath}/batch/product/${batchData.version}` + product.photo;
                this.model.product = product;

                this.DSUStorage.getItem(`${basePath}/batch/batch.json`, "json", (err, batchData) => {
                    if (err) {
                        return console.log(err);
                    }

                    batchData.expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(batchData.expiry);
                    this.model.batch = batchData;
                    if(this.model.gtin !=  batchData.gtin ||
                        this.model.batchNumber !=  batchData.batchNumber ||
                        this.model.expiryForDisplay != batchData.expiryForDisplay) {
                        //TODO antocounterfeit WIP
                        alert("Anti Counterfeiting warning. Will be improved in next days ");
                    }
                });
            });
        });
    }
}
