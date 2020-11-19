import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import interpretGS1scan from "../gs1ScanInterpreter/interpretGS1scan/interpretGS1scan.js";

const gtinResolver = require("gtin-resolver");
export default class ScanController extends ContainerController {
    constructor(element, history) {
        super(element);
        this.setModel({data: '', hasCode: false, hasError: false});
        this.history = history;
        this.model.onChange("data", () => {
            this.model.hasCode = true;
            const gs1Elements = interpretGS1scan.interpretScan(this.model.data);
            const gtinComponents = {};
            gtinComponents.gtin = gs1Elements.ol.find(el => el.label.includes("GTIN")).value;
            gtinComponents.batchNumber = gs1Elements.ol.find(el => el.label.includes("BATCH")).value;
            gtinComponents.serialNumber = gs1Elements.ol.find(el => el.label.includes("SERIAL")).value;
            let expiry = gs1Elements.ol.find(el => el.label.includes("EXPIRY")).value;
            expiry = expiry.split("-");
            expiry[0] = expiry[0].substring(2);
            gtinComponents.expirationDate = expiry.join('');
            const gtinSSI = gtinResolver.createGTIN_SSI("default", gtinComponents.gtin, gtinComponents.batchNumber, gtinComponents.expirationDate);
            this.DSUStorage.call("listDSUs", `/packages`, (err, dsuList) => {
                const productDSU = dsuList.find(dsu => dsu.identifier === gtinSSI.getIdentifier());
                if (typeof productDSU === "undefined") {
                    this.DSUStorage.call("mountDSU", `/package`, gtinSSI.getIdentifier(), (err) => {
                        this.productExists(gtinSSI, (productExists) => {
                            if (productExists) {
                                this.DSUStorage.call("mountDSU", `/packages/${Date.now()}`, gtinSSI.getIdentifier(), (err) => {
                                    history.push("/drug-details");
                                });
                            } else {
                                history.push("/scan-error");
                            }
                        });
                    });
                } else {
                    history.push("/drug-details");
                }
            });
        });
    }

    productExists(gtinSSI, callback) {
        this.DSUStorage.getItem(`/package/batch/batch.json`, "json",(err) => callback(!err));
    }
}