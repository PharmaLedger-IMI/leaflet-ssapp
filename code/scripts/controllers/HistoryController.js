import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";

export default class HistoryController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});

        this.on("view-details", (event) => {
            let target = event.target;
            let targetProduct = target.getAttribute("keySSI");
            const index = parseInt(targetProduct.replace(/\D/g, ''));
            history.push({
                pathname: '/drug-details',
                state: {
                    productIndex: index
                }
            });
        }, {capture: true});

        this.DSUStorage.call("listDSUs", "/packages", (err, dsuList) => {
            const products = [];
            dsuList.sort((a, b) => parseInt(a.path) <= parseInt(b.path));

            const __readProductsRecursively = (packageNumber, callback) => {
                if (packageNumber < dsuList.length) {
                    const basePath = `/packages/${dsuList[packageNumber].path}`;
                    this.DSUStorage.getItem(`${basePath}/batch/batch.json`, 'json', (err, batch) => {
                        this.DSUStorage.getItem(`${basePath}/batch/product/${batch.version}/product.json`, 'json', (err, product) => {
                            if (err) {
                                return callback(err);
                            }

                            product.keySSI = batch.product;
                            product.expiry = utils.convertFromGS1DateToYYYY_HM(batch.expiry);
                            product.photo = `/download${basePath}/batch/product` + product.photo;
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
}
