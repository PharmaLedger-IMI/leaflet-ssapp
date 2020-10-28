import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import utils from "../../utils.js";

const gtinResolver = require("gtin-resolver");
export default class ScanController extends ContainerController {
    constructor(element, history) {
        super(element);
        this.setModel({data: '', hasCode: false});
        this.history = history;
        this.model.onChange("data", () => {
            this.model.hasCode = true;
            const gtinComponents = utils.parse(this.model.data);
            const gtinSSI = gtinResolver.createGTIN_SSI("default", gtinComponents.gtin, gtinComponents.batchNumber, gtinComponents.expirationDate);
            this.DSUStorage.call("mountDSU", "/tmp", gtinSSI.getIdentifier(), (err) => {
                this.DSUStorage.call("listDSUs", "/tmp", (err, dsuList) => {
                    this.DSUStorage.call("mountDSU", `/packages/${Date.now()}`, gtinSSI.getIdentifier(), (err) => {
                    history.push("/drug-details");
                });
                });
            });
        });
    }
}