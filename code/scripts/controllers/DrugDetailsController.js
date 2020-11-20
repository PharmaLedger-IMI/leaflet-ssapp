import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        if (typeof history.location.state !== "undefined") {
            this.productIndex = history.location.state.productIndex;
        }

        this.on("view-leaflet", () => {
            history.push({
                pathname: '/leaflet',
                state: {
                    productIndex: this.productIndex
                }
            });
        });

        this.DSUStorage.call("listDSUs", "/packages", (err, dsuList) => {
            dsuList.sort((a, b) => parseInt(a.path) <= parseInt(b.path));
            let targetDSU = dsuList[dsuList.length - 1];
            if (typeof this.productIndex !== "undefined") {
                targetDSU = dsuList[this.productIndex];
            }
            const basePath = `/packages/${targetDSU.path}`;

            this.DSUStorage.getItem(`${basePath}/batch/batch.json`, "json", (err, batchData) => {
                if (err) {
                    console.log(err);
                    return;
                }

                this.DSUStorage.getItem(`${basePath}/batch/product/${batchData.version}/${batchData.language}/product.json`, "json", (err, product) => {
                    if (err) {
                        return console.log(err);
                    }
                    product.photo = `/download${basePath}/batch/product/${batchData.version}/${batchData.language}` + product.photo;
                    this.model.product = product;

                    this.DSUStorage.getItem(`${basePath}/batch/batch.json`, "json", (err, batchData) => {
                        if (err) {
                            return console.log(err);
                        }

                        this.model.batch = batchData;
                    });
                });
            });
        });
    }
}
