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
                this.redirectToError("Invalid GS1DataMatrix", this.parseGs1Fields(e.dlOrderedAIlist));
                return;
            }

            const gs1Fields = this.parseGs1Fields(gs1FormatFields.ol);
            if (!this.hasMandatoryFields(gs1Fields)) {
                this.redirectToError("Invalid GS1DataMatrix", gs1Fields);
            }
            const gtinSSI = gtinResolver.createGTIN_SSI("default", gs1Fields.gtin, gs1Fields.batchNumber);
            this.DSUStorage.call("listDSUs", `/packages`, (err, dsuList) => {
                this.productIndex = dsuList.findIndex(dsu => dsu.identifier === gtinSSI.getIdentifier());
                if (this.productIndex === -1) {
                    this.DSUStorage.call("mountDSU", `/package`, gtinSSI.getIdentifier(), (err) => {
                        this.packageAnchorExists(gtinSSI, (err, status) => {
                            if (status) {
                                this.DSUStorage.call("mountDSU", `/packages/${Date.now()}`, gtinSSI.getIdentifier(), (err) => {
                                    history.push("/drug-details");
                                });
                            } else {
                                this.redirectToError("This package is not anchored in blockchain", gs1Fields);
                            }
                        });
                    });
                } else {
                    history.push({
                        pathname: "/drug-details",
                        state: {
                            productIndex: this.productIndex
                        }
                    });
                }
            });
        });
    }

    packageAnchorExists(gtinSSI, callback) {
        this.DSUStorage.getItem(`/package/batch/batch.json`, "json", err => {
            if (err) {
                return callback(undefined, false)
            }
            return callback(undefined, true);
        });
    }

    parseGs1Fields(orderedList) {
        const gs1Fields = {};
        const fieldsConfig = {
            "GTIN": "gtin",
            "BATCH/LOT": "batchNumber",
            "SERIAL": "serialNumber",
            "USE BY OR EXPIRY": "expiry"
        };

        orderedList.map(el=> {
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