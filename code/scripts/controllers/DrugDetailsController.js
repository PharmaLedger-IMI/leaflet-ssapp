import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        if (typeof history.location.state !== "undefined") {
            this.gtinSSI = history.location.state.gtinSSI;
        }

        this.on("view-leaflet", () => {
            history.push({
                pathname: '/leaflet',
                state: {
                    gtinSSI: this.gtinSSI
                }
            });
        });

        this.on("view-smpc", () => {
            history.push({
                pathname: '/smpc',
                state: {
                    gtinSSI: this.gtinSSI
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
                });
            });
        });
    }
}
