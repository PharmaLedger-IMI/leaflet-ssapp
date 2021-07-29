const {WebcController} = WebCardinal.controllers;

export default class ScanErrorController extends WebcController {
    constructor(element, history) {
        super(element, history);
        this.setModel({
            ... history.location.state,
            title: 'Product not found'
        });
        this.model.showSecondaryMessage = !!this.model.secondaryMessage;
    }
}
