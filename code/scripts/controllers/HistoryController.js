import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";

export default class HistoryController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});

        this.on("view-leaflet", (event) => {
            let target = event.target;
            let targetProduct = target.getAttribute("keySSI");
            const index = parseInt(targetProduct.replace(/\D/g, ''));
            history.push({
                pathname: '/leaflet',
                state: {
                    productIndex: index
                }
            });
        }, {capture: true});

        this.DSUStorage.call("listDSUs", "/packages", (err, dsuList) => {
            const products = [];
            const __readProductsRecursively = (packageNumber, callback) => {
                if (packageNumber < dsuList.length) {
                    this.DSUStorage.getItem(`/packages/${dsuList[packageNumber].path}/batch/product/product.json`, 'json', (err, product) => {
                        if (err) {
                            return callback(err);
                        }

                        this.DSUStorage.getItem(`/packages/${dsuList[packageNumber].path}/package.json`, 'json', (err, pack) => {
                            if (err) {
                                return callback(err);
                            }

                            product.keySSI = pack.product;
                            product.expiry = utils.getDate(pack.expiration);
                            product.photo = '/download/tmp/batch/product' + product.photo;
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
