import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import utils from "../../utils.js";

export default class SMPCController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        if (typeof history.location.state !== "undefined") {
            this.packageIndex = history.location.state.productIndex;
            this.language = history.location.state.language;
        }
        if (typeof this.language === "undefined") {
            this.language = "English";
        }
        utils.displayXml(this.DSUStorage, this.element, "smpc", this.language, "smpc.xml");
    }
}