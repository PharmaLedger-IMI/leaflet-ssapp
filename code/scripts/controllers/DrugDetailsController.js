import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
export default class DrugDetailsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({});
        this.DSUStorage.getItem('/tmp/batch/product/product.json', 'json', (err, product) => {
            if (err) {
                console.log(err);
            }
            product.photo = '/download/tmp/batch/product' + product.photo;
            this.model.product = product;

            this.DSUStorage.getItem('/tmp/package.json', 'json', (err, pack) => {
                if (err) {
                    console.log(err);
                }

                const year = "20" + pack.expiration.substring(0, 2);
                const month = parseInt(pack.expiration.substring(2, 4));
                this.model.expiry = `${monthNames[month - 1]} - ${year}`;
                this.model.package = pack;
            });
        });


    }
}
