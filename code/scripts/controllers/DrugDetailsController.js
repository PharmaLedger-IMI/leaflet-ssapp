import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);

        this.DSUStorage.getItem('/tmp/batch/product/product.json', 'json', (err, product) => {
            if (err) {
                console.log(err);
            }
            product.photo = '/download/tmp/batch/product'+product.photo;
            this.setModel({product});
        });
    }
}
