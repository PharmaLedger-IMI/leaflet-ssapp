import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";

export default class HistoryController extends ContainerController {
    constructor(element, history) {
        super(element);
        console.log("Preparing to set up the view model");

        this.setModel({});

        const self = this;
        this.model.addExpression('historyLoaded', function() {
            console.log("Expression checking", typeof self.model.scannedDrugs !== "undefined");
            return typeof self.model.scannedDrugs !== "undefined";
        }, 'scannedDrugs');

        this.DSUStorage.getItem('/data/drugsHistory.json', 'json', (err, drugHistory) => {
            if(typeof drugHistory === "undefined"){
                return this.model.scannedDrugs = [];
            }

            this.model.scannedDrugs = drugHistory;
        });

        this.on("clearHistory", (event) => {
            this.DSUStorage.setItem('/data/drugsHistory.json', JSON.stringify([]), err => {
                if (!err) {
                    this.model.scannedDrugs = [];
                }
            });
        });

        this.on("view-drug", (event) => {
            history.push("/drug-details");
        }, {capture: true});

        this.on("displayLeaflet", (event) => {
            history.push("/leaflet");
        }, {capture: true});
    }
}
