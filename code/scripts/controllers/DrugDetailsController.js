import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";

export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
this.setModel({});
        this.DSUStorage.getItem('/tmp/batch/product/product.json', 'json', (err, product) => {
            if (err) {
                console.log(err);
            }
            product.photo = '/download/tmp/batch/product'+product.photo;
            this.model.product=product;
        });

        this.DSUStorage.getItem('package', 'json', (err, packages) => {
            if (err) {
                console.log(err);
            }
            this.model.packages=packages
            console.log( "Packages here: ",packages)
        });        
    }
}
