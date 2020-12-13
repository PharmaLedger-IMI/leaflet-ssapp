import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({
            serialNumberVerification: "Verified",
            productStatus: "Verified",
            packageVerification: "Action required"
        });

        this.model.SNCheckIcon = ""

        if (typeof history.location.state !== "undefined") {
            this.gtinSSI = history.location.state.gtinSSI;
            this.gs1Fields = history.location.state.gs1Fields;
            this.model.serialNumber       = this.gs1Fields.serialNumber;
            this.model.gtin               = this.gs1Fields.gtin;
            this.model.batchNumber        = this.gs1Fields.batchNumber;
            this.model.expiryForDisplay   = this.gs1Fields.expiry;
        }

        this.model.SNCheckIcon = "assets/icons/serial_number/png/sn_ok.png"
        this.model.PSCheckIcon = "assets/icons/product_status/png/ps_ok.png"

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

                     let checkSNCheck = ()=>{
                        let res = false;
                        try{
                            let bloomFilter = require("opendsu").loadAPI("crypto").createBloomFilter(batchData.bloomFilterSerialisation);
                            res = bloomFilter.test(this.model.serialNumber);
                        } catch(err){
                            alert(err.message);
                        }
                        return res;
                    };

                    batchData.expiryForDisplay = utils.convertFromGS1DateToYYYY_HM(batchData.expiry);
                    this.model.batch = batchData;
                    let snCheck =  checkSNCheck();
                    let expiryCheck =  this.model.expiryForDisplay != batchData.expiryForDisplay;
                    if(!snCheck){
                        this.model.serialNumberVerification = "Failed";
                        this.model.SNCheckIcon = "assets/icons/serial_number/png/sn_fail.png"
                    }

                    if(expiryCheck){
                        this.model.productStatus = "Wrong expiry";
                        this.model.PSCheckIcon = "assets/icons/serial_number/png/ps_fail.png"
                    }

                });
            });
        });
    }
}
