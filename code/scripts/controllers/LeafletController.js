import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
import utils from "../../utils.js";
export default class LeafletController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        if (typeof history.location.state !== "undefined") {
            this.gtinSSI = history.location.state.gtinSSI;
        }

        this.on("go-back", (event)=> {
            history.push({
                pathname: '/drug-details',
                state: {
                    gtinSSI: this.gtinSSI
                }
            });
        })

        utils.displayXml(this.DSUStorage, this.element, this.gtinSSI, "leaflet", "leaflet.xml");
    }
}