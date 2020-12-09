import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";
import constants from "../../constants.js";

export default class HistoryController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        this.model.loadingStatusMessage = "Loading...";

        this.on("view-details", (event) => {
            let target = event.target;
            let targetProduct = target.getAttribute("keySSI");
            const index = parseInt(targetProduct.replace(/\D/g, ''));
            let gtinSSI = this.model.products[index].batchGtinSSI;
            this.getGS1Fields(gtinSSI, (err, gs1Fields) => {
                history.push({
                    pathname: '/drug-details',
                    state: {
                        gtinSSI,
                        gs1Fields
                    }
                });
            });
        }, {capture: true});

        this.DSUStorage.call("listDSUs", "/packages", (err, dsuList) => {
            const products = [];
            if(dsuList.length === 0 ){
                this.model.loadingStatusMessage = "You have not scanned any valid products previously. Kindly click on the scan button below to scan.";
            }
            const __readProductsRecursively = (packageNumber, callback) => {
                if (packageNumber < dsuList.length) {
                    const gtinSSI = dsuList[packageNumber].identifier;
                    const basePath = `/packages/${dsuList[packageNumber].path}`;
                    this.DSUStorage.getItem(`${basePath}/batch/batch.json`, 'json', (err, batch) => {
                        this.DSUStorage.getItem(`${basePath}/batch/product/${batch.version}/product.json`, 'json', (err, product) => {
                            if (err) {
                                return callback(err);
                            }

                            product.batchGtinSSI = gtinSSI;
                            product.keySSI = batch.product;
                            product.expiry = utils.convertFromGS1DateToYYYY_HM(batch.expiry);
                            product.photo = utils.getFetchUrl(`/download${basePath}/batch/product` + product.photo);
                            products.push(product);
                            packageNumber++;
                            __readProductsRecursively(packageNumber, callback);
                        });
                    });
                } else {
                    callback(undefined, products);
                }
            }

            __readProductsRecursively(0, (err, productsList) => {
                if (err) {
                    console.log(err);
                } else {
                    this.model.products = productsList;
                }
            });
        });
    }

    getGS1Fields(gtinSSI, callback){
        this.DSUStorage.getObject(constants.PACKAGES_STORAGE_PATH, (err, packages) => {
            if (err) {
                return callback(err);
            }

            callback(undefined, packages[gtinSSI]);
        });
    }
}
