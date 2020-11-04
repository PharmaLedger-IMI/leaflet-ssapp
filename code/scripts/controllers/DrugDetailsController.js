import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        this.DSUStorage.call("listDSUs", "/packages", (err, dsuList) => {
            dsuList.sort((a, b) => parseInt(a.path) <= parseInt(b.path));
            const basePath = `/packages/${dsuList[dsuList.length - 1].path}`;
            this.DSUStorage.getItem(basePath + `/batch/product/product.json`, 'json', (err, product) => {
                if (err) {
                    console.log(err);
                    console.log(product);
                }
                product.photo = `/download/${basePath}/batch/product` + product.photo;
                this.model.product = product;

                this.DSUStorage.getItem(`${basePath}/package.json`, 'json', (err, pack) => {
                    if (err) {
                        console.log(err);
                    }

                    this.model.expiry = utils.getDate(pack.expiration);
                    this.model.package = pack;
                });
            });
        });
    }
}
