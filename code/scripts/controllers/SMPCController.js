import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import utils from "../../utils.js";

export default class SMPCController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        if (typeof history.location.state !== "undefined") {
            this.gtinSSI = history.location.state.gtinSSI;
            this.gs1Fields = history.location.state.gs1Fields;
        }

        this.on("go-back", (event)=> {
            history.push({
                pathname: '/drug-details',
                state: {
                    gtinSSI: this.gtinSSI,
                    gs1Fields:this.gs1Fields
                }
            });
        })

        utils.displayXml(this.DSUStorage, this.element, this.gtinSSI, "smpc", "smpc.xml");
    }
}