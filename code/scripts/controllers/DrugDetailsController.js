import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import utils from "../../utils.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        this.DSUStorage.getItem('/tmp/batch/product/product.json', 'json', (err, product) => {
            if (err) {
                console.log(err);
                console.log(product);
            }
            product.photo = '/download/tmp/batch/product' + product.photo;
//            this.model.product.photo = '/download/tmp/batch/product' + this.model.product.photo;

            this.model.product = product;

            this.DSUStorage.getItem('/tmp/package.json', 'json', (err, pack) => {
                if (err) {
                    console.log(err);
                }

                this.model.expiry = utils.getDate(pack.expiration);
                this.model.package = pack;
            });
        });


    }
}
