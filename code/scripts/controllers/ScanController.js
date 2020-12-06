import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import interpretGS1scan from "../gs1ScanInterpreter/interpretGS1scan/interpretGS1scan.js";
import utils from "../../utils.js";

const gtinResolver = require("gtin-resolver");
export default class ScanController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({data: '', hasCode: false, hasError: false});
        this.history = history;
        this.model.onChange("data", () => {
            this.model.hasCode = true;
            let gs1FormatFields;
            try {
                gs1FormatFields = interpretGS1scan.interpretScan(this.model.data);
            } catch (e) {
                this.redirectToError("Barcode is not readable, please contact pharmacy / doctor who issued the medicine package.", this.parseGs1Fields(e.dlOrderedAIlist));
                return;
            }

            const gs1Fields = this.parseGs1Fields(gs1FormatFields.ol);
            if (!this.hasMandatoryFields(gs1Fields)) {
                this.redirectToError("Barcode is not readable, please contact pharmacy / doctor who issued the medicine package.", gs1Fields);
            }
            const gtinSSI = gtinResolver.createGTIN_SSI("epi", gs1Fields.gtin, gs1Fields.batchNumber);
            this.packageAlreadyScanned(gtinSSI, (err, status) => {
                if (err) {
                    return this.redirectToError("Product code combination could not be resolved.", gs1Fields);
                }
                if (status === false) {
                    this.packageAnchorExists(gtinSSI, (err, status) => {
                        if (status) {
                            this.addPackageToScannedPackagesList(gtinSSI, (err)=>{
                                this.redirectToDrugDetails({gtinSSI: gtinSSI.getIdentifier()});
                            })
                        } else {
                            this.redirectToError("Product code combination could not be resolved.", gs1Fields);
                        }
                    });
                } else {
                   this.redirectToDrugDetails({gtinSSI: gtinSSI.getIdentifier()});
                }
            });
        });
    }

    redirectToDrugDetails(state){
        this.history.push("/drug-details", state);
    }

    packageAlreadyScanned(packageGTIN_SSI, callback) {
        this.DSUStorage.call("listDSUs", `/packages`, (err, dsuList) => {
            if (err) {
                return callback(err);
            }

            let packageIndex = dsuList.findIndex(dsu => dsu.identifier === packageGTIN_SSI.getIdentifier());
            if (packageIndex === -1) {
                callback(undefined, false);
            }else{
                callback(undefined, true);
            }
        });
    }

    addPackageToScannedPackagesList(packageGTIN_SSI, callback) {
        this.DSUStorage.call("mountDSU", `/packages/${packageGTIN_SSI.getIdentifier()}`, packageGTIN_SSI.getIdentifier(), callback);
    }

    packageAnchorExists(packageGTIN_SSI, callback) {
        this.DSUStorage.call("mountDSU", `/package`, packageGTIN_SSI.getIdentifier(), (err) => {
            this.DSUStorage.getItem(`/package/batch/batch.json`, "json", err => {
                if (err) {
                    return callback(undefined, false)
                }
                return callback(undefined, true);
            });
        })
    }

    parseGs1Fields(orderedList) {
        const gs1Fields = {};
        const fieldsConfig = {
            "GTIN": "gtin",
            "BATCH/LOT": "batchNumber",
            "SERIAL": "serialNumber",
            "USE BY OR EXPIRY": "expiry"
        };

        orderedList.map(el => {
            let fieldName = fieldsConfig[el.label];
            gs1Fields[fieldName] = el.value;
        })

        if (gs1Fields.expiry) {
            gs1Fields.expiry = utils.convertFromISOtoYYYY_HM(gs1Fields.expiry);
        }

        return gs1Fields;
    }

    hasMandatoryFields(gs1Fields) {
        if (!gs1Fields.gtin || !gs1Fields.serialNumber || !gs1Fields.serialNumber || !gs1Fields.expiry) {
            return false;
        }

        return true;
    }

    redirectToError(message, fields) {
        this.history.push({
            pathname: "/scan-error",
            state: {
                message,
                fields
            }
        })
    }
}